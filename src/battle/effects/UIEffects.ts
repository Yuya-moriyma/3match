import Phaser from 'phaser';
import { TILE_SIZE } from '../../types';
import { THEME } from '../../theme';

/**
 * UIEffects - UI演出（バトル開始、ボーナス生成）を管理
 */
export class UIEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * ボーナスオーブ生成エフェクト
   */
  showBonusCreateEffect(x: number, y: number): void {
    const glow = this.scene.add.graphics();
    glow.fillStyle(THEME.parchmentLight, 0.7);
    glow.fillCircle(0, 0, TILE_SIZE * 0.5);
    glow.setPosition(x, y);
    glow.setDepth(52);

    this.scene.tweens.add({
      targets: glow,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        glow.destroy();
      },
    });

    for (let i = 0; i < 6; i++) {
      const angle = ((Math.PI * 2) / 6) * i;
      const particle = this.scene.add.graphics();
      particle.fillStyle(THEME.accentLight, 1);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(x, y);
      particle.setDepth(53);

      const distance = TILE_SIZE * 0.8;
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }
}
