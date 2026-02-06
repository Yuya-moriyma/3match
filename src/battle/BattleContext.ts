import Phaser from 'phaser';
import { Character } from '../types';
import { SoundManager } from '../utils/SoundManager';
import { BoardModel } from './board/BoardModel';
import { BoardView } from './board/BoardView';
import { TileFactory } from './board/TileFactory';
import { EffectManager } from './effects/EffectManager';
import { BattleHUD } from './ui/BattleHUD';
import { ActionSystem } from './actions/ActionSystem';
import { SkillExecutor } from './skills/SkillExecutor';
import { EnemySkillExecutor } from './skills/EnemySkillExecutor';
import { StatusEffectManager } from './StatusEffectManager';

/**
 * BattleContext - サブハンドラ間の状態共有インターフェース
 * BattleController がメディエーターとして各ハンドラに提供する
 */
export interface BattleContext {
  readonly scene: Phaser.Scene;
  readonly boardModel: BoardModel;
  readonly boardView: BoardView;
  readonly tileFactory: TileFactory;
  readonly effectManager: EffectManager;
  readonly battleHUD: BattleHUD;
  readonly actionSystem: ActionSystem;
  readonly skillExecutor: SkillExecutor;
  readonly enemySkillExecutor: EnemySkillExecutor;
  readonly statusEffectManager: StatusEffectManager;
  readonly soundManager: SoundManager;
  readonly character: Character;

  // 状態アクセス（getter/setter）
  getPlayerHp(): number;
  setPlayerHp(hp: number): void;
  getPlayerMaxHp(): number;
  getEnemyHp(): number;
  setEnemyHp(hp: number): void;
  getEnemyMaxHp(): number;
  getEnemyId(): string;
  getEnemyNormalAttack(): number;
  getEnemySkillCounter(): number;
  setEnemySkillCounter(value: number): void;
  getEnemySkillInterval(): number;
  getEnemyAttackCounter(): number;
  setEnemyAttackCounter(value: number): void;
  getEnemyAttackInterval(): number;

  // 共通操作
  updateHUD(): void;
  isEnemyDefeated(): boolean;
  setEnemyDefeated(value: boolean): void;
  getIsProcessing(): boolean;
  setIsProcessing(value: boolean): void;
  getChainCount(): number;
  setChainCount(value: number): void;
  getLastSwappedTile(): { row: number; col: number } | null;
  setLastSwappedTile(value: { row: number; col: number } | null): void;

  // コールバック
  onTileClick(row: number, col: number): void;
}

/**
 * ReadonlyBattleContext - 状態変更を行わないハンドラ向け
 */
export interface ReadonlyBattleContext {
  readonly scene: Phaser.Scene;
  readonly boardModel: BoardModel;
  readonly boardView: BoardView;
  readonly tileFactory: TileFactory;
  readonly effectManager: EffectManager;
  readonly soundManager: SoundManager;
  getPlayerHp(): number;
  getEnemyHp(): number;
}
