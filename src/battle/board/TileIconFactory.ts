import Phaser from 'phaser';
import { ActionType, BonusDirection, TileType } from '../../types';
import { TILE_LIGHT_COLORS, TILE_SHADOW_COLORS } from '../constants';

/**
 * TileIconFactory - タイルアイコンの生成を担当
 */
export class TileIconFactory {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * アクションタイプのアイコンを作成
   */
  createActionIcon(
    actionType: ActionType,
    gemSize: number,
    tileType: TileType
  ): Phaser.GameObjects.Container {
    const iconNames = {
      [ActionType.ATTACK]: 'swords',
      [ActionType.SKILL]: 'star',
      [ActionType.HEAL]: 'favorite',
    };

    return this.createMaterialIcon(iconNames[actionType], gemSize * 1, tileType);
  }

  /**
   * ボーナスオーブの方向アイコンを作成
   */
  createBonusDirectionIcon(
    direction: BonusDirection,
    gemSize: number,
    tileType: TileType
  ): Phaser.GameObjects.Container {
    const iconName = direction === BonusDirection.HORIZONTAL ? 'swap_horiz' : 'swap_vert';
    return this.createMaterialIcon(iconName, gemSize * 1.1, tileType, 0.35);
  }

  /**
   * 爆弾オーブのアイコンを作成
   */
  createBombIcon(gemSize: number, tileType: TileType): Phaser.GameObjects.Container {
    return this.createMaterialIcon('bomb', gemSize * 1.1, tileType, 0.35);
  }

  /**
   * お邪魔オーブのアイコンを作成
   */
  createOjamaIcon(gemSize: number): Phaser.GameObjects.Container {
    return this.createMaterialIcon('do_not_touch', gemSize * 1, TileType.OJAMA, 0.2);
  }

  /**
   * 毒オーブのアイコンを作成
   */
  createPoisonIcon(gemSize: number): Phaser.GameObjects.Container {
    return this.createMaterialIcon('skull', gemSize * 1, TileType.POISON, 0.2);
  }

  /**
   * Material Symbolsアイコンを作成（共通処理）
   */
  private createMaterialIcon(
    iconName: string,
    fontSize: number,
    tileType: TileType,
    highlightAlpha = 0.25
  ): Phaser.GameObjects.Container {
    const iconContainer = this.scene.add.container(0, 0);

    const lightColor = TILE_LIGHT_COLORS[tileType];
    const colorHex = '#' + lightColor.toString(16).padStart(6, '0');
    const shadowColor = TILE_SHADOW_COLORS[tileType];
    const shadowHex = '#' + shadowColor.toString(16).padStart(6, '0');

    const fontSizePx = Math.floor(fontSize);

    // アイコンのシャドウ
    const shadowText = this.scene.add.text(1, 2, iconName, {
      fontFamily: 'Material Symbols Outlined',
      fontSize: `${fontSizePx}px`,
      color: shadowHex,
    });
    shadowText.setOrigin(0.5, 0.5);
    shadowText.setAlpha(0.5);
    iconContainer.add(shadowText);

    // メインアイコン
    const iconText = this.scene.add.text(0, 0, iconName, {
      fontFamily: 'Material Symbols Outlined',
      fontSize: `${fontSizePx}px`,
      color: colorHex,
    });
    iconText.setOrigin(0.5, 0.5);
    iconContainer.add(iconText);

    // 輝きのハイライト
    const highlightText = this.scene.add.text(-1, -1, iconName, {
      fontFamily: 'Material Symbols Outlined',
      fontSize: `${fontSizePx}px`,
      color: '#ffffff',
    });
    highlightText.setOrigin(0.5, 0.5);
    highlightText.setAlpha(highlightAlpha);
    highlightText.setScale(0.95);
    iconContainer.add(highlightText);

    return iconContainer;
  }
}
