import { BoardModel } from './board/BoardModel';

/**
 * 毒状態の管理データ
 */
interface PoisonState {
  remainingTurns: number;
  damagePerTurn: number;
}

/**
 * タイルロック状態の管理データ
 */
interface TileLockState {
  tiles: { row: number; col: number }[];
  remainingTurns: number;
}

/**
 * tick()の実行結果
 */
export interface StatusEffectTickResult {
  /** 毒ダメージ（毒状態でなければ0） */
  poisonDamage: number;
  /** ロック解除されたタイル（解除がなければ空配列） */
  unlockedTiles: { row: number; col: number }[];
}

/**
 * 敵カウンター停止状態の管理データ
 */
interface EnemyCounterFreezeState {
  remainingTurns: number;
}

/**
 * StatusEffectManager - 状態異常（毒・タイルロック・敵カウンター停止）を管理
 */
export class StatusEffectManager {
  private boardModel: BoardModel;
  private poison: PoisonState | null = null;
  private tileLock: TileLockState | null = null;
  private enemyCounterFreeze: EnemyCounterFreezeState | null = null;

  constructor(boardModel: BoardModel) {
    this.boardModel = boardModel;
  }

  /**
   * 毒状態を付与
   */
  applyPoison(duration: number, damagePerTurn: number): void {
    this.poison = {
      remainingTurns: duration,
      damagePerTurn,
    };
  }

  /**
   * タイルロック状態を付与
   */
  applyTileLock(tiles: { row: number; col: number }[], duration: number): void {
    this.tileLock = {
      tiles: [...tiles],
      remainingTurns: duration,
    };
  }

  /**
   * 毎操作完了時に呼ばれる
   * 残りターンを減算し、終了した状態を自動解除する
   */
  tick(): StatusEffectTickResult {
    const result: StatusEffectTickResult = {
      poisonDamage: 0,
      unlockedTiles: [],
    };

    // 毒処理
    if (this.poison) {
      result.poisonDamage = this.poison.damagePerTurn;
      this.poison.remainingTurns--;
      if (this.poison.remainingTurns <= 0) {
        this.poison = null;
      }
    }

    // タイルロック処理
    if (this.tileLock) {
      this.tileLock.remainingTurns--;
      if (this.tileLock.remainingTurns <= 0) {
        // ロック解除
        for (const { row, col } of this.tileLock.tiles) {
          const tile = this.boardModel.getTile(row, col);
          if (tile) {
            tile.isLocked = false;
          }
        }
        result.unlockedTiles = [...this.tileLock.tiles];
        this.tileLock = null;
      }
    }

    return result;
  }

  /**
   * 指定タイルがロック中かを返す
   */
  isLocked(row: number, col: number): boolean {
    if (!this.tileLock) return false;
    return this.tileLock.tiles.some((t) => t.row === row && t.col === col);
  }

  /**
   * 現在の毒ターンダメージを返す
   */
  getPoisonDamage(): number {
    return this.poison?.damagePerTurn ?? 0;
  }

  /**
   * 毒状態が有効か
   */
  isPoisoned(): boolean {
    return this.poison !== null;
  }

  /**
   * タイルロック状態が有効か
   */
  hasTileLock(): boolean {
    return this.tileLock !== null;
  }

  /**
   * 敵カウンター停止状態を付与（既に停止中なら残りターンをリセット）
   */
  applyEnemyCounterFreeze(duration: number): void {
    this.enemyCounterFreeze = { remainingTurns: duration };
  }

  /**
   * 敵カウンターが停止中かどうかを返す
   */
  isEnemyCounterFrozen(): boolean {
    return this.enemyCounterFreeze !== null;
  }

  /**
   * 敵カウンター停止の残りターン数を返す（停止中でなければ0）
   */
  getEnemyCounterFreezeRemaining(): number {
    return this.enemyCounterFreeze?.remainingTurns ?? 0;
  }

  /**
   * 敵カウンター停止の残りターンを1減算し、0になったら解除する
   * @returns 解除された場合true
   */
  tickEnemyCounterFreeze(): boolean {
    if (!this.enemyCounterFreeze) return false;
    this.enemyCounterFreeze.remainingTurns--;
    if (this.enemyCounterFreeze.remainingTurns <= 0) {
      this.enemyCounterFreeze = null;
      return true;
    }
    return false;
  }

  /**
   * 全状態をリセット
   */
  cleanup(): void {
    // ロック中タイルのフラグを解除
    if (this.tileLock) {
      for (const { row, col } of this.tileLock.tiles) {
        const tile = this.boardModel.getTile(row, col);
        if (tile) {
          tile.isLocked = false;
        }
      }
    }
    this.poison = null;
    this.tileLock = null;
    this.enemyCounterFreeze = null;
  }
}
