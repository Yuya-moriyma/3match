/**
 * TutorialModal - チュートリアルモーダルコンポーネント
 *
 * 初回表示用のチュートリアルを表示するモーダル。
 * 複数ページ対応、ページ切り替えUI付き。
 */

import { getTutorialById, TutorialPage } from '../../data/tutorials';
import { TutorialService } from '../../utils/TutorialService';
import tutorialModalHtml from '../templates/partials/tutorial-modal.html?raw';

export class TutorialModal {
  private static instance: TutorialModal | null = null;

  private overlay: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private currentPage: number = 0;
  private pages: TutorialPage[] = [];
  private tutorialId: string = '';
  private onCloseCallback: (() => void) | undefined;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): TutorialModal {
    if (!TutorialModal.instance) {
      TutorialModal.instance = new TutorialModal();
    }
    return TutorialModal.instance;
  }

  /**
   * チュートリアルを表示
   * @param tutorialId チュートリアルID
   * @param onClose 閉じた時のコールバック
   * @returns 表示したかどうか（既に表示済みの場合はfalse）
   */
  show(tutorialId: string, onClose?: () => void): boolean {
    // 既に表示済みならスキップ
    if (TutorialService.getInstance().isCompleted(tutorialId)) {
      console.log('[TutorialModal] Tutorial already completed:', tutorialId);
      onClose?.();
      return false;
    }

    // チュートリアル定義を取得
    const tutorial = getTutorialById(tutorialId);
    if (!tutorial) {
      console.warn('[TutorialModal] Tutorial not found:', tutorialId);
      onClose?.();
      return false;
    }

    if (this.isOpen) {
      console.warn('[TutorialModal] Already open');
      return false;
    }

    this.tutorialId = tutorialId;
    this.pages = tutorial.pages;
    this.currentPage = 0;
    this.onCloseCallback = onClose;

    // DOM作成
    this.createModal(tutorial.title);
    this.updatePage();

    // 表示
    document.body.appendChild(this.overlay!);
    requestAnimationFrame(() => {
      this.overlay?.classList.add('tutorial-modal__overlay--visible');
    });

    this.isOpen = true;
    console.log('[TutorialModal] Opened:', tutorialId);

    return true;
  }

  /**
   * モーダルを閉じる
   */
  close(): void {
    if (!this.isOpen || !this.overlay) return;

    // 表示済みとしてマーク
    TutorialService.getInstance().markCompleted(this.tutorialId);

    // アニメーション
    this.overlay.classList.remove('tutorial-modal__overlay--visible');

    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      this.isOpen = false;

      // コールバック
      this.onCloseCallback?.();
      this.onCloseCallback = undefined;

      console.log('[TutorialModal] Closed:', this.tutorialId);
    }, 300);
  }

  /**
   * 開いているかどうか
   */
  isOpened(): boolean {
    return this.isOpen;
  }

  /**
   * モーダルDOM作成
   */
  private createModal(title: string): void {
    const container = document.createElement('div');
    container.innerHTML = tutorialModalHtml.replace('{{title}}', title);
    this.overlay = container.firstElementChild as HTMLDivElement;

    // イベントハンドラ設定
    this.setupEventHandlers();

    // インジケーター作成
    this.createIndicators();
  }

  /**
   * イベントハンドラ設定
   */
  private setupEventHandlers(): void {
    if (!this.overlay) return;

    // 前へボタン
    const prevBtn = this.overlay.querySelector('.tutorial-modal__prev');
    prevBtn?.addEventListener('click', () => this.goToPrev());

    // 次へボタン
    const nextBtn = this.overlay.querySelector('.tutorial-modal__next');
    nextBtn?.addEventListener('click', () => this.goToNext());

    // 閉じるボタン
    const closeBtn = this.overlay.querySelector('.tutorial-modal__close');
    closeBtn?.addEventListener('click', () => this.close());

    // オーバーレイクリックでは閉じない（誤操作防止）
    // ESCキーでも閉じない
  }

  /**
   * インジケーター作成
   */
  private createIndicators(): void {
    const container = this.overlay?.querySelector('.tutorial-modal__indicators');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < this.pages.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'tutorial-modal__indicator';
      if (i === 0) {
        dot.classList.add('tutorial-modal__indicator--active');
      }
      container.appendChild(dot);
    }
  }

  /**
   * ページ表示を更新
   */
  private updatePage(): void {
    if (!this.overlay) return;

    const page = this.pages[this.currentPage];

    // テキスト更新
    const textEl = this.overlay.querySelector('.tutorial-modal__text');
    if (textEl) {
      textEl.textContent = page.text;
    }

    // 前へボタン
    const prevBtn = this.overlay.querySelector('.tutorial-modal__prev') as HTMLButtonElement;
    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 0;
    }

    // 次へボタン
    const nextBtn = this.overlay.querySelector('.tutorial-modal__next') as HTMLButtonElement;
    if (nextBtn) {
      nextBtn.disabled = this.currentPage === this.pages.length - 1;
    }

    // 閉じるボタン（最後のページでのみ表示）
    const closeBtn = this.overlay.querySelector('.tutorial-modal__close');
    if (closeBtn) {
      if (this.currentPage === this.pages.length - 1) {
        closeBtn.classList.add('tutorial-modal__close--visible');
      } else {
        closeBtn.classList.remove('tutorial-modal__close--visible');
      }
    }

    // インジケーター更新
    const indicators = this.overlay.querySelectorAll('.tutorial-modal__indicator');
    indicators.forEach((indicator, i) => {
      if (i === this.currentPage) {
        indicator.classList.add('tutorial-modal__indicator--active');
      } else {
        indicator.classList.remove('tutorial-modal__indicator--active');
      }
    });
  }

  /**
   * 前のページへ
   */
  private goToPrev(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePage();
    }
  }

  /**
   * 次のページへ
   */
  private goToNext(): void {
    if (this.currentPage < this.pages.length - 1) {
      this.currentPage++;
      this.updatePage();
    }
  }
}
