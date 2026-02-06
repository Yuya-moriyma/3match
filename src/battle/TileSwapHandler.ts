import { Tile } from './board/types';
import { BoardModel } from './board/BoardModel';
import { BoardView } from './board/BoardView';
import { StatusEffectManager } from './StatusEffectManager';
import { SoundManager, SoundKeys } from '../utils/SoundManager';

/**
 * TileSwapHandler - タイル選択・スワップ処理を担当
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
  }
}
