import Phaser from 'phaser';
import { GameBridgeEvents } from '../../ui/GameBridge';
import { BOARD_COLS, BOARD_ROWS, TILE_SIZE, EnemySkillDef } from '../../types';

/**
 * 敵情報インターフェース（ツールチップ表示用）
 */
export interface EnemyInfo {
  normalAttack: number;
  attackInterval: number;
  skillDef?: EnemySkillDef;
}

/**
 * BattleHUD - バトル画面のUIデータブリッジ
 *
 * Phase 0〜7でPhaser描画はHTML/CSSに移行済み。
 * 現在は GameBridge 経由で HTML HUD にイベント通知するラッパーと、
 * ActionCountDisplay（Phaser描画、ActionSystem連携用）を管理する。
 */
export class BattleHUD {
  private scene: Phaser.Scene;

  // 互換用ダミーコンテナ（CombatEffectsのシグネチャ維持用）
  private _enemyContainer!: Phaser.GameObjects.Container;
  private _enemyContainerBaseX = 0;
  private _enemyContainerBaseY = 0;

  get enemyContainer(): Phaser.GameObjects.Container {
    return this._enemyContainer;
  }

  get enemyContainerBaseX(): number {
    return this._enemyContainerBaseX;
  }

  get enemyContainerBaseY(): number {
    return this._enemyContainerBaseY;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * バトルUIを作成
   * Phaser描画はHTML/CSSに移行済み。GameBridge経由でHTML HUDに初期化データを送信する。
   */
  createBattleUI(
    width: number,
    boardOffsetX: number,
    boardOffsetY: number,
    playerHp: number,
    playerMaxHp: number,
    enemyHp: number,
    enemyMaxHp: number,
    enemySkillCounter: number,
    enemyAttackCounter: number,
    enemyInfo: EnemyInfo
  ): void {
    // 互換用ダミーコンテナ（ActionEffectHandler経由でCombatEffectsに渡される）
    const containerCenterX = width / 2;
    const containerCenterY = 230;
    this._enemyContainerBaseX = containerCenterX;
    this._enemyContainerBaseY = containerCenterY;
    this._enemyContainer = this.scene.add.container(containerCenterX, containerCenterY);
    this._enemyContainer.setVisible(false);

    // GameBridge経由でHTML HUDに初期化データを送信
    this.scene.game.events.emit(GameBridgeEvents.BATTLE_HUD_INIT, {
      playerHp,
      playerMaxHp,
      enemyHp,
      enemyMaxHp,
      enemyAttackCounter,
      enemySkillCounter,
      enemyInfo,
      boardGeometry: {
        offsetX: boardOffsetX - 15,
        offsetY: boardOffsetY - 15,
        width: BOARD_COLS * TILE_SIZE + 30,
        height: BOARD_ROWS * TILE_SIZE + 30,
        gameWidth: width,
        gameHeight: this.scene.cameras.main.height,
      },
    });
  }

  /**
   * アクションカウントUIを更新（3カラム表示）
   */
  updateActionCountUI(
    attackDisplay: { triggers: number; remainder: number; threshold: number },
    skillDisplay: { triggers: number; remainder: number; threshold: number },
    healDisplay: { triggers: number; remainder: number; threshold: number }
  ): void {
    // GameBridge経由でHTML HUDに通知
    this.scene.game.events.emit(GameBridgeEvents.ACTION_COUNT_UPDATE, {
      attack: attackDisplay,
      skill: skillDisplay,
      heal: healDisplay,
    });
  }

  /**
   * HPバーを更新（GameBridge経由のみ）
   */
  updateHpBars(
    playerHp: number,
    playerMaxHp: number,
    enemyHp: number,
    enemyMaxHp: number,
    enemySkillCounter: number,
    enemyAttackCounter: number
  ): void {
    // GameBridge経由でHTML HUDに通知
    this.scene.game.events.emit(GameBridgeEvents.HP_UPDATE, {
      playerHp,
      playerMaxHp,
      enemyHp,
      enemyMaxHp,
    });
    this.scene.game.events.emit(GameBridgeEvents.COUNTER_UPDATE, {
      attackCounter: enemyAttackCounter,
      skillCounter: enemySkillCounter,
    });
  }

  /**
   * 毒ステータス表示を更新（GameBridge経由のみ）
   */
  updatePoisonStatus(isPoisoned: boolean): void {
    this.scene.game.events.emit(GameBridgeEvents.POISON_UPDATE, { isPoisoned });
  }

  /**
   * 敵カウンター停止状態のUI切り替え（GameBridge経由のみ）
   */
  setEnemyCounterFrozen(frozen: boolean, remainingTurns: number = 0): void {
    this.scene.game.events.emit(GameBridgeEvents.COUNTER_FROZEN, { frozen, remainingTurns });
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    // HTML HUDのクリーンアップはBattleHUDScreenが担当
  }
}
