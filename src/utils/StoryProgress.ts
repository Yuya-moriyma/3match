/**
 * StoryProgress - ストーリー進行度の永続化管理
 *
 * メモリでストーリー進行度を管理し、Firebaseへの同期機能を提供する。
 * Cookieは使用せず、データの永続化はFirebaseで一元管理。
 * PlayerPreferencesと同様のシングルトンパターン。
 */

import { Chapter, Section } from '../types/story';
import { chapters, getFirstSection } from '../data/story';
import { UserSession } from './UserSession';
import { UserDataService } from '../firebase/UserDataService';

export class StoryProgress {
  private static instance: StoryProgress | null = null;

  private lastClearedSectionId: string | null = null;
  private currentChapterId: string | null = null;

  private constructor() {
    // デフォルト値で初期化（Cookieからの読み込みは行わない）
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): StoryProgress {
    if (!StoryProgress.instance) {
      StoryProgress.instance = new StoryProgress();
    }
    return StoryProgress.instance;
  }

  /**
   * 最終クリア節IDを取得
   */
  getLastClearedSectionId(): string | null {
    return this.lastClearedSectionId;
  }

  /**
   * 現在の章IDを取得
   */
  getCurrentChapterId(): string | null {
    return this.currentChapterId;
  }

  /**
   * 節をクリア済みにマーク
   */
  markSectionCleared(sectionId: string): void {
    this.lastClearedSectionId = sectionId;
    // 章IDも更新
    for (const chapter of chapters) {
      if (chapter.sections.some((s) => s.id === sectionId)) {
        this.currentChapterId = chapter.id;
        break;
      }
    }
    this.syncToFirebase();
  }

  /**
   * 現在の章を設定
   */
  setCurrentChapter(chapterId: string): void {
    this.currentChapterId = chapterId;
    this.syncToFirebase();
  }

  /**
   * 節が解放済みかどうか判定
   * 最初の節は常に解放、それ以外は前の節がクリア済みなら解放
   */
  isSectionUnlocked(sectionId: string): boolean {
    const firstSection = getFirstSection();
    if (sectionId === firstSection.id) {
      return true;
    }

    // 全章・全節を順番に走査
    let previousSectionId: string | null = null;
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        if (section.id === sectionId) {
          // 前の節がクリア済みなら解放
          return previousSectionId === this.lastClearedSectionId;
        }
        previousSectionId = section.id;
      }
    }

    return false;
  }

  /**
   * 章が解放済みかどうか判定
   * 章の最初の節が解放済みなら、その章は解放済み
   */
  isChapterUnlocked(chapterId: string): boolean {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter || chapter.sections.length === 0) {
      return false;
    }
    return this.isSectionUnlocked(chapter.sections[0].id);
  }

  /**
   * 解放済み節リストを取得
   */
  getUnlockedSections(): Section[] {
    const unlocked: Section[] = [];
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        if (this.isSectionUnlocked(section.id)) {
          unlocked.push(section);
        }
      }
    }
    return unlocked;
  }

  /**
   * 解放済み章リストを取得
   */
  getUnlockedChapters(): Chapter[] {
    return chapters.filter((chapter) => this.isChapterUnlocked(chapter.id));
  }

  /**
   * 次にプレイすべき節を取得
   * （未クリアで解放済みの最初の節）
   */
  getNextPlayableSection(): Section | null {
    const firstSection = getFirstSection();

    // 何もクリアしていない場合は最初の節
    if (!this.lastClearedSectionId) {
      return firstSection;
    }

    // クリア済み節の次の節を探す
    let foundCleared = false;
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        if (foundCleared) {
          return section; // クリア済みの次の節
        }
        if (section.id === this.lastClearedSectionId) {
          foundCleared = true;
        }
      }
    }

    // 全節クリア済みの場合はnull
    return null;
  }

  /**
   * 進行度をリセット（デバッグ用）
   */
  reset(): void {
    this.lastClearedSectionId = null;
    this.currentChapterId = null;
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

      if (userData?.progress) {
        const { lastClearedSectionId, currentChapterId } = userData.progress;
        this.lastClearedSectionId = lastClearedSectionId ?? null;
        this.currentChapterId = currentChapterId ?? null;
        console.log('[StoryProgress] Loaded from Firebase');
        return true;
      }
    } catch (error) {
      console.error('[StoryProgress] Failed to load from Firebase:', error);
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
      .saveProgress(userName, {
        lastClearedSectionId: this.lastClearedSectionId,
        currentChapterId: this.currentChapterId,
      })
      .catch((error) => {
        console.warn('[StoryProgress] Firebase sync failed:', error);
      });
  }

  /**
   * Firebaseからの値で上書き（外部から呼び出し用）
   */
  applyFirebaseData(
    lastClearedSectionId: string | null,
    currentChapterId: string | null
  ): void {
    this.lastClearedSectionId = lastClearedSectionId;
    this.currentChapterId = currentChapterId;
  }
}
