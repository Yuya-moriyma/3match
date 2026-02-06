import Phaser from 'phaser';
import { EnemySkillDef, EnemySkillEffectType, TileType } from '../../types';
import { BoardModel } from '../board/BoardModel';
import { MatchDetector } from '../board/MatchDetector';
import { Tile } from '../board/types';

/**
 * 敵スキル実行結果
 */
export interface EnemySkillResult {
  /** 追加ダメージ（HEAVY_ATTACK用） */
  damage?: number;
  /** 毒状態パラメータ（POISON用） */
  poison?: {
    duration: number;
    damagePerTurn: number;
  };
  /** タイルロックパラメータ（TILE_LOCK用） */
  tileLock?: {
    tiles: { row: number; col: number }[];
    duration: number;
  };
  /** お邪魔オーブ変換パラメータ（OJAMA_CONVERT用） */
  ojamaConvert?: {
    tiles: { row: number; col: number }[];
  };
  /** 氷漬けパラメータ（FREEZE用） */
  freeze?: {
    tiles: { row: number; col: number }[];
  };
  /** 毒オーブ変換パラメータ（POISON_CONVERT用） */
  poisonConvert?: {
    tiles: { row: number; col: number }[];
  };
}

/**
 * EnemySkillExecutor - 敵スキルの効果を実行するクラス
 */
export class EnemySkillExecutor {
  private boardModel: BoardModel;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    boardModel: BoardModel
  ) {
    this.scene = scene;
    this.boardModel = boardModel;
  }

  /**
   * 敵スキルを実行
   */
  execute(
    skillDef: EnemySkillDef,
    normalAttackDamage: number
  ): EnemySkillResult {
    switch (skillDef.effectType) {
      case EnemySkillEffectType.HEAVY_ATTACK:
        return this.executeHeavyAttack(skillDef, normalAttackDamage);
      case EnemySkillEffectType.BOARD_SHUFFLE:
        this.executeBoardShuffle();
        return {};
      case EnemySkillEffectType.TILE_LOCK:
        return this.executeTileLock(skillDef);
      case EnemySkillEffectType.POISON:
        return this.executePoison(skillDef);
      case EnemySkillEffectType.OJAMA_CONVERT:
        return this.executeOjamaConvert(skillDef);
      case EnemySkillEffectType.FREEZE:
        return this.executeFreezeOrbs(skillDef);
      case EnemySkillEffectType.POISON_CONVERT:
        return this.executePoisonConvert(skillDef);
      default:
        return {};
    }
  }

  /**
   * HEAVY_ATTACK: 固定ダメージまたは通常攻撃のN倍ダメージ
   */
  private executeHeavyAttack(
    skillDef: EnemySkillDef,
    normalAttackDamage: number
  ): EnemySkillResult {
    if (skillDef.params.fixedDamage != null) {
      return {
        damage: skillDef.params.fixedDamage,
      };
    }
    const multiplier = skillDef.params.multiplier ?? 2;
    return {
      damage: Math.floor(normalAttackDamage * multiplier),
    };
  }

  /**
   * BOARD_SHUFFLE: 盤面の全タイル位置をランダムに再配置
   * マッチが発生しないよう検証し、マッチがある場合は再シャッフル
   */
  private executeBoardShuffle(): void {
    // 全タイル位置を収集
    const tiles: { row: number; col: number; tile: Tile }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (tile) {
        tiles.push({ row, col, tile });
      }
    }

    if (tiles.length <= 1) return;

    let attempts = 0;
    const maxAttempts = 50;

    do {
      // Fisher-Yatesシャッフルで位置をランダム化
      const positions = tiles.map((t) => ({ row: t.row, col: t.col }));
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Phaser.Math.Between(0, i);
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      // 新しい位置にタイルを配置
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i].tile;
        const newPos = positions[i];
        this.boardModel.setTile(newPos.row, newPos.col, tile);
      }

      // マッチが発生しないか検証
      const matches = MatchDetector.findMatches(this.boardModel.getRawBoard());
      if (matches.length === 0) {
        break;
      }

      attempts++;
    } while (attempts < maxAttempts);

    // タイルの視覚的な位置を更新（アニメーション付き）
    for (const { tile } of this.boardModel.iterateTiles()) {
      if (tile) {
        const targetPos = this.boardModel.getTilePosition(tile.row, tile.col);
        this.scene.tweens.add({
          targets: tile.container,
          x: targetPos.x,
          y: targetPos.y,
          duration: 300,
          ease: 'Quad.easeInOut',
        });
      }
    }
  }

  /**
   * TILE_LOCK: ランダムにタイルを選びロック状態にする
   */
  private executeTileLock(skillDef: EnemySkillDef): EnemySkillResult {
    const count = skillDef.params.count ?? 3;
    const duration = skillDef.params.duration ?? 3;

    // ロック可能なタイルを収集（既にロック済みでないもの）
    const candidates: { row: number; col: number }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (tile && !tile.isLocked) {
        candidates.push({ row, col });
      }
    }

    // ランダムにcount個選択
    const selected: { row: number; col: number }[] = [];
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selected.push(shuffled[i]);
      const tile = this.boardModel.getTile(shuffled[i].row, shuffled[i].col);
      if (tile) {
        tile.isLocked = true;
      }
    }

    return {
      tileLock: {
        tiles: selected,
        duration,
      },
    };
  }

  /**
   * POISON: 毒状態パラメータを返す
   */
  private executePoison(skillDef: EnemySkillDef): EnemySkillResult {
    const duration = skillDef.params.duration ?? 3;
    const damagePerTurn = skillDef.params.damagePerTurn ?? 5;

    return {
      poison: {
        duration,
        damagePerTurn,
      },
    };
  }

  /**
   * OJAMA_CONVERT: 通常オーブをお邪魔オーブに変換
   */
  private executeOjamaConvert(skillDef: EnemySkillDef): EnemySkillResult {
    const ojamaCount = skillDef.params.ojamaCount ?? 5;

    // 変換対象候補を収集（通常オーブ、非ボーナス、非ロック、非お邪魔、非氷漬け）
    const candidates: { row: number; col: number }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (tile && !tile.isBonus && !tile.isLocked && !tile.isFrozen && tile.type !== TileType.OJAMA) {
        candidates.push({ row, col });
      }
    }

    if (candidates.length === 0) {
      return {};
    }

    // Fisher-Yatesシャッフル
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 候補がojamaCount未満の場合は候補全数を使用
    const selected = shuffled.slice(0, Math.min(ojamaCount, shuffled.length));

    return {
      ojamaConvert: {
        tiles: selected,
      },
    };
  }

  /**
   * FREEZE: 通常オーブを氷漬けにする
   */
  private executeFreezeOrbs(skillDef: EnemySkillDef): EnemySkillResult {
    const freezeCount = skillDef.params.freezeCount ?? 5;

    // 凍結対象候補を収集（通常オーブ、非ボーナス、非ロック、非お邪魔、非氷漬け）
    const candidates: { row: number; col: number }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (tile && !tile.isBonus && !tile.isLocked && !tile.isFrozen && tile.type !== TileType.OJAMA) {
        candidates.push({ row, col });
      }
    }

    if (candidates.length === 0) {
      return {};
    }

    // Fisher-Yatesシャッフル
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, Math.min(freezeCount, shuffled.length));

    // データ上で氷漬けフラグを設定
    for (const { row, col } of selected) {
      const tile = this.boardModel.getTile(row, col);
      if (tile) {
        tile.isFrozen = true;
      }
    }

    return {
      freeze: {
        tiles: selected,
      },
    };
  }

  /**
   * POISON_CONVERT: 通常オーブを毒オーブに変換
   */
  private executePoisonConvert(skillDef: EnemySkillDef): EnemySkillResult {
    const poisonCount = skillDef.params.poisonCount ?? 5;

    // 変換対象候補を収集（通常オーブ、非ボーナス、非ロック、非お邪魔、非毒、非氷漬け）
    const candidates: { row: number; col: number }[] = [];
    for (const { row, col, tile } of this.boardModel.iterateTiles()) {
      if (
        tile &&
        !tile.isBonus &&
        !tile.isLocked &&
        !tile.isFrozen &&
        tile.type !== TileType.OJAMA &&
        tile.type !== TileType.POISON
      ) {
        candidates.push({ row, col });
      }
    }

    if (candidates.length === 0) {
      return {};
    }

    // Fisher-Yatesシャッフル
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 候補がpoisonCount未満の場合は候補全数を使用
    const selected = shuffled.slice(0, Math.min(poisonCount, shuffled.length));

    return {
      poisonConvert: {
        tiles: selected,
      },
    };
  }
}
