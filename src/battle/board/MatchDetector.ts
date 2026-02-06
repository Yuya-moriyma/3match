import { BOARD_COLS, BOARD_ROWS, BonusDirection, BonusType, TileType } from '../../types';
import { Tile, MatchGroup, BonusPosition, MergedMatchGroup } from './types';

/**
 * マッチした座標の配列
 */
export type MatchedPositions = { row: number; col: number }[];

/**
 * MatchDetector - マッチ検出アルゴリズム
 * 純粋関数として実装し、盤面データを引数として受け取る
 */
export class MatchDetector {
  /**
   * タイルがマッチ対象外かどうかを判定（OJAMAはマッチしない）
   */
  private static isUnmatchable(tile: Tile | null): boolean {
    if (!tile) return true;
    return tile.type === TileType.OJAMA;
  }

  /**
   * 盤面上のマッチを検出
   * @param board 盤面データ（2次元配列）
   * @returns マッチした座標の配列
   */
  static findMatches(board: readonly (readonly (Tile | null)[])[]): MatchedPositions {
    const matches: MatchedPositions = [];
    const matched = new Set<string>();

    // 横方向チェック
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS - 2; col++) {
        const t1 = board[row][col];
        const t2 = board[row][col + 1];
        const t3 = board[row][col + 2];
        if (!this.isUnmatchable(t1) && !this.isUnmatchable(t2) && !this.isUnmatchable(t3) &&
            t1!.type === t2!.type && t2!.type === t3!.type) {
          matched.add(`${row},${col}`);
          matched.add(`${row},${col + 1}`);
          matched.add(`${row},${col + 2}`);
        }
      }
    }

    // 縦方向チェック
    for (let row = 0; row < BOARD_ROWS - 2; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const t1 = board[row][col];
        const t2 = board[row + 1][col];
        const t3 = board[row + 2][col];
        if (!this.isUnmatchable(t1) && !this.isUnmatchable(t2) && !this.isUnmatchable(t3) &&
            t1!.type === t2!.type && t2!.type === t3!.type) {
          matched.add(`${row},${col}`);
          matched.add(`${row + 1},${col}`);
          matched.add(`${row + 2},${col}`);
        }
      }
    }

    matched.forEach((key) => {
      const [row, col] = key.split(',').map(Number);
      matches.push({ row, col });
    });

    return matches;
  }

  /**
   * マッチグループを検出（連続するタイルのグループ情報を返す）
   * @param board 盤面データ（2次元配列）
   * @returns マッチグループの配列
   */
  static findMatchGroups(board: readonly (readonly (Tile | null)[])[]): MatchGroup[] {
    const groups: MatchGroup[] = [];

    // 横方向のマッチグループを検出
    for (let row = 0; row < BOARD_ROWS; row++) {
      let col = 0;
      while (col < BOARD_COLS) {
        const startTile = board[row][col];
        if (this.isUnmatchable(startTile)) {
          col++;
          continue;
        }

        let matchLength = 1;
        while (col + matchLength < BOARD_COLS) {
          const nextTile = board[row][col + matchLength];
          if (!this.isUnmatchable(nextTile) && nextTile!.type === startTile!.type) {
            matchLength++;
          } else {
            break;
          }
        }

        if (matchLength >= 3) {
          const tiles: { row: number; col: number }[] = [];
          for (let i = 0; i < matchLength; i++) {
            tiles.push({ row, col: col + i });
          }
          groups.push({
            tiles,
            direction: BonusDirection.HORIZONTAL,
            length: matchLength,
            type: startTile!.type,
          });
        }

        col += Math.max(1, matchLength);
      }
    }

    // 縦方向のマッチグループを検出
    for (let col = 0; col < BOARD_COLS; col++) {
      let row = 0;
      while (row < BOARD_ROWS) {
        const startTile = board[row][col];
        if (this.isUnmatchable(startTile)) {
          row++;
          continue;
        }

        let matchLength = 1;
        while (row + matchLength < BOARD_ROWS) {
          const nextTile = board[row + matchLength][col];
          if (!this.isUnmatchable(nextTile) && nextTile!.type === startTile!.type) {
            matchLength++;
          } else {
            break;
          }
        }

        if (matchLength >= 3) {
          const tiles: { row: number; col: number }[] = [];
          for (let i = 0; i < matchLength; i++) {
            tiles.push({ row: row + i, col });
          }
          groups.push({
            tiles,
            direction: BonusDirection.VERTICAL,
            length: matchLength,
            type: startTile!.type,
          });
        }

        row += Math.max(1, matchLength);
      }
    }

    return groups;
  }

  /**
   * 特定の位置がマッチに含まれているか確認
   */
  static isPositionInMatches(
    row: number,
    col: number,
    matches: MatchedPositions
  ): boolean {
    return matches.some((m) => m.row === row && m.col === col);
  }

  /**
   * マッチしたタイルからボーナスオーブを抽出
   */
  static extractBonusOrbs(
    board: readonly (readonly (Tile | null)[])[],
    matches: MatchedPositions
  ): Tile[] {
    const bonusOrbs: Tile[] = [];
    matches.forEach(({ row, col }) => {
      const tile = board[row][col];
      if (tile && tile.isBonus) {
        bonusOrbs.push(tile);
      }
    });
    return bonusOrbs;
  }

  /**
   * 交差するグループを統合してMergedMatchGroupを生成
   * 同じ色のグループ同士で共有タイルがあれば統合する
   */
  static mergeIntersectingGroups(groups: MatchGroup[]): {
    merged: MergedMatchGroup[];
    standalone: MatchGroup[];
  } {
    // 色別にグループを分類
    const groupsByType = new Map<number, MatchGroup[]>();
    for (const group of groups) {
      const existing = groupsByType.get(group.type) || [];
      existing.push(group);
      groupsByType.set(group.type, existing);
    }

    const merged: MergedMatchGroup[] = [];
    const standalone: MatchGroup[] = [];

    // 各色ごとに交差判定
    for (const [type, sameColorGroups] of groupsByType) {
      if (sameColorGroups.length < 2) {
        // 同色グループが1つのみなら交差なし
        standalone.push(...sameColorGroups);
        continue;
      }

      // Union-Findで交差するグループをクラスタリング
      const parent: number[] = sameColorGroups.map((_, i) => i);
      const find = (x: number): number => {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
      };
      const union = (a: number, b: number): void => {
        const pa = find(a);
        const pb = find(b);
        if (pa !== pb) parent[pa] = pb;
      };

      // 2つのグループが交差するか判定
      const hasIntersection = (g1: MatchGroup, g2: MatchGroup): boolean => {
        for (const t1 of g1.tiles) {
          for (const t2 of g2.tiles) {
            if (t1.row === t2.row && t1.col === t2.col) {
              return true;
            }
          }
        }
        return false;
      };

      // 全ペアで交差判定
      for (let i = 0; i < sameColorGroups.length; i++) {
        for (let j = i + 1; j < sameColorGroups.length; j++) {
          if (hasIntersection(sameColorGroups[i], sameColorGroups[j])) {
            union(i, j);
          }
        }
      }

      // クラスタごとにグループをまとめる
      const clusters = new Map<number, number[]>();
      for (let i = 0; i < sameColorGroups.length; i++) {
        const root = find(i);
        const existing = clusters.get(root) || [];
        existing.push(i);
        clusters.set(root, existing);
      }

      // 各クラスタを処理
      for (const indices of clusters.values()) {
        if (indices.length === 1) {
          // 単独グループ（交差なし）
          standalone.push(sameColorGroups[indices[0]]);
        } else {
          // 複数グループが交差 → 統合
          const clusterGroups = indices.map((i) => sameColorGroups[i]);
          const allTilesSet = new Set<string>();
          const intersectionsSet = new Set<string>();

          // 全タイルを収集
          for (const g of clusterGroups) {
            for (const t of g.tiles) {
              allTilesSet.add(`${t.row},${t.col}`);
            }
          }

          // 交差点を検出（複数グループに属するタイル）
          const tileCounts = new Map<string, number>();
          for (const g of clusterGroups) {
            for (const t of g.tiles) {
              const key = `${t.row},${t.col}`;
              tileCounts.set(key, (tileCounts.get(key) || 0) + 1);
            }
          }
          for (const [key, count] of tileCounts) {
            if (count > 1) {
              intersectionsSet.add(key);
            }
          }

          const allTiles = Array.from(allTilesSet).map((key) => {
            const [row, col] = key.split(',').map(Number);
            return { row, col };
          });

          const intersections = Array.from(intersectionsSet).map((key) => {
            const [row, col] = key.split(',').map(Number);
            return { row, col };
          });

          merged.push({
            groups: clusterGroups,
            allTiles,
            totalCount: allTiles.length,
            intersections,
            type: type,
          });
        }
      }
    }

    return { merged, standalone };
  }

  /**
   * ボーナス生成位置を計算（4つ以上のマッチでボーナスを生成）
   * 一直線4個マッチ: LINE（ライン消し）
   * 一直線5個以上マッチ: BOMB（爆弾）
   * L字・T字など交差形5個以上: BOMB（爆弾）
   * L字・T字など交差形4個以下: ボーナスなし
   */
  static calculateBonusPositions(
    groups: MatchGroup[],
    lastSwappedTile: { row: number; col: number } | null
  ): BonusPosition[] {
    const bonusPositions: BonusPosition[] = [];

    // 交差グループを統合
    const { merged, standalone } = this.mergeIntersectingGroups(groups);

    // 1. 統合グループの処理（L字・T字・十字形など）
    for (const mergedGroup of merged) {
      // 5個以上の場合のみBOMB生成
      if (mergedGroup.totalCount >= 5) {
        let bonusPos: { row: number; col: number } | null = null;

        // スワップしたタイルが含まれていればそこをボーナス位置にする
        if (lastSwappedTile) {
          const swapInGroup = mergedGroup.allTiles.find(
            (t) => t.row === lastSwappedTile.row && t.col === lastSwappedTile.col
          );
          if (swapInGroup) {
            bonusPos = swapInGroup;
          }
        }

        // スワップ位置がなければ交差点をボーナス位置にする
        if (!bonusPos && mergedGroup.intersections.length > 0) {
          bonusPos = mergedGroup.intersections[0];
        }

        // 交差点もなければ中央のタイルを使用
        if (!bonusPos) {
          const midIndex = Math.floor(mergedGroup.allTiles.length / 2);
          bonusPos = mergedGroup.allTiles[midIndex];
        }

        bonusPositions.push({
          row: bonusPos.row,
          col: bonusPos.col,
          direction: undefined, // 交差形はBOMBのみなので方向なし
          type: mergedGroup.type,
          bonusType: BonusType.BOMB,
        });
      }
      // 4個以下の交差形はボーナスなし（通常消し）
    }

    // 2. 単独グループの処理（一直線のマッチ）
    for (const group of standalone) {
      if (group.length >= 4) {
        let bonusPos: { row: number; col: number } | null = null;

        // スワップしたタイルがグループに含まれている場合、そこをボーナス位置にする
        if (lastSwappedTile) {
          const swapInGroup = group.tiles.find(
            (t) => t.row === lastSwappedTile.row && t.col === lastSwappedTile.col
          );
          if (swapInGroup) {
            bonusPos = swapInGroup;
          }
        }

        // スワップ位置がなければ中央をボーナス位置にする
        if (!bonusPos) {
          const midIndex = Math.floor(group.tiles.length / 2);
          bonusPos = group.tiles[midIndex];
        }

        // 5個以上: BOMB、4個: LINE
        const bonusType = group.length >= 5 ? BonusType.BOMB : BonusType.LINE;

        bonusPositions.push({
          row: bonusPos.row,
          col: bonusPos.col,
          direction: bonusType === BonusType.LINE ? group.direction : undefined,
          type: group.type,
          bonusType,
        });
      }
    }

    return bonusPositions;
  }
}
