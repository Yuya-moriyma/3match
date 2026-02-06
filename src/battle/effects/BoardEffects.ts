import Phaser from 'phaser';
import { TILE_SIZE, BOARD_COLS, BOARD_ROWS } from '../../types';
import { THEME } from '../../theme';
import { BOARD_SHAKE_INTENSITY, BOARD_SHAKE_DURATION_MS, BOARD_SHAKE_COUNT } from '../constants';
import { Tile } from '../board/types';

/**
 * BoardEffects - 盤面エフェクト（シェイク、オーバーレイ）を管理
 */
export class BoardEffects {
  private scene: Phaser.Scene;
  private enemyActionOverlay?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 盤面全体をシェイク
   */
  shakeBoardEffect(
    board: (Tile | null)[][],
    boardOffsetX: number,
    boardOffsetY: number
  ): void {
    let delay = 0;
    for (let i = 0; i < BOARD_SHAKE_COUNT; i++) {
      this.scene.time.delayedCall(delay, () => {
        this.applyBoardOffset(board, boardOffsetX, boardOffsetY, BOARD_SHAKE_INTENSITY, 0);
      });
      delay += BOARD_SHAKE_DURATION_MS;

      this.scene.time.delayedCall(delay, () => {
        this.applyBoardOffset(board, boardOffsetX, boardOffsetY, -BOARD_SHAKE_INTENSITY, 0);
      });
      delay += BOARD_SHAKE_DURATION_MS;
    }

    this.scene.time.delayedCall(delay, () => {
      this.applyBoardOffset(board, boardOffsetX, boardOffsetY, 0, 0);
    });
  }

  /**
   * 盤面の全タイルにオフセットを適用
   */
  private applyBoardOffset(
    board: (Tile | null)[][],
    boardOffsetX: number,
    boardOffsetY: number,
    offsetX: number,
    offsetY: number
  ): void {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const tile = board[row][col];
        if (tile) {
          const baseX = boardOffsetX + col * TILE_SIZE + TILE_SIZE / 2;
          const baseY = boardOffsetY + row * TILE_SIZE + TILE_SIZE / 2;
          tile.container.x = baseX + offsetX;
          tile.container.y = baseY + offsetY;
        }
      }
    }
  }

  /**
   * 敵アクション開始時のオーバーレイを表示
   * 盤面を暗転させ「Enemy Action」テキストを表示する
   */
  showEnemyActionOverlay(boardOffsetX: number, boardOffsetY: number): void {
    this.destroyEnemyActionOverlay();

    const boardWidth = BOARD_COLS * TILE_SIZE;
    const boardHeight = BOARD_ROWS * TILE_SIZE;
    const boardCenterX = boardOffsetX + boardWidth / 2;
    const boardCenterY = boardOffsetY + boardHeight / 2;

    this.enemyActionOverlay = this.scene.add.container(boardCenterX, boardCenterY);
    this.enemyActionOverlay.setDepth(55);
    this.enemyActionOverlay.setAlpha(0);

    // 暗転背景
    const overlay = this.scene.add.rectangle(0, 0, boardWidth, boardHeight, 0x000000, 0.6);
    this.enemyActionOverlay.add(overlay);

    // ラベル背景（赤系の警告色調）
    const bgGraphics = this.scene.add.graphics();
    const bgWidth = 260;
    const bgHeight = 60;

    // 外枠（赤みのあるアクセント）
    bgGraphics.lineStyle(3, THEME.danger, 0.8);
    bgGraphics.strokeRoundedRect(-bgWidth / 2 - 3, -bgHeight / 2 - 3, bgWidth + 6, bgHeight + 6, 10);

    // 背景（暗い赤茶）
    bgGraphics.fillStyle(THEME.counterAttackBg, 0.95);
    bgGraphics.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);
    bgGraphics.lineStyle(2, THEME.danger, 1);
    bgGraphics.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);

    this.enemyActionOverlay.add(bgGraphics);

    // 「Enemy Action」テキスト
    const messageText = this.scene.add
      .text(0, 0, 'Enemy Action', {
        fontSize: '28px',
        color: '#ff6644',
        fontFamily: 'Kaisei Opti, serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);
    this.enemyActionOverlay.add(messageText);

    // フェードインアニメーション
    this.scene.tweens.add({
      targets: this.enemyActionOverlay,
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut',
    });

    // テキストスケールアニメーション
    messageText.setScale(0.5);
    this.scene.tweens.add({
      targets: messageText,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      delay: 100,
    });

    // テキストパルスアニメーション
    this.scene.tweens.add({
      targets: messageText,
      alpha: 0.85,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 400,
    });
  }

  /**
   * 敵アクションオーバーレイをフェードアウトして非表示にする
   */
  hideEnemyActionOverlay(onComplete?: () => void): void {
    if (!this.enemyActionOverlay) {
      onComplete?.();
      return;
    }

    this.scene.tweens.add({
      targets: this.enemyActionOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroyEnemyActionOverlay();
        onComplete?.();
      },
    });
  }

  /**
   * 敵アクションオーバーレイを即時破棄（tweenの完了を待たない）
   */
  destroyEnemyActionOverlay(): void {
    if (this.enemyActionOverlay) {
      this.enemyActionOverlay.destroy();
      this.enemyActionOverlay = undefined;
    }
  }
}
