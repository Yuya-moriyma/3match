import Phaser from 'phaser';
import { ActionType, Character, SkillEffectType } from '../types';
import { PARCHMENT_ORB_COLORS, colorToHex } from '../theme';
import { SoundManager, SoundKeys } from '../utils/SoundManager';
import { BoardModel } from './board/BoardModel';
import { EffectManager } from './effects/EffectManager';
import { BattleHUD } from './ui/BattleHUD';
import { ActionSystem } from './actions/ActionSystem';
import { SkillExecutor } from './skills/SkillExecutor';
import { StatusEffectManager } from './StatusEffectManager';
import { TILE_COLORS } from './constants';

/**
 * ActionEffectHandler のコールバック
 */
export interface ActionEffectCallbacks {
  getPlayerHp: () => number;
  setPlayerHp: (hp: number) => void;
  getPlayerMaxHp: () => number;
  getEnemyHp: () => number;
  setEnemyHp: (hp: number) => void;
  isEnemyDefeated: () => boolean;
  setEnemyDefeated: (value: boolean) => void;
  updateHUD: () => void;
  emitBattleEnd: (victory: boolean) => void;
  onTileClick: (row: number, col: number, pointer?: Phaser.Input.Pointer) => void;
}

/**
 * ActionEffectHandler - アクション効果の発動を担当
 * 攻撃・スキル・回復のアクション効果を実行する
 */
export class ActionEffectHandler {
  private scene: Phaser.Scene;
  private boardModel: BoardModel;
  private effectManager: EffectManager;
  private battleHUD: BattleHUD;
  private actionSystem: ActionSystem;
  private skillExecutor: SkillExecutor;
  private statusEffectManager: StatusEffectManager;
  private character: Character;
  private atkBonus = 0;
  private healBonus = 0;
  private levelMultiplier = 1.0;
  private callbacks!: ActionEffectCallbacks;

  constructor(
    scene: Phaser.Scene,
    boardModel: BoardModel,
    effectManager: EffectManager,
    battleHUD: BattleHUD,
    actionSystem: ActionSystem,
    skillExecutor: SkillExecutor,
    statusEffectManager: StatusEffectManager,
    character: Character
  ) {
    this.scene = scene;
    this.boardModel = boardModel;
    this.effectManager = effectManager;
    this.battleHUD = battleHUD;
    this.actionSystem = actionSystem;
    this.skillExecutor = skillExecutor;
    this.statusEffectManager = statusEffectManager;
    this.character = character;
  }

  setAtkBonus(bonus: number): void {
    this.atkBonus = bonus;
  }

  setHealBonus(bonus: number): void {
    this.healBonus = bonus;
  }

  setLevelMultiplier(playerLevel: number): void {
    this.levelMultiplier = 1 + playerLevel * 0.01;
  }

  setCallbacks(callbacks: ActionEffectCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * アクション発動キューを実行
   */
  executeQueuedActions(onComplete: () => void): void {
    const offset = this.boardModel.getBoardOffset();
    this.actionSystem.executeQueuedActions(
      offset.x,
      offset.y,
      (actionType, showText) => this.triggerActionEffect(actionType, showText),
      () => this.callbacks.updateHUD(),
      onComplete
    );
  }

  /**
   * アクション効果を発動
   * @returns 敵撃破時はtrue（以後のアクションを中断）
   */
  triggerActionEffect(actionType: ActionType, showText = true): boolean {
    if (this.callbacks.isEnemyDefeated()) {
      return true;
    }

    switch (actionType) {
      case ActionType.ATTACK: {
        const attackDamage = Math.floor((this.character.attackPower + this.atkBonus) * this.levelMultiplier);
        const newHp = Math.max(0, this.callbacks.getEnemyHp() - attackDamage);
        this.callbacks.setEnemyHp(newHp);
        this.callbacks.updateHUD();
        if (showText) {
          this.effectManager.showActionEffectText(
            'ATTACK!',
            colorToHex(PARCHMENT_ORB_COLORS.highlight.red)
          );
        }
        this.effectManager.shakeEnemyUI(
          this.battleHUD.enemyContainer,
          this.battleHUD.enemyContainerBaseX,
          this.battleHUD.enemyContainerBaseY
        );
        this.effectManager.showDamagePopup(
          attackDamage,
          this.battleHUD.enemyContainerBaseX,
          this.battleHUD.enemyContainerBaseY
        );
        SoundManager.getInstance().playSE(SoundKeys.ATTACK);
        if (newHp <= 0) {
          this.callbacks.setEnemyDefeated(true);
          this.actionSystem.abort();
          this.effectManager.destroyEnemyActionOverlay();
          this.scene.tweens.killAll();
          this.scene.time.removeAllEvents();
          // HPバーtransition(300ms) + 余韻(500ms) 後に消滅演出開始
          this.scene.time.delayedCall(800, () => {
            this.effectManager.playEnemyDeathAnimation(
              this.battleHUD.enemyContainer,
              () => {
                this.scene.time.delayedCall(1000, () => {
                  this.callbacks.emitBattleEnd(true);
                });
              }
            );
          });
          return true;
        }
        break;
      }

      case ActionType.SKILL:
        this.executeCharacterSkill(showText);
        break;

      case ActionType.HEAL:
        this.healPlayer(Math.floor((this.character.healPower + this.healBonus) * this.levelMultiplier));
        if (showText) {
          this.effectManager.showActionEffectText(
            'HEAL!',
            colorToHex(PARCHMENT_ORB_COLORS.highlight.green)
          );
        }
        break;
    }

    return false;
  }

  /**
   * プレイヤー回復
   */
  private healPlayer(amount: number): void {
    const newHp = Math.min(this.callbacks.getPlayerMaxHp(), this.callbacks.getPlayerHp() + amount);
    this.callbacks.setPlayerHp(newHp);
    this.callbacks.updateHUD();
    this.scene.cameras.main.flash(200, 90, 140, 70);
    SoundManager.getInstance().playSE(SoundKeys.HEAL);
  }

  /**
   * キャラクタースキルを実行
   */
  private executeCharacterSkill(showText: boolean): void {
    const skill = this.character.skill;

    if (showText) {
      this.effectManager.showSkillActivationText(skill.name, this.character.color);
    }

    if (this.character.skillSe) {
      if (this.character.skillSeDuration) {
        SoundManager.getInstance().playSEForDuration(this.character.skillSe, this.character.skillSeDuration);
      } else {
        SoundManager.getInstance().playSE(this.character.skillSe);
      }
    }

    const result = this.skillExecutor.execute(
      this.character,
      (row, col) => this.callbacks.onTileClick(row, col)
    );

    if (!result.success) {
      this.effectManager.showNoTargetText();
      return;
    }

    if (result.enemyCounterFreeze) {
      const duration = result.enemyCounterFreeze.duration;
      this.statusEffectManager.applyEnemyCounterFreeze(duration);
      this.battleHUD.setEnemyCounterFrozen(true, duration);
    }

    if (result.affectedTiles) {
      for (const { row, col } of result.affectedTiles) {
        const pos = this.boardModel.getTilePosition(row, col);

        if (skill.effectType === SkillEffectType.CREATE_BOMB) {
          this.effectManager.showBombCreateSkillEffect(pos.x, pos.y);
        } else if (skill.effectType === SkillEffectType.CONVERT_COLOR) {
          const toColor = skill.effectParams?.toColor;
          if (toColor !== undefined) {
            this.effectManager.showColorConvertSkillEffect(pos.x, pos.y, TILE_COLORS[toColor]);
          }
        } else if (skill.effectType === SkillEffectType.GENERATE_COLOR) {
          this.effectManager.showOrbGenerateSkillEffect(pos.x, pos.y);
        }
      }
    }
  }
}
