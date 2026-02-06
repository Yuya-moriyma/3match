/**
 * BattleEffectsScreen - 戦闘エフェクト用HTMLレイヤー
 *
 * 暗転・BATTLE STARTテキスト等の全画面エフェクトを管理する。
 * BattleHUDScreenとは別レイヤー（z-index: 20）で、HUDの上に重なる。
 *
 * ライフサイクル: show() → (バトル中) → hide() → destroy()
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';
import { BattleTextOverlay } from '../components/BattleTextOverlay';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

export class BattleEffectsScreen {
  private container: HTMLElement;
  private gameBridge: GameBridge;
  private rootElement: HTMLElement | null = null;
  private darkenElement: HTMLElement | null = null;
  private eventCleanups: Array<() => void> = [];
  private textOverlay: BattleTextOverlay | null = null;

  constructor(container: HTMLElement, gameBridge: GameBridge) {
    this.container = container;
    this.gameBridge = gameBridge;
  }

  /**
   * エフェクトレイヤーを生成して表示
   */
  public show(): void {
    if (this.rootElement) return;

    this.rootElement = this.createElement();
    this.container.appendChild(this.rootElement);
    this.initComponents();
    this.setupEventListeners();
  }

  /**
   * エフェクトレイヤーを非表示
   */
  public hide(): void {
    if (this.rootElement) {
      this.rootElement.style.display = 'none';
    }
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    if (this.textOverlay) {
      this.textOverlay.destroy();
      this.textOverlay = null;
    }

    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];

    if (this.rootElement) {
      this.rootElement.remove();
      this.rootElement = null;
    }
    this.darkenElement = null;
  }

  /**
   * DOM構造を生成
   */
  private createElement(): HTMLElement {
    const root = document.createElement('div');
    root.id = 'battle-effects-root';

    // 暗転オーバーレイ
    const darken = document.createElement('div');
    darken.className = 'battle-effects__darken';
    root.appendChild(darken);
    this.darkenElement = darken;

    // テキスト演出エリア
    const text = document.createElement('div');
    text.className = 'battle-effects__text';
    root.appendChild(text);

    return root;
  }

  /**
   * サブコンポーネントを初期化
   */
  private initComponents(): void {
    if (!this.rootElement) return;

    const textArea = this.rootElement.querySelector('.battle-effects__text') as HTMLElement;
    this.textOverlay = new BattleTextOverlay(textArea, this.gameBridge);
  }

  /**
   * GameBridgeイベントリスナーを設定
   */
  private setupEventListeners(): void {
    this.listenBridge(GameBridgeEvents.BATTLE_START_EFFECT, () => {
      this.showBattleStartEffect();
    });
  }

  /**
   * バトル開始演出: 暗転 → BATTLE STARTテキスト → フェードアウト
   */
  private showBattleStartEffect(): void {
    if (!this.darkenElement || !this.rootElement) return;

    // 1. 暗転出現（pointer-events: auto でクリック遮断）
    this.darkenElement.classList.add('battle-effects__darken--active');

    // 2. BATTLE STARTテキスト生成
    const textEl = document.createElement('div');
    textEl.className = 'battle-effects__battle-start-text';
    textEl.textContent = 'BATTLE START';
    this.rootElement.appendChild(textEl);

    // 3. アニメーション完了検知
    let completed = false;
    const onComplete = () => {
      if (completed) return;
      completed = true;

      // テキストを削除
      textEl.remove();

      // 暗転フェードアウト
      if (this.darkenElement) {
        this.darkenElement.classList.remove('battle-effects__darken--active');
        this.darkenElement.classList.add('battle-effects__darken--fadeout');

        // フェードアウト完了後にクラスをクリーンアップ
        const onFadeEnd = () => {
          if (this.darkenElement) {
            this.darkenElement.classList.remove('battle-effects__darken--fadeout');
          }
          // 完了通知
          this.gameBridge.emit(GameBridgeEvents.BATTLE_START_EFFECT_COMPLETE);
        };

        this.darkenElement.addEventListener('transitionend', onFadeEnd, { once: true });
        // フォールバック: transition(400ms) + マージン
        setTimeout(onFadeEnd, 600);
      }
    };

    textEl.addEventListener('animationend', onComplete, { once: true });
    // フォールバック: animation(1450ms) + マージン
    setTimeout(onComplete, 1650);
  }

  /**
   * GameBridgeイベントを購読（destroy時に自動解除）
   */
  private listenBridge(event: string, callback: EventCallback): void {
    this.gameBridge.on(event, callback);
    this.eventCleanups.push(() => this.gameBridge.off(event, callback));
  }
}
