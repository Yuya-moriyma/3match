import { TileType, ActionType, BonusDirection } from '../types';
import { PARCHMENT_ORB_COLORS } from '../theme';

/**
 * タイルカラー定義
 * Classic Parchment トーンのオーブカラー（暖かみのあるセピア調）
 */
export const TILE_COLORS: Record<TileType, number> = {
  [TileType.RED]: PARCHMENT_ORB_COLORS.main.red,
  [TileType.BLUE]: PARCHMENT_ORB_COLORS.main.blue,
  [TileType.GREEN]: PARCHMENT_ORB_COLORS.main.green,
  [TileType.YELLOW]: PARCHMENT_ORB_COLORS.main.yellow,
  [TileType.ORANGE]: PARCHMENT_ORB_COLORS.main.orange,
  [TileType.OJAMA]: PARCHMENT_ORB_COLORS.main.ojama,
  [TileType.POISON]: PARCHMENT_ORB_COLORS.main.poison,
};

export const TILE_HIGHLIGHT_COLORS: Record<TileType, number> = {
  [TileType.RED]: PARCHMENT_ORB_COLORS.highlight.red,
  [TileType.BLUE]: PARCHMENT_ORB_COLORS.highlight.blue,
  [TileType.GREEN]: PARCHMENT_ORB_COLORS.highlight.green,
  [TileType.YELLOW]: PARCHMENT_ORB_COLORS.highlight.yellow,
  [TileType.ORANGE]: PARCHMENT_ORB_COLORS.highlight.orange,
  [TileType.OJAMA]: PARCHMENT_ORB_COLORS.highlight.ojama,
  [TileType.POISON]: PARCHMENT_ORB_COLORS.highlight.poison,
};

export const TILE_SHADOW_COLORS: Record<TileType, number> = {
  [TileType.RED]: PARCHMENT_ORB_COLORS.shadow.red,
  [TileType.BLUE]: PARCHMENT_ORB_COLORS.shadow.blue,
  [TileType.GREEN]: PARCHMENT_ORB_COLORS.shadow.green,
  [TileType.YELLOW]: PARCHMENT_ORB_COLORS.shadow.yellow,
  [TileType.ORANGE]: PARCHMENT_ORB_COLORS.shadow.orange,
  [TileType.OJAMA]: PARCHMENT_ORB_COLORS.shadow.ojama,
  [TileType.POISON]: PARCHMENT_ORB_COLORS.shadow.poison,
};

export const TILE_MID_COLORS: Record<TileType, number> = {
  [TileType.RED]: PARCHMENT_ORB_COLORS.mid.red,
  [TileType.BLUE]: PARCHMENT_ORB_COLORS.mid.blue,
  [TileType.GREEN]: PARCHMENT_ORB_COLORS.mid.green,
  [TileType.YELLOW]: PARCHMENT_ORB_COLORS.mid.yellow,
  [TileType.ORANGE]: PARCHMENT_ORB_COLORS.mid.orange,
  [TileType.OJAMA]: PARCHMENT_ORB_COLORS.mid.ojama,
  [TileType.POISON]: PARCHMENT_ORB_COLORS.mid.poison,
};

export const TILE_LIGHT_COLORS: Record<TileType, number> = {
  [TileType.RED]: PARCHMENT_ORB_COLORS.light.red,
  [TileType.BLUE]: PARCHMENT_ORB_COLORS.light.blue,
  [TileType.GREEN]: PARCHMENT_ORB_COLORS.light.green,
  [TileType.YELLOW]: PARCHMENT_ORB_COLORS.light.yellow,
  [TileType.ORANGE]: PARCHMENT_ORB_COLORS.light.orange,
  [TileType.OJAMA]: PARCHMENT_ORB_COLORS.light.ojama,
  [TileType.POISON]: PARCHMENT_ORB_COLORS.light.poison,
};

/**
 * アクションタイプの重み（攻撃5:回復3:スキル2）
 */
export const ACTION_TYPE_WEIGHTS: { type: ActionType; weight: number }[] = [
  { type: ActionType.ATTACK, weight: 5 },
  { type: ActionType.SKILL, weight: 2 },
  { type: ActionType.HEAL, weight: 3 },
];

export const ACTION_TYPE_TOTAL_WEIGHT = ACTION_TYPE_WEIGHTS.reduce(
  (sum, w) => sum + w.weight,
  0
);

/**
 * アクションアイコンのオフセット設定（X, Y）
 */
export const ACTION_ICON_OFFSETS: Record<ActionType, { x: number; y: number }> = {
  [ActionType.ATTACK]: { x: 0, y: 5 },
  [ActionType.SKILL]: { x: 0, y: 5 },
  [ActionType.HEAL]: { x: 0, y: 6 },
};

/**
 * ボーナスオーブアイコンのオフセット設定（X, Y）
 */
export const BONUS_ICON_OFFSETS: Record<BonusDirection, { x: number; y: number }> = {
  [BonusDirection.HORIZONTAL]: { x: 0, y: 5 },
  [BonusDirection.VERTICAL]: { x: 0, y: 5 },
};

/**
 * ボーナスオーブ爆発設定
 */
export const BONUS_EXPLOSION_DELAY_MS = 50; // 起爆地点から各オーブへの爆発遅延（1マスあたりのミリ秒）
export const BOARD_SHAKE_INTENSITY = 4; // 盤面シェイクの強さ（ピクセル）
export const BOARD_SHAKE_DURATION_MS = 30; // シェイク1回の持続時間
export const BOARD_SHAKE_COUNT = 4; // シェイク回数

/**
 * アニメーション設定
 */
export const COUNT_UP_INTERVAL_MS = 60; // カウントアップアニメーションの間隔
export const COUNTDOWN_INTERVAL_MS = 40; // カウントダウンアニメーションの間隔
export const DROP_SOUND_DEBOUNCE_MS = 100; // 落下SE再生のデバウンス間隔

/**
 * バトル設定
 */
export const INITIAL_PLAYER_HP = 100;
export const INITIAL_ENEMY_HP = 300;
export const INITIAL_ENEMY_ACTION_COUNTER = 3;
export const INITIAL_ENEMY_ATTACK_INTERVAL = 2;
export const ATTACK_DAMAGE = 30;
export const ENEMY_ATTACK_DAMAGE = 20;
export const HEAL_AMOUNT = 30;
export const ACTION_TRIGGER_THRESHOLD = 10;

/**
 * アニメーション共通設定（ミリ秒）
 */
export const ANIM = {
  // HP バー
  HP_BAR_DURATION: 300,
  HP_PULSE_DURATION: 600,

  // カウンター警告
  COUNTER_WARNING_SHAKE_DURATION: 100,
  COUNTER_GLOW_DURATION: 400,

  // アクションカウント
  ACTION_PULSE_DURATION: 800,

  // エフェクト
  EFFECT_FADE_IN_DURATION: 150,
  EFFECT_FADE_OUT_DURATION: 300,
  EFFECT_SCALE_DURATION: 200,

  // マッチ処理後の遅延
  NORMAL_MATCH_DELAY: 250,
  BONUS_MATCH_DELAY: 300,

  // 爆発遅延
  EXPLOSION_DISTANCE_DELAY: 50,
} as const;
