/**
 * BattlePauseMenu - 戦闘中ポーズメニューのHTMLコンポーネント
 *
 * 機能:
 * - 半透明黒オーバーレイ
 * - 羊皮紙風ダイアログパネル
 * - BGM/SE音量スライダー
 * - 再開/リタイアボタン
 *
 * 通信:
 * - PAUSE_TOGGLE: ポーズボタン押下時に発火
 * - RESUME: 再開ボタン押下時に発火
 * - RETIRE: リタイアボタン押下時に発火
 * - VOLUME_CHANGE: 音量変更時に発火
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';
import { Button } from './Button';

export class BattlePauseMenu {
  private gameBridge: GameBridge;
  private overlayContainer: HTMLElement;
  private pauseButton: Button | null = null;
  private resumeButton: Button | null = null;
  private retireButton: Button | null = null;
  private isPaused = false;

  constructor(
    pauseBtnContainer: HTMLElement,
    overlayContainer: HTMLElement,
    gameBridge: GameBridge
  ) {
    this.gameBridge = gameBridge;
    this.overlayContainer = overlayContainer;

    this.createPauseButton(pauseBtnContainer);
  }

  /**
   * ポーズボタンを作成
   */
  private createPauseButton(container: HTMLElement): void {
    this.pauseButton = new Button({
      text: 'PAUSE',
      variant: 'ribbon',
      size: 'sm',
      className: 'battle-pause__btn',
      onClick: () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.toggle();
      },
    });
    container.appendChild(this.pauseButton.getElement());
  }

  /**
   * ポーズ状態をトグル
   */
  public toggle(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * ポーズを開始
   */
  private pause(): void {
    this.isPaused = true;
    this.gameBridge.emit(GameBridgeEvents.PAUSE_TOGGLE);
    this.showMenu();
  }

  /**
   * ゲームを再開
   */
  private resume(): void {
    this.isPaused = false;
    this.hideMenu();
    this.gameBridge.emit(GameBridgeEvents.RESUME);
  }

  /**
   * ポーズメニューを表示
   */
  private showMenu(): void {
    // オーバーレイ内コンテンツを構築
    this.overlayContainer.innerHTML = '';

    // 背景オーバーレイ（クリックで何もしない—再開ボタンで閉じる）
    const backdrop = document.createElement('div');
    backdrop.className = 'battle-pause__backdrop';
    this.overlayContainer.appendChild(backdrop);

    // パネル
    const panel = document.createElement('div');
    panel.className = 'battle-pause__panel';

    // タイトル
    const title = document.createElement('h2');
    title.className = 'battle-pause__title';
    title.textContent = 'PAUSED';
    panel.appendChild(title);

    // 音量スライダー
    const soundMgr = SoundManager.getInstance();
    panel.appendChild(this.createVolumeSlider('BGM', soundMgr.getBGMVolume(), (v) => {
      soundMgr.setBGMVolume(v);
      this.gameBridge.emit(GameBridgeEvents.VOLUME_CHANGE, { type: 'bgm', value: v });
    }));
    panel.appendChild(this.createVolumeSlider('SE', soundMgr.getSEVolume(), (v) => {
      soundMgr.setSEVolume(v);
      this.gameBridge.emit(GameBridgeEvents.VOLUME_CHANGE, { type: 'se', value: v });
    }));

    // ボタンコンテナ
    const btnContainer = document.createElement('div');
    btnContainer.className = 'battle-pause__buttons';

    // 再開ボタン
    this.resumeButton = new Button({
      text: '再開',
      variant: 'ribbon',
      size: 'md',
      className: 'battle-pause__resume-btn',
      onClick: () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.resume();
      },
    });
    btnContainer.appendChild(this.resumeButton.getElement());

    // リタイアボタン
    this.retireButton = new Button({
      text: 'リタイア',
      variant: 'ribbon-secondary',
      size: 'md',
      className: 'battle-pause__retire-btn',
      onClick: () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.isPaused = false;
        this.hideMenu();
        this.gameBridge.emit(GameBridgeEvents.RETIRE);
      },
    });
    btnContainer.appendChild(this.retireButton.getElement());

    panel.appendChild(btnContainer);
    this.overlayContainer.appendChild(panel);

    // オーバーレイを表示
    this.overlayContainer.classList.add('active');
  }

  /**
   * ポーズメニューを非表示
   */
  private hideMenu(): void {
    this.overlayContainer.classList.remove('active');
    this.overlayContainer.innerHTML = '';
    this.resumeButton = null;
    this.retireButton = null;
  }

  /**
   * 音量スライダーを作成
   */
  private createVolumeSlider(
    label: string,
    initialValue: number,
    onChange: (value: number) => void
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'battle-pause__slider';

    const labelEl = document.createElement('label');
    labelEl.className = 'battle-pause__slider-label';
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(initialValue * 100));
    input.className = 'battle-pause__slider-input';

    const valueEl = document.createElement('span');
    valueEl.className = 'battle-pause__slider-value';
    valueEl.textContent = `${Math.round(initialValue * 100)}%`;

    input.addEventListener('input', () => {
      const v = parseInt(input.value, 10) / 100;
      valueEl.textContent = `${input.value}%`;
      onChange(v);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    wrapper.appendChild(valueEl);

    return wrapper;
  }

  /**
   * ポーズ状態を取得
   */
  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    this.hideMenu();
    if (this.pauseButton) {
      this.pauseButton.destroy();
      this.pauseButton = null;
    }
  }
}
