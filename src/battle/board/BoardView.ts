import Phaser from 'phaser';
import { BOARD_COLS, BOARD_ROWS, TILE_SIZE, TileType, TILE_TYPES_COUNT } from '../../types';
import { THEME } from '../../theme';
import { Tile } from './types';
import { BoardModel } from './BoardModel';
import { TileFactory } from './TileFactory';

/**
 * BoardView - 盤面の視覚的な表示・更新を管理
 * MVPパターンのView層として、盤面の描画とアニメーションを担当
 */
export class BoardView {
  private scene: Phaser.Scene;
  private boardModel: BoardModel;
  private tileFactory: TileFactory;
  private selectionGlow?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, boardModel: BoardModel, tileFactory: TileFactory) {
    this.scene = scene;
    this.boardModel = boardModel;
    this.tileFactory = tileFactory;
  }

  /**
   * 盤面のフレームを描画
   */
  createBoardFrame(): void {
    const offset = this.boardModel.getBoardOffset();
    const frameX = offset.x - 15;
    const frameY = offset.y - 15;
    const frameWidth = BOARD_COLS * TILE_SIZE + 30;
    const frameHeight = BOARD_ROWS * TILE_SIZE + 30;

    const graphics = this.scene.add.graphics();

    // 外側のアクセントボーダー
    graphics.lineStyle(4, THEME.accent, 1);
    graphics.strokeRoundedRect(frameX - 4, frameY - 4, frameWidth + 8, frameHeight + 8, 12);

    // 内側の暗い背景
    graphics.fillStyle(THEME.border, 0.9);
    graphics.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 8);

    // 内側のボーダー
    graphics.lineStyle(2, THEME.accentDark, 1);
    graphics.strokeRoundedRect(frameX, frameY, frameWidth, frameHeight, 8);

    // コーナーの装飾（蝋封風）
    const cornerSize = 10;
    const corners = [
      { x: frameX - 2, y: frameY - 2 },
      { x: frameX + frameWidth + 2, y: frameY - 2 },
      { x: frameX - 2, y: frameY + frameHeight + 2 },
      { x: frameX + frameWidth + 2, y: frameY + frameHeight + 2 },
    ];

    corners.forEach((corner) => {
      graphics.fillStyle(THEME.accentLight, 1);
      graphics.fillCircle(corner.x, corner.y, cornerSize);
      graphics.fillStyle(THEME.accent, 1);
      graphics.fillCircle(corner.x, corner.y, cornerSize - 3);
    });
  }

  /**
   * 盤面を初期化（タイルを生成して配置）
   */
  initBoard(onTileClick: (row: number, col: number, pointer?: Phaser.Input.Pointer) => void): void {
    this.boardModel.initialize();
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const type = Phaser.Math.Between(0, TILE_TYPES_COUNT - 1) as TileType;
        const pos = this.boardModel.getTilePosition(row, col);
        const tile = this.tileFactory.createTile(row, col, pos.x, pos.y, type, onTileClick);
        this.boardModel.setTile(row, col, tile);
      }
    }
  }

  /**
   * 選択グローエフェクトを表示
   */
  showSelectionGlow(tile: Tile): void {
    const pos = this.boardModel.getTilePosition(tile.row, tile.col);

    this.selectionGlow = this.scene.add.circle(
      pos.x,
      pos.y,
      TILE_SIZE * 0.5,
      THEME.accentLight,
      0.35
    );
    this.selectionGlow.setStrokeStyle(3, THEME.accentLight, 1);

    this.scene.tweens.add({
      targets: this.selectionGlow,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.15,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * 選択グローエフェクトを非表示
   */
  hideSelectionGlow(): void {
    if (this.selectionGlow) {
      this.scene.tweens.killTweensOf(this.selectionGlow);
      this.selectionGlow.destroy();
      this.selectionGlow = undefined;
    }
  }

  /**
   * タイルのスワップアニメーションを実行
   */
  animateSwap(
    tile1: Tile,
    tile2: Tile,
    duration: number,
    onComplete: () => void
  ): void {
    const pos1 = this.boardModel.getTilePosition(tile1.row, tile1.col);
    const pos2 = this.boardModel.getTilePosition(tile2.row, tile2.col);

    this.scene.tweens.add({
      targets: tile1.container,
      x: pos1.x,
      y: pos1.y,
      duration,
    });

    this.scene.tweens.add({
      targets: tile2.container,
      x: pos2.x,
      y: pos2.y,
      duration,
      onComplete,
    });
  }

  /**
   * タイルの落下アニメーションを実行
   */
  animateTileDrop(
    tile: Tile,
    targetRow: number,
    duration: number,
    onComplete?: () => void
  ): void {
    const pos = this.boardModel.getTilePosition(targetRow, tile.col);

    this.scene.tweens.add({
      targets: tile.container,
      y: pos.y,
      duration,
      ease: 'Bounce.easeOut',
      onComplete,
    });
  }

  /**
   * 新しいタイルを盤面上部から落下させる
   */
  createAndDropTile(
    row: number,
    col: number,
    type: TileType,
    duration: number,
    onTileClick: (row: number, col: number, pointer?: Phaser.Input.Pointer) => void,
    onComplete?: () => void
  ): Tile {
    const offset = this.boardModel.getBoardOffset();
    const targetPos = this.boardModel.getTilePosition(row, col);

    // 盤面上部からスタート
    const startY = offset.y - TILE_SIZE + TILE_SIZE / 2;
    const tile = this.tileFactory.createTile(row, col, targetPos.x, startY, type, onTileClick);

    this.scene.tweens.add({
      targets: tile.container,
      y: targetPos.y,
      duration,
      ease: 'Bounce.easeOut',
      onComplete,
    });

    return tile;
  }

  /**
   * タイルを破壊（コンテナを削除）
   */
  destroyTile(tile: Tile): void {
    if (tile.container) {
      tile.container.destroy();
    }
  }

  /**
   * タイル位置を更新
   */
  updateTilePosition(tile: Tile): void {
    const pos = this.boardModel.getTilePosition(tile.row, tile.col);
    tile.container.setPosition(pos.x, pos.y);
  }

  /**
   * 盤面オフセットを取得
   */
  getBoardOffset(): { x: number; y: number } {
    return this.boardModel.getBoardOffset();
  }
}
