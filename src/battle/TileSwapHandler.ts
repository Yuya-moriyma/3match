import Phaser from 'phaser';
import { Tile } from './board/types';
import { BoardModel } from './board/BoardModel';
import { BoardView } from './board/BoardView';
import { StatusEffectManager } from './StatusEffectManager';
import { SoundManager, SoundKeys } from '../utils/SoundManager';

/**
 * TileSwapHandler - タイル選択・スワップ処理を担当
 * フリック（スワイプ）操作にも対応
 */
export class TileSwapHandler {
  private boardModel: BoardModel;
  private boardView: BoardView;
  private statusEffectManager: StatusEffectManager;
  private selectedTile: Tile | null = null;

  // 外部から注入されるコールバック
  private onSwapComplete: (tile1: Tile, tile2: Tile) => void = () => {};
  private onBonusActivate: (bonusTile: Tile) => void = () => {};
  private getIsProcessing: () => boolean = () => false;
  private getIsPaused: () => boolean = () => false;

  // フリック検出用プロパティ
  private flickStartRow: number | null = null;
  private flickStartCol: number | null = null;
  private flickStartX: number = 0;
  private flickStartY: number = 0;
  private isFlicking: boolean = false;
  private static readonly MIN_FLICK_DISTANCE = 30;

  constructor(
    boardModel: BoardModel,
    boardView: BoardView,
    statusEffectManager: StatusEffectManager
  ) {
    this.boardModel = boardModel;
    this.boardView = boardView;
    this.statusEffectManager = statusEffectManager;
  }

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: {
    onSwapComplete: (tile1: Tile, tile2: Tile) => void;
    onBonusActivate: (bonusTile: Tile) => void;
    getIsProcessing: () => boolean;
    getIsPaused: () => boolean;
  }): void {
    this.onSwapComplete = callbacks.onSwapComplete;
    this.onBonusActivate = callbacks.onBonusActivate;
    this.getIsProcessing = callbacks.getIsProcessing;
    this.getIsPaused = callbacks.getIsPaused;
  }

  /**
   * タイルクリック処理
   */
  onTileClick(row: number, col: number): void {
    if (this.getIsProcessing() || this.getIsPaused()) return;

    const clickedTile = this.boardModel.getTile(row, col);
    if (!clickedTile) return;

    if (!this.selectedTile) {
      // ロック中・氷漬け中のタイルを選択不可にする
      if (this.statusEffectManager.isLocked(row, col)) {
        SoundManager.getInstance().playSE(SoundKeys.NOT_MOVE);
        return;
      }
      if (clickedTile.isFrozen) {
        SoundManager.getInstance().playSE(SoundKeys.NOT_MOVE);
        return;
      }
      this.selectedTile = clickedTile;
      this.boardView.showSelectionGlow(clickedTile);
    } else {
      // 選択中のボーナスオーブを再クリックした場合は特殊効果を発動
      if (this.selectedTile === clickedTile && this.selectedTile.isBonus) {
        this.boardView.hideSelectionGlow();
        this.selectedTile = null;
        this.onBonusActivate(clickedTile);
        return;
      }

      const isAdjacent = this.boardModel.isAdjacent(
        this.selectedTile.row,
        this.selectedTile.col,
        row,
        col
      );

      if (isAdjacent) {
        // 選択済みタイルまたは交換先タイルのいずれかがロック中・氷漬け中なら交換不可
        if (
          this.statusEffectManager.isLocked(this.selectedTile.row, this.selectedTile.col) ||
          this.statusEffectManager.isLocked(row, col) ||
          this.selectedTile.isFrozen ||
          clickedTile.isFrozen
        ) {
          SoundManager.getInstance().playSE(SoundKeys.NOT_MOVE);
          this.boardView.hideSelectionGlow();
          this.selectedTile = null;
          return;
        }
        this.swapTiles(this.selectedTile, clickedTile);
      }

      this.boardView.hideSelectionGlow();
      this.selectedTile = null;
    }
  }

  /**
   * タイルをスワップ
   */
  private swapTiles(tile1: Tile, tile2: Tile): void {
    // データ上でスワップ
    this.boardModel.swapTiles(tile1.row, tile1.col, tile2.row, tile2.col);

    // アニメーション
    this.boardView.animateSwap(tile1, tile2, 150, () => {
      this.onSwapComplete(tile1, tile2);
    });
  }

  /**
   * スワップを戻す
   */
  swapBack(tile1: Tile, tile2: Tile, onComplete: () => void): void {
    this.boardModel.swapTiles(tile1.row, tile1.col, tile2.row, tile2.col);
    this.boardView.animateSwap(tile1, tile2, 150, onComplete);
  }

  /**
   * 選択状態をリセット
   */
  resetSelection(): void {
    this.boardView.hideSelectionGlow();
    this.selectedTile = null;
    this.resetFlickState();
  }

  /**
   * タイル上でのポインターダウン処理（フリック開始）
   */
  onTilePointerDown(row: number, col: number, pointer: Phaser.Input.Pointer): void {
    if (this.getIsProcessing() || this.getIsPaused()) return;

    const tile = this.boardModel.getTile(row, col);
    if (!tile) return;

    // フリック開始位置を記録
    this.flickStartRow = row;
    this.flickStartCol = col;
    this.flickStartX = pointer.x;
    this.flickStartY = pointer.y;
    this.isFlicking = true;
  }

  /**
   * ポインターアップ処理（フリック終了判定）
   */
  onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isFlicking || this.flickStartRow === null || this.flickStartCol === null) {
      this.resetFlickState();
      return;
    }

    if (this.getIsProcessing() || this.getIsPaused()) {
      this.resetFlickState();
      return;
    }

    const dx = pointer.x - this.flickStartX;
    const dy = pointer.y - this.flickStartY;
    const direction = this.getFlickDirection(dx, dy);

    if (direction) {
      // フリック操作として処理
      const toRow = this.flickStartRow + direction.dRow;
      const toCol = this.flickStartCol + direction.dCol;
      this.executeFlickSwap(this.flickStartRow, this.flickStartCol, toRow, toCol);
    } else {
      // 移動距離が閾値未満の場合は従来のクリック処理
      this.onTileClick(this.flickStartRow, this.flickStartCol);
    }

    this.resetFlickState();
  }

  /**
   * フリック方向を判定
   * @returns 方向（dRow, dCol）または null（閾値未満）
   */
  private getFlickDirection(dx: number, dy: number): { dRow: number; dCol: number } | null {
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < TileSwapHandler.MIN_FLICK_DISTANCE) {
      return null;
    }

    // 主要な方向を判定（上下左右）
    if (Math.abs(dx) > Math.abs(dy)) {
      // 左右方向
      return { dRow: 0, dCol: dx > 0 ? 1 : -1 };
    } else {
      // 上下方向
      return { dRow: dy > 0 ? 1 : -1, dCol: 0 };
    }
  }

  /**
   * フリックによるスワップを実行
   */
  private executeFlickSwap(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    const fromTile = this.boardModel.getTile(fromRow, fromCol);
    const toTile = this.boardModel.getTile(toRow, toCol);

    // 移動先が盤面外または存在しない場合
    if (!fromTile || !toTile) {
      SoundManager.getInstance().playSE(SoundKeys.NOT_MOVE);
      return;
    }

    // ロック・氷漬けチェック
    if (
      this.statusEffectManager.isLocked(fromRow, fromCol) ||
      this.statusEffectManager.isLocked(toRow, toCol) ||
      fromTile.isFrozen ||
      toTile.isFrozen
    ) {
      SoundManager.getInstance().playSE(SoundKeys.NOT_MOVE);
      return;
    }

    // 隣接チェック（念のため）
    if (!this.boardModel.isAdjacent(fromRow, fromCol, toRow, toCol)) {
      SoundManager.getInstance().playSE(SoundKeys.NOT_MOVE);
      return;
    }

    // スワップ実行
    this.swapTiles(fromTile, toTile);
  }

  /**
   * フリック状態をリセット
   */
  private resetFlickState(): void {
    this.flickStartRow = null;
    this.flickStartCol = null;
    this.flickStartX = 0;
    this.flickStartY = 0;
    this.isFlicking = false;
  }
}
