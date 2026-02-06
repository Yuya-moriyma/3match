/**
 * TitleScreen - タイトル画面（HTML版）
 *
 * 機能:
 * - ゲームタイトル表示
 * - TAP TO STARTボタン
 * - メニュー画面への遷移
 */

import { BaseScreen } from './BaseScreen';
import { createOrnateDivider } from '../components/Decorations';
import { renderToElement } from '../utils';
import titleScreenTemplate from '../templates/title-screen.html?raw';

export class TitleScreen extends BaseScreen {
  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(titleScreenTemplate);

    // 装飾線を追加
    const dividerContainer = screen.querySelector('.title-screen__divider-container');
    if (dividerContainer) {
      dividerContainer.appendChild(createOrnateDivider());
    }

    return screen;
  }

  protected setupEventHandlers(): void {
    const startBtn = this.element?.querySelector('.title-screen__start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.navigateTo('menu');
      });
    }

    // 画面全体のタップでも遷移可能
    this.element?.addEventListener('click', (e) => {
      // ボタン以外をタップした場合も遷移
      if (!(e.target as HTMLElement).closest('.title-screen__start-btn')) {
        this.navigateTo('menu');
      }
    });
  }

  protected async onAfterShow(): Promise<void> {
    // 表示アニメーション
    const content = this.element?.querySelector('.title-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }
  }
}
