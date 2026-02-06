/**
 * TutorialService - チュートリアル表示済み管理サービス
 *
 * 表示済みチュートリアルIDをキャッシュし、
 * UserDataService経由でFirestoreに永続化する。
 */

import { UserDataService } from '../firebase/UserDataService';
import { UserSession } from './UserSession';

export class TutorialService {
  private static instance: TutorialService | null = null;

  private completedIds: Set<string> = new Set();
  private userDataService: UserDataService;

  private constructor() {
    this.userDataService = UserDataService.getInstance();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): TutorialService {
    if (!TutorialService.instance) {
      TutorialService.instance = new TutorialService();
    }
    return TutorialService.instance;
  }

  /**
   * UserDataから読み込んで初期化
   */
  loadFromUserData(tutorials: { completedIds: string[] } | undefined): void {
    this.completedIds.clear();
    if (tutorials?.completedIds) {
      for (const id of tutorials.completedIds) {
        this.completedIds.add(id);
      }
    }
    console.log('[TutorialService] Loaded completed tutorials:', Array.from(this.completedIds));
  }

  /**
   * 指定IDのチュートリアルが表示済みかどうか
   */
  isCompleted(id: string): boolean {
    return this.completedIds.has(id);
  }

  /**
   * 指定IDを表示済みとしてマーク（キャッシュ更新＋非同期保存）
   */
  markCompleted(id: string): void {
    if (this.completedIds.has(id)) {
      return;
    }

    this.completedIds.add(id);
    console.log('[TutorialService] Marked as completed:', id);

    // 非同期でFirestoreに保存
    this.saveToFirestore();
  }

  /**
   * 全チュートリアルをリセット
   */
  resetAll(): void {
    this.completedIds.clear();
    console.log('[TutorialService] Reset all tutorials');

    // 非同期でFirestoreに保存
    this.saveToFirestore();
  }

  /**
   * 現在の完了済みIDリストを取得
   */
  getCompletedIds(): string[] {
    return Array.from(this.completedIds);
  }

  /**
   * Firestoreに保存
   */
  private async saveToFirestore(): Promise<void> {
    const userName = UserSession.getInstance().getUserName();
    if (!userName) {
      console.warn('[TutorialService] No user name, skipping save');
      return;
    }

    const tutorials = { completedIds: Array.from(this.completedIds) };
    const success = await this.userDataService.saveTutorials(userName, tutorials);
    if (success) {
      console.log('[TutorialService] Saved to Firestore');
    }
  }
}
