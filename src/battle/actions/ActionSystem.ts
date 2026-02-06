import Phaser from 'phaser';
import { ActionType, BOARD_COLS, BOARD_ROWS, TILE_SIZE, Character } from '../../types';
import { THEME } from '../../theme';
import { ActionCounts } from '../board/types';
import { defaultCharacter } from '../../data/characters';
import { COUNT_UP_INTERVAL_MS, ACTION_TRIGGER_THRESHOLD } from '../constants';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';
import { GameBridgeEvents } from '../../ui/GameBridge';

/**
 * ActionCountdownInfo - アクション発動情報
 */
export interface ActionCountdownInfo {
  attack: { triggers: number };
  skill: { triggers: number };
  heal: { triggers: number };
}

/**
 * ActionSystem - アクション発動システム
 * カウント管理、カウントダウンアニメーション、アクション発動キューを担当
 */
export class ActionSystem {
  private scene: Phaser.Scene;
  private character: Character = defaultCharacter;
  private skillCostReduction = 0;
  private attackCostReduction = 0;
  private healCostReduction = 0;
  private actionOverlay?: Phaser.GameObjects.Container;

  // アクションカウント
  private attackCount = 0;
  private skillCount = 0;
  private healCount = 0;

  // 発動待ちアクション
  private pendingActions: ActionCounts = { attack: 0, skill: 0, heal: 0 };

  // 中断フラグ（敵撃破時にカウントダウンを停止するため）
  private isAborted = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * キャラクター情報を設定
   */
  setCharacter(character: Character): void {
    this.character = character;
  }

  /**
   * スキルコスト減算値を設定
   */
  setSkillCostReduction(reduction: number): void {
    this.skillCostReduction = reduction;
  }

  /**
   * 攻撃コスト減算値を設定
   */
  setAttackCostReduction(reduction: number): void {
    this.attackCostReduction = reduction;
  }

  /**
   * 回復コスト減算値を設定
   */
  setHealCostReduction(reduction: number): void {
    this.healCostReduction = reduction;
  }

  /**
   * スキル発動に必要なカウントを取得（装備によるコスト減算を適用）
   */
  getSkillThreshold(): number {
    return Math.max(1, this.character.skill.cost - this.skillCostReduction);
  }

  /**
   * 攻撃発動に必要なカウントを取得（装備によるコスト減算を適用）
   */
  getAttackThreshold(): number {
    return Math.max(1, ACTION_TRIGGER_THRESHOLD - this.attackCostReduction);
  }

  /**
   * 回復発動に必要なカウントを取得（装備によるコスト減算を適用）
   */
  getHealThreshold(): number {
    return Math.max(1, ACTION_TRIGGER_THRESHOLD - this.healCostReduction);
  }

  /**
   * カウントをリセット
   */
  reset(): void {
    this.attackCount = 0;
    this.skillCount = 0;
    this.healCount = 0;
    this.pendingActions = { attack: 0, skill: 0, heal: 0 };
    this.isAborted = false;
  }

  /**
   * カウントダウンを中断（敵撃破時に呼び出す）
   */
  abort(): void {
    this.isAborted = true;
  }

  /**
   * 現在のカウントを取得
   */
  getCounts(): ActionCounts {
    return {
      attack: this.attackCount,
      skill: this.skillCount,
      heal: this.healCount,
    };
  }

  /**
   * 表示用の3カラム値を算出
   * 内部カウント値から「発動回数（triggers）」「端数（remainder）」「閾値（threshold）」を返す
   */
  getDisplayValues(): {
    attack: { triggers: number; remainder: number; threshold: number };
    skill: { triggers: number; remainder: number; threshold: number };
    heal: { triggers: number; remainder: number; threshold: number };
  } {
    const attackThreshold = this.getAttackThreshold();
    const skillThreshold = this.getSkillThreshold();
    const healThreshold = this.getHealThreshold();
    return {
      attack: {
        triggers: Math.floor(this.attackCount / attackThreshold),
        remainder: this.attackCount % attackThreshold,
        threshold: attackThreshold,
      },
      skill: {
        triggers: Math.floor(this.skillCount / skillThreshold),
        remainder: this.skillCount % skillThreshold,
        threshold: skillThreshold,
      },
      heal: {
        triggers: Math.floor(this.healCount / healThreshold),
        remainder: this.healCount % healThreshold,
        threshold: healThreshold,
      },
    };
  }

  /**
   * 発動待ちアクションを取得
   */
  getPendingActions(): ActionCounts {
    return { ...this.pendingActions };
  }

  /**
   * マッチしたタイルからアクションカウントを加算
   * @returns 各アクションの発動回数
   */
  addCounts(
    actionCounts: ActionCounts,
    chainMultiplier: number
  ): { attackTriggers: number; skillTriggers: number; healTriggers: number } {
    const prevAttack = this.attackCount;
    const prevSkill = this.skillCount;
    const prevHeal = this.healCount;

    this.attackCount += actionCounts.attack * chainMultiplier;
    this.skillCount += actionCounts.skill * chainMultiplier;
    this.healCount += actionCounts.heal * chainMultiplier;

    // 各アクションの閾値を取得（装備減算済み）
    const attackThreshold = this.getAttackThreshold();
    const skillThreshold = this.getSkillThreshold();
    const healThreshold = this.getHealThreshold();

    const attackTriggers =
      Math.floor(this.attackCount / attackThreshold) -
      Math.floor(prevAttack / attackThreshold);
    const skillTriggers =
      Math.floor(this.skillCount / skillThreshold) -
      Math.floor(prevSkill / skillThreshold);
    const healTriggers =
      Math.floor(this.healCount / healThreshold) -
      Math.floor(prevHeal / healThreshold);

    this.pendingActions.attack += attackTriggers;
    this.pendingActions.skill += skillTriggers;
    this.pendingActions.heal += healTriggers;

    return { attackTriggers, skillTriggers, healTriggers };
  }

  /**
   * アクションカウント加算 + 10カウント達成SE再生
   * addCounts を呼び出し、trigger が1つ以上あればSEを再生する
   */
  addCountsWithSE(
    actionCounts: ActionCounts,
    chainMultiplier: number
  ): { attackTriggers: number; skillTriggers: number; healTriggers: number } {
    const triggers = this.addCounts(actionCounts, chainMultiplier);
    if (triggers.attackTriggers > 0 || triggers.skillTriggers > 0 || triggers.healTriggers > 0) {
      SoundManager.getInstance().playSE(SoundKeys.TEN_COUNT);
    }
    return triggers;
  }

  /**
   * カウントアップアニメーションを実行（GameBridge経由でHTML側に通知）
   */
  animateCountUp(
    actionType: ActionType,
    fromValue: number,
    toValue: number,
    intervalMs: number = COUNT_UP_INTERVAL_MS
  ): void {
    const threshold = this.getThresholdForAction(actionType);
    const type = actionType === ActionType.ATTACK ? 'attack'
      : actionType === ActionType.SKILL ? 'skill'
      : 'heal';

    this.scene.game.events.emit(GameBridgeEvents.ACTION_COUNT_ANIMATE, {
      type,
      fromValue,
      toValue,
      threshold,
      intervalMs,
    });
  }

  /**
   * 溜まったアクションを順次発動
   */
  executeQueuedActions(
    boardOffsetX: number,
    boardOffsetY: number,
    onActionTrigger: (actionType: ActionType, showText: boolean) => boolean,
    onUpdateUI: () => void,
    onComplete: () => void
  ): void {
    const attackTriggers = this.pendingActions.attack;
    const skillTriggers = this.pendingActions.skill;
    const healTriggers = this.pendingActions.heal;

    this.pendingActions = { attack: 0, skill: 0, heal: 0 };

    if (attackTriggers === 0 && skillTriggers === 0 && healTriggers === 0) {
      onComplete();
      return;
    }

    this.showActionOverlay(boardOffsetX, boardOffsetY);

    const countdownInfo: ActionCountdownInfo = {
      attack: { triggers: attackTriggers },
      skill: { triggers: skillTriggers },
      heal: { triggers: healTriggers },
    };

    this.scene.time.delayedCall(1000, () => {
      this.executeCountdownPhase(countdownInfo, onActionTrigger, onUpdateUI, onComplete);
    });
  }

  /**
   * アクション発動時のオーバーレイを表示
   */
  private showActionOverlay(boardOffsetX: number, boardOffsetY: number): void {
    const boardWidth = BOARD_COLS * TILE_SIZE;
    const boardHeight = BOARD_ROWS * TILE_SIZE;
    const boardCenterX = boardOffsetX + boardWidth / 2;
    const boardCenterY = boardOffsetY + boardHeight / 2;

    this.actionOverlay = this.scene.add.container(boardCenterX, boardCenterY);
    this.actionOverlay.setDepth(50);
    this.actionOverlay.setAlpha(0);

    const overlay = this.scene.add.rectangle(0, 0, boardWidth, boardHeight, 0x000000, 0.5);
    this.actionOverlay.add(overlay);

    const bgGraphics = this.scene.add.graphics();
    const bgWidth = 240;
    const bgHeight = 60;

    bgGraphics.lineStyle(3, THEME.accentLight, 0.8);
    bgGraphics.strokeRoundedRect(-bgWidth / 2 - 3, -bgHeight / 2 - 3, bgWidth + 6, bgHeight + 6, 10);

    bgGraphics.fillStyle(THEME.border, 0.95);
    bgGraphics.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);
    bgGraphics.lineStyle(2, THEME.accent, 1);
    bgGraphics.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);

    this.actionOverlay.add(bgGraphics);

    const messageText = this.scene.add
      .text(0, 0, 'Your Action', {
        fontSize: '28px',
        color: THEME.textAccent,
        fontFamily: 'Kaisei Opti, serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);
    this.actionOverlay.add(messageText);

    this.scene.tweens.add({
      targets: this.actionOverlay,
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut',
    });

    messageText.setScale(0.5);
    this.scene.tweens.add({
      targets: messageText,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      delay: 100,
    });

    this.scene.tweens.add({
      targets: messageText,
      alpha: 0.85,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 400,
    });
  }

  /**
   * アクション発動時のオーバーレイを非表示
   */
  private hideActionOverlay(onComplete?: () => void): void {
    if (!this.actionOverlay) {
      onComplete?.();
      return;
    }

    this.scene.tweens.add({
      targets: this.actionOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.actionOverlay?.destroy();
        this.actionOverlay = undefined;
        onComplete?.();
      },
    });
  }

  /**
   * カウントダウンフェーズを実行
   * animateCountdown()を廃止し、アクション実行と同時に左端カウントを-1する方式
   */
  private executeCountdownPhase(
    countdownInfo: ActionCountdownInfo,
    onActionTrigger: (actionType: ActionType, showText: boolean) => boolean,
    onUpdateUI: () => void,
    onComplete: () => void
  ): void {
    const executeAttackPhase = (next: () => void) => {
      if (countdownInfo.attack.triggers > 0) {
        this.executeActionsForType(ActionType.ATTACK, countdownInfo.attack.triggers, onActionTrigger, next);
      } else {
        next();
      }
    };

    const executeSkillPhase = (next: () => void) => {
      if (countdownInfo.skill.triggers > 0) {
        this.executeActionsForType(ActionType.SKILL, countdownInfo.skill.triggers, onActionTrigger, next);
      } else {
        next();
      }
    };

    const executeHealPhase = (next: () => void) => {
      if (countdownInfo.heal.triggers > 0) {
        this.executeActionsForType(ActionType.HEAL, countdownInfo.heal.triggers, onActionTrigger, next);
      } else {
        next();
      }
    };

    executeAttackPhase(() => {
      executeSkillPhase(() => {
        executeHealPhase(() => {
          onUpdateUI();
          this.hideActionOverlay(() => {
            onComplete();
          });
        });
      });
    });
  }

  /**
   * 特定のアクション種別のエフェクトを発動回数分実行
   */
  private executeActionsForType(
    actionType: ActionType,
    count: number,
    onActionTrigger: (actionType: ActionType, showText: boolean) => boolean,
    onComplete: () => void
  ): void {
    if (count <= 0) {
      onComplete();
      return;
    }

    const actions: ActionType[] = [];
    for (let i = 0; i < count; i++) {
      actions.push(actionType);
    }

    this.executeActionSequence(actions, 0, onActionTrigger, () => {
      this.scene.time.delayedCall(250, onComplete);
    });
  }

  /**
   * アクションを1つずつ順番に発動
   * アクション実行と同時にカウントを1回分減算し、左端カウントをUI上で-1する
   * onActionTriggerがtrueを返した場合は以後のアクションを中断
   */
  private executeActionSequence(
    actions: ActionType[],
    index: number,
    onActionTrigger: (actionType: ActionType, showText: boolean) => boolean,
    onComplete: () => void
  ): void {
    if (index >= actions.length) {
      onComplete();
      return;
    }

    // 中断フラグが立っている場合は即座に終了
    if (this.isAborted) {
      onComplete();
      return;
    }

    const action = actions[index];
    const threshold = this.getThresholdForAction(action);

    // アクション実行と同時にカウントを1回分減算
    this.subtractCount(action, threshold);

    // 左端カウントのUI更新（パルスアニメーション付き）
    this.updateActionCountDisplay(action);

    const showText = index === 0;
    const shouldAbort = onActionTrigger(action, showText);

    // 敵撃破などで中断が要求された場合は即座に完了
    if (shouldAbort) {
      onComplete();
      return;
    }

    this.scene.time.delayedCall(250, () => {
      this.executeActionSequence(actions, index + 1, onActionTrigger, onComplete);
    });
  }

  /**
   * アクションカウントを1回分減算
   */
  private subtractCount(actionType: ActionType, threshold: number): void {
    switch (actionType) {
      case ActionType.ATTACK:
        this.attackCount -= threshold;
        break;
      case ActionType.SKILL:
        this.skillCount -= threshold;
        break;
      case ActionType.HEAL:
        this.healCount -= threshold;
        break;
    }
  }

  /**
   * アクションカウント表示を更新（GameBridge経由でHTML側に通知）
   */
  private updateActionCountDisplay(_actionType: ActionType): void {
    const displayValues = this.getDisplayValues();
    this.scene.game.events.emit(GameBridgeEvents.ACTION_COUNT_UPDATE, {
      attack: displayValues.attack,
      skill: displayValues.skill,
      heal: displayValues.heal,
    });
  }

  /**
   * アクションタイプに対応する閾値を取得
   */
  private getThresholdForAction(actionType: ActionType): number {
    switch (actionType) {
      case ActionType.ATTACK:
        return this.getAttackThreshold();
      case ActionType.SKILL:
        return this.getSkillThreshold();
      case ActionType.HEAL:
        return this.getHealThreshold();
      default:
        return ACTION_TRIGGER_THRESHOLD;
    }
  }

}
