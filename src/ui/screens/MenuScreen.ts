/**
 * MenuScreen - メニュー画面（HTML版）
 *
 * 機能:
 * - プレイヤー情報表示
 * - ストーリー/設定/Showcase画面への遷移
 * - タイトル画面へ戻る
 */

import { BaseScreen } from './BaseScreen';
import { Button } from '../components/Button';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';
import { UserSession } from '../../utils/UserSession';
import { PlayerStatus } from '../../utils/PlayerStatus';
import { StoryProgress } from '../../utils/StoryProgress';
import { chapters } from '../../data/story';
import { renderToElement } from '../utils';
import menuScreenTemplate from '../templates/menu-screen.html?raw';

const KANJI_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function toKanji(n: number): string {
  if (n >= 1 && n <= 10) return KANJI_DIGITS[n];
  if (n > 10 && n < 20) return `十${KANJI_DIGITS[n - 10]}`;
  if (n === 20) return '二十';
  return String(n);
}

export class MenuScreen extends BaseScreen {
  private bgmTimer: number | null = null;

  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(menuScreenTemplate);

    // ヘッダー戻るボタン
    const backContainer = screen.querySelector('.screen-header__back');
    if (backContainer) {
      const backBtn = new Button({
        icon: 'arrow_back',
        variant: 'icon-diamond',
        onClick: () => this.navigateTo('title'),
      });
      backContainer.appendChild(backBtn.getElement());
    }

    // メニューボタンを追加
    const buttonsContainer = screen.querySelector('.menu-screen__buttons');
    if (buttonsContainer) {
      // ストーリーボタン
      const storyBtn = new Button({
        text: 'ストーリー',
        variant: 'ribbon',
        size: 'lg',
        className: 'menu-screen__menu-btn',
        onClick: () => this.navigateTo('battlePrep'),
      });
      buttonsContainer.appendChild(storyBtn.getElement());

      // クエストボタン
      const questBtn = new Button({
        text: 'クエスト',
        variant: 'ribbon',
        size: 'lg',
        className: 'menu-screen__menu-btn',
        onClick: () => this.navigateTo('quest'),
      });
      buttonsContainer.appendChild(questBtn.getElement());

      // 設定ボタン
      const settingsBtn = new Button({
        text: '設定',
        variant: 'ribbon',
        size: 'lg',
        className: 'menu-screen__menu-btn',
        onClick: () => this.navigateTo('settings'),
      });
      buttonsContainer.appendChild(settingsBtn.getElement());

      // Showcaseボタン
      const showcaseBtn = new Button({
        text: 'Showcase',
        variant: 'ribbon',
        size: 'lg',
        className: 'menu-screen__menu-btn',
        onClick: () => this.navigateTo('showcase'),
      });
      buttonsContainer.appendChild(showcaseBtn.getElement());
    }

    return screen;
  }

  private updatePlayerInfo(): void {
    if (!this.element) return;

    const userName = UserSession.getInstance().getUserName() ?? '---';
    const level = PlayerStatus.getInstance().getLevel();

    // ストーリー進行度: クリア済みの章・節を表示
    const lastClearedSectionId = StoryProgress.getInstance().getLastClearedSectionId();
    let storyText: string;
    if (!lastClearedSectionId) {
      storyText = '—';
    } else {
      const chapterIndex = chapters.findIndex((ch) =>
        ch.sections.some((s) => s.id === lastClearedSectionId)
      );
      const chapter = chapters[chapterIndex];
      const sectionIndex = chapter.sections.findIndex(
        (s) => s.id === lastClearedSectionId
      );
      storyText = `第${toKanji(chapterIndex + 1)}章 第${toKanji(sectionIndex + 1)}節`;
    }

    const nameEl = this.element.querySelector('.menu-screen__player-name');
    const levelEl = this.element.querySelector('.menu-screen__player-level');
    const storyEl = this.element.querySelector('.menu-screen__player-story');

    if (nameEl) nameEl.textContent = userName;
    if (levelEl) levelEl.textContent = `Lv. ${level}`;
    if (storyEl) storyEl.textContent = storyText;
  }

  protected async onAfterShow(): Promise<void> {
    this.updatePlayerInfo();

    const content = this.element?.querySelector('.menu-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }

    // main BGMが再生中でなければ1秒後に再生開始
    const soundManager = SoundManager.getInstance();
    if (soundManager.getCurrentBGMKey() !== SoundKeys.MAIN_BGM) {
      this.bgmTimer = window.setTimeout(() => {
        this.bgmTimer = null;
        soundManager.playBGM(SoundKeys.MAIN_BGM);
      }, 1000);
    }
  }

  protected async onBeforeHide(): Promise<void> {
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
