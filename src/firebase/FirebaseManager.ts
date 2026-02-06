/**
 * FirebaseManager - Firebase初期化・接続管理
 *
 * CDN経由でFirebase SDKを動的インポートし、Firestoreへの接続を管理する。
 * シングルトンパターンで実装。
 */

import { firebaseConfig } from './FirebaseConfig';

// Firebase SDK CDN URLs
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firestore型定義（動的インポート用）
type Firestore = unknown;

export class FirebaseManager {
  private static instance: FirebaseManager | null = null;

  private db: Firestore | null = null;
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): FirebaseManager {
    if (!FirebaseManager.instance) {
      FirebaseManager.instance = new FirebaseManager();
    }
    return FirebaseManager.instance;
  }

  /**
   * Firebase初期化
   * @returns 初期化成功したかどうか
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  /**
   * 内部初期化処理
   */
  private async _doInit(): Promise<boolean> {
    try {
      const { initializeApp } = await import(/* @vite-ignore */ FIREBASE_APP_URL);
      const { getFirestore } = await import(/* @vite-ignore */ FIREBASE_FIRESTORE_URL);

      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);
      this.initialized = true;
      console.log('[Firebase] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Firebase] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Firestoreインスタンスを取得
   */
  getFirestore(): Firestore | null {
    return this.db;
  }

  /**
   * 初期化済みかどうか
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Firestore SDKのURLを取得（外部からのインポート用）
   */
  getFirestoreUrl(): string {
    return FIREBASE_FIRESTORE_URL;
  }
}
