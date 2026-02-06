import Phaser from 'phaser';
import { TILE_SIZE } from '../../types';
import { Tile } from './types';

/**
 * TileOverlayManager - タイルのオーバーレイ（氷漬け等）を管理
 */
export class TileOverlayManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 宝石サイズを取得（TILE_SIZEの42%）
   */
  private getGemSize(): number {
    return TILE_SIZE * 0.42;
  }

  /**
   * 氷漬けオーバーレイをタイルに追加
   */
  addFrozenOverlay(tile: Tile): void {
    // 二重呼び出しガード
    if (tile.container.getByName('frozenOverlay')) return;

    const gemSize = this.getGemSize();

    // 霜オーバーレイ（縁をグラデーション的に水色にし、中央はオーブの色が見える）
    // Canvasテクスチャで真のラジアルグラデーションを実現し、中央の視認性を確保
    const textureSize = Math.ceil(gemSize * 2.1);
    const textureKey = `frozenGradient_${textureSize}`;
    if (!this.scene.textures.exists(textureKey)) {
      const canvasTex = this.scene.textures.createCanvas(textureKey, textureSize, textureSize)!;
      const ctx = canvasTex.getContext();
      const cx = textureSize / 2;
      const cy = textureSize / 2;
      const outerRadius = gemSize * 1.02;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
      gradient.addColorStop(0, 'rgba(153, 221, 255, 0)');
      gradient.addColorStop(0.35, 'rgba(153, 221, 255, 0)');
      gradient.addColorStop(0.5, 'rgba(153, 221, 255, 0.08)');
      gradient.addColorStop(0.65, 'rgba(153, 221, 255, 0.20)');
      gradient.addColorStop(0.78, 'rgba(153, 221, 255, 0.32)');
      gradient.addColorStop(0.88, 'rgba(153, 221, 255, 0.42)');
      gradient.addColorStop(0.95, 'rgba(153, 221, 255, 0.50)');
      gradient.addColorStop(1.0, 'rgba(153, 221, 255, 0.55)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.fill();
      canvasTex.refresh();
    }
    const frozenOverlay = this.scene.add.image(0, 0, textureKey);
    frozenOverlay.setName('frozenOverlay');
    tile.container.add(frozenOverlay);

    // 氷の枠線（ボーダー）
    const frozenBorder = this.scene.add.graphics();
    frozenBorder.lineStyle(3, 0x66ccee, 0.8);
    frozenBorder.strokeCircle(0, 0, gemSize * 0.98);
    frozenBorder.setName('frozenBorder');
    tile.container.add(frozenBorder);

    // 氷アイコン（右上コーナーに配置してアクションアイコンと重ならないようにする）
    const fontSize = Math.floor(gemSize * 0.5);
    const iceIcon = this.scene.add.text(gemSize * 0.45, -gemSize * 0.45, 'ac_unit', {
      fontFamily: 'Material Symbols Outlined',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
    });
    iceIcon.setOrigin(0.5, 0.5);
    iceIcon.setAlpha(0.85);
    iceIcon.setName('frozenIcon');
    tile.container.add(iceIcon);

    // 枠線のalpha明滅アニメーション
    this.scene.tweens.add({
      targets: frozenBorder,
      alpha: 0.4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * 氷漬けオーバーレイをタイルから削除
   */
  removeFrozenOverlay(tile: Tile): void {
    const overlay = tile.container.getByName('frozenOverlay');
    if (overlay) {
      overlay.destroy();
    }
    const border = tile.container.getByName('frozenBorder');
    if (border) {
      this.scene.tweens.killTweensOf(border);
      border.destroy();
    }
    const icon = tile.container.getByName('frozenIcon');
    if (icon) {
      icon.destroy();
    }
  }
}
