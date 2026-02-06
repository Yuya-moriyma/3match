import Phaser from 'phaser';
import { BonusDirection, TileType, TILE_SIZE, BOARD_COLS, BOARD_ROWS } from '../../types';
import { THEME } from '../../theme';
import { TILE_COLORS, TILE_HIGHLIGHT_COLORS } from '../constants';

/**
 * ExplosionEffects - 爆発・パーティクル系のエフェクトを管理
 */
export class ExplosionEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 爆発エフェクトを作成
   */
  createExplosionEffect(x: number, y: number, type: TileType): void {
    const particleCount = Phaser.Math.Between(8, 12);
    const color = TILE_COLORS[type];
    const highlightColor = TILE_HIGHLIGHT_COLORS[type];

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      const size = Phaser.Math.Between(4, 8);

      particle.fillStyle(highlightColor, 1);
      particle.fillCircle(0, 0, size);
      particle.fillStyle(color, 0.8);
      particle.fillCircle(0, 0, size * 0.7);

      particle.setPosition(x, y);
      particle.setDepth(50);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(TILE_SIZE * 0.5, TILE_SIZE * 1.0);
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: Phaser.Math.Between(300, 400),
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }

    // 中心の閃光エフェクト
    const flash = this.scene.add.graphics();
    flash.fillStyle(THEME.parchmentLight, 0.7);
    flash.fillCircle(0, 0, TILE_SIZE * 0.3);
    flash.setPosition(x, y);
    flash.setDepth(51);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * ライン発動エフェクト
   */
  showLineActivationEffect(
    row: number,
    col: number,
    direction: BonusDirection,
    tileType: TileType,
    boardOffsetX: number,
    boardOffsetY: number
  ): void {
    const highlightColor = TILE_HIGHLIGHT_COLORS[tileType];

    if (direction === BonusDirection.HORIZONTAL) {
      const y = boardOffsetY + row * TILE_SIZE + TILE_SIZE / 2;
      const startX = boardOffsetX;
      const endX = boardOffsetX + BOARD_COLS * TILE_SIZE;

      const line = this.scene.add.graphics();
      line.fillStyle(highlightColor, 0.7);
      line.fillRect(startX, y - TILE_SIZE * 0.3, endX - startX, TILE_SIZE * 0.6);
      line.setDepth(50);

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          line.destroy();
        },
      });
    } else {
      const x = boardOffsetX + col * TILE_SIZE + TILE_SIZE / 2;
      const startY = boardOffsetY;
      const endY = boardOffsetY + BOARD_ROWS * TILE_SIZE;

      const line = this.scene.add.graphics();
      line.fillStyle(highlightColor, 0.7);
      line.fillRect(x - TILE_SIZE * 0.3, startY, TILE_SIZE * 0.6, endY - startY);
      line.setDepth(50);

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          line.destroy();
        },
      });
    }
  }

  /**
   * ボムオーブ爆発エフェクト（衝撃波リング + 中心フラッシュ + 微小パーティクル）
   */
  showBombExplosionEffect(centerX: number, centerY: number): void {
    // --- 衝撃波リング1（外側・速い） ---
    const ring1 = this.scene.add.graphics();
    ring1.lineStyle(4, THEME.parchmentLight, 0.8);
    ring1.strokeCircle(0, 0, TILE_SIZE * 0.3);
    ring1.setPosition(centerX, centerY);
    ring1.setDepth(48);

    this.scene.tweens.add({
      targets: ring1,
      scaleX: (TILE_SIZE * 2.5) / (TILE_SIZE * 0.3),
      scaleY: (TILE_SIZE * 2.5) / (TILE_SIZE * 0.3),
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        ring1.destroy();
      },
    });

    // --- 衝撃波リング2（内側・遅延） ---
    this.scene.time.delayedCall(80, () => {
      const ring2 = this.scene.add.graphics();
      ring2.lineStyle(3, THEME.accentLight, 0.6);
      ring2.strokeCircle(0, 0, TILE_SIZE * 0.3);
      ring2.setPosition(centerX, centerY);
      ring2.setDepth(49);

      this.scene.tweens.add({
        targets: ring2,
        scaleX: (TILE_SIZE * 2.0) / (TILE_SIZE * 0.3),
        scaleY: (TILE_SIZE * 2.0) / (TILE_SIZE * 0.3),
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => {
          ring2.destroy();
        },
      });
    });

    // --- 中心フラッシュ ---
    const flash = this.scene.add.graphics();
    flash.fillStyle(THEME.parchmentLight, 0.8);
    flash.fillCircle(0, 0, TILE_SIZE * 0.4);
    flash.setPosition(centerX, centerY);
    flash.setDepth(49);

    this.scene.tweens.add({
      targets: flash,
      scaleX: (TILE_SIZE * 1.0) / (TILE_SIZE * 0.4),
      scaleY: (TILE_SIZE * 1.0) / (TILE_SIZE * 0.4),
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy();
      },
    });

    // --- 微小パーティクル ---
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const delay = Phaser.Math.Between(0, 150);

      this.scene.time.delayedCall(delay, () => {
        const particle = this.scene.add.graphics();
        const radius = Phaser.Math.Between(2, 4);

        particle.fillStyle(THEME.parchmentLight, 0.9);
        particle.fillCircle(0, 0, radius);
        particle.setPosition(centerX, centerY);
        particle.setDepth(49);

        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.FloatBetween(TILE_SIZE * 1.5, TILE_SIZE * 2.8);
        const targetX = centerX + Math.cos(angle) * distance;
        const targetY = centerY + Math.sin(angle) * distance;

        this.scene.tweens.add({
          targets: particle,
          x: targetX,
          y: targetY,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: Phaser.Math.Between(400, 600),
          ease: 'Quad.easeOut',
          onComplete: () => {
            particle.destroy();
          },
        });
      });
    }
  }

  /**
   * 氷解除エフェクト（氷の破片が散らばる表現）
   */
  createIceBreakEffect(x: number, y: number): void {
    const particleCount = 6;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      const size = Phaser.Math.Between(3, 6);

      // 水色の氷の破片
      particle.fillStyle(0xaaddff, 0.9);
      particle.fillRect(-size / 2, -size / 2, size, size);

      particle.setPosition(x, y);
      particle.setDepth(55);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(TILE_SIZE * 0.4, TILE_SIZE * 0.9);
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        angle: Phaser.Math.Between(0, 360),
        duration: Phaser.Math.Between(300, 500),
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }

    // 中心の水色フラッシュ
    const flash = this.scene.add.graphics();
    flash.fillStyle(0x88ccff, 0.6);
    flash.fillCircle(0, 0, TILE_SIZE * 0.3);
    flash.setPosition(x, y);
    flash.setDepth(54);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy();
      },
    });
  }
}
