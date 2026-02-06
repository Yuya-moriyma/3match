import Phaser from 'phaser';
import { TileType, ActionType, BonusDirection, BonusType } from '../../types';

/**
 * タイルデータ構造
 * 盤面上の各タイルの状態を表す
 */
export interface Tile {
  row: number;
  col: number;
  type: TileType;
  actionType: ActionType;
  container: Phaser.GameObjects.Container;
  isBonus: boolean;
  bonusDirection?: BonusDirection;
  bonusType?: BonusType;
  isLocked?: boolean;
  isFrozen?: boolean;
}

/**
 * マッチグループ
 * 連続してマッチしたタイルのグループ情報
 */
export interface MatchGroup {
  tiles: { row: number; col: number }[];
  direction: BonusDirection;
  length: number;
  type: TileType;
}

/**
 * ボーナス生成位置情報
 */
export interface BonusPosition {
  row: number;
  col: number;
  direction?: BonusDirection;
  type: TileType;
  bonusType: BonusType;
}

/**
 * アクションカウント
 */
export interface ActionCounts {
  attack: number;
  skill: number;
  heal: number;
}

/**
 * 統合マッチグループ（L字・T字・十字形など交差するグループ）
 */
export interface MergedMatchGroup {
  groups: MatchGroup[];
  allTiles: { row: number; col: number }[];
  totalCount: number;
  intersections: { row: number; col: number }[];
  type: TileType;
}

/**
 * アクションカウント可能なタイルか判定
 * ボーナスオーブ、お邪魔オーブ、毒オーブはカウント対象外
 */
export function isCountableTile(tile: Tile): boolean {
  return !tile.isBonus && tile.type !== TileType.OJAMA && tile.type !== TileType.POISON;
}

/**
 * 座標配列からアクションカウントを集計する
 * お邪魔オーブ・ボーナスオーブ・氷漬けオーブは除外
 */
export function collectActionCounts(
  positions: { row: number; col: number }[],
  getTile: (row: number, col: number) => Tile | null
): ActionCounts {
  const counts: ActionCounts = { attack: 0, skill: 0, heal: 0 };
  for (const { row, col } of positions) {
    const tile = getTile(row, col);
    if (tile && isCountableTile(tile) && !tile.isFrozen) {
      switch (tile.actionType) {
        case ActionType.ATTACK:
          counts.attack++;
          break;
        case ActionType.SKILL:
          counts.skill++;
          break;
        case ActionType.HEAL:
          counts.heal++;
          break;
      }
    }
  }
  return counts;
}
