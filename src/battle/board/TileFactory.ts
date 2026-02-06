import Phaser from 'phaser';
import { ActionType, BonusDirection, BonusType, TileType, TILE_SIZE } from '../../types';
import { Tile } from './types';
import {
  TILE_COLORS,
  TILE_HIGHLIGHT_COLORS,
  TILE_SHADOW_COLORS,
  TILE_MID_COLORS,
  ACTION_TYPE_WEIGHTS,
  ACTION_TYPE_TOTAL_WEIGHT,
  ACTION_ICON_OFFSETS,
  BONUS_ICON_OFFSETS,
} from '../constants';
import { TileIconFactory } from './TileIconFactory';
import { TileOverlayManager } from './TileOverlayManager';

/**
 * TileFactory - タイル・ボーナスオーブの生成ロジック
 * Phaserシーンを受け取り、タイルのContainerを生成する
 */
export class TileFactory {
  private scene: Phaser.Scene;
  private iconFactory: TileIconFactory;
  private overlayManager: TileOverlayManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.iconFactory = new TileIconFactory(scene);
    this.overlayManager = new TileOverlayManager(scene);
  }

  /**
   * 通常タイルを作成
   */
  createTile(
    row: number,
    col: number,
    x: number,
    y: number,
    type: TileType,
    onTileClick: (row: number, col: number) => void
  ): Tile {
    const container = this.scene.add.container(x, y);
    const gemSize = this.getGemSize();

    // 円形オーブ描画
    const graphics = this.createCircleOrbGraphics(gemSize, type);
    container.add(graphics);

    // アクションタイプを重み付きでランダムに割り当て（攻撃5:回復3:スキル2）
    const actionType = this.getWeightedActionType();

    // アクションタイプのシンボルを描画
    const iconContainer = this.iconFactory.createActionIcon(actionType, gemSize, type);
    const actionOffset = ACTION_ICON_OFFSETS[actionType];
    iconContainer.setPosition(actionOffset.x, actionOffset.y);
    container.add(iconContainer);

    // インタラクティブな当たり判定
    const hitArea = this.scene.add.circle(0, 0, gemSize, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    this.addHoverGlowEffect(hitArea, container, TILE_HIGHLIGHT_COLORS[type], gemSize * 1.3);

    const tile: Tile = { row, col, type, actionType, container, isBonus: false };

    hitArea.on('pointerdown', () => onTileClick(tile.row, tile.col));

    return tile;
  }

  /**
   * ボーナスオーブを作成（六角形、矢印アイコン）
   */
  createBonusTile(
    row: number,
    col: number,
    x: number,
    y: number,
    type: TileType,
    direction: BonusDirection,
    onTileClick: (row: number, col: number) => void
  ): Tile {
    const container = this.scene.add.container(x, y);
    const gemSize = this.getGemSize();

    // 六角形オーブ描画（ボーナス用グロー強め）
    const graphics = this.createHexagonOrbGraphics(gemSize, type, 0.35);
    container.add(graphics);

    // 方向アイコンを作成
    const directionIcon = this.iconFactory.createBonusDirectionIcon(direction, gemSize, type);
    const bonusOffset = BONUS_ICON_OFFSETS[direction];
    directionIcon.setPosition(bonusOffset.x, bonusOffset.y);
    container.add(directionIcon);

    // インタラクティブな当たり判定
    const hitArea = this.scene.add.circle(0, 0, gemSize, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    this.addHoverGlowEffect(hitArea, container, TILE_HIGHLIGHT_COLORS[type], gemSize * 1.3);

    const tile: Tile = {
      row,
      col,
      type,
      actionType: ActionType.ATTACK,
      container,
      isBonus: true,
      bonusDirection: direction,
      bonusType: BonusType.LINE,
    };

    hitArea.on('pointerdown', () => onTileClick(tile.row, tile.col));

    return tile;
  }

  /**
   * 爆弾オーブを作成（六角形、爆弾アイコン）
   */
  createBombTile(
    row: number,
    col: number,
    x: number,
    y: number,
    type: TileType,
    onTileClick: (row: number, col: number) => void
  ): Tile {
    const container = this.scene.add.container(x, y);
    const gemSize = this.getGemSize();

    // 六角形オーブ描画（爆弾用グロー強め）
    const graphics = this.createHexagonOrbGraphics(gemSize, type, 0.4);
    container.add(graphics);

    // 爆弾アイコンを作成
    const bombIcon = this.iconFactory.createBombIcon(gemSize, type);
    bombIcon.setPosition(0, 5);
    container.add(bombIcon);

    // インタラクティブな当たり判定
    const hitArea = this.scene.add.circle(0, 0, gemSize, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    this.addHoverGlowEffect(hitArea, container, TILE_HIGHLIGHT_COLORS[type], gemSize * 1.3);

    const tile: Tile = {
      row,
      col,
      type,
      actionType: ActionType.ATTACK,
      container,
      isBonus: true,
      bonusType: BonusType.BOMB,
    };

    hitArea.on('pointerdown', () => onTileClick(tile.row, tile.col));

    return tile;
  }

  /**
   * お邪魔オーブを作成（円形、禁止マークアイコン）
   */
  createOjamaTile(
    row: number,
    col: number,
    x: number,
    y: number,
    onTileClick: (row: number, col: number) => void
  ): Tile {
    const container = this.scene.add.container(x, y);
    const gemSize = this.getGemSize();
    const type = TileType.OJAMA;

    // 円形オーブ描画（お邪魔用、控えめ）
    const graphics = this.createCircleOrbGraphics(gemSize, type, 0.15, 0.35, 0.15);
    container.add(graphics);

    // お邪魔アイコン
    const iconContainer = this.iconFactory.createOjamaIcon(gemSize);
    iconContainer.setPosition(0, 5);
    container.add(iconContainer);

    // インタラクティブな当たり判定
    const hitArea = this.scene.add.circle(0, 0, gemSize, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    this.addHoverGlowEffect(hitArea, container, TILE_HIGHLIGHT_COLORS[type], gemSize * 1.3);

    const tile: Tile = {
      row,
      col,
      type: TileType.OJAMA,
      actionType: ActionType.ATTACK,
      container,
      isBonus: false,
    };

    hitArea.on('pointerdown', () => onTileClick(tile.row, tile.col));

    return tile;
  }

  /**
   * 毒オーブを作成（円形、ドクロアイコン）
   * 盤面での性質はお邪魔オーブと同様（マッチ対象外、隣接マッチで消去）
   */
  createPoisonTile(
    row: number,
    col: number,
    x: number,
    y: number,
    onTileClick: (row: number, col: number) => void
  ): Tile {
    const container = this.scene.add.container(x, y);
    const gemSize = this.getGemSize();
    const type = TileType.POISON;

    // 円形オーブ描画（毒用、濃い紫）
    const graphics = this.createCircleOrbGraphics(gemSize, type, 0.2, 0.4, 0.2);
    container.add(graphics);

    // 毒アイコン（ドクロ）
    const iconContainer = this.iconFactory.createPoisonIcon(gemSize);
    iconContainer.setPosition(0, 5);
    container.add(iconContainer);

    // インタラクティブな当たり判定
    const hitArea = this.scene.add.circle(0, 0, gemSize, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    this.addHoverGlowEffect(hitArea, container, TILE_HIGHLIGHT_COLORS[type], gemSize * 1.3);

    const tile: Tile = {
      row,
      col,
      type: TileType.POISON,
      actionType: ActionType.ATTACK,
      container,
      isBonus: false,
    };

    hitArea.on('pointerdown', () => onTileClick(tile.row, tile.col));

    return tile;
  }

  /**
   * 重み付きでアクションタイプを取得（攻撃5:回復3:スキル2）
   */
  getWeightedActionType(): ActionType {
    const rand = Phaser.Math.Between(1, ACTION_TYPE_TOTAL_WEIGHT);
    let cumulative = 0;
    for (const { type, weight } of ACTION_TYPE_WEIGHTS) {
      cumulative += weight;
      if (rand <= cumulative) {
        return type;
      }
    }
    return ActionType.ATTACK; // フォールバック
  }

  /**
   * 円形オーブのグラフィックスを作成
   */
  private createCircleOrbGraphics(
    gemSize: number,
    type: TileType,
    glowAlpha = 0.2,
    highlightAlpha = 0.45,
    whiteHighlightAlpha = 0.25
  ): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();

    // 外側のグロー効果（より暖かみのある光）
    graphics.fillStyle(TILE_HIGHLIGHT_COLORS[type], glowAlpha);
    graphics.fillCircle(0, 0, gemSize * 1.1);

    // リムライト（背景との分離感向上）
    graphics.fillStyle(0xf8f0e0, 0.05);
    graphics.fillCircle(0, 0, gemSize * 1.02);

    // 影（下に少しオフセット）
    graphics.fillStyle(0x1a1008, 0.5);
    graphics.fillCircle(2, 3, gemSize);

    // 外枠（暗い色）
    graphics.fillStyle(TILE_SHADOW_COLORS[type], 1);
    graphics.fillCircle(0, 0, gemSize);

    // メインの円（グラデーション - 外側）
    graphics.fillStyle(TILE_MID_COLORS[type], 1);
    graphics.fillCircle(0, 0, gemSize * 0.92);

    // メインの円（グラデーション - 内側）
    graphics.fillStyle(TILE_COLORS[type], 1);
    graphics.fillCircle(0, 0, gemSize * 0.82);

    // 中央のハイライト
    graphics.fillStyle(TILE_HIGHLIGHT_COLORS[type], highlightAlpha);
    graphics.fillCircle(0, 0, gemSize * 0.65);

    // 白いハイライト（光沢感 - やや抑えめ）
    graphics.fillStyle(0xfff8f0, whiteHighlightAlpha);
    graphics.fillCircle(-gemSize * 0.25, -gemSize * 0.25, gemSize * 0.25);

    return graphics;
  }

  /**
   * 六角形オーブのグラフィックスを作成
   */
  private createHexagonOrbGraphics(
    gemSize: number,
    type: TileType,
    glowAlpha = 0.35
  ): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();

    // 六角形の頂点を計算
    const hexPoints = this.getHexagonPoints(0, 0, gemSize);

    // 外側のグロー効果（ボーナスは強め）
    graphics.fillStyle(TILE_HIGHLIGHT_COLORS[type], glowAlpha);
    graphics.fillPoints(this.getHexagonPoints(0, 0, gemSize * 1.15), true);

    // リムライト（背景との分離感向上）
    graphics.fillStyle(0xf8f0e0, 0.05);
    graphics.fillPoints(this.getHexagonPoints(0, 0, gemSize * 1.02), true);

    // 影
    graphics.fillStyle(0x1a1008, 0.5);
    const shadowPoints = this.getHexagonPoints(2, 3, gemSize);
    graphics.fillPoints(shadowPoints, true);

    // 外枠
    graphics.fillStyle(TILE_SHADOW_COLORS[type], 1);
    graphics.fillPoints(hexPoints, true);

    // メインの宝石（グラデーション - 外側）
    const layer1Points = this.getHexagonPoints(0, 0, gemSize * 0.92);
    graphics.fillStyle(TILE_MID_COLORS[type], 1);
    graphics.fillPoints(layer1Points, true);

    // メインの宝石（グラデーション - 内側）
    const layer2Points = this.getHexagonPoints(0, 0, gemSize * 0.82);
    graphics.fillStyle(TILE_COLORS[type], 1);
    graphics.fillPoints(layer2Points, true);

    // 中央のハイライト
    const layer3Points = this.getHexagonPoints(0, 0, gemSize * 0.65);
    graphics.fillStyle(TILE_HIGHLIGHT_COLORS[type], 0.45);
    graphics.fillPoints(layer3Points, true);

    return graphics;
  }

  /**
   * ホバーグローエフェクトをhitAreaに追加する共通メソッド
   */
  private addHoverGlowEffect(
    hitArea: Phaser.GameObjects.Arc,
    container: Phaser.GameObjects.Container,
    color: number,
    size: number
  ): void {
    let glowGraphics: Phaser.GameObjects.Graphics | null = null;

    const clearGlow = () => {
      if (!glowGraphics) return;
      this.scene.tweens.killTweensOf(glowGraphics);
      glowGraphics.destroy();
      glowGraphics = null;
    };

    hitArea.on('pointerover', () => {
      if (glowGraphics) return;

      glowGraphics = this.scene.add.graphics();
      glowGraphics.fillStyle(color, 0.5);
      glowGraphics.fillCircle(0, 0, size);
      container.addAt(glowGraphics, 0);

      this.scene.tweens.add({
        targets: glowGraphics,
        alpha: 0.2,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    });

    hitArea.on('pointerout', clearGlow);
    container.on('destroy', clearGlow);
  }

  /**
   * 六角形の頂点を計算
   */
  getHexagonPoints(cx: number, cy: number, size: number): Phaser.Geom.Point[] {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      points.push(new Phaser.Geom.Point(px, py));
    }
    return points;
  }

  /**
   * 氷漬けオーバーレイをタイルに追加
   */
  addFrozenOverlay(tile: Tile): void {
    this.overlayManager.addFrozenOverlay(tile);
  }

  /**
   * 氷漬けオーバーレイをタイルから削除
   */
  removeFrozenOverlay(tile: Tile): void {
    this.overlayManager.removeFrozenOverlay(tile);
  }

  /**
   * 宝石サイズを取得（TILE_SIZEの42%）
   */
  private getGemSize(): number {
    return TILE_SIZE * 0.42;
  }
}
