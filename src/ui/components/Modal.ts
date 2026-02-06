/**
 * Modal - モーダルダイアログコンポーネント
 *
 * 機能:
 * - オーバーレイ背景
 * - アニメーション付き表示/非表示
 * - 閉じるボタン
 * - カスタムコンテンツ
 */

import { Button } from './Button';

export interface ModalOptions {
  title?: string;
  closable?: boolean;
  closeOnOverlay?: boolean;
  className?: string;
  onClose?: () => void;
}

export class Modal {
  private overlay: HTMLDivElement;
  private dialog: HTMLDivElement;
  private contentContainer: HTMLDivElement;
  private options: ModalOptions;
  private isOpen: boolean = false;

  constructor(options: ModalOptions = {}) {
    this.options = {
      closable: true,
      closeOnOverlay: true,
      ...options,
    };

    this.overlay = this.createOverlay();
    this.dialog = this.overlay.querySelector('.ui-modal__dialog') as HTMLDivElement;
    this.contentContainer = this.overlay.querySelector('.ui-modal__body') as HTMLDivElement;
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'ui-modal__overlay';

    // カスタムクラス
    if (this.options.className) {
      overlay.classList.add(...this.options.className.split(' '));
    }

    // オーバーレイクリックで閉じる
    if (this.options.closeOnOverlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }

    // ダイアログ
    const dialog = document.createElement('div');
    dialog.className = 'ui-modal__dialog ui-panel ui-panel--parchment ui-panel--decorated';

    let html = '';

    // ヘッダー
    if (this.options.title || this.options.closable) {
      html += '<div class="ui-modal__header">';

      if (this.options.title) {
        html += `<h2 class="ui-modal__title">${this.options.title}</h2>`;
      }

      html += '</div>';
    }

    // ボディ
    html += '<div class="ui-modal__body"></div>';

    // フッター（必要に応じて追加）
    html += '<div class="ui-modal__footer"></div>';

    dialog.innerHTML = html;

    // 閉じるボタン
    if (this.options.closable) {
      const closeBtn = new Button({
        icon: 'close',
        variant: 'icon',
        className: 'ui-modal__close',
        onClick: () => this.close(),
      });
      const header = dialog.querySelector('.ui-modal__header');
      header?.appendChild(closeBtn.getElement());
    }

    overlay.appendChild(dialog);

    return overlay;
  }

  /**
   * オーバーレイ要素を取得
   */
  public getElement(): HTMLDivElement {
    return this.overlay;
  }

  /**
   * ダイアログ要素を取得
   */
  public getDialog(): HTMLDivElement {
    return this.dialog;
  }

  /**
   * コンテンツコンテナを取得
   */
  public getContentContainer(): HTMLDivElement {
    return this.contentContainer;
  }

  /**
   * フッターを取得
   */
  public getFooter(): HTMLDivElement {
    return this.overlay.querySelector('.ui-modal__footer') as HTMLDivElement;
  }

  /**
   * モーダルを開く
   */
  public open(): void {
    if (this.isOpen) return;

    // DOMに追加
    document.body.appendChild(this.overlay);

    // アニメーション用にフレームを待つ
    requestAnimationFrame(() => {
      this.overlay.classList.add('ui-modal__overlay--visible');
      this.dialog.classList.add('ui-modal__dialog--visible');
    });

    this.isOpen = true;

    // ESCキーで閉じる
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * モーダルを閉じる
   */
  public close(): void {
    if (!this.isOpen) return;

    this.overlay.classList.remove('ui-modal__overlay--visible');
    this.dialog.classList.remove('ui-modal__dialog--visible');

    // アニメーション完了後にDOMから削除
    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }, 300);

    this.isOpen = false;

    // ESCキーリスナーを解除
    document.removeEventListener('keydown', this.handleKeyDown);

    // コールバック
    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  /**
   * キーダウンハンドラ
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.options.closable) {
      this.close();
    }
  };

  /**
   * コンテンツを設定（HTML文字列）
   */
  public setContent(html: string): void {
    this.contentContainer.innerHTML = html;
  }

  /**
   * コンテンツを追加（DOM要素）
   */
  public appendContent(element: HTMLElement): void {
    this.contentContainer.appendChild(element);
  }

  /**
   * フッターにボタンを追加
   */
  public addFooterButton(button: Button): void {
    this.getFooter().appendChild(button.getElement());
  }

  /**
   * タイトルを更新
   */
  public setTitle(title: string): void {
    const titleEl = this.dialog.querySelector('.ui-modal__title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * 開いているかどうか
   */
  public isOpened(): boolean {
    return this.isOpen;
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay.remove();
  }
}

/**
 * モーダルを簡単に作成するファクトリ関数
 */
export function createModal(options: ModalOptions = {}): Modal {
  return new Modal(options);
}

/**
 * 確認ダイアログを作成
 */
export function createConfirmDialog(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): Modal {
  const modal = new Modal({
    title,
    closable: true,
    closeOnOverlay: false,
  });

  modal.setContent(`<p class="ui-modal__message">${message}</p>`);

  // キャンセルボタン
  const cancelBtn = new Button({
    text: 'Cancel',
    variant: 'outline',
    onClick: () => {
      modal.close();
      if (onCancel) onCancel();
    },
  });

  // 確認ボタン
  const confirmBtn = new Button({
    text: 'OK',
    variant: 'accent',
    onClick: () => {
      modal.close();
      onConfirm();
    },
  });

  modal.addFooterButton(cancelBtn);
  modal.addFooterButton(confirmBtn);

  return modal;
}

/**
 * アラートダイアログを作成
 */
export function createAlertDialog(
  title: string,
  message: string,
  onClose?: () => void
): Modal {
  const modal = new Modal({
    title,
    closable: true,
    onClose,
  });

  modal.setContent(`<p class="ui-modal__message">${message}</p>`);

  // OKボタン
  const okBtn = new Button({
    text: 'OK',
    variant: 'accent',
    onClick: () => modal.close(),
  });

  modal.addFooterButton(okBtn);

  return modal;
}
