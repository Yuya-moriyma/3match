/**
 * SettingsScreen - 設定画面（HTML版）
 *
 * 機能:
 * - BGM/SE音量スライダー
 * - その他設定
 * - メニュー画面へ戻る
 */

import { BaseScreen } from './BaseScreen';
import { Button } from '../components/Button';
import { createOrnateDivider } from '../components/Decorations';
import { createConfirmDialog } from '../components/Modal';
import { PlayerPreferences } from '../../utils/PlayerPreferences';
import { TutorialService } from '../../utils/TutorialService';
import { renderToElement } from '../utils';
import settingsScreenTemplate from '../templates/settings-screen.html?raw';

export class SettingsScreen extends BaseScreen {
  private bgmSlider: HTMLInputElement | null = null;
  private seSlider: HTMLInputElement | null = null;
  private testModeToggle: HTMLInputElement | null = null;

  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(settingsScreenTemplate);

    // ヘッダー戻るボタン
    const backContainer = screen.querySelector('.screen-header__back');
    if (backContainer) {
      const backBtn = new Button({
        icon: 'arrow_back',
        variant: 'icon-diamond',
        onClick: () => this.navigateTo('menu'),
      });
      backContainer.appendChild(backBtn.getElement());
    }

    // 装飾線を追加
    const dividerContainer = screen.querySelector('.settings-screen__divider');
    if (dividerContainer) {
      dividerContainer.appendChild(createOrnateDivider());
    }

    return screen;
  }

  protected setupEventHandlers(): void {
    // BGMスライダー
    this.bgmSlider = this.element?.querySelector('#bgm-volume') as HTMLInputElement;
    const bgmValue = this.element?.querySelector('#bgm-value');
    if (this.bgmSlider && bgmValue) {
      this.bgmSlider.addEventListener('input', () => {
        bgmValue.textContent = `${this.bgmSlider?.value}%`;
        this.onBgmVolumeChange(Number(this.bgmSlider?.value));
      });
    }

    // SEスライダー
    this.seSlider = this.element?.querySelector('#se-volume') as HTMLInputElement;
    const seValue = this.element?.querySelector('#se-value');
    if (this.seSlider && seValue) {
      this.seSlider.addEventListener('input', () => {
        seValue.textContent = `${this.seSlider?.value}%`;
        this.onSeVolumeChange(Number(this.seSlider?.value));
      });
    }

    // テストモードトグル
    this.testModeToggle = this.element?.querySelector('#test-mode') as HTMLInputElement;
    if (this.testModeToggle) {
      this.testModeToggle.addEventListener('change', () => {
        this.onTestModeChange(this.testModeToggle?.checked ?? false);
      });
    }

    // チュートリアルリセットボタン
    const tutorialResetBtn = this.element?.querySelector('#tutorial-reset');
    if (tutorialResetBtn) {
      tutorialResetBtn.addEventListener('click', () => {
        this.onTutorialReset();
      });
    }
  }

  private onBgmVolumeChange(value: number): void {
    // GameBridge経由で設定変更を通知
    const bridge = this.manager?.getGameBridge();
    if (bridge) {
      bridge.notifySettingsChanged({ bgmVolume: value / 100 });
    }
  }

  private onSeVolumeChange(value: number): void {
    // GameBridge経由で設定変更を通知
    const bridge = this.manager?.getGameBridge();
    if (bridge) {
      bridge.notifySettingsChanged({ seVolume: value / 100 });
    }
  }

  private onTestModeChange(enabled: boolean): void {
    // PlayerPreferencesに直接保存
    const prefs = PlayerPreferences.getInstance();
    prefs.setTestMode(enabled);
  }

  private onTutorialReset(): void {
    const dialog = createConfirmDialog(
      'チュートリアルリセット',
      'チュートリアルを再度表示しますか？',
      () => {
        TutorialService.getInstance().resetAll();
      }
    );
    dialog.open();
  }

  protected async onAfterShow(): Promise<void> {
    const content = this.element?.querySelector('.settings-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }

    // 保存された音量設定をスライダーに反映
    this.loadSavedVolumes();
  }

  /**
   * 保存された設定をUIに反映
   */
  private loadSavedVolumes(): void {
    const prefs = PlayerPreferences.getInstance();

    // BGM音量
    const bgmValue = Math.round(prefs.getBgmVolume() * 100);
    if (this.bgmSlider) {
      this.bgmSlider.value = String(bgmValue);
    }
    const bgmValueEl = this.element?.querySelector('#bgm-value');
    if (bgmValueEl) {
      bgmValueEl.textContent = `${bgmValue}%`;
    }

    // SE音量
    const seValue = Math.round(prefs.getSeVolume() * 100);
    if (this.seSlider) {
      this.seSlider.value = String(seValue);
    }
    const seValueEl = this.element?.querySelector('#se-value');
    if (seValueEl) {
      seValueEl.textContent = `${seValue}%`;
    }

    // テストモード
    if (this.testModeToggle) {
      this.testModeToggle.checked = prefs.getTestMode();
    }
  }
}
