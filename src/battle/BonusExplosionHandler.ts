import Phaser from 'phaser';
import {
  BOARD_COLS,
  BOARD_ROWS,
  BonusDirection,
  BonusType,
} from '../types';
import { SoundManager, SoundKeys } from '../utils/SoundManager';
import { Tile, collectActionCounts } from './board/types';
import { BoardModel } from './board/BoardModel';
import { EffectManager } from './effects/EffectManager';
import { ActionSystem } from './actions/ActionSystem';
import { StatusEffectController } from './StatusEffectController';
import { BONUS_EXPLOSION_DELAY_MS } from './constants';

export interface BonusExplosionCallbacks {
  dropTiles: (isPlayerMove: boolean) => void;
  getChainMultiplier: () => number;
  updateHUD: () => void;
}

interface ExplosionOptions {
  skipSelfBonus: boolean;
  onComplete?: () => void;
}

/**
 * BonusExplosionHandler - LINE/BOMB爆発処理
 */
export class BonusExplosionHandler {
  private scene: Phaser.Scene;
  private boardModel: BoardModel;
  private effectManager: EffectManager;
  private actionSystem: ActionSystem;
  private statusEffectController: StatusEffectController;
  private callbacks!: BonusExplosionCallbacks;

  constructor(
    scene: Phaser.Scene,
    boardModel: BoardModel,
    effectManager: EffectManager,
    actionSystem: ActionSystem,
    statusEffectController: StatusEffectController
  ) {
    this.scene = scene;
    this.boardModel = boardModel;
    this.effectManager = effectManager;
    this.actionSystem = actionSystem;
    this.statusEffectController = statusEffectController;
  }

  setCallbacks(callbacks: BonusExplosionCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * ボーナスオーブ爆発処理
   */
  triggerBonusExplosion(
    bonusTile: Tile,
    isPlayerMove: boolean,
    onComplete?: () => void
  ): void {
    SoundManager.getInstance().playSE(SoundKeys.LINE_DELETE);

    const { row, col, bonusDirection, type } = bonusTile;
    const offset = this.boardModel.getBoardOffset();

    // 爆発対象のタイルを距離順にソート
    const tilesToDestroy: { row: number; col: number; distance: number }[] = [];

    if (bonusDirection === BonusDirection.HORIZONTAL) {
      for (let c = 0; c < BOARD_COLS; c++) {
        tilesToDestroy.push({ row, col: c, distance: Math.abs(c - col) });
      }
    } else {
      for (let r = 0; r < BOARD_ROWS; r++) {
        tilesToDestroy.push({ row: r, col, distance: Math.abs(r - row) });
      }
    }

    tilesToDestroy.sort((a, b) => a.distance - b.distance);

    this.effectManager.showLineActivationEffect(row, col, bonusDirection!, type, offset.x, offset.y);
    this.effectManager.shakeBoardEffect(
      this.boardModel.getRawBoard() as (Tile | null)[][],
      offset.x,
      offset.y
    );

    this.executeSequentialExplosion(tilesToDestroy, row, col, isPlayerMove, {
      skipSelfBonus: true,
      onComplete,
    });
  }

  /**
   * 爆弾オーブ爆発処理（5×5範囲）
   */
  triggerBombExplosion(
    bonusTile: Tile,
    isPlayerMove: boolean,
    onComplete?: () => void
  ): void {
    SoundManager.getInstance().playSE(SoundKeys.BOMB_DELETE);

    const { row, col } = bonusTile;
    const offset = this.boardModel.getBoardOffset();

    // 爆発範囲を計算（チェビシェフ距離2以内、5×5範囲）
    const tilesToDestroy: { row: number; col: number; distance: number }[] = [];

    for (let r = Math.max(0, row - 2); r <= Math.min(BOARD_ROWS - 1, row + 2); r++) {
      for (let c = Math.max(0, col - 2); c <= Math.min(BOARD_COLS - 1, col + 2); c++) {
        const distance = Math.max(Math.abs(r - row), Math.abs(c - col)); // チェビシェフ距離
        tilesToDestroy.push({ row: r, col: c, distance });
      }
    }

    tilesToDestroy.sort((a, b) => a.distance - b.distance);

    // 爆発エフェクト（盤面シェイク + 衝撃波）
    this.effectManager.shakeBoardEffect(
      this.boardModel.getRawBoard() as (Tile | null)[][],
      offset.x,
      offset.y
    );

    // ボム爆発エフェクト（衝撃波リング + パーティクル）
    const bombCenter = this.boardModel.getTilePosition(row, col);
    this.effectManager.showBombExplosionEffect(bombCenter.x, bombCenter.y);

    this.executeSequentialExplosion(tilesToDestroy, row, col, isPlayerMove, {
      skipSelfBonus: true,
      onComplete,
    });
  }

  /**
   * 連鎖ボーナス爆発処理
   */
  processChainBonusExplosions(
    bonusOrbs: Tile[],
    isPlayerMove: boolean,
    onComplete?: () => void
  ): void {
    if (bonusOrbs.length === 0) {
      if (onComplete) {
        onComplete();
      } else {
        this.callbacks.dropTiles(isPlayerMove);
      }
      return;
    }

    const nextBonus = bonusOrbs.shift()!;

    if (nextBonus.bonusType === BonusType.BOMB) {
      this.triggerVirtualBombExplosion(nextBonus, isPlayerMove, () => {
        this.processChainBonusExplosions(bonusOrbs, isPlayerMove, onComplete);
      });
    } else {
      this.triggerVirtualBonusExplosion(nextBonus, isPlayerMove, () => {
        this.processChainBonusExplosions(bonusOrbs, isPlayerMove, onComplete);
      });
    }
  }

  /**
   * 仮想ボーナス爆発
   */
  private triggerVirtualBonusExplosion(
    bonusInfo: Tile,
    isPlayerMove: boolean,
    onComplete: () => void
  ): void {
    SoundManager.getInstance().playSE(SoundKeys.LINE_DELETE);

    const { row, col, bonusDirection, type } = bonusInfo;
    const offset = this.boardModel.getBoardOffset();

    const tilesToDestroy: { row: number; col: number; distance: number }[] = [];

    if (bonusDirection === BonusDirection.HORIZONTAL) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (this.boardModel.getTile(row, c)) {
          tilesToDestroy.push({ row, col: c, distance: Math.abs(c - col) });
        }
      }
    } else {
      for (let r = 0; r < BOARD_ROWS; r++) {
        if (this.boardModel.getTile(r, col)) {
          tilesToDestroy.push({ row: r, col, distance: Math.abs(r - row) });
        }
      }
    }

    if (tilesToDestroy.length === 0) {
      onComplete();
      return;
    }

    tilesToDestroy.sort((a, b) => a.distance - b.distance);

    this.effectManager.showLineActivationEffect(row, col, bonusDirection!, type, offset.x, offset.y);
    this.effectManager.shakeBoardEffect(
      this.boardModel.getRawBoard() as (Tile | null)[][],
      offset.x,
      offset.y
    );

    this.executeSequentialExplosion(tilesToDestroy, row, col, isPlayerMove, {
      skipSelfBonus: false,
      onComplete,
    });
  }

  /**
   * 仮想爆弾爆発（連鎖用）
   */
  private triggerVirtualBombExplosion(
    bonusInfo: Tile,
    isPlayerMove: boolean,
    onComplete: () => void
  ): void {
    SoundManager.getInstance().playSE(SoundKeys.BOMB_DELETE);

    const { row, col } = bonusInfo;
    const offset = this.boardModel.getBoardOffset();

    // 爆発範囲を計算（チェビシェフ距離2以内、5×5範囲）
    const tilesToDestroy: { row: number; col: number; distance: number }[] = [];

    for (let r = Math.max(0, row - 2); r <= Math.min(BOARD_ROWS - 1, row + 2); r++) {
      for (let c = Math.max(0, col - 2); c <= Math.min(BOARD_COLS - 1, col + 2); c++) {
        if (this.boardModel.getTile(r, c)) {
          const distance = Math.max(Math.abs(r - row), Math.abs(c - col));
          tilesToDestroy.push({ row: r, col: c, distance });
        }
      }
    }

    if (tilesToDestroy.length === 0) {
      onComplete();
      return;
    }

    tilesToDestroy.sort((a, b) => a.distance - b.distance);

    // 爆発エフェクト（盤面シェイク + 衝撃波）
    this.effectManager.shakeBoardEffect(
      this.boardModel.getRawBoard() as (Tile | null)[][],
      offset.x,
      offset.y
    );

    // ボム爆発エフェクト（衝撃波リング + パーティクル）
    const bombCenter = this.boardModel.getTilePosition(row, col);
    this.effectManager.showBombExplosionEffect(bombCenter.x, bombCenter.y);

    this.executeSequentialExplosion(tilesToDestroy, row, col, isPlayerMove, {
      skipSelfBonus: false,
      onComplete,
    });
  }

  /**
   * シーケンシャル爆発の共通処理
   * アクションカウント集計 → HUD更新 → 距離順の遅延爆発 → 連鎖/完了分岐
   */
  private executeSequentialExplosion(
    tilesToDestroy: { row: number; col: number; distance: number }[],
    originRow: number,
    originCol: number,
    isPlayerMove: boolean,
    options: ExplosionOptions
  ): void {
    if (tilesToDestroy.length === 0) {
      if (options.onComplete) {
        options.onComplete();
      } else {
        this.callbacks.dropTiles(isPlayerMove);
      }
      return;
    }

    // アクションカウント集計（お邪魔オーブ・ボーナスオーブ・氷漬けオーブは除外）
    const actionCounts = collectActionCounts(tilesToDestroy, (r, c) => this.boardModel.getTile(r, c));

    const multiplier = this.callbacks.getChainMultiplier();
    this.actionSystem.addCountsWithSE(actionCounts, multiplier);

    this.callbacks.updateHUD();

    // 連鎖ボーナスオーブを記録
    const chainBonusOrbs: Tile[] = [];

    // シーケンシャル爆発（距離順）
    let maxDelay = 0;
    tilesToDestroy.forEach(({ row: r, col: c, distance }) => {
      const tile = this.boardModel.getTile(r, c);
      if (tile) {
        const delay = distance * BONUS_EXPLOSION_DELAY_MS;
        maxDelay = Math.max(maxDelay, delay);

        this.scene.time.delayedCall(delay, () => {
          if (!this.boardModel.getTile(r, c)) return;

          // 氷漬けオーブは氷解除のみ（破壊しない）
          if (tile.isFrozen) {
            this.statusEffectController.thawFrozenTile(r, c);
            return;
          }

          const pos = this.boardModel.getTilePosition(r, c);
          this.effectManager.createExplosionEffect(pos.x, pos.y, tile.type);

          // 連鎖対象のボーナスオーブを収集
          if (tile.isBonus) {
            const isSelf = r === originRow && c === originCol;
            if (!options.skipSelfBonus || !isSelf) {
              chainBonusOrbs.push({ ...tile });
            }
          }

          this.scene.tweens.add({
            targets: tile.container,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 150,
            onComplete: () => {
              tile.container.destroy();
            },
          });
          this.boardModel.clearTile(r, c);
        });
      }
    });

    const totalExplosionTime = maxDelay + 200;
    this.scene.time.delayedCall(totalExplosionTime, () => {
      if (chainBonusOrbs.length > 0) {
        this.processChainBonusExplosions(chainBonusOrbs, isPlayerMove, options.onComplete);
      } else {
        this.scene.time.delayedCall(50, () => {
          if (options.onComplete) {
            options.onComplete();
          } else {
            this.callbacks.dropTiles(isPlayerMove);
          }
        });
      }
    });
  }
}
