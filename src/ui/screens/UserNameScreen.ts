/**
 * UserNameScreen - ユーザー名入力画面
 *
 * 初回起動時にユーザー名を入力させる画面。
 * 入力後、Firebaseにデータを同期してタイトル画面へ遷移。
 */

import { BaseScreen } from './BaseScreen';
import { createOrnateDivider } from '../components/Decorations';
import { UserSession } from '../../utils/UserSession';
import { UserDataService } from '../../firebase/UserDataService';
import { PlayerPreferences } from '../../utils/PlayerPreferences';
import { SoundManager } from '../../utils/SoundManager';
import { StoryProgress } from '../../utils/StoryProgress';
import { PlayerStatus } from '../../utils/PlayerStatus';
import { EquipmentService } from '../../utils/EquipmentService';
import { TutorialService } from '../../utils/TutorialService';
import { DEFAULT_OWNED_EQUIPMENT_IDS } from '../../data/equipment';

export class UserNameScreen extends BaseScreen {
  private inputElement: HTMLInputElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  private errorMessage: HTMLElement | null = null;

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'screen username-screen dark-bg';

    screen.innerHTML = `
      <div class="username-screen__content">
        <!-- タイトルフレーム -->
        <div class="username-screen__frame">
          <h1 class="username-screen__title">Welcome!</h1>
          <p class="username-screen__subtitle">Enter your name</p>
        </div>

        <!-- 装飾線 -->
        <div class="username-screen__divider-container"></div>

        <!-- 入力フォーム -->
        <div class="username-screen__form">
          <input
            type="text"
            class="username-screen__input"
            placeholder="Your Name"
            maxlength="20"
            autocomplete="off"
          />
          <p class="username-screen__error"></p>
          <button class="username-screen__submit-btn" disabled>
            START ADVENTURE
          </button>
        </div>

        <!-- フッター -->
        <p class="username-screen__footer">Your journey begins here</p>
      </div>
    `;

    // 装飾線を追加
    const dividerContainer = screen.querySelector('.username-screen__divider-container');
    if (dividerContainer) {
      dividerContainer.appendChild(createOrnateDivider());
    }

    return screen;
  }

  protected setupEventHandlers(): void {
    this.inputElement = this.element?.querySelector('.username-screen__input') as HTMLInputElement;
    this.submitButton = this.element?.querySelector('.username-screen__submit-btn') as HTMLButtonElement;
    this.errorMessage = this.element?.querySelector('.username-screen__error') as HTMLElement;

    // 入力イベント
    this.inputElement?.addEventListener('input', () => {
      this.validateInput();
    });

    // Enterキーで送信
    this.inputElement?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.submitButton?.disabled) {
        this.handleSubmit();
      }
    });

    // 送信ボタン
    this.submitButton?.addEventListener('click', () => {
      this.handleSubmit();
    });
  }

  protected async onAfterShow(): Promise<void> {
    // 表示アニメーション
    const content = this.element?.querySelector('.username-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }

    // Cookieから前回のユーザー名を読み込んでprefill
    this.prefillUserName();

    // 入力欄にフォーカス
    setTimeout(() => {
      this.inputElement?.focus();
    }, 300);
  }

  /**
   * Cookieから前回のユーザー名を読み込んで入力欄にprefill
   */
  private prefillUserName(): void {
    const session = UserSession.getInstance();
    const savedName = session.getUserName();

    if (savedName && this.inputElement) {
      this.inputElement.value = savedName;
      // バリデーションを実行してボタンを有効化
      this.validateInput();
    }
  }

  /**
   * 入力バリデーション
   */
  private validateInput(): void {
    const value = this.inputElement?.value.trim() || '';

    if (value.length === 0) {
      this.setError('');
      this.setSubmitEnabled(false);
      return;
    }

    if (value.length < 1) {
      this.setError('Please enter at least 1 character');
      this.setSubmitEnabled(false);
      return;
    }

    if (value.length > 20) {
      this.setError('Maximum 20 characters');
      this.setSubmitEnabled(false);
      return;
    }

    // バリデーションOK
    this.setError('');
    this.setSubmitEnabled(true);
  }

  /**
   * エラーメッセージを設定
   */
  private setError(message: string): void {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = message ? 'block' : 'none';
    }
  }

  /**
   * 送信ボタンの有効/無効を設定
   */
  private setSubmitEnabled(enabled: boolean): void {
    if (this.submitButton) {
      this.submitButton.disabled = !enabled;
    }
  }

  /**
   * 送信処理
   */
  private async handleSubmit(): Promise<void> {
    const userName = this.inputElement?.value.trim();
    if (!userName) return;

    // ボタンを無効化してローディング表示
    this.setSubmitEnabled(false);
    if (this.submitButton) {
      this.submitButton.textContent = 'LOADING...';
    }

    try {
      // ユーザーセッションに保存
      const session = UserSession.getInstance();
      session.setUserName(userName);

      // Firebaseからデータを読み込み（既存データがあれば復元）
      const userDataService = UserDataService.getInstance();
      const existingData = await userDataService.loadUserData(userName);

      if (existingData) {
        console.log('[UserNameScreen] Found existing data for user:', userName);
        // 既存データがあれば、ローカルに反映
        if (existingData.preferences) {
          PlayerPreferences.getInstance().applyFirebaseData(
            existingData.preferences.bgmVolume,
            existingData.preferences.seVolume
          );
          // SoundManagerの内部音量もFirebase値で更新
          SoundManager.getInstance().refreshVolumes();
        }
        if (existingData.progress) {
          StoryProgress.getInstance().applyFirebaseData(
            existingData.progress.lastClearedSectionId,
            existingData.progress.currentChapterId
          );
        }
        if (existingData.playerStatus) {
          PlayerStatus.getInstance().applyFirebaseData(
            existingData.playerStatus.level,
            existingData.playerStatus.currentExp
          );
        }
        if (existingData.equipment) {
          EquipmentService.getInstance().applyFirebaseData(
            existingData.equipment.ownedIds,
            existingData.equipment.equippedId
          );
        } else {
          // 既存ユーザーでequipmentフィールドが無い場合、デフォルト値を設定
          EquipmentService.getInstance().applyFirebaseData(
            [...DEFAULT_OWNED_EQUIPMENT_IDS],
            null
          );
        }
        // チュートリアル完了状態を読み込み
        TutorialService.getInstance().loadFromUserData(existingData.tutorials);
      } else {
        console.log('[UserNameScreen] New user, creating default data:', userName);
        // 新規ユーザーの場合、デフォルトデータを保存
        const defaultData = userDataService.getDefaultUserData();
        await userDataService.saveUserData(userName, defaultData);
      }

      // タイトル画面へ遷移
      this.navigateTo('title');
    } catch (error) {
      console.error('[UserNameScreen] Error during submission:', error);
      this.setError('Connection error. Please try again.');
      this.setSubmitEnabled(true);
      if (this.submitButton) {
        this.submitButton.textContent = 'START ADVENTURE';
      }
    }
  }
}
