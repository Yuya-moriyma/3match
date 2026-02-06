/**
 * BaseScreen - 全てのUI画面の基底クラス
 *
 * 責務:
 * - DOM要素の生成と管理
 * - 表示/非表示アニメーション
 * - ライフサイクルメソッドの提供
 */

import type { UIManager } from '../UIManager';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';

export abstract class BaseScreen {
  protected element: HTMLElement | null = null;
  protected manager: UIManager | null = null;
  protected isVisible: boolean = false;
  private isNavigating: boolean = false;

  /**
   * UIManagerを設定
   */
  public setManager(manager: UIManager): void {
    this.manager = manager;
  }

  /**
   * DOM要素を取得（遅延初期化）
   */
  public getElement(): HTMLElement {
    if (!this.element) {
      this.element = this.createElement();
      this.setupEventHandlers();
    }
    return this.element;
  }

  /**
   * 画面を表示
   */
  public async show(data?: unknown): Promise<void> {
    if (this.isVisible) return;

    const element = this.getElement();

    this.isNavigating = false;

    // 表示前のコールバック
    await this.onBeforeShow(data);

    // 表示アニメーション
    element.classList.add('active');
    this.isVisible = true;

    // 表示後のコールバック
    await this.onAfterShow(data);
  }

  /**
   * 画面を非表示
   */
  public async hide(): Promise<void> {
    if (!this.isVisible) return;

    const element = this.getElement();

    // 非表示前のコールバック
    await this.onBeforeHide();

    // 非表示アニメーション
    element.classList.remove('active');
    this.isVisible = false;

    // 非表示後のコールバック
    await this.onAfterHide();
  }

  /**
   * 画面を即座に非表示（トランジションなし）
   */
  public async hideImmediate(): Promise<void> {
    if (!this.isVisible) return;

    const element = this.getElement();

    await this.onBeforeHide();

    // トランジションを無効化して即非表示
    element.style.transition = 'none';
    element.classList.remove('active');
    this.isVisible = false;

    // 強制リフローで即反映
    void element.offsetHeight;
    element.style.transition = '';

    await this.onAfterHide();
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.manager = null;
    this.isVisible = false;
  }

  /**
   * DOM要素を生成（サブクラスで実装必須）
   */
  protected abstract createElement(): HTMLElement;

  /**
   * イベントハンドラを設定（サブクラスでオーバーライド可）
   */
  protected setupEventHandlers(): void {
    // サブクラスで実装
  }

  /**
   * 表示前のコールバック（サブクラスでオーバーライド可）
   */
  protected async onBeforeShow(_data?: unknown): Promise<void> {
    // サブクラスで実装
  }

  /**
   * 表示後のコールバック（サブクラスでオーバーライド可）
   */
  protected async onAfterShow(_data?: unknown): Promise<void> {
    // サブクラスで実装
  }

  /**
   * 非表示前のコールバック（サブクラスでオーバーライド可）
   */
  protected async onBeforeHide(): Promise<void> {
    // サブクラスで実装
  }

  /**
   * 非表示後のコールバック（サブクラスでオーバーライド可）
   */
  protected async onAfterHide(): Promise<void> {
    // サブクラスで実装
  }

  /**
   * 他の画面に遷移
   */
  protected navigateTo(
    screenName: Parameters<UIManager['showScreen']>[0],
    data?: unknown
  ): void {
    if (this.isNavigating || !this.manager) return;
    this.isNavigating = true;
    SoundManager.getInstance().playSE(SoundKeys.BUTTON_CHANGE_PAGE);
    this.manager.showScreen(screenName, data);
  }

  /**
   * バトルを開始
   */
  protected startBattle(data: Parameters<UIManager['startBattle']>[0]): void {
    if (this.isNavigating || !this.manager) return;
    this.isNavigating = true;
    SoundManager.getInstance().playSE(SoundKeys.BUTTON_CHANGE_PAGE);
    this.manager.startBattle(data);
  }

  /**
   * ユーティリティ: 要素を作成
   */
  protected createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    textContent?: string
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (className) {
      el.className = className;
    }
    if (textContent) {
      el.textContent = textContent;
    }
    return el;
  }
}
