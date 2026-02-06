/**
 * ストーリー機能の型定義
 */

/**
 * 会話データ - 各セリフの情報
 */
export interface Dialogue {
  /** 話者の名前（空文字でナレーション） */
  speaker: string;
  /** セリフ本文 */
  text: string;
  /** 立ち絵表示用のキャラクターID（将来拡張用） */
  characterId?: string;
}

/**
 * 敵設定 - 節ごとに敵キャラクターを定義
 */
export interface EnemyConfig {
  /** 敵の一意識別子（レジストリのキーとして使用） */
  id: string;
  /** 敵の名前 */
  name: string;
  /** 体力 */
  hp: number;
  /** 通常攻撃ダメージ量 */
  normalAttack: number;
  /** 通常攻撃発動までの操作回数 */
  attackInterval: number;
  /** 特殊スキル発動までの操作回数 */
  skillInterval: number;
}

/**
 * 戦闘設定 - 戦闘が存在する節に付与
 */
export interface BattleConfig {
  /** 敵ID（敵マスターデータから解決） */
  enemyId: string;
  /** ステージ識別子（将来の拡張用） */
  stageId?: string;
  /** 戦闘クリア時の獲得経験値 */
  expReward?: number;
}

/**
 * 節 - ストーリーの最小単位
 */
export interface Section {
  /** 節ID（命名規則: {chapterId}-{sectionNumber}） */
  id: string;
  /** 節タイトル */
  title: string;
  /** 会話データ（任意） */
  dialogues?: Dialogue[];
  /** 戦闘設定（任意） */
  battle?: BattleConfig;
}

/**
 * 章 - 複数の節をまとめる
 */
export interface Chapter {
  /** 章ID */
  id: string;
  /** 章タイトル */
  title: string;
  /** この章に含まれる節 */
  sections: Section[];
}

/**
 * ストーリー進行度データ
 */
export interface StoryProgressData {
  /** 最後にクリアした節ID */
  lastClearedSectionId: string | null;
  /** 現在の章ID（UI表示用） */
  currentChapterId: string | null;
}
