/**
 * ShowcaseScreen - デザインショーケース画面（HTML版）
 *
 * 機能:
 * - 各確認画面へのナビゲーション
 */

import { BaseScreen } from './BaseScreen';
import { renderToElement } from '../utils';
import showcaseScreenTemplate from '../templates/showcase-screen.html?raw';

export class ShowcaseScreen extends BaseScreen {
  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(showcaseScreenTemplate);
    return screen;
  }

  protected setupEventHandlers(): void {
    // ヘッダー戻るボタン
    const backContainer = this.element?.querySelector('.screen-header__back');
    if (backContainer) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'ui-btn ui-btn--icon-diamond ui-btn--md';
      backBtn.innerHTML = '<span class="material-symbols-outlined ui-btn__icon">arrow_back</span>';
      backBtn.addEventListener('click', () => this.navigateTo('menu'));
      backContainer.appendChild(backBtn);
    }

    // ナビゲーションボタン
    const navBtns = this.element?.querySelectorAll('.showcase-screen__nav-btn');
    navBtns?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target === 'panelGallery') {
          this.navigateTo('panelGallery');
        } else if (target === 'themeGallery') {
          this.navigateTo('themeGallery');
        }
      });
    });
  }

  protected async onAfterShow(): Promise<void> {
    const content = this.element?.querySelector('.showcase-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }
  }
}
