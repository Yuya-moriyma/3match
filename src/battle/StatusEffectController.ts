import Phaser from 'phaser';
import {
  BOARD_COLS,
  BOARD_ROWS,
  TILE_SIZE,
  TileType,
} from '../types';
import { BoardModel } from './board/BoardModel';
import { TileFactory } from './board/TileFactory';
import { EffectManager } from './effects/EffectManager';

/**
 * StatusEffectController - 状態異常の適用・解除・表示を担当
 */
export class StatusEffectController {
  private scene: Phaser.Scene;
  private boardModel: BoardModel;
  private tileFactory: TileFactory;
  private effectManager: EffectManager;

  // 外部から注入されるコールバック
  private onTileClick: (row: number, col: number, pointer?: Phaser.Input.Pointer) => void = () => {};

  constructor(
    scene: Phaser.Scene,
    boardModel: BoardModel,
    tileFactory: TileFactory,
    effectManager: EffectManager
  ) {
    this.scene = scene;
    this.boardModel = boardModel;
    this.tileFactory = tileFactory;
    this.effectManager = effectManager;
  }

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: {
    onTileClick: (row: number, col: number, pointer?: Phaser.Input.Pointer) => void;
  }): void {
    this.onTileClick = callbacks.onTileClick;
  }

  /**
   * お邪魔オーブ変換を適用（敵スキル結果）
   */
  applyOjamaConvert(tiles: { row: number; col: number }[]): void {
    // 灰色フラッシュ演出
    this.scene.cameras.main.flash(200, 120, 120, 120);

    for (const { row, col } of tiles) {
      const existingTile = this.boardModel.getTile(row, col);
      if (existingTile) {
        existingTile.container.destroy();

        const pos = this.boardModel.getTilePosition(row, col);
        const ojamaTile = this.tileFactory.createOjamaTile(
          row,
          col,
          pos.x,
          pos.y,
          (r, c) => this.onTileClick(r, c)
        );
        this.boardModel.setTile(row, col, ojamaTile);

        // スケールイン演出
        ojamaTile.container.setScale(0);
        ojamaTile.container.setAlpha(0);
        this.scene.tweens.add({
          targets: ojamaTile.container,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    }
  }

  /**
   * 氷漬けを適用（敵スキル結果）
   */
  applyFreeze(tiles: { row: number; col: number }[]): void {
    // 水色フラッシュ演出
    this.scene.cameras.main.flash(200, 100, 180, 255);

    for (const { row, col } of tiles) {
      const tile = this.boardModel.getTile(row, col);
      if (tile) {
        this.tileFactory.addFrozenOverlay(tile);
      }
    }
  }

  /**
   * 氷漬けオーブの氷を解除（データ更新＋視覚演出）
   */
  thawFrozenTile(row: number, col: number): void {
    const tile = this.boardModel.getTile(row, col);
    if (!tile || !tile.isFrozen) return;

    // データ更新
    tile.isFrozen = false;

    // 氷オーバーレイを削除
    this.tileFactory.removeFrozenOverlay(tile);

    // 氷解除エフェクト
    const pos = this.boardModel.getTilePosition(row, col);
    this.effectManager.createIceBreakEffect(pos.x, pos.y);
  }

  /**
   * タイルロックオーバーレイを表示
   */
  showTileLockOverlays(tiles: { row: number; col: number }[]): void {
    for (const { row, col } of tiles) {
      const tile = this.boardModel.getTile(row, col);
      if (tile) {
        const lockOverlay = this.scene.add.graphics();
        lockOverlay.fillStyle(0x000000, 0.4);
        lockOverlay.fillCircle(0, 0, TILE_SIZE * 0.42);
        lockOverlay.setName('lockOverlay');
        tile.container.add(lockOverlay);

        // ロックアイコン
        const lockIcon = this.scene.add.text(0, 0, 'lock', {
          fontFamily: 'Material Symbols Outlined',
          fontSize: '20px',
          color: '#ffffff',
        });
        lockIcon.setOrigin(0.5, 0.5);
        lockIcon.setName('lockIcon');
        tile.container.add(lockIcon);
      }
    }
  }

  /**
   * タイルロックオーバーレイを削除
   */
  removeTileLockOverlays(tiles: { row: number; col: number }[]): void {
    for (const { row, col } of tiles) {
      const tile = this.boardModel.getTile(row, col);
      if (tile) {
        const overlay = tile.container.getByName('lockOverlay');
        if (overlay) overlay.destroy();
        const icon = tile.container.getByName('lockIcon');
        if (icon) icon.destroy();
      }
    }
  }

  /**
   * 毒オーブ変換を適用（敵スキル結果）
   */
  applyPoisonConvert(tiles: { row: number; col: number }[]): void {
    // 紫色フラッシュ演出
    this.scene.cameras.main.flash(200, 100, 40, 120);

    for (const { row, col } of tiles) {
      const existingTile = this.boardModel.getTile(row, col);
      if (existingTile) {
        existingTile.container.destroy();

        const pos = this.boardModel.getTilePosition(row, col);
        const poisonTile = this.tileFactory.createPoisonTile(
          row,
          col,
          pos.x,
          pos.y,
          (r, c) => this.onTileClick(r, c)
        );
        this.boardModel.setTile(row, col, poisonTile);

        // スケールイン演出
        poisonTile.container.setScale(0);
        poisonTile.container.setAlpha(0);
        this.scene.tweens.add({
          targets: poisonTile.container,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }
    }
  }

  /**
   * マッチ座標の隣接にあるお邪魔オーブまたは毒オーブを検出
   */
  findAdjacentOjamaOrbs(matches: { row: number; col: number }[]): { row: number; col: number }[] {
    const matchSet = new Set(matches.map(m => `${m.row},${m.col}`));
    const ojamaSet = new Set<string>();

    const directions = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
    ];

    for (const { row, col } of matches) {
      for (const { dr, dc } of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) continue;

        const key = `${nr},${nc}`;
        if (matchSet.has(key) || ojamaSet.has(key)) continue;

        const tile = this.boardModel.getTile(nr, nc);
        // お邪魔オーブと毒オーブの両方を検出
        if (tile && (tile.type === TileType.OJAMA || tile.type === TileType.POISON)) {
          ojamaSet.add(key);
        }
      }
    }

    return Array.from(ojamaSet).map(key => {
      const [row, col] = key.split(',').map(Number);
      return { row, col };
    });
  }

  /**
   * 盤面上の毒オーブの数をカウント
   */
  countPoisonOrbs(): number {
    let count = 0;
    for (const { tile } of this.boardModel.iterateTiles()) {
      if (tile && tile.type === TileType.POISON) {
        count++;
      }
    }
    return count;
  }
}
