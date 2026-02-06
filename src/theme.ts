/**
 * Classic Parchment テーマ定義
 * アプリケーション全体で使用する統一されたデザインテーマ
 */

export interface ThemeColors {
  // 背景系
  background: number;           // メイン背景色
  backgroundGradientTop: number;    // グラデーション上部
  backgroundGradientBottom: number; // グラデーション下部

  // 羊皮紙系
  parchment: number;            // 羊皮紙メイン色
  parchmentDark: number;        // 羊皮紙影色
  parchmentLight: number;       // 羊皮紙ハイライト

  // インク/テキスト系
  ink: number;                  // メインテキスト色
  inkLight: number;             // サブテキスト色

  // アクセント/装飾系
  accent: number;               // アクセント色（ボタン、装飾）
  accentDark: number;           // アクセント暗色
  accentLight: number;          // アクセントハイライト
  border: number;               // ボーダー色

  // 機能色
  success: number;              // 成功/HP（緑）
  danger: number;               // 危険/敵HP（赤）
  warning: number;              // 警告（黄）
  dangerCritical: number;       // HP低下時やターン残り1の警告色
  warningUrgent: number;        // ターン残り2の注意色

  // カウンター色
  counterAttack: number;        // 敵攻撃カウンター用テキスト色
  counterSkill: number;         // 敵スキルカウンター用テキスト色
  counterAttackBg: number;      // 敵攻撃カウンター背景色
  counterSkillBg: number;       // 敵スキルカウンター背景色

  // テキスト色（hex文字列）
  textPrimary: string;          // メインテキスト
  textSecondary: string;        // サブテキスト
  textAccent: string;           // アクセントテキスト
  textLight: string;            // 明るいテキスト
  textInfo: string;             // 戦闘情報テキスト色（白）
  textMuted: string;            // 装飾ラベル用の控えめテキスト色
}

// Dusty Parchment テーマカラー
export const THEME: ThemeColors = {
  // 背景系 - Dusty Parchment
  background: 0x2a1f14,
  backgroundGradientTop: 0x362a1c,
  backgroundGradientBottom: 0x1e160e,

  // 羊皮紙系 - アンティーク象牙
  parchment: 0xf0e0c8,
  parchmentDark: 0xdccfb0,
  parchmentLight: 0xf8f0e0,

  // インク/テキスト系 - セピアブラウン
  ink: 0x42301a,
  inkLight: 0x6b5030,

  // アクセント/装飾系 - バーントアンバー
  accent: 0x8b5a2b,
  accentDark: 0x6b4520,
  accentLight: 0xb8844a,
  border: 0x5a4530,

  // 機能色
  success: 0x4CAF50,            // 鮮やかな緑
  danger: 0xD84040,             // 明るく危機感のある赤
  warning: 0xc9a227,            // ゴールドイエロー
  dangerCritical: 0xFF5722,     // 鮮やかな赤橙（HP低下・残り1ターン）
  warningUrgent: 0xFFAB00,      // 強い黄色（残り2ターン）

  // カウンター色
  counterAttack: 0xFF8A65,      // 暖色オレンジ（敵攻撃カウンター）
  counterSkill: 0xCE93D8,       // ラベンダー（敵スキルカウンター）
  counterAttackBg: 0x5a2020,    // 暗い赤茶（攻撃カウンター背景）
  counterSkillBg: 0x3a2050,     // 暗い紫茶（スキルカウンター背景）

  // テキスト色（hex文字列）
  textPrimary: '#42301a',       // セピアブラウン
  textSecondary: '#6b5030',     // ライトブラウン
  textAccent: '#b8844a',        // アンバー
  textLight: '#f0e0c8',         // アンティーク象牙
  textInfo: '#ffffff',          // 戦闘情報テキスト色（白）
  textMuted: '#8a7050',         // 装飾ラベル用の控えめテキスト色
};

// オーブ用のクラシックパーチメントトーンカラー
// より暖かみのあるセピア調に調整
export const PARCHMENT_ORB_COLORS = {
  // メインカラー（より暖かく、落ち着いたトーン）
  main: {
    red: 0xb03030,        // ワインレッド
    blue: 0x2a5a7a,       // ティールブルー
    green: 0x4a7a3a,      // モスグリーン
    yellow: 0xb89a30,     // ゴールデンイエロー
    purple: 0x6a3a7a,     // プラムパープル
    orange: 0xb86a30,     // バーントオレンジ
    ojama: 0x5a5a5a,      // 暗いグレー（石のような色合い）
    poison: 0x4a1850,     // ダークパープル（毒オーブ用、濃い紫）
  },
  // ハイライトカラー
  highlight: {
    red: 0xd86060,
    blue: 0x5a8aaa,
    green: 0x7aaa6a,
    yellow: 0xd8c060,
    purple: 0x9a6aaa,
    orange: 0xd89a60,
    ojama: 0x8a8a8a,
    poison: 0x7a3080,     // 毒オーブハイライト
  },
  // シャドウカラー
  shadow: {
    red: 0x701818,
    blue: 0x183848,
    green: 0x284820,
    yellow: 0x786818,
    purple: 0x402050,
    orange: 0x784018,
    ojama: 0x2a2a2a,
    poison: 0x280830,     // 毒オーブシャドウ
  },
  // ミドルカラー
  mid: {
    red: 0x902828,
    blue: 0x204a6a,
    green: 0x3a6a2a,
    yellow: 0x988828,
    purple: 0x582a6a,
    orange: 0x985828,
    ojama: 0x4a4a4a,
    poison: 0x3a1040,     // 毒オーブミドル
  },
  // ライトカラー（アイコン用）
  light: {
    red: 0xf0d8d0,
    blue: 0xd0e0e8,
    green: 0xd8e8d0,
    yellow: 0xf0e8d0,
    purple: 0xe0d8e8,
    orange: 0xf0e0d0,
    ojama: 0xd8d8d8,
    poison: 0xe8d0f0,     // 毒オーブライト
  },
};

// ユーティリティ関数：数値カラーをhex文字列に変換
export function colorToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

// ユーティリティ関数：hex文字列を数値カラーに変換
export function hexToColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ユーティリティ関数：CSS変数から値を取得
export function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ユーティリティ関数：CSS変数から数値カラーを取得
export function getCSSColorAsNumber(name: string): number {
  const hex = getCSSVariable(name);
  return hexToColor(hex);
}
