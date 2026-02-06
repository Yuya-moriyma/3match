/**
 * UIManager - HTML UIの表示/非表示、シーン遷移を管理
 *
 * 責務:
 * - 画面（Screen）のライフサイクル管理
 * - Phaserシーンとの連携（イベント通信）
 * - 画面遷移アニメーション
 * - グローバル状態（音量設定など）の管理
 */

import { BaseScreen } from './screens/BaseScreen';
import { GameBridge, GameBridgeEvents, BattleStartData, BattleResultData } from './GameBridge';
import { BattleHUDScreen } from './screens/BattleHUDScreen';
import { BattleEffectsScreen } from './screens/BattleEffectsScreen';
import { SoundManager } from '../utils/SoundManager';

export type ScreenName =
  | 'userName'
  | 'title'
  | 'menu'
  | 'battlePrep'
  | 'story'
  | 'settings'
  | 'showcase'
  | 'panelGallery'
  | 'themeGallery'
  | 'quest'
  | 'result';

export interface UIManagerConfig {
  container: HTMLElement;
  phaserGame: Phaser.Game | null;
}

export class UIManager {
  private static instance: UIManager | null = null;

  private container: HTMLElement;
  private screens: Map<ScreenName, BaseScreen> = new Map();
  private currentScreen: ScreenName | null = null;
  private phaserGame: Phaser.Game | null = null;
  private gameBridge: GameBridge;
  private isBattleStarting: boolean = false;
  private battleHUDScreen: BattleHUDScreen | null = null;
  private battleEffectsScreen: BattleEffectsScreen | null = null;
  private resizeHandler: (() => void) | null = null;

  private constructor(config: UIManagerConfig) {
    this.container = config.container;
    this.phaserGame = config.phaserGame;
    this.gameBridge = new GameBridge();

    // GameBridgeにPhaserゲームインスタンスを設定
    if (this.phaserGame) {
      this.gameBridge.setPhaserGame(this.phaserGame);
    }

    this.setupEventListeners();
    this.setupCanvasSync();
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      throw new Error('UIManager has not been initialized. Call UIManager.init() first.');
    }
    return UIManager.instance;
  }

  /**
   * UIManagerを初期化
   */
  public static init(config: UIManagerConfig): UIManager {
    if (UIManager.instance) {
      console.warn('UIManager is already initialized.');
      return UIManager.instance;
    }
    UIManager.instance = new UIManager(config);
    return UIManager.instance;
  }

  /**
   * Phaserゲームインスタンスを設定
   */
  public setPhaserGame(game: Phaser.Game): void {
    this.phaserGame = game;
    this.gameBridge.setPhaserGame(game);
  }

  /**
   * 画面を登録
   */
  public registerScreen(name: ScreenName, screen: BaseScreen): void {
    this.screens.set(name, screen);
    screen.setManager(this);

    // 画面要素をコンテナに追加
    const element = screen.getElement();
    if (element && !this.container.contains(element)) {
      this.container.appendChild(element);
    }
  }

  /**
   * 画面を表示
   */
  public async showScreen(name: ScreenName, data?: unknown): Promise<void> {
    const screen = this.screens.get(name);
    if (!screen) {
      console.error(`Screen "${name}" is not registered.`);
      return;
    }

    // 現在の画面を非表示
    if (this.currentScreen && this.currentScreen !== name) {
      await this.hideScreen(this.currentScreen);
    }

    // Phaserキャンバスを非表示（バトル以外）
    this.setPhaserVisibility(false);

    // 新しい画面を表示
    this.currentScreen = name;
    await screen.show(data);
  }

  /**
   * 画面を非表示
   */
  public async hideScreen(name: ScreenName): Promise<void> {
    const screen = this.screens.get(name);
    if (!screen) {
      return;
    }

    await screen.hide();

    if (this.currentScreen === name) {
      this.currentScreen = null;
    }
  }

  /**
   * 全てのUI画面を非表示にしてPhaserを表示
   */
  public async showPhaserOnly(): Promise<void> {
    // 全画面を非表示
    for (const [name] of this.screens) {
      await this.hideScreen(name);
    }

    // Phaserキャンバスを表示
    this.setPhaserVisibility(true);
  }

  /**
   * バトルを開始
   */
  public async startBattle(data: BattleStartData): Promise<void> {
    // 連打ガード: 既にバトル開始処理中なら無視
    if (this.isBattleStarting) {
      return;
    }
    this.isBattleStarting = true;

    await this.showBattleMode();
    this.gameBridge.startBattle(data);
  }

  /**
   * 戦闘モード表示: Phaserキャンバス + BattleHUDScreen を表示
   */
  private async showBattleMode(): Promise<void> {
    // 全画面を即非表示（フェードアウトなし）
    for (const [name, screen] of this.screens) {
      await screen.hideImmediate();
      if (this.currentScreen === name) {
        this.currentScreen = null;
      }
    }

    // Phaserキャンバスを表示
    this.setPhaserVisibility(true);

    // BattleEffectsScreenを生成・表示
    this.battleEffectsScreen = new BattleEffectsScreen(this.container, this.gameBridge);
    this.battleEffectsScreen.show();

    // BattleHUDScreenを生成・表示
    this.battleHUDScreen = new BattleHUDScreen(this.container, this.gameBridge);
    this.battleHUDScreen.show();
  }

  /**
   * 戦闘モード終了: BattleHUDScreenを破棄
   */
  private endBattleMode(): void {
    // Effectsを先に破棄（HUDが一瞬見える → 自然な遷移）
    if (this.battleEffectsScreen) {
      this.battleEffectsScreen.hide();
      this.battleEffectsScreen.destroy();
      this.battleEffectsScreen = null;
    }
    if (this.battleHUDScreen) {
      this.battleHUDScreen.hide();
      this.battleHUDScreen.destroy();
      this.battleHUDScreen = null;
    }
  }

  /**
   * Phaserキャンバスの表示/非表示を切り替え
   */
  private setPhaserVisibility(visible: boolean): void {
    const canvas = this.phaserGame?.canvas;
    if (canvas) {
      canvas.style.visibility = visible ? 'visible' : 'hidden';
      canvas.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // Phaserからのバトル終了イベントを購読
    this.gameBridge.on(GameBridgeEvents.BATTLE_END, (result: BattleResultData) => {
      this.isBattleStarting = false;
      this.endBattleMode();
      this.showScreen('result', result);
    });

    // Phaserからのシーン遷移要求を購読
    this.gameBridge.on(GameBridgeEvents.REQUEST_SCREEN, (screenName: ScreenName) => {
      this.isBattleStarting = false;
      this.endBattleMode();
      this.showScreen(screenName);
    });

    // 設定変更イベントを購読
    this.gameBridge.on(GameBridgeEvents.SETTINGS_CHANGED, (settings: Record<string, unknown>) => {
      this.handleSettingsChanged(settings);
    });
  }

  /**
   * 設定変更を処理
   */
  private handleSettingsChanged(settings: Record<string, unknown>): void {
    const soundManager = SoundManager.getInstance();

    if (typeof settings.bgmVolume === 'number') {
      soundManager.setBGMVolume(settings.bgmVolume);
    }

    if (typeof settings.seVolume === 'number') {
      soundManager.setSEVolume(settings.seVolume);
    }
  }

  /**
   * GameBridgeを取得
   */
  public getGameBridge(): GameBridge {
    return this.gameBridge;
  }

  /**
   * 現在の画面名を取得
   */
  public getCurrentScreen(): ScreenName | null {
    return this.currentScreen;
  }

  /**
   * コンテナ要素を取得
   */
  public getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * #ui-layerをPhaserキャンバスの位置・サイズに同期する設定
   */
  private setupCanvasSync(): void {
    if (!this.phaserGame) return;

    const sync = () => this.syncUILayerToCanvas();

    if (this.phaserGame.isBooted) {
      requestAnimationFrame(sync);
    } else {
      this.phaserGame.events.once('ready', () => {
        requestAnimationFrame(sync);
      });
    }

    this.resizeHandler = () => requestAnimationFrame(sync);
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * #ui-layerの位置・サイズをPhaserキャンバスに合わせる
   */
  private syncUILayerToCanvas(): void {
    const canvas = this.phaserGame?.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    this.container.style.left = `${rect.left}px`;
    this.container.style.top = `${rect.top}px`;
    this.container.style.width = `${rect.width}px`;
    this.container.style.height = `${rect.height}px`;
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    for (const screen of this.screens.values()) {
      screen.destroy();
    }
    this.screens.clear();
    this.gameBridge.destroy();
    UIManager.instance = null;
  }
}
