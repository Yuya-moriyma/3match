import { BOARD_COLS, BOARD_ROWS, TILE_SIZE } from '../../types';
import { Tile } from './types';

/**
 * BoardModel - 盤面の状態データ管理
 * MVPパターンのModel層として、盤面データの保持と基本的な操作を提供
 */
export class BoardModel {
  private board: (Tile | null)[][] = [];
  private _offsetX = 0;
  private _offsetY = 0;

  get offsetX(): number {
    return this._offsetX;
  }

  get offsetY(): number {
    return this._offsetY;
  }

  /**
   * 盤面オフセットを設定（画面中央下寄せ）
   */
  setOffset(screenWidth: number, screenHeight: number): void {
    this._offsetX = (screenWidth - BOARD_COLS * TILE_SIZE) / 2;
    this._offsetY = screenHeight - BOARD_ROWS * TILE_SIZE - 100;
  }

  /**
   * 盤面を初期化（空の2次元配列を作成）
   */
  initialize(): void {
    this.board = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      this.board[row] = [];
      for (let col = 0; col < BOARD_COLS; col++) {
        this.board[row][col] = null;
      }
    }
  }

  /**
   * 指定位置のタイルを取得
   */
  getTile(row: number, col: number): Tile | null {
    if (!this.isValidPosition(row, col)) {
      return null;
    }
    return this.board[row][col];
  }

  /**
   * 指定位置にタイルを設定
   */
  setTile(row: number, col: number, tile: Tile | null): void {
    if (!this.isValidPosition(row, col)) {
      return;
    }
    this.board[row][col] = tile;
    if (tile) {
      tile.row = row;
      tile.col = col;
    }
  }

  /**
   * 指定位置のタイルをクリア
   */
  clearTile(row: number, col: number): void {
    if (!this.isValidPosition(row, col)) {
      return;
    }
    this.board[row][col] = null;
  }

  /**
   * 盤面オフセットを取得
   */
  getBoardOffset(): { x: number; y: number } {
    return { x: this._offsetX, y: this._offsetY };
  }

  /**
   * 指定位置のタイルのワールド座標を取得
   */
  getTilePosition(row: number, col: number): { x: number; y: number } {
    return {
      x: this._offsetX + col * TILE_SIZE + TILE_SIZE / 2,
      y: this._offsetY + row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  /**
   * 盤面全体をリセット（タイルのcontainerは破棄しない）
   */
  reset(): void {
    this.board = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      this.board[row] = [];
      for (let col = 0; col < BOARD_COLS; col++) {
        this.board[row][col] = null;
      }
    }
  }

  /**
   * 2つのタイルを入れ替え（データのみ、アニメーションなし）
   */
  swapTiles(row1: number, col1: number, row2: number, col2: number): void {
    const tile1 = this.board[row1][col1];
    const tile2 = this.board[row2][col2];

    this.board[row1][col1] = tile2;
    this.board[row2][col2] = tile1;

    if (tile1) {
      tile1.row = row2;
      tile1.col = col2;
    }
    if (tile2) {
      tile2.row = row1;
      tile2.col = col1;
    }
  }

  /**
   * 座標が盤面内かどうかを判定
   */
  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
  }

  /**
   * 2つの位置が隣接しているかどうかを判定
   */
  isAdjacent(row1: number, col1: number, row2: number, col2: number): boolean {
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  /**
   * 盤面の行数を取得
   */
  getRowCount(): number {
    return BOARD_ROWS;
  }

  /**
   * 盤面の列数を取得
   */
  getColCount(): number {
    return BOARD_COLS;
  }

  /**
   * 盤面全体を走査するためのイテレータ
   */
  *iterateTiles(): Generator<{ row: number; col: number; tile: Tile | null }> {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        yield { row, col, tile: this.board[row][col] };
      }
    }
  }

  /**
   * 盤面の生のデータを取得（読み取り専用目的）
   */
  getRawBoard(): readonly (readonly (Tile | null)[])[] {
    return this.board;
  }

  /**
   * ワールド座標から盤面の行・列を取得
   * 盤面外の場合は null を返す
   */
  getRowColFromWorldPosition(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - this._offsetX) / TILE_SIZE);
    const row = Math.floor((y - this._offsetY) / TILE_SIZE);

    if (!this.isValidPosition(row, col)) {
      return null;
    }

    return { row, col };
  }
}
