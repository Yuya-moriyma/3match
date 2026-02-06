import Phaser from 'phaser';
import {
  BOARD_COLS,
  BOARD_ROWS,
  TILE_SIZE,
  TileType,
  TILE_TYPES_COUNT,
} from '../types';
import { BoardModel } from './board/BoardModel';
import { TileFactory } from './board/TileFactory';
import { MatchDetector } from './board/MatchDetector';
import { SoundManager, SoundKeys } from '../utils/SoundManager';
import { DROP_SOUND_DEBOUNCE_MS } from './constants';

/**
 * TileDropHandler - タイル落下・補充・初期マッチ除去を担当
 */
export class TileDropHandler {
  private scene: Phaser.Scene;
  private boardModel: BoardModel;
  private tileFactory: TileFactory;

  // 落下SE用デバウンス
  private lastDropSoundTime = 0;

  // 外部から注入されるコールバック
  private onTileClick: (row: number, col: number, pointer?: Phaser.Input.Pointer) => void = () => {};
  private onDropComplete: (isPlayerMove: boolean) => void = () => {};

  constructor(
    scene: Phaser.Scene,
    boardModel: BoardModel,
    tileFactory: TileFactory
  ) {
    this.scene = scene;
    this.boardModel = boardModel;
    this.tileFactory = tileFactory;
  }

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: {
    onTileClick: (row: number, col: number, pointer?: Phaser.Input.Pointer) => void;
    onDropComplete: (isPlayerMove: boolean) => void;
  }): void {
    this.onTileClick = callbacks.onTileClick;
    this.onDropComplete = callbacks.onDropComplete;
  }

  /**
   * タイル落下処理
   */
  dropTiles(isPlayerMove = false): void {
    let hasDropped = false;
    let maxDropDistance = 0;

    for (let col = 0; col < BOARD_COLS; col++) {
      let emptySpaces = 0;

      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        if (this.boardModel.getTile(row, col) === null) {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          const tile = this.boardModel.getTile(row, col)!;
          const newRow = row + emptySpaces;

          this.boardModel.setTile(newRow, col, tile);
          this.boardModel.clearTile(row, col);

          const targetPos = this.boardModel.getTilePosition(newRow, col);
          this.scene.tweens.add({
            targets: tile.container,
            y: targetPos.y,
            duration: emptySpaces * 50,
            onComplete: () => {
              this.playDropSoundDebounced();
            },
          });

          hasDropped = true;
          maxDropDistance = Math.max(maxDropDistance, emptySpaces);
        }
      }
    }

    const maxDropTime = maxDropDistance * 50;
    this.scene.time.delayedCall(hasDropped ? maxDropTime : 0, () => {
      this.fillEmptyTiles(isPlayerMove);
    });
  }

  /**
   * 空のタイルを埋める
   */
  private fillEmptyTiles(isPlayerMove = false): void {
    let maxEndTime = 0;

    for (let col = 0; col < BOARD_COLS; col++) {
      const emptyRows: number[] = [];
      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        if (this.boardModel.getTile(row, col) === null) {
          emptyRows.push(row);
        }
      }

      let columnDelay = 0;

      for (const row of emptyRows) {
        const dropDistance = row + 1;
        const dropDuration = dropDistance * 50;

        const endTime = columnDelay + dropDuration;
        maxEndTime = Math.max(maxEndTime, endTime);

        const currentDelay = columnDelay;
        this.scene.time.delayedCall(currentDelay, () => {
          const type = Phaser.Math.Between(0, TILE_TYPES_COUNT - 1) as TileType;
          const targetPos = this.boardModel.getTilePosition(row, col);
          const offset = this.boardModel.getBoardOffset();
          const startY = offset.y - TILE_SIZE + TILE_SIZE / 2;

          const tile = this.tileFactory.createTile(
            row,
            col,
            targetPos.x,
            startY,
            type,
            (r, c) => this.onTileClick(r, c)
          );
          this.boardModel.setTile(row, col, tile);

          this.scene.tweens.add({
            targets: tile.container,
            y: targetPos.y,
            duration: dropDuration,
            onComplete: () => {
              this.playDropSoundDebounced();
            },
          });
        });

        columnDelay = endTime;
      }
    }

    this.scene.time.delayedCall(maxEndTime + 50, () => {
      this.onDropComplete(isPlayerMove);
    });
  }

  /**
   * 初期マッチを除去
   */
  removeInitialMatches(): void {
    let hasMatches = true;
    while (hasMatches) {
      const matches = MatchDetector.findMatches(this.boardModel.getRawBoard());
      if (matches.length > 0) {
        matches.forEach(({ row, col }) => {
          const tile = this.boardModel.getTile(row, col);
          if (tile) {
            tile.container.destroy();
            const newType = Phaser.Math.Between(0, TILE_TYPES_COUNT - 1) as TileType;
            const pos = this.boardModel.getTilePosition(row, col);
            const newTile = this.tileFactory.createTile(
              row,
              col,
              pos.x,
              pos.y,
              newType,
              (r, c) => this.onTileClick(r, c)
            );
            this.boardModel.setTile(row, col, newTile);
          }
        });
      } else {
        hasMatches = false;
      }
    }
  }

  /**
   * 落下SEをデバウンス付きで再生
   */
  private playDropSoundDebounced(): void {
    const now = Date.now();
    if (now - this.lastDropSoundTime >= DROP_SOUND_DEBOUNCE_MS) {
      SoundManager.getInstance().playSE(SoundKeys.ORB_DROP);
      this.lastDropSoundTime = now;
    }
  }
}
