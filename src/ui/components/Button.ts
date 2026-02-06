/**
 * Button - 共通ボタンコンポーネント
 *
 * バリエーション:
 * - ribbon: リボン風ボタン（メインアクション用）
 * - ribbon-secondary: 羊皮紙色リボンボタン（セカンダリアクション用）
 * - scroll: 巻物風ボタン（レガシー）
 * - accent: アクセントボタン（レガシー）
 * - outline: アウトラインボタン（キャンセル等）
 * - icon: アイコンのみのボタン
 */

export type ButtonVariant = 'ribbon' | 'ribbon-secondary' | 'scroll' | 'accent' | 'outline' | 'icon' | 'icon-diamond';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonOptions {
  text?: string;
  icon?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export class Button {
  private element: HTMLButtonElement;
  private options: ButtonOptions;

  constructor(options: ButtonOptions = {}) {
    this.options = {
      variant: 'ribbon',
      size: 'md',
      disabled: false,
      ...options,
    };

    this.element = this.createElement();
  }

  private createElement(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';

    // ベースクラス
    btn.className = 'ui-btn';

    // バリアントクラス
    btn.classList.add(`ui-btn--${this.options.variant}`);

    // サイズクラス
    btn.classList.add(`ui-btn--${this.options.size}`);

    // カスタムクラス
    if (this.options.className) {
      btn.classList.add(...this.options.className.split(' '));
    }

    // 無効状態
    if (this.options.disabled) {
      btn.disabled = true;
      btn.classList.add('ui-btn--disabled');
    }

    // コンテンツ
    if (this.options.icon && this.options.text) {
      // アイコン + テキスト
      btn.innerHTML = `
        <span class="material-symbols-outlined ui-btn__icon">${this.options.icon}</span>
        <span class="ui-btn__text">${this.options.text}</span>
      `;
    } else if (this.options.icon) {
      // アイコンのみ
      btn.innerHTML = `<span class="material-symbols-outlined ui-btn__icon">${this.options.icon}</span>`;
    } else if (this.options.text) {
      // テキストのみ
      btn.innerHTML = `<span class="ui-btn__text">${this.options.text}</span>`;
    }

    // クリックイベント
    if (this.options.onClick) {
      btn.addEventListener('click', this.options.onClick);
    }

    return btn;
  }

  /**
   * DOM要素を取得
   */
  public getElement(): HTMLButtonElement {
    return this.element;
  }

  /**
   * テキストを更新
   */
  public setText(text: string): void {
    this.options.text = text;
    const textEl = this.element.querySelector('.ui-btn__text');
    if (textEl) {
      textEl.textContent = text;
    }
  }

  /**
   * アイコンを更新
   */
  public setIcon(icon: string): void {
    this.options.icon = icon;
    const iconEl = this.element.querySelector('.ui-btn__icon');
    if (iconEl) {
      iconEl.textContent = icon;
    }
  }

  /**
   * 有効/無効を切り替え
   */
  public setDisabled(disabled: boolean): void {
    this.options.disabled = disabled;
    this.element.disabled = disabled;
    this.element.classList.toggle('ui-btn--disabled', disabled);
  }

  /**
   * ローディング状態を設定
   */
  public setLoading(loading: boolean): void {
    this.element.classList.toggle('ui-btn--loading', loading);
    this.element.disabled = loading;

    if (loading) {
      const spinner = document.createElement('span');
      spinner.className = 'ui-btn__spinner';
      this.element.prepend(spinner);
    } else {
      const spinner = this.element.querySelector('.ui-btn__spinner');
      spinner?.remove();
    }
  }

  /**
   * クリックイベントを設定
   */
  public onClick(handler: () => void): void {
    this.element.addEventListener('click', handler);
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    this.element.remove();
  }
}

/**
 * ボタンを簡単に作成するファクトリ関数
 */
export function createButton(options: ButtonOptions): Button {
  return new Button(options);
}

/**
 * リボン風ボタンを作成（メインアクション用）
 */
export function createRibbonButton(text: string, onClick?: () => void): Button {
  return new Button({ text, variant: 'ribbon', onClick });
}

/**
 * リボン風セカンダリボタンを作成
 */
export function createRibbonSecondaryButton(text: string, onClick?: () => void): Button {
  return new Button({ text, variant: 'ribbon-secondary', onClick });
}

/**
 * 巻物風ボタンを作成（レガシー）
 */
export function createScrollButton(text: string, onClick?: () => void): Button {
  return new Button({ text, variant: 'scroll', onClick });
}

/**
 * アクセントボタンを作成（レガシー）
 */
export function createAccentButton(text: string, onClick?: () => void): Button {
  return new Button({ text, variant: 'accent', onClick });
}

/**
 * アイコンボタンを作成
 */
export function createIconButton(icon: string, onClick?: () => void): Button {
  return new Button({ icon, variant: 'icon', onClick });
}
