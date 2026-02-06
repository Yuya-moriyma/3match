/**
 * UserDataService - ユーザーデータのFirestore永続化サービス
 *
 * preferences（音量設定）とprogress（ストーリー進行度）を
 * Firestoreに保存・読み込みする。
 */

import { FirebaseManager } from './FirebaseManager';
import { DEFAULT_OWNED_EQUIPMENT_IDS } from '../data/equipment';

// Firestore SDK URL
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// コレクション名
const USERS_COLLECTION = 'users';

/**
 * ユーザーデータの型定義
 */
export interface UserData {
  preferences: {
    bgmVolume: number;
    seVolume: number;
    testMode?: boolean;
  };
  progress: {
    lastClearedSectionId: string | null;
    currentChapterId: string | null;
  };
  playerStatus: {
    level: number;
    currentExp: number;
  };
  equipment: {
    ownedIds: string[];
    equippedId: string | null;
  };
  tutorials: {
    completedIds: string[];
  };
  updatedAt?: unknown; // Firestore Timestamp
}

/**
 * デフォルトのユーザーデータ
 */
const DEFAULT_USER_DATA: UserData = {
  preferences: {
    bgmVolume: 0.5,
    seVolume: 0.5,
    testMode: false,
  },
  progress: {
    lastClearedSectionId: null,
    currentChapterId: null,
  },
  playerStatus: {
    level: 1,
    currentExp: 0,
  },
  equipment: {
    ownedIds: [...DEFAULT_OWNED_EQUIPMENT_IDS],
    equippedId: null,
  },
  tutorials: {
    completedIds: [],
  },
};

export class UserDataService {
  private static instance: UserDataService | null = null;

  private firebaseManager: FirebaseManager;

  private constructor() {
    this.firebaseManager = FirebaseManager.getInstance();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): UserDataService {
    if (!UserDataService.instance) {
      UserDataService.instance = new UserDataService();
    }
    return UserDataService.instance;
  }

  /**
   * ユーザーデータを読み込み
   * @param userName ユーザー名
   * @returns ユーザーデータ（存在しない場合はnull）
   */
  async loadUserData(userName: string): Promise<UserData | null> {
    if (!await this.firebaseManager.init()) {
      console.warn('[UserDataService] Firebase not initialized, returning null');
      return null;
    }

    try {
      const { doc, getDoc } = await import(/* @vite-ignore */ FIREBASE_FIRESTORE_URL);
      const db = this.firebaseManager.getFirestore();

      const docRef = doc(db, USERS_COLLECTION, userName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        console.log('[UserDataService] Loaded user data for:', userName);
        return data;
      } else {
        console.log('[UserDataService] No data found for:', userName);
        return null;
      }
    } catch (error) {
      console.error('[UserDataService] Failed to load user data:', error);
      return null;
    }
  }

  /**
   * ユーザーデータを保存
   * @param userName ユーザー名
   * @param data 保存するデータ
   * @returns 保存成功したかどうか
   */
  async saveUserData(userName: string, data: Partial<UserData>): Promise<boolean> {
    if (!await this.firebaseManager.init()) {
      console.warn('[UserDataService] Firebase not initialized, skipping save');
      return false;
    }

    try {
      const { doc, setDoc, serverTimestamp } = await import(/* @vite-ignore */ FIREBASE_FIRESTORE_URL);
      const db = this.firebaseManager.getFirestore();

      const docRef = doc(db, USERS_COLLECTION, userName);

      // 既存データとマージして保存
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('[UserDataService] Saved user data for:', userName);
      return true;
    } catch (error) {
      console.error('[UserDataService] Failed to save user data:', error);
      return false;
    }
  }

  /**
   * preferences（音量設定）のみを保存
   */
  async savePreferences(
    userName: string,
    preferences: UserData['preferences']
  ): Promise<boolean> {
    return this.saveUserData(userName, { preferences });
  }

  /**
   * progress（ストーリー進行度）のみを保存
   */
  async saveProgress(
    userName: string,
    progress: UserData['progress']
  ): Promise<boolean> {
    return this.saveUserData(userName, { progress });
  }

  /**
   * playerStatus（レベル・経験値）のみを保存
   */
  async savePlayerStatus(
    userName: string,
    playerStatus: UserData['playerStatus']
  ): Promise<boolean> {
    return this.saveUserData(userName, { playerStatus });
  }

  /**
   * equipment（装備データ）のみを保存
   */
  async saveEquipment(
    userName: string,
    equipment: UserData['equipment']
  ): Promise<boolean> {
    return this.saveUserData(userName, { equipment });
  }

  /**
   * tutorials（チュートリアル完了状態）のみを保存
   */
  async saveTutorials(
    userName: string,
    tutorials: UserData['tutorials']
  ): Promise<boolean> {
    return this.saveUserData(userName, { tutorials });
  }

  /**
   * デフォルトのユーザーデータを取得
   */
  getDefaultUserData(): UserData {
    return { ...DEFAULT_USER_DATA };
  }
}
