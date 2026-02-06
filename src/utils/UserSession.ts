/**
 * UserSession - ユーザーセッション管理
 *
 * ユーザー名をCookieに保存し、セッションを管理する。
 * Cookieは自動ログインではなく、ユーザー名入力欄のprefill用。
 * 毎回起動時にユーザー名入力を求め、Cookieの名前を入力欄に自動入力する。
 */

const COOKIE_NAME = 'user_session';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1年間（秒）

export class UserSession {
  private static instance: UserSession | null = null;

  private userName: string | null = null;

  private constructor() {
    this.load();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): UserSession {
    if (!UserSession.instance) {
      UserSession.instance = new UserSession();
    }
    return UserSession.instance;
  }

  /**
   * ユーザー名を取得
   */
  getUserName(): string | null {
    return this.userName;
  }

  /**
   * ユーザー名を設定・保存
   */
  setUserName(name: string): void {
    this.userName = name.trim().substring(0, 20); // 最大20文字
    this.save();
  }

  /**
   * ログイン済みかどうか
   */
  isLoggedIn(): boolean {
    return this.userName !== null && this.userName.length > 0;
  }

  /**
   * ログアウト（セッションをクリア）
   */
  logout(): void {
    this.userName = null;
    this.clearCookie();
  }

  /**
   * Cookieから読み込み
   */
  private load(): void {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === COOKIE_NAME && value) {
          this.userName = decodeURIComponent(value);
          break;
        }
      }
    } catch {
      this.userName = null;
    }
  }

  /**
   * Cookieに保存
   */
  private save(): void {
    try {
      if (this.userName) {
        const value = encodeURIComponent(this.userName);
        document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
      }
    } catch {
      // 保存失敗時は無視
    }
  }

  /**
   * Cookieを削除
   */
  private clearCookie(): void {
    document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
  }
}
