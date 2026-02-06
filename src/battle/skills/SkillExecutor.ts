import Phaser from 'phaser';
import { Character, SkillEffectType, TileType, TILE_SIZE } from '../../types';
// OJAMA除外: CREATE_BOMBの対象候補からお邪魔オーブを除外する
// CONVERT_COLORは fromColor === TileType.OJAMA になることがないため変更不要
import { BoardModel } from '../board/BoardModel';
import { TileFactory } from '../board/TileFactory';
import { TileIconFactory } from '../board/TileIconFactory';
import { Tile } from '../board/types';
import {
  TILE_COLORS,
  TILE_HIGHLIGHT_COLORS,
  TILE_SHADOW_COLORS,
  TILE_MID_COLORS,
  ACTION_ICON_OFFSETS,
} from '../constants';

/**
 * スキル実行結果
 */
export interface SkillExecutionResult {
  success: boolean;
  message?: string;
  affectedTiles?: { row: number; col: number }[];
  enemyCounterFreeze?: { duration: number };
}

/**
 * SkillExecutor - キャラクタースキルの実行を担当
 */
export class SkillExecutor {
  private boardModel: BoardModel;
  private tileFactory: TileFactory;
  private iconFactory: TileIconFactory;

  constructor(boardModel: BoardModel, tileFactory: TileFactory, scene: Phaser.Scene) {
    this.boardModel = boardModel;
    this.tileFactory = tileFactory;
    this.iconFactory = new TileIconFactory(scene);
  }

  /**
   * キャラクタースキルを実行
   */
  execute(
    character: Character,
    onTileClick: (row: number, col: number) => void
  ): SkillExecutionResult {
    switch (character.skill.effectType) {
      case SkillEffectType.CREATE_BOMB:
        return this.executeCreateBomb(character, onTileClick);
      case SkillEffectType.CONVERT_COLOR:
        return this.executeConvertColor(character);
      case SkillEffectType.FREEZE_ENEMY_COUNTER:
        return this.executeFreezeEnemyCounter(character);
      case SkillEffectType.GENERATE_COLOR:
        return this.executeGenerateColor(character);
      default:
        return { success: false, message: '未知のスキル効果タイプ' };
    }
  }

  /**
   * ボム生成スキルを実行（赤ずきん）
   */
  private executeCreateBomb(
    character: Character,
    onTileClick: (row: number, col: number) => void
  ): SkillExecutionResult {
    const count = character.skill.effectParams?.count ?? 1;

    // 通常オーブ（非ボーナス、非お邪魔）の位置をリストアップ
    const normalTilePositions: { row: number; col: number }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (tile && !tile.isBonus && tile.type !== TileType.OJAMA) {
        normalTilePositions.push({ row, col });
      }
    }

    if (normalTilePositions.length === 0) {
      return { success: false, message: '対象なし' };
    }

    // ランダムに選択
    const affectedTiles: { row: number; col: number }[] = [];
    for (let i = 0; i < count && normalTilePositions.length > 0; i++) {
      const randomIndex = Phaser.Math.Between(0, normalTilePositions.length - 1);
      const selected = normalTilePositions.splice(randomIndex, 1)[0];
      affectedTiles.push(selected);
    }

    // 選択したタイルをボムに変換
    for (const { row, col } of affectedTiles) {
      const existingTile = this.boardModel.getTile(row, col);
      if (existingTile) {
        const tileType = existingTile.type;
        existingTile.container.destroy();

        const pos = this.boardModel.getTilePosition(row, col);
        const bombTile = this.tileFactory.createBombTile(
          row,
          col,
          pos.x,
          pos.y,
          tileType,
          onTileClick
        );
        this.boardModel.setTile(row, col, bombTile);
      }
    }

    return { success: true, affectedTiles };
  }

  /**
   * 色変換スキルを実行（白雪姫）
   */
  private executeConvertColor(character: Character): SkillExecutionResult {
    const fromColor = character.skill.effectParams?.fromColor;
    const toColor = character.skill.effectParams?.toColor;

    if (fromColor === undefined || toColor === undefined) {
      return { success: false, message: 'スキルパラメータが不正' };
    }

    // 変換対象のタイルを検索
    const targetTiles: { row: number; col: number; tile: Tile }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (tile && !tile.isBonus && tile.type === fromColor) {
        targetTiles.push({ row, col, tile });
      }
    }

    if (targetTiles.length === 0) {
      return { success: false, message: '対象なし' };
    }

    // 各タイルの色を変換
    for (const { tile } of targetTiles) {
      this.convertTileColor(tile, toColor);
    }

    return {
      success: true,
      affectedTiles: targetTiles.map(({ row, col }) => ({ row, col })),
    };
  }

  /**
   * 敵カウンター停止スキルを実行（シンデレラ）
   */
  private executeFreezeEnemyCounter(character: Character): SkillExecutionResult {
    const duration = character.skill.effectParams?.duration ?? 3;
    return { success: true, enemyCounterFreeze: { duration } };
  }

  /**
   * 指定色オーブ生成スキルを実行（白雪姫）
   * 全オーブ（お邪魔、毒、氷漬け含む）を対象に指定色に変換
   */
  private executeGenerateColor(character: Character): SkillExecutionResult {
    const targetColor = character.skill.effectParams?.targetColor;
    const count = character.skill.effectParams?.count ?? 10;

    if (targetColor === undefined) {
      return { success: false, message: 'スキルパラメータが不正' };
    }

    // 対象オーブを収集（targetColor以外の全オーブ）
    const candidateTiles: { row: number; col: number; tile: Tile }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (tile && tile.type !== targetColor) {
        candidateTiles.push({ row, col, tile });
      }
    }

    if (candidateTiles.length === 0) {
      return { success: false, message: '対象なし' };
    }

    // 変換対象を選択（count個まで、それ以下なら全て）
    let targetTiles: { row: number; col: number; tile: Tile }[];
    if (candidateTiles.length <= count) {
      targetTiles = candidateTiles;
    } else {
      // ランダムにcount個選択
      targetTiles = [];
      const remaining = [...candidateTiles];
      for (let i = 0; i < count && remaining.length > 0; i++) {
        const randomIndex = Phaser.Math.Between(0, remaining.length - 1);
        targetTiles.push(remaining.splice(randomIndex, 1)[0]);
      }
    }

    // 各タイルを変換
    for (const { tile } of targetTiles) {
      this.convertToColorOrb(tile, targetColor);
    }

    return {
      success: true,
      affectedTiles: targetTiles.map(({ row, col }) => ({ row, col })),
    };
  }

  /**
   * タイルを指定色の通常オーブに変換（お邪魔/毒オーブ対応）
   * アクション属性: 元が通常オーブなら引き継ぎ、そうでなければランダム生成
   */
  private convertToColorOrb(tile: Tile, newType: TileType): void {
    const oldType = tile.type;
    const isSpecialOrb = oldType === TileType.OJAMA || oldType === TileType.POISON;

    // アクション属性の決定
    if (isSpecialOrb) {
      // お邪魔/毒オーブは新しいアクション属性をランダム生成
      tile.actionType = this.tileFactory.getWeightedActionType();
    }
    // 通常オーブの場合は既存のactionTypeを維持

    // タイプを変更
    tile.type = newType;

    const container = tile.container;
    const children = container.getAll();
    const gemSize = TILE_SIZE * 0.42;

    // グラフィックス（オーブ本体）を再描画
    for (const child of children) {
      if (child instanceof Phaser.GameObjects.Graphics) {
        if (tile.isBonus) {
          this.redrawHexagonOrbGraphics(child, newType);
        } else {
          this.redrawOrbGraphics(child, newType);
        }
        break;
      }
    }

    // お邪魔/毒オーブの場合はアイコンを入れ替え
    if (isSpecialOrb) {
      // 既存のアイコンコンテナを削除（お邪魔/毒アイコン）
      const containersToRemove: Phaser.GameObjects.Container[] = [];
      for (const child of children) {
        if (child instanceof Phaser.GameObjects.Container) {
          containersToRemove.push(child);
        }
      }
      for (const c of containersToRemove) {
        c.destroy();
      }

      // 新しいアクションアイコンを追加
      const iconContainer = this.iconFactory.createActionIcon(tile.actionType, gemSize, newType);
      const actionOffset = ACTION_ICON_OFFSETS[tile.actionType];
      iconContainer.setPosition(actionOffset.x, actionOffset.y);
      // hitArea（Circle）の前に挿入（hitAreaは最後にある想定）
      container.addAt(iconContainer, container.length - 1);
    } else {
      // 通常オーブの場合はアイコンの色のみ更新
      this.updateActionIconColor(tile, newType);
    }
  }

  /**
   * アクションアイコンの色を更新（通常オーブ用）
   */
  private updateActionIconColor(tile: Tile, newType: TileType): void {
    const container = tile.container;
    const children = container.getAll();
    const gemSize = TILE_SIZE * 0.42;

    // 既存のアイコンコンテナを探して削除
    for (const child of children) {
      if (child instanceof Phaser.GameObjects.Container) {
        child.destroy();
        break;
      }
    }

    // 新しいアクションアイコンを追加
    const iconContainer = this.iconFactory.createActionIcon(tile.actionType, gemSize, newType);
    const actionOffset = ACTION_ICON_OFFSETS[tile.actionType];
    iconContainer.setPosition(actionOffset.x, actionOffset.y);
    // hitArea（Circle）の前に挿入
    container.addAt(iconContainer, container.length - 1);
  }

  /**
   * タイルの色を変換（グラフィックを再描画）
   */
  private convertTileColor(tile: Tile, newType: TileType): void {
    // タイプを変更
    tile.type = newType;

    // コンテナ内のgraphicsを探して再描画
    const container = tile.container;
    const children = container.getAll();

    // 最初のGraphicsオブジェクトを取得（オーブ本体）
    for (const child of children) {
      if (child instanceof Phaser.GameObjects.Graphics) {
        this.redrawOrbGraphics(child, newType);
        break;
      }
    }
  }

  /**
   * オーブのグラフィックを再描画（円形）
   */
  private redrawOrbGraphics(graphics: Phaser.GameObjects.Graphics, type: TileType): void {
    const gemSize = TILE_SIZE * 0.42;

    graphics.clear();

    // 外側のグロー効果
    graphics.fillStyle(TILE_HIGHLIGHT_COLORS[type], 0.2);
    graphics.fillCircle(0, 0, gemSize * 1.1);

    // リムライト
    graphics.fillStyle(0xf8f0e0, 0.05);
    graphics.fillCircle(0, 0, gemSize * 1.02);

    // 影
    graphics.fillStyle(0x1a1008, 0.5);
    graphics.fillCircle(2, 3, gemSize);

    // 外枠
    graphics.fillStyle(TILE_SHADOW_COLORS[type], 1);
    graphics.fillCircle(0, 0, gemSize);

    // メインの円（外側）
    graphics.fillStyle(TILE_MID_COLORS[type], 1);
    graphics.fillCircle(0, 0, gemSize * 0.92);

    // メインの円（内側）
    graphics.fillStyle(TILE_COLORS[type], 1);
    graphics.fillCircle(0, 0, gemSize * 0.82);

    // 中央のハイライト
    graphics.fillStyle(TILE_HIGHLIGHT_COLORS[type], 0.45);
    graphics.fillCircle(0, 0, gemSize * 0.65);

    // 白いハイライト
    graphics.fillStyle(0xfff8f0, 0.25);
    graphics.fillCircle(-gemSize * 0.25, -gemSize * 0.25, gemSize * 0.25);
  }

  /**
   * オーブのグラフィックを再描画（六角形・ボーナスオーブ用）
   */
  private redrawHexagonOrbGraphics(graphics: Phaser.GameObjects.Graphics, type: TileType, glowAlpha = 0.35): void {
    const gemSize = TILE_SIZE * 0.42;

    graphics.clear();

    // 六角形の頂点を計算
    const hexPoints = this.getHexagonPoints(0, 0, gemSize);

    // 外側のグロー効果（ボーナスは強め）
    graphics.fillStyle(TILE_HIGHLIGHT_COLORS[type], glowAlpha);
    graphics.fillPoints(this.getHexagonPoints(0, 0, gemSize * 1.15), true);

    // リムライト
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
  }

  /**
   * 六角形の頂点を計算
   */
  private getHexagonPoints(cx: number, cy: number, size: number): Phaser.Geom.Point[] {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      points.push(new Phaser.Geom.Point(px, py));
    }
    return points;
  }
}
