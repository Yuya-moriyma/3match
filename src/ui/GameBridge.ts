/**
 * GameBridge - UIManagerとPhaserシーン間の通信を管理
 *
 * イベントベース通信:
 * - UIManager → Phaser: カスタムイベントでシーン開始を通知
 * - Phaser → UIManager: ゲーム終了時にリザルト画面表示を要求
 *
 * 共有データ:
 * - キャラクター選択情報
 * - ゲーム結果
 * - 設定値（音量など）
 */

import type { ScreenName } from './UIManager';
import type { EnemyConfig } from '../types/story';

/**
 * バトル開始時に渡すデータ
 */
export interface BattleStartData {
  stageId: string;
  characterId: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  /** ストーリーモード用: 敵データ */
  enemyConfig?: EnemyConfig;
  /** ストーリーモード用: 節ID */
  sectionId?: string;
  /** クエストモード用: クエストID */
  questId?: string;
  /** プレイヤーレベル */
  playerLevel?: number;
  /** 獲得経験値 */
  expReward?: number;
}

/**
 * バトル結果データ
 */
export interface BattleResultData {
  victory: boolean;
  score: number;
  turns: number;
  maxCombo: number;
  stageId: string;
  characterId: string;
  /** ストーリーモード用: 節ID */
  sectionId?: string;
  /** バトルがあったかどうか（会話のみの節ではfalse） */
  hasBattle?: boolean;
  /** クエストモード用: クエストID */
  questId?: string;
  /** 獲得経験値 */
  expReward?: number;
  /** ドロップした装備品ID（nullは入手なし） */
  droppedEquipmentId?: string | null;
}

/**
 * GameBridgeで使用するイベント名
 */
export const GameBridgeEvents = {
  // UIManager → Phaser
  BATTLE_START: 'gameBridge:battleStart',
  SCENE_CHANGE: 'gameBridge:sceneChange',

  // Phaser → UIManager
  BATTLE_END: 'gameBridge:battleEnd',
  REQUEST_SCREEN: 'gameBridge:requestScreen',

  // 共通
  SETTINGS_CHANGED: 'gameBridge:settingsChanged',

  // === 戦闘HUD用イベント ===

  // Phaser → HTML（状態通知）
  BATTLE_HUD_INIT: 'gameBridge:battleHudInit',
  HP_UPDATE: 'gameBridge:hpUpdate',
  COUNTER_UPDATE: 'gameBridge:counterUpdate',
  ACTION_COUNT_UPDATE: 'gameBridge:actionCountUpdate',
  ACTION_COUNT_ANIMATE: 'gameBridge:actionCountAnimate',
  POISON_UPDATE: 'gameBridge:poisonUpdate',
  COUNTER_FROZEN: 'gameBridge:counterFrozen',
  SHOW_DAMAGE_POPUP: 'gameBridge:showDamagePopup',
  SHOW_PLAYER_DAMAGE_POPUP: 'gameBridge:showPlayerDamagePopup',
  ENEMY_SHAKE: 'gameBridge:enemyShake',
  ENEMY_DEATH: 'gameBridge:enemyDeath',
  SHOW_SKILL_TEXT: 'gameBridge:showSkillText',
  SHOW_NO_TARGET: 'gameBridge:showNoTarget',
  SHOW_ACTION_TEXT: 'gameBridge:showActionText',
  SHOW_CHAIN_TEXT: 'gameBridge:showChainText',
  SHOW_TOOLTIP: 'gameBridge:showTooltip',
  HIDE_TOOLTIP: 'gameBridge:hideTooltip',
  BATTLE_READY: 'gameBridge:battleReady',
  BATTLE_START_EFFECT: 'gameBridge:battleStartEffect',

  // HTML → Phaser（ユーザー操作・完了通知）
  PAUSE_TOGGLE: 'gameBridge:pauseToggle',
  RESUME: 'gameBridge:resume',
  RETIRE: 'gameBridge:retire',
  VOLUME_CHANGE: 'gameBridge:volumeChange',
  SKILL_TEXT_COMPLETE: 'gameBridge:skillTextComplete',
  ENEMY_DEATH_COMPLETE: 'gameBridge:enemyDeathComplete',
  BATTLE_START_EFFECT_COMPLETE: 'gameBridge:battleStartEffectComplete',
  TUTORIAL_CLOSED: 'gameBridge:tutorialClosed',

  // Phaser → HTML（チュートリアル用）
  POISON_PANEL_SPAWNED: 'gameBridge:poisonPanelSpawned',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

export class GameBridge {
  private phaserGame: Phaser.Game | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Phaserゲームインスタンスを設定
   */
  public setPhaserGame(game: Phaser.Game): void {
    this.phaserGame = game;
    this.setupPhaserEventListeners();
  }

  /**
   * Phaserイベントリスナーを設定
   */
  private setupPhaserEventListeners(): void {
    if (!this.phaserGame) return;

    // Phaserのイベントエミッターを購読
    this.phaserGame.events.on(GameBridgeEvents.BATTLE_END, (result: BattleResultData) => {
      this.emit(GameBridgeEvents.BATTLE_END, result);
    });

    this.phaserGame.events.on(GameBridgeEvents.REQUEST_SCREEN, (screenName: ScreenName) => {
      this.emit(GameBridgeEvents.REQUEST_SCREEN, screenName);
    });

    // --- 戦闘HUD: Phaser → HTML 方向のイベント中継 ---
    const phaserToHtmlEvents = [
      GameBridgeEvents.BATTLE_HUD_INIT,
      GameBridgeEvents.HP_UPDATE,
      GameBridgeEvents.COUNTER_UPDATE,
      GameBridgeEvents.ACTION_COUNT_UPDATE,
      GameBridgeEvents.ACTION_COUNT_ANIMATE,
      GameBridgeEvents.POISON_UPDATE,
      GameBridgeEvents.COUNTER_FROZEN,
      GameBridgeEvents.SHOW_DAMAGE_POPUP,
      GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP,
      GameBridgeEvents.ENEMY_SHAKE,
      GameBridgeEvents.ENEMY_DEATH,
      GameBridgeEvents.SHOW_SKILL_TEXT,
      GameBridgeEvents.SHOW_NO_TARGET,
      GameBridgeEvents.SHOW_ACTION_TEXT,
      GameBridgeEvents.SHOW_CHAIN_TEXT,
      GameBridgeEvents.SHOW_TOOLTIP,
      GameBridgeEvents.HIDE_TOOLTIP,
      GameBridgeEvents.BATTLE_READY,
      GameBridgeEvents.BATTLE_START_EFFECT,
      GameBridgeEvents.POISON_PANEL_SPAWNED,
    ] as const;

    for (const event of phaserToHtmlEvents) {
      this.phaserGame.events.on(event, (...args: unknown[]) => {
        this.emit(event, ...args);
      });
    }

    // --- 戦闘HUD: HTML → Phaser 方向のイベント中継 ---
    const htmlToPhaserEvents = [
      GameBridgeEvents.PAUSE_TOGGLE,
      GameBridgeEvents.RESUME,
      GameBridgeEvents.RETIRE,
      GameBridgeEvents.VOLUME_CHANGE,
      GameBridgeEvents.SKILL_TEXT_COMPLETE,
      GameBridgeEvents.ENEMY_DEATH_COMPLETE,
      GameBridgeEvents.BATTLE_START_EFFECT_COMPLETE,
      GameBridgeEvents.TUTORIAL_CLOSED,
    ] as const;

    for (const event of htmlToPhaserEvents) {
      this.on(event, (...args: unknown[]) => {
        this.phaserGame?.events.emit(event, ...args);
      });
    }
  }

  /**
   * バトルを開始
   */
  public startBattle(data: BattleStartData): void {
    if (!this.phaserGame) {
      console.error('Phaser game is not set.');
      return;
    }

    // BattleSceneを開始
    const scene = this.phaserGame.scene.getScene('BattleScene');
    if (scene) {
      // シーンが既に実行中の場合は再起動
      if (scene.scene.isActive()) {
        scene.scene.restart(data);
      } else {
        scene.scene.start('BattleScene', data);
      }
    } else {
      // シーンがまだ追加されていない場合は開始
      this.phaserGame.scene.start('BattleScene', data);
    }

    // イベントを発行
    this.phaserGame.events.emit(GameBridgeEvents.BATTLE_START, data);
  }

  /**
   * Phaserシーンを変更
   */
  public changeScene(sceneName: string, data?: unknown): void {
    if (!this.phaserGame) {
      console.error('Phaser game is not set.');
      return;
    }

    this.phaserGame.scene.start(sceneName, data as object | undefined);
    this.phaserGame.events.emit(GameBridgeEvents.SCENE_CHANGE, { sceneName, data });
  }

  /**
   * イベントリスナーを登録
   */
  public on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * イベントリスナーを解除
   */
  public off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * イベントを発行
   */
  public emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(...args));
    }
  }

  /**
   * 設定変更を通知
   */
  public notifySettingsChanged(settings: Record<string, unknown>): void {
    if (this.phaserGame) {
      this.phaserGame.events.emit(GameBridgeEvents.SETTINGS_CHANGED, settings);
    }
    this.emit(GameBridgeEvents.SETTINGS_CHANGED, settings);
  }

  /**
   * Phaserゲームインスタンスを取得
   */
  public getPhaserGame(): Phaser.Game | null {
    return this.phaserGame;
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    this.eventListeners.clear();

    if (this.phaserGame) {
      // 既存イベント
      this.phaserGame.events.off(GameBridgeEvents.BATTLE_END);
      this.phaserGame.events.off(GameBridgeEvents.REQUEST_SCREEN);

      // 戦闘HUD: Phaser → HTML
      this.phaserGame.events.off(GameBridgeEvents.BATTLE_HUD_INIT);
      this.phaserGame.events.off(GameBridgeEvents.HP_UPDATE);
      this.phaserGame.events.off(GameBridgeEvents.COUNTER_UPDATE);
      this.phaserGame.events.off(GameBridgeEvents.ACTION_COUNT_UPDATE);
      this.phaserGame.events.off(GameBridgeEvents.ACTION_COUNT_ANIMATE);
      this.phaserGame.events.off(GameBridgeEvents.POISON_UPDATE);
      this.phaserGame.events.off(GameBridgeEvents.COUNTER_FROZEN);
      this.phaserGame.events.off(GameBridgeEvents.SHOW_DAMAGE_POPUP);
      this.phaserGame.events.off(GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP);
      this.phaserGame.events.off(GameBridgeEvents.ENEMY_SHAKE);
      this.phaserGame.events.off(GameBridgeEvents.ENEMY_DEATH);
      this.phaserGame.events.off(GameBridgeEvents.SHOW_SKILL_TEXT);
      this.phaserGame.events.off(GameBridgeEvents.SHOW_NO_TARGET);
      this.phaserGame.events.off(GameBridgeEvents.SHOW_ACTION_TEXT);
      this.phaserGame.events.off(GameBridgeEvents.SHOW_CHAIN_TEXT);
      this.phaserGame.events.off(GameBridgeEvents.SHOW_TOOLTIP);
      this.phaserGame.events.off(GameBridgeEvents.HIDE_TOOLTIP);
      this.phaserGame.events.off(GameBridgeEvents.BATTLE_READY);
      this.phaserGame.events.off(GameBridgeEvents.BATTLE_START_EFFECT);
      this.phaserGame.events.off(GameBridgeEvents.POISON_PANEL_SPAWNED);
    }

    this.phaserGame = null;
  }
}
