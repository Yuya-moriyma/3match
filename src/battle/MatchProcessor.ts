import Phaser from 'phaser';
import { ActionType, BonusDirection, BonusType } from '../types';
import { SoundManager, SoundKeys } from '../utils/SoundManager';
import { Tile, collectActionCounts } from './board/types';
import { BoardModel } from './board/BoardModel';
import { TileFactory } from './board/TileFactory';
import { MatchDetector } from './board/MatchDetector';
import { EffectManager } from './effects/EffectManager';
import { ActionSystem } from './actions/ActionSystem';
import { StatusEffectController } from './StatusEffectController';
import { COUNT_UP_INTERVAL_MS } from './constants';

export interface MatchProcessorCallbacks {
  onTileClick: (row: number, col: number) => void;
  dropTiles: (isPlayerMove: boolean) => void;
  processChainBonusExplosions: (bonusOrbs: Tile[], isPlayerMove: boolean) => void;
  getChainMultiplier: () => number;
  getLastSwappedTile: () => { row: number; col: number } | null;
}

/**
 * MatchProcessor - マッチ処理（通常マッチ・ボーナス含むマッチ）
 */
export class MatchProcessor {
  private scene: Phaser.Scene;
  private boardModel: BoardModel;
  private tileFactory: TileFactory;
  private effectManager: EffectManager;
  private actionSystem: ActionSystem;
  private statusEffectController: StatusEffectController;
  private callbacks!: MatchProcessorCallbacks;

  constructor(
    scene: Phaser.Scene,
    boardModel: BoardModel,
    tileFactory: TileFactory,
    effectManager: EffectManager,
    actionSystem: ActionSystem,
    statusEffectController: StatusEffectController
  ) {
    this.scene = scene;
    this.boardModel = boardModel;
    this.tileFactory = tileFactory;
    this.effectManager = effectManager;
    this.actionSystem = actionSystem;
    this.statusEffectController = statusEffectController;
  }

  setCallbacks(callbacks: MatchProcessorCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * マッチ処理
   */
  processMatches(matches: { row: number; col: number }[], isPlayerMove = false): void {
    // 氷漬けボーナスオーブは爆発せず氷解除のみ（フェーズ2のマッチ処理で対応）
    const matchedBonusOrbs = MatchDetector.extractBonusOrbs(this.boardModel.getRawBoard(), matches)
      .filter(orb => !orb.isFrozen);

    this.processMatchesInternal(matches, matchedBonusOrbs, isPlayerMove);
  }

  /**
   * マッチ処理の共通実装
   * bonusOrbs が空なら通常マッチ、非空ならボーナス含むマッチ
   */
  private processMatchesInternal(
    matches: { row: number; col: number }[],
    bonusOrbs: Tile[],
    isPlayerMove: boolean
  ): void {
    const hasBonusOrbs = bonusOrbs.length > 0;

    SoundManager.getInstance().playSE(SoundKeys.ORB_DELETE);

    // アクションカウントを集計（お邪魔オーブ・ボーナスオーブ・氷漬けオーブは除外）
    const actionCounts = collectActionCounts(matches, (r, c) => this.boardModel.getTile(r, c));

    const multiplier = this.callbacks.getChainMultiplier();
    const prevCounts = this.actionSystem.getCounts();
    this.actionSystem.addCountsWithSE(actionCounts, multiplier);

    // カウントアップアニメーション
    const currentCounts = this.actionSystem.getCounts();
    if (actionCounts.attack > 0) {
      this.actionSystem.animateCountUp(ActionType.ATTACK, prevCounts.attack, currentCounts.attack, COUNT_UP_INTERVAL_MS);
    }
    if (actionCounts.skill > 0) {
      this.actionSystem.animateCountUp(ActionType.SKILL, prevCounts.skill, currentCounts.skill, COUNT_UP_INTERVAL_MS);
    }
    if (actionCounts.heal > 0) {
      this.actionSystem.animateCountUp(ActionType.HEAL, prevCounts.heal, currentCounts.heal, COUNT_UP_INTERVAL_MS);
    }

    // ボーナス生成位置を計算
    const matchGroups = MatchDetector.findMatchGroups(this.boardModel.getRawBoard());
    const bonusPositions = MatchDetector.calculateBonusPositions(matchGroups, this.callbacks.getLastSwappedTile());

    // 氷漬けタイル上のボーナス位置を除外（氷漬けオーブは消えず残るためボーナス配置不可）
    const filteredBonusPositions = bonusPositions.filter(bp => {
      const tile = this.boardModel.getTile(bp.row, bp.col);
      return !tile || !tile.isFrozen;
    });

    // 隣接するお邪魔オーブを検出
    const adjacentOjama = this.statusEffectController.findAdjacentOjamaOrbs(matches);

    // マッチしたタイルを処理（氷漬けは氷解除のみ、ボーナスオーブはそのまま、それ以外は削除）
    matches.forEach(({ row, col }) => {
      const tile = this.boardModel.getTile(row, col);
      if (tile) {
        // 氷漬けオーブはマッチに含まれても削除せず氷解除のみ
        if (tile.isFrozen) {
          this.statusEffectController.thawFrozenTile(row, col);
          return;
        }

        // ボーナスオーブが含まれるマッチの場合、ボーナスオーブ自体は削除しない
        if (hasBonusOrbs && tile.isBonus) {
          return;
        }

        const pos = this.boardModel.getTilePosition(row, col);
        this.effectManager.createExplosionEffect(pos.x, pos.y, tile.type);

        // ボーナス生成位置でなければ削除
        const isBonusPosition = filteredBonusPositions.some((bp) => bp.row === row && bp.col === col);
        if (!isBonusPosition) {
          this.scene.tweens.add({
            targets: tile.container,
            alpha: 0,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 200,
            onComplete: () => {
              tile.container.destroy();
            },
          });
          this.boardModel.clearTile(row, col);
        }
      }
    });

    // 隣接お邪魔オーブを消去（アクションカウントに加算しない）
    adjacentOjama.forEach(({ row, col }) => {
      const tile = this.boardModel.getTile(row, col);
      if (tile) {
        const pos = this.boardModel.getTilePosition(row, col);
        this.effectManager.createExplosionEffect(pos.x, pos.y, tile.type);
        this.scene.tweens.add({
          targets: tile.container,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 200,
          onComplete: () => {
            tile.container.destroy();
          },
        });
        this.boardModel.clearTile(row, col);
      }
    });

    // ボーナスオーブを生成
    this.createBonusTiles(filteredBonusPositions);

    // 完了時の分岐: ボーナスオーブがあれば連鎖爆発、なければ落下処理
    if (hasBonusOrbs) {
      this.scene.time.delayedCall(300, () => {
        this.callbacks.processChainBonusExplosions([...bonusOrbs], isPlayerMove);
      });
    } else {
      this.scene.time.delayedCall(250, () => {
        this.callbacks.dropTiles(isPlayerMove);
      });
    }
  }

  /**
   * ボーナスオーブを生成
   */
  private createBonusTiles(
    bonusPositions: { row: number; col: number; type: number; bonusType: BonusType; direction?: BonusDirection }[]
  ): void {
    bonusPositions.forEach((bp) => {
      const existingTile = this.boardModel.getTile(bp.row, bp.col);
      if (existingTile) {
        existingTile.container.destroy();
      }

      const pos = this.boardModel.getTilePosition(bp.row, bp.col);
      let bonusTile: Tile;

      if (bp.bonusType === BonusType.BOMB) {
        // 5個以上マッチ: 爆弾オーブ
        bonusTile = this.tileFactory.createBombTile(
          bp.row,
          bp.col,
          pos.x,
          pos.y,
          bp.type,
          (r, c) => this.callbacks.onTileClick(r, c)
        );
      } else {
        // 4個マッチ: ラインオーブ
        bonusTile = this.tileFactory.createBonusTile(
          bp.row,
          bp.col,
          pos.x,
          pos.y,
          bp.type,
          bp.direction!,
          (r, c) => this.callbacks.onTileClick(r, c)
        );
      }
      this.boardModel.setTile(bp.row, bp.col, bonusTile);
      this.effectManager.showBonusCreateEffect(pos.x, pos.y);
    });
  }
}
