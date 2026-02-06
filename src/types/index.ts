import { SoundKey } from '../utils/SoundManager';

// タイルの種類（5種類 + お邪魔 + 毒）
export enum TileType {
  RED = 0,
  BLUE = 1,
  GREEN = 2,
  YELLOW = 3,
  ORANGE = 4,
  OJAMA = 5,
  POISON = 6,
}

// タイルの状態
export interface TileData {
  row: number;
  col: number;
  type: TileType;
}

// 盤面の定数
export const BOARD_COLS = 8;
export const BOARD_ROWS = 8;
export const TILE_SIZE = 72;
export const TILE_TYPES_COUNT = 5;

// ボーナスパネルの方向
export enum BonusDirection {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

// ボーナスタイプ（4個マッチ: LINE、5個以上マッチ: BOMB）
export enum BonusType {
  LINE = 'line',
  BOMB = 'bomb',
}

// アクションタイプ（オーブの効果タイプ）
export enum ActionType {
  ATTACK = 0,  // 攻撃
  SKILL = 1,   // スキル
  HEAL = 2,    // 回復
}

// アクションタイプの数
export const ACTION_TYPES_COUNT = 3;

// ゲーム状態
export interface GameState {
  playerHP: number;
  enemyHP: number;
  moveCount: number;
}

// スキル効果の種類
export enum SkillEffectType {
  CREATE_BOMB = 'create_bomb',              // ランダムマスをボムに変える
  CONVERT_COLOR = 'convert_color',          // 色変換
  FREEZE_ENEMY_COUNTER = 'freeze_enemy_counter',  // 敵のカウンター進行を停止
  GENERATE_COLOR = 'generate_color',        // 指定色オーブを生成（全オーブ対象）
}

// スキル定義
export interface Skill {
  name: string;                    // スキル名
  description: string;             // スキル説明
  cost: number;                    // 発動に必要なスキルカウント
  effectType: SkillEffectType;     // スキル効果タイプ
  effectParams?: {                 // スキル効果のパラメータ
    fromColor?: TileType;          // 変換元の色（色変換用）
    toColor?: TileType;            // 変換先の色（色変換用）
    targetColor?: TileType;        // 生成する色（GENERATE_COLOR用）
    count?: number;                // 効果対象数（ボム生成、GENERATE_COLORなど）
    duration?: number;             // 持続ターン数（カウンター停止用）
  };
}

// 敵スキル効果の種類
export enum EnemySkillEffectType {
  HEAVY_ATTACK = 'heavy_attack',      // 強力な単体攻撃（通常攻撃のN倍ダメージ）
  BOARD_SHUFFLE = 'board_shuffle',    // 盤面シャッフル（全タイルの配置をランダムに入れ替え）
  TILE_LOCK = 'tile_lock',            // タイルロック（ランダムなタイルを数個選び、一定操作回数の間交換不可）
  POISON = 'poison',                  // 毒付与（数ターンの間、毎操作追加ダメージ）
  OJAMA_CONVERT = 'ojama_convert',    // お邪魔オーブ変換（通常オーブをお邪魔オーブに変換）
  FREEZE = 'freeze',                  // 氷漬け（通常オーブを氷漬けにして入れ替え不可・マッチ時は氷解除のみ）
  POISON_CONVERT = 'poison_convert',  // 毒オーブ変換（通常オーブを毒オーブに変換）
}

// 敵スキル定義
export interface EnemySkillDef {
  id: string;                          // スキル識別子
  name: string;                        // スキル表示名（演出表示用）
  effectType: EnemySkillEffectType;    // 効果種別
  skillSe?: SoundKey;                  // スキル発動SE（サウンドキー）
  params: {                            // 効果パラメータ
    multiplier?: number;               // ダメージ倍率（HEAVY_ATTACK用）
    fixedDamage?: number;              // 固定ダメージ（HEAVY_ATTACK用、指定時はmultiplierより優先）
    count?: number;                    // ロック個数（TILE_LOCK用）
    duration?: number;                 // 効果持続操作回数（TILE_LOCK, POISON用）
    damagePerTurn?: number;            // ターンあたりダメージ（POISON用）
    ojamaCount?: number;               // 変換するお邪魔オーブの数（OJAMA_CONVERT用）
    freezeCount?: number;              // 氷漬けにするオーブの数（FREEZE用）
    poisonCount?: number;              // 変換する毒オーブの数（POISON_CONVERT用）
  };
}

// キャラクター定義
export interface Character {
  id: string;                      // キャラクターID
  name: string;                    // キャラクター名
  attackPower: number;             // 攻撃力（アクション発動時のダメージ）
  healPower: number;               // 回復力（アクション発動時の回復量）
  skill: Skill;                    // キャラクター固有スキル
  color: number;                   // キャラクター固有カラー（演出用）
  skillSe?: SoundKey;              // スキル発動SE（サウンドキー）
  skillSeDuration?: number;        // スキルSEの再生秒数（指定時間で停止）
}

// プレイヤーステータスデータ
export interface PlayerStatusData {
  level: number;        // プレイヤーレベル（初期値: 1）
  currentExp: number;   // 現在の累積経験値（初期値: 0）
}

// 経験値カーブ設定
export interface ExpCurveConfig {
  maxLevel: number;                           // 最大レベル
  needAtLevel1: number;                       // Lv1→2に必要なEXP
  needAtLevelMaxMinus1: number;               // Lv(max-1)→maxに必要なEXP
  q: number;                                  // 10Lv帯ごとの倍率上昇率
  rounding?: 'round' | 'floor' | 'ceil';      // 必要EXPの整数化方式（既定: "round"）
}

// 生成された経験値テーブル
export interface ExpTables {
  needToNext: number[];     // 各レベルの次レベルへの必要EXP
  totalToReach: number[];   // 各レベル到達に必要な累計EXP
}

// 装備品の効果種別
export enum EquipmentEffectType {
  ATK_UP = 'atk_up',                   // 攻撃力上昇
  SKILL_COST_DOWN = 'skill_cost_down', // スキルコスト減少
  HP_UP = 'hp_up',                     // HP上昇
  HEAL_UP = 'heal_up',                 // 回復力上昇
  ATK_COST_DOWN = 'atk_cost_down',     // 攻撃コスト減少
  HEAL_COST_DOWN = 'heal_cost_down',   // 回復コスト減少
}

// 装備品定義
export interface Equipment {
  id: string;                          // 装備品ID
  name: string;                        // 装備品名
  description: string;                 // 装備品説明
  effectType: EquipmentEffectType;     // 効果種別
  effectValue: number;                 // 効果値
  icon: string;                        // Material Symbolsアイコン名
  iconRotate?: number;                 // アイコン回転角度(deg)
  rarity: number;                      // レアリティ（1=一般, 2=レア, 3=Sレア）
}
