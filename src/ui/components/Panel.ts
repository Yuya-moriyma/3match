/**
 * Panel - パネル/カードコンポーネント
 *
 * バリエーション:
 * - parchment: 羊皮紙風パネル
 * - dark: ダーク背景パネル
 * - transparent: 透明パネル
 */

export type PanelVariant = 'parchment' | 'dark' | 'transparent';

export interface PanelOptions {
  variant?: PanelVariant;
  title?: string;
  className?: string;
  decorated?: boolean;
}

export class Panel {
  private element: HTMLDivElement;
  private contentContainer: HTMLDivElement;
  private options: PanelOptions;

  constructor(options: PanelOptions = {}) {
    this.options = {
      variant: 'parchment',
      decorated: false,
      ...options,
    };

    this.element = this.createElement();
    this.contentContainer = this.element.querySelector('.ui-panel__content') as HTMLDivElement;
  }

  private createElement(): HTMLDivElement {
    const panel = document.createElement('div');

    // ベースクラス
    panel.className = 'ui-panel';

    // バリアントクラス
    panel.classList.add(`ui-panel--${this.options.variant}`);

    // 装飾クラス
    if (this.options.decorated) {
      panel.classList.add('ui-panel--decorated');
    }

    // カスタムクラス
    if (this.options.className) {
      panel.classList.add(...this.options.className.split(' '));
    }

    // 内部構造
    let html = '';

    // タイトル
    if (this.options.title) {
      html += `
        <div class="ui-panel__header">
          <h2 class="ui-panel__title">${this.options.title}</h2>
          <div class="ui-panel__divider"></div>
        </div>
      `;
    }

    // コンテンツ領域
    html += '<div class="ui-panel__content"></div>';

    panel.innerHTML = html;

    return panel;
  }

  /**
   * DOM要素を取得
   */
  public getElement(): HTMLDivElement {
    return this.element;
  }

  /**
   * コンテンツコンテナを取得
   */
  public getContentContainer(): HTMLDivElement {
    return this.contentContainer;
  }

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
   * コンテンツをクリア
   */
  public clearContent(): void {
    this.contentContainer.innerHTML = '';
  }

  /**
   * タイトルを更新
   */
  public setTitle(title: string): void {
    const titleEl = this.element.querySelector('.ui-panel__title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * 表示/非表示を切り替え
   */
  public setVisible(visible: boolean): void {
    this.element.style.display = visible ? '' : 'none';
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    this.element.remove();
  }
}

/**
 * パネルを簡単に作成するファクトリ関数
 */
export function createPanel(options: PanelOptions = {}): Panel {
  return new Panel(options);
}

/**
 * 羊皮紙風パネルを作成
 */
export function createParchmentPanel(title?: string): Panel {
  return new Panel({ variant: 'parchment', title, decorated: true });
}

/**
 * ダークパネルを作成
 */
export function createDarkPanel(title?: string): Panel {
  return new Panel({ variant: 'dark', title });
}
