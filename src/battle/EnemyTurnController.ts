import Phaser from 'phaser';
import { SoundManager, SoundKeys } from '../utils/SoundManager';
import { GameBridgeEvents } from '../ui/GameBridge';
import { BoardModel } from './board/BoardModel';
import { Tile } from './board/types';
import { EffectManager } from './effects/EffectManager';
import { BattleHUD } from './ui/BattleHUD';
import { EnemySkillExecutor } from './skills/EnemySkillExecutor';
import { getEnemySkill } from './skills/EnemySkillRegistry';
import { StatusEffectManager } from './StatusEffectManager';
import { StatusEffectController } from './StatusEffectController';

/**
 * EnemyTurnController のコールバック定義
 */
export interface EnemyTurnCallbacks {
  getPlayerHp: () => number;
  setPlayerHp: (hp: number) => void;
  getPlayerMaxHp: () => number;
  getEnemyNormalAttack: () => number;
  getEnemyAttackCounter: () => number;
  setEnemyAttackCounter: (counter: number) => void;
  getEnemyAttackInterval: () => number;
  getEnemySkillCounter: () => number;
  setEnemySkillCounter: (counter: number) => void;
  getEnemySkillInterval: () => number;
  getEnemyId: () => string;
  isEnemyDefeated: () => boolean;
  updateHUD: () => void;
  emitBattleEnd: (victory: boolean) => void;
}

/**
 * EnemyTurnController - 敵ターン制御（通常攻撃・スキル・敗北判定）
 */
export class EnemyTurnController {
  private scene: Phaser.Scene;
  private boardModel: BoardModel;
  private effectManager: EffectManager;
  private battleHUD: BattleHUD;
  private enemySkillExecutor: EnemySkillExecutor;
  private statusEffectManager: StatusEffectManager;
  private statusEffectController: StatusEffectController;

  // コールバック
  private callbacks!: EnemyTurnCallbacks;

  // 毒パネル生成フラグ（ターン完了後にチュートリアル表示するため）
  private hasPoisonConvertThisTurn = false;

  constructor(
    scene: Phaser.Scene,
    boardModel: BoardModel,
    effectManager: EffectManager,
    battleHUD: BattleHUD,
    enemySkillExecutor: EnemySkillExecutor,
    statusEffectManager: StatusEffectManager,
    statusEffectController: StatusEffectController
  ) {
    this.scene = scene;
    this.boardModel = boardModel;
    this.effectManager = effectManager;
    this.battleHUD = battleHUD;
    this.enemySkillExecutor = enemySkillExecutor;
    this.statusEffectManager = statusEffectManager;
    this.statusEffectController = statusEffectController;
  }

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: EnemyTurnCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * ムーブ完了時の処理（敵ターン）
   * 1. 状態異常のtick（タイルロック解除のみ）
   * 2. 敵アクション判定（通常攻撃・スキル）
   * 3. 敵アクションがあればオーバーレイ表示→攻撃→スキル→オーバーレイ非表示
   * 4. 最後のアクションから0.25秒後に毒ダメージ処理
   * @param onComplete 全敵アクション完了後に呼ばれるコールバック
   */
  onMoveComplete(onComplete: () => void): void {
    // 毒パネル生成フラグをリセット
    this.hasPoisonConvertThisTurn = false;

    if (this.callbacks.isEnemyDefeated()) {
      return;
    }

    // 1. 状態異常のtick（毒ダメージは後で処理するためここでは取得のみ）
    const tickResult = this.statusEffectManager.tick();

    // タイルロック解除処理
    if (tickResult.unlockedTiles.length > 0) {
      this.statusEffectController.removeTileLockOverlays(tickResult.unlockedTiles);
    }

    // HUD毒表示更新
    this.battleHUD.updatePoisonStatus(this.statusEffectManager.isPoisoned());

    // カウント停止チェック
    if (this.statusEffectManager.isEnemyCounterFrozen()) {
      const released = this.statusEffectManager.tickEnemyCounterFreeze();
      if (released) {
        this.battleHUD.setEnemyCounterFrozen(false);
      } else {
        this.battleHUD.setEnemyCounterFrozen(
          true,
          this.statusEffectManager.getEnemyCounterFreezeRemaining()
        );
      }
      this.callbacks.updateHUD();
      // 敵アクションなしのため、0.25秒後に毒ダメージ処理
      this.scene.time.delayedCall(250, () => {
        this.processPoisonDamage(tickResult.poisonDamage, onComplete);
      });
      return;
    }

    // 2. 敵アクション判定（カウンターをデクリメントする前に判定）
    const enemyAttackCounter = this.callbacks.getEnemyAttackCounter();
    const enemySkillCounter = this.callbacks.getEnemySkillCounter();
    const enemyId = this.callbacks.getEnemyId();

    const hasNormalAttack = (enemyAttackCounter - 1) <= 0;
    const skillDef = getEnemySkill(enemyId);
    const hasSkill = (enemySkillCounter - 1) <= 0 && skillDef !== undefined;
    const hasEnemyAction = hasNormalAttack || hasSkill;

    // カウンターデクリメント
    this.callbacks.setEnemyAttackCounter(enemyAttackCounter - 1);
    this.callbacks.setEnemySkillCounter(enemySkillCounter - 1);
    this.callbacks.updateHUD();

    // 敵アクションがなければ0.25秒後に毒ダメージ処理
    if (!hasEnemyAction) {
      this.scene.time.delayedCall(250, () => {
        this.processPoisonDamage(tickResult.poisonDamage, onComplete);
      });
      return;
    }

    // 3. 敵アクション実行（オーバーレイ付き）
    const boardOffset = this.boardModel.getBoardOffset();
    this.effectManager.showEnemyActionOverlay(boardOffset.x, boardOffset.y);

    // オーバーレイ表示後に敵アクションを順次実行
    this.scene.time.delayedCall(300, () => {
      if (this.callbacks.isEnemyDefeated()) {
        this.effectManager.destroyEnemyActionOverlay();
        return;
      }

      // 通常攻撃フェーズ
      const afterNormalAttack = () => {
        if (this.callbacks.isEnemyDefeated()) {
          this.effectManager.destroyEnemyActionOverlay();
          return;
        }

        // スキルフェーズ
        if (hasSkill && skillDef) {
          this.callbacks.setEnemySkillCounter(this.callbacks.getEnemySkillInterval());

          this.scene.time.delayedCall(400, () => {
            if (this.callbacks.isEnemyDefeated()) {
              this.effectManager.destroyEnemyActionOverlay();
              return;
            }

            // スキル名演出（テキストのみ先行表示）
            this.effectManager.showEnemySkillText(skillDef.name, skillDef.effectType);

            // テキスト表示後にフラッシュ+SE+スキル効果を同時発動
            this.scene.time.delayedCall(300, () => {
              if (this.callbacks.isEnemyDefeated()) {
                this.effectManager.destroyEnemyActionOverlay();
                return;
              }

              this.effectManager.flashEnemySkill(skillDef.effectType);
              if (skillDef.skillSe) {
                SoundManager.getInstance().playSE(skillDef.skillSe);
              }

              const result = this.enemySkillExecutor.execute(
                skillDef,
                this.callbacks.getEnemyNormalAttack()
              );

              // 効果結果に応じた追加処理
              if (result.damage) {
                const newHp = Math.max(0, this.callbacks.getPlayerHp() - result.damage);
                this.callbacks.setPlayerHp(newHp);
                this.callbacks.updateHUD();
                this.scene.game.events.emit(GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP, { damage: result.damage });
                this.scene.cameras.main.shake(200, 0.015);
                this.effectManager.shakeBoardEffect(
                  this.boardModel.getRawBoard() as (Tile | null)[][],
                  this.boardModel.offsetX,
                  this.boardModel.offsetY
                );
                if (this.checkPlayerDefeat()) {
                  this.effectManager.destroyEnemyActionOverlay();
                  return;
                }
              }

              if (result.poison) {
                this.statusEffectManager.applyPoison(result.poison.duration, result.poison.damagePerTurn);
                this.battleHUD.updatePoisonStatus(true);
              }

              if (result.tileLock) {
                this.statusEffectManager.applyTileLock(result.tileLock.tiles, result.tileLock.duration);
                this.statusEffectController.showTileLockOverlays(result.tileLock.tiles);
              }

              if (result.ojamaConvert) {
                this.statusEffectController.applyOjamaConvert(result.ojamaConvert.tiles);
              }

              if (result.freeze) {
                this.statusEffectController.applyFreeze(result.freeze.tiles);
              }

              if (result.poisonConvert) {
                this.statusEffectController.applyPoisonConvert(result.poisonConvert.tiles);
                // 毒パネル生成フラグを立てる（チュートリアル表示はターン完了後）
                this.hasPoisonConvertThisTurn = true;
              }

              // スキル完了後にオーバーレイ非表示→0.25秒後に毒ダメージ処理
              this.scene.time.delayedCall(300, () => {
                this.effectManager.hideEnemyActionOverlay(() => {
                  this.scene.time.delayedCall(250, () => {
                    this.processPoisonDamage(tickResult.poisonDamage, onComplete);
                  });
                });
              });
            });
          });
        } else {
          // スキルなし: 通常攻撃のみ完了後にオーバーレイ非表示→0.25秒後に毒ダメージ処理
          this.scene.time.delayedCall(300, () => {
            this.effectManager.hideEnemyActionOverlay(() => {
              this.scene.time.delayedCall(250, () => {
                this.processPoisonDamage(tickResult.poisonDamage, onComplete);
              });
            });
          });
        }
      };

      if (hasNormalAttack) {
        this.callbacks.setEnemyAttackCounter(this.callbacks.getEnemyAttackInterval());
        this.enemyNormalAttackAction();
        if (this.checkPlayerDefeat()) {
          this.effectManager.destroyEnemyActionOverlay();
          return;
        }
        // 通常攻撃のカメラエフェクト後にスキルフェーズへ
        this.scene.time.delayedCall(400, afterNormalAttack);
      } else {
        // 通常攻撃なし: スキルフェーズへ直行
        afterNormalAttack();
      }
    });
  }

  /**
   * 毒ダメージ処理（ターン最後に実行）
   * @param statusPoisonDamage 状態異常の毒によるダメージ
   * @param onComplete 完了コールバック
   */
  private processPoisonDamage(statusPoisonDamage: number, onComplete: () => void): void {
    // 毒パネル生成があった場合、完了時にイベントを発行するようラップ
    const wrappedOnComplete = () => {
      if (this.hasPoisonConvertThisTurn) {
        this.scene.game.events.emit(GameBridgeEvents.POISON_PANEL_SPAWNED);
        this.hasPoisonConvertThisTurn = false;
      }
      onComplete();
    };

    if (this.callbacks.isEnemyDefeated()) {
      wrappedOnComplete();
      return;
    }

    // 状態異常の毒ダメージ処理
    if (statusPoisonDamage > 0) {
      const newHp = Math.max(0, this.callbacks.getPlayerHp() - statusPoisonDamage);
      this.callbacks.setPlayerHp(newHp);
      this.callbacks.updateHUD();
      this.scene.game.events.emit(GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP, { damage: statusPoisonDamage });
      this.scene.cameras.main.flash(200, 60, 160, 60); // 緑色フラッシュ
      this.scene.cameras.main.shake(100, 0.005);
      if (this.checkPlayerDefeat()) return;
    }

    // 毒オーブダメージ処理（盤面上の毒オーブによるダメージ）
    const poisonOrbCount = this.statusEffectController.countPoisonOrbs();
    if (poisonOrbCount > 0) {
      // 状態異常の毒ダメージがあった場合は少し待ってから処理
      const delay = statusPoisonDamage > 0 ? 300 : 0;
      this.scene.time.delayedCall(delay, () => {
        if (this.callbacks.isEnemyDefeated()) {
          wrappedOnComplete();
          return;
        }
        // 最大HPの1% × 毒オーブ数（小数点以下切り上げ）
        const poisonOrbDamage = Math.ceil(this.callbacks.getPlayerMaxHp() * 0.01 * poisonOrbCount);
        const newHp = Math.max(0, this.callbacks.getPlayerHp() - poisonOrbDamage);
        this.callbacks.setPlayerHp(newHp);
        this.callbacks.updateHUD();
        this.scene.game.events.emit(GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP, { damage: poisonOrbDamage });
        this.scene.cameras.main.flash(200, 80, 40, 100); // 紫色フラッシュ
        this.scene.cameras.main.shake(100, 0.005);
        if (this.checkPlayerDefeat()) return;
        wrappedOnComplete();
      });
    } else {
      wrappedOnComplete();
    }
  }

  /**
   * 敵の通常攻撃
   */
  private enemyNormalAttackAction(): void {
    const damage = this.callbacks.getEnemyNormalAttack();
    const newHp = Math.max(0, this.callbacks.getPlayerHp() - damage);
    this.callbacks.setPlayerHp(newHp);
    this.callbacks.updateHUD();
    this.scene.game.events.emit(GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP, { damage });

    this.scene.cameras.main.flash(200, 160, 60, 60);
    this.scene.cameras.main.shake(150, 0.01);
    SoundManager.getInstance().playSE(SoundKeys.DAMAGED);
  }

  /**
   * プレイヤーHP<=0チェック（敗北判定）
   * @returns 敗北した場合true
   */
  private checkPlayerDefeat(): boolean {
    if (this.callbacks.getPlayerHp() <= 0) {
      this.scene.time.delayedCall(500, () => {
        this.callbacks.emitBattleEnd(false);
      });
      return true;
    }
    return false;
  }
}
