/**
 * PlayerPreferences - プレイヤー設定の永続化管理
 *
 * メモリで設定を管理し、Cookie + Firebaseへの同期機能を提供する。
 * Cookieは即時復元用（ネットワーク不要）、Firebaseはクロスデバイス永続化用。
 * 設定項目: BGM音量、SE音量
 */

import { UserSession } from './UserSession';
import { UserDataService } from '../firebase/UserDataService';

const DEFAULT_VOLUME = 0.5;
const COOKIE_BGM_VOLUME = 'pref_bgm_volume';
const COOKIE_SE_VOLUME = 'pref_se_volume';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1年間（秒）

export class PlayerPreferences {
  private static instance: PlayerPreferences | null = null;

  private bgmVolume: number = DEFAULT_VOLUME;
  private seVolume: number = DEFAULT_VOLUME;
  private testMode: boolean = false;

  private constructor() {
    // Cookieから音量を復元（なければデフォルト値を維持）
    this.loadFromCookie();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): PlayerPreferences {
    if (!PlayerPreferences.instance) {
      PlayerPreferences.instance = new PlayerPreferences();
    }
    return PlayerPreferences.instance;
  }

  /**
   * BGM音量を取得
   * @returns 0.0 - 1.0
   */
  getBgmVolume(): number {
    return this.bgmVolume;
  }

  /**
   * SE音量を取得
   * @returns 0.0 - 1.0
   */
  getSeVolume(): number {
    return this.seVolume;
  }

  /**
   * BGM音量を設定・保存
   * @param volume 0.0 - 1.0
   */
  setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    this.saveToCookie();
    this.syncToFirebase();
  }

  /**
   * SE音量を設定・保存
   * @param volume 0.0 - 1.0
   */
  setSeVolume(volume: number): void {
    this.seVolume = Math.max(0, Math.min(1, volume));
    this.saveToCookie();
    this.syncToFirebase();
  }

  /**
   * テストモードを取得
   */
  getTestMode(): boolean {
    return this.testMode;
  }

  /**
   * テストモードを設定・保存
   */
  setTestMode(enabled: boolean): void {
    this.testMode = enabled;
    this.syncToFirebase();
  }

  /**
   * Firebaseからデータを読み込んでローカルに反映
   * @returns 読み込み成功したかどうか
   */
  async loadFromFirebase(): Promise<boolean> {
    const userName = UserSession.getInstance().getUserName();
    if (!userName) return false;

    try {
      const userDataService = UserDataService.getInstance();
      const userData = await userDataService.loadUserData(userName);

      if (userData?.preferences) {
        const { bgmVolume, seVolume, testMode } = userData.preferences;
        if (typeof bgmVolume === 'number') {
          this.bgmVolume = Math.max(0, Math.min(1, bgmVolume));
        }
        if (typeof seVolume === 'number') {
          this.seVolume = Math.max(0, Math.min(1, seVolume));
        }
        if (typeof testMode === 'boolean') {
          this.testMode = testMode;
        }
        console.log('[PlayerPreferences] Loaded from Firebase');
        return true;
      }
    } catch (error) {
      console.error('[PlayerPreferences] Failed to load from Firebase:', error);
    }

    return false;
  }

  /**
   * Firebaseにデータを同期（非同期・バックグラウンド）
   */
  private syncToFirebase(): void {
    const userName = UserSession.getInstance().getUserName();
    if (!userName) return;

    // バックグラウンドで同期（エラーは無視）
    UserDataService.getInstance()
      .savePreferences(userName, {
        bgmVolume: this.bgmVolume,
        seVolume: this.seVolume,
        testMode: this.testMode,
      })
      .catch((error) => {
        console.warn('[PlayerPreferences] Firebase sync failed:', error);
      });
  }

  /**
   * Firebaseからの値で上書き（外部から呼び出し用）
   */
  applyFirebaseData(bgmVolume: number, seVolume: number, testMode?: boolean): void {
    this.bgmVolume = Math.max(0, Math.min(1, bgmVolume));
    this.seVolume = Math.max(0, Math.min(1, seVolume));
    if (typeof testMode === 'boolean') {
      this.testMode = testMode;
    }
    // Firebase値でCookieも更新（syncToFirebaseは呼ばない）
    this.saveToCookie();
  }

  /**
   * Cookieから音量設定を読み込み
   */
  private loadFromCookie(): void {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === COOKIE_BGM_VOLUME && value !== undefined && value !== '') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            this.bgmVolume = Math.max(0, Math.min(1, parsed));
          }
        }
        if (name === COOKIE_SE_VOLUME && value !== undefined && value !== '') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            this.seVolume = Math.max(0, Math.min(1, parsed));
          }
        }
      }
    } catch {
      // パースエラー時はデフォルト値を維持
    }
  }

  /**
   * Cookieに音量設定を保存
   */
  private saveToCookie(): void {
    try {
      document.cookie = `${COOKIE_BGM_VOLUME}=${this.bgmVolume}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
      document.cookie = `${COOKIE_SE_VOLUME}=${this.seVolume}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    } catch {
      // 保存失敗時は無視
    }
  }
}
