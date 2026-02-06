/**
 * ThemeGalleryScreen - テーマ確認画面（HTML版）
 *
 * 機能:
 * - テーマ一覧の表示
 * - テーマ選択でプレビューモーダル表示
 * - カラーパレット、ボタンスタイル、タイポグラフィのプレビュー
 */

import { BaseScreen } from './BaseScreen';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';

interface ThemeConfig {
  name: string;
  description: string;
  colors: {
    background: string;
    parchment: string;
    parchmentDark: string;
    ink: string;
    inkLight: string;
    accent: string;
    accentDark: string;
    border: string;
  };
  buttonStyle: 'scroll' | 'wooden' | 'waxSeal' | 'ribbon';
}

const THEMES: ThemeConfig[] = [
  {
    name: 'Dusty Parchment',
    description: '古びた羊皮紙、経年の味わい',
    colors: {
      background: '#2a1f14',
      parchment: '#f0e0c8',
      parchmentDark: '#dccfb0',
      ink: '#42301a',
      inkLight: '#6b5030',
      accent: '#8b5a2b',
      accentDark: '#6b4520',
      border: '#5a4530',
    },
    buttonStyle: 'scroll',
  },
  {
    name: "Grimm's Library",
    description: 'グリム図書室、革装丁の古書',
    colors: {
      background: '#1a1410',
      parchment: '#e8dcc8',
      parchmentDark: '#d0c4a8',
      ink: '#3d2e22',
      inkLight: '#5c4a38',
      accent: '#8b1a1a',
      accentDark: '#5c1010',
      border: '#4a3828',
    },
    buttonStyle: 'wooden',
  },
  {
    name: 'Golden Chronicle',
    description: '黄金年代記、王室の記録',
    colors: {
      background: '#2d2415',
      parchment: '#faf5e8',
      parchmentDark: '#e8e0c8',
      ink: '#362a1e',
      inkLight: '#5a4830',
      accent: '#b8963a',
      accentDark: '#8a7028',
      border: '#6a5838',
    },
    buttonStyle: 'waxSeal',
  },
  {
    name: 'Candlelit Tale',
    description: '燭台の物語、炉端の暖かさ',
    colors: {
      background: '#241a10',
      parchment: '#f5ecd8',
      parchmentDark: '#e0d4b8',
      ink: '#4a3a28',
      inkLight: '#6b5840',
      accent: '#c87030',
      accentDark: '#985020',
      border: '#5c4828',
    },
    buttonStyle: 'ribbon',
  },
];

export class ThemeGalleryScreen extends BaseScreen {
  private modalOverlay: HTMLElement | null = null;

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'screen theme-gallery-screen dark-bg';

    screen.innerHTML = `
      <div class="theme-gallery-screen__content">
        <!-- ヘッダー -->
        <div class="screen-header">
          <div class="screen-header__back"></div>
          <h1 class="screen-header__title">Theme Gallery</h1>
        </div>

        <!-- ボディ -->
        <div class="screen-body">
          <div class="theme-gallery-screen__body-inner">
            <!-- テーマリスト -->
            <div class="theme-gallery-screen__theme-list">
              ${this.createThemeCards()}
            </div>
          </div>
        </div>
      </div>
    `;

    return screen;
  }

  private createThemeCards(): string {
    return THEMES.map((theme, index) => `
      <div class="theme-gallery-screen__theme-card" data-theme-index="${index}"
           style="background: ${theme.colors.parchment}; border-color: ${theme.colors.accent};">
        <h3 class="theme-gallery-screen__card-name" style="color: ${theme.colors.ink};">${theme.name}</h3>
        <p class="theme-gallery-screen__card-desc" style="color: ${theme.colors.inkLight};">${theme.description}</p>
        <div class="theme-gallery-screen__color-swatches">
          <span class="theme-gallery-screen__swatch" style="background: ${theme.colors.parchment}; border-color: ${theme.colors.border};"></span>
          <span class="theme-gallery-screen__swatch" style="background: ${theme.colors.parchmentDark}; border-color: ${theme.colors.border};"></span>
          <span class="theme-gallery-screen__swatch" style="background: ${theme.colors.ink}; border-color: ${theme.colors.border};"></span>
          <span class="theme-gallery-screen__swatch" style="background: ${theme.colors.accent}; border-color: ${theme.colors.border};"></span>
          <span class="theme-gallery-screen__swatch" style="background: ${theme.colors.border}; border-color: ${theme.colors.border};"></span>
        </div>
        <span class="theme-gallery-screen__button-style" style="color: ${theme.colors.inkLight};">Style: ${theme.buttonStyle}</span>
      </div>
    `).join('');
  }

  protected setupEventHandlers(): void {
    // ヘッダー戻るボタン
    const backContainer = this.element?.querySelector('.screen-header__back');
    if (backContainer) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'ui-btn ui-btn--icon-diamond ui-btn--md';
      backBtn.innerHTML = '<span class="material-symbols-outlined ui-btn__icon">arrow_back</span>';
      backBtn.addEventListener('click', () => this.navigateTo('showcase'));
      backContainer.appendChild(backBtn);
    }

    // テーマカードクリック
    const cards = this.element?.querySelectorAll('.theme-gallery-screen__theme-card');
    cards?.forEach((card) => {
      card.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        const index = parseInt(card.getAttribute('data-theme-index') ?? '0', 10);
        this.showThemePreview(THEMES[index]);
      });
    });
  }

  private showThemePreview(theme: ThemeConfig): void {
    if (this.modalOverlay) return;

    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'theme-gallery-screen__modal-overlay ui-modal__overlay ui-modal__overlay--visible';

    const c = theme.colors;

    this.modalOverlay.innerHTML = `
      <div class="theme-gallery-screen__modal-dialog ui-modal__dialog ui-modal__dialog--visible"
           style="background: ${c.parchment}; border-color: ${c.accent};">
        <!-- テーマ名 -->
        <div class="theme-gallery-screen__preview-header">
          <div class="theme-gallery-screen__preview-divider" style="background: linear-gradient(to right, transparent, ${c.accent}, transparent);"></div>
          <h2 class="theme-gallery-screen__preview-title" style="color: ${c.ink};">${theme.name}</h2>
          <div class="theme-gallery-screen__preview-divider" style="background: linear-gradient(to right, transparent, ${c.accent}, transparent);"></div>
        </div>

        <!-- カラーパレット -->
        <div class="theme-gallery-screen__preview-section">
          <h3 class="theme-gallery-screen__section-title" style="color: ${c.inkLight};">~ Color Palette ~</h3>
          <div class="theme-gallery-screen__palette">
            ${this.createPaletteSwatches(theme)}
          </div>
        </div>

        <!-- ボタンスタイル -->
        <div class="theme-gallery-screen__preview-section">
          <h3 class="theme-gallery-screen__section-title" style="color: ${c.inkLight};">~ Button Style ~</h3>
          <div class="theme-gallery-screen__button-preview">
            ${this.createButtonPreview(theme)}
          </div>
        </div>

        <!-- タイポグラフィ -->
        <div class="theme-gallery-screen__preview-section">
          <h3 class="theme-gallery-screen__section-title" style="color: ${c.inkLight};">~ Typography ~</h3>
          <p class="theme-gallery-screen__typo-sample-title" style="color: ${c.accent};">Once Upon a Time...</p>
          <p class="theme-gallery-screen__typo-sample-body" style="color: ${c.ink};">
            昔々、遠い国のお話です。<br>
            古い羊皮紙に記された物語が<br>
            今、新たな冒険を紡ぎます。
          </p>
        </div>

        <!-- UI要素 -->
        <div class="theme-gallery-screen__preview-section">
          <h3 class="theme-gallery-screen__section-title" style="color: ${c.inkLight};">~ UI Elements ~</h3>
          <div class="theme-gallery-screen__ui-samples">
            <div class="theme-gallery-screen__ui-panel" style="background: ${c.parchmentDark}; border-color: ${c.accent};">
              <span style="color: ${c.ink};">Panel</span>
            </div>
            <div class="theme-gallery-screen__ui-frame" style="background: ${c.parchment}; border-color: ${c.accent};">
              <span style="color: ${c.ink};">Frame</span>
            </div>
          </div>
        </div>

        <!-- 閉じるボタン -->
        <button class="theme-gallery-screen__modal-close" style="background: ${c.parchmentDark}; color: ${c.ink}; border-color: ${c.border};">
          閉じる
        </button>
      </div>
    `;

    this.element?.appendChild(this.modalOverlay);

    // 閉じるボタン
    const closeBtn = this.modalOverlay.querySelector('.theme-gallery-screen__modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.closeModal();
      });
    }

    // オーバーレイクリックで閉じる
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.closeModal();
      }
    });
  }

  private createPaletteSwatches(theme: ThemeConfig): string {
    const c = theme.colors;
    const colors = [
      { color: c.background, name: 'Background' },
      { color: c.parchment, name: 'Parchment' },
      { color: c.parchmentDark, name: 'Shadow' },
      { color: c.ink, name: 'Ink' },
      { color: c.accent, name: 'Accent' },
      { color: c.border, name: 'Border' },
    ];

    return colors.map(({ color, name }) => `
      <div class="theme-gallery-screen__palette-item">
        <span class="theme-gallery-screen__palette-swatch" style="background: ${color}; border-color: ${c.border};"></span>
        <span class="theme-gallery-screen__palette-name" style="color: ${c.ink};">${name}</span>
      </div>
    `).join('');
  }

  private createButtonPreview(theme: ThemeConfig): string {
    const c = theme.colors;

    switch (theme.buttonStyle) {
      case 'scroll':
        return `
          <div class="theme-gallery-screen__btn-scroll">
            <span class="theme-gallery-screen__btn-scroll-end" style="background: ${c.accent};"></span>
            <span class="theme-gallery-screen__btn-scroll-body" style="background: ${c.parchmentDark}; border-color: ${c.border}; color: ${c.ink};">Sample Button</span>
            <span class="theme-gallery-screen__btn-scroll-end" style="background: ${c.accent};"></span>
          </div>
        `;
      case 'wooden':
        return `
          <div class="theme-gallery-screen__btn-wooden" style="background: ${c.accent}; border-color: ${c.accentDark}; color: ${c.parchment};">
            Sample Button
          </div>
        `;
      case 'waxSeal':
        return `
          <div class="theme-gallery-screen__btn-waxseal" style="background: ${c.accent}; border-color: ${c.accentDark};">
            <span class="theme-gallery-screen__btn-waxseal-inner" style="background: ${c.parchment}; color: ${c.ink};">&#10003;</span>
          </div>
        `;
      case 'ribbon':
        return `
          <div class="theme-gallery-screen__btn-ribbon" style="background: ${c.accent}; color: ${c.parchment};">
            Sample Button
          </div>
        `;
      default:
        return '';
    }
  }

  private closeModal(): void {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
  }

  protected async onAfterShow(): Promise<void> {
    const content = this.element?.querySelector('.theme-gallery-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }
  }

  protected async onBeforeHide(): Promise<void> {
    this.closeModal();
  }
}
