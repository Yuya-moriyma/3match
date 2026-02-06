import Phaser from 'phaser';
import { BonusDirection, TileType, EnemySkillEffectType } from '../../types';
import { Tile } from '../board/types';
import { ExplosionEffects } from './ExplosionEffects';
import { BattleTextEffects } from './BattleTextEffects';
import { BoardEffects } from './BoardEffects';
import { CombatEffects } from './CombatEffects';
import { UIEffects } from './UIEffects';

/**
 * EffectManager - 視覚エフェクトを一元管理するファサード
 * 各エフェクトクラスへの委譲を行い、既存のAPI互換性を保持
 */
export class EffectManager {
  private explosionEffects: ExplosionEffects;
  private battleTextEffects: BattleTextEffects;
  private boardEffects: BoardEffects;
  private combatEffects: CombatEffects;
  private uiEffects: UIEffects;

  constructor(scene: Phaser.Scene) {
    this.explosionEffects = new ExplosionEffects(scene);
    this.battleTextEffects = new BattleTextEffects(scene);
    this.boardEffects = new BoardEffects(scene);
    this.combatEffects = new CombatEffects(scene);
    this.uiEffects = new UIEffects(scene);
  }

  // ===== ExplosionEffects への委譲 =====

  /**
   * 爆発エフェクトを作成
   */
  createExplosionEffect(x: number, y: number, type: TileType): void {
    this.explosionEffects.createExplosionEffect(x, y, type);
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
    this.explosionEffects.showLineActivationEffect(
      row,
      col,
      direction,
      tileType,
      boardOffsetX,
      boardOffsetY
    );
  }

  /**
   * ボムオーブ爆発エフェクト
   */
  showBombExplosionEffect(centerX: number, centerY: number): void {
    this.explosionEffects.showBombExplosionEffect(centerX, centerY);
  }

  /**
   * 氷解除エフェクト
   */
  createIceBreakEffect(x: number, y: number): void {
    this.explosionEffects.createIceBreakEffect(x, y);
  }

  // ===== BattleTextEffects への委譲 =====

  /**
   * チェインテキストを表示
   */
  showChainText(chainNumber: number): void {
    this.battleTextEffects.showChainText(chainNumber);
  }

  /**
   * アクション効果テキストを表示
   */
  showActionEffectText(text: string, color: string): void {
    this.battleTextEffects.showActionEffectText(text, color);
  }

  /**
   * スキル発動テキストを表示
   */
  showSkillActivationText(
    skillName: string,
    characterColor: number,
    onComplete?: () => void
  ): void {
    this.battleTextEffects.showSkillActivationText(skillName, characterColor, onComplete);
  }

  /**
   * 対象なしテキストを表示
   */
  showNoTargetText(): void {
    this.battleTextEffects.showNoTargetText();
  }

  /**
   * 敵スキル発動テキストを表示
   */
  showEnemySkillText(skillName: string, effectType: EnemySkillEffectType): void {
    this.battleTextEffects.showEnemySkillText(skillName, effectType);
  }

  // ===== BoardEffects への委譲 =====

  /**
   * 盤面全体をシェイク
   */
  shakeBoardEffect(
    board: (Tile | null)[][],
    boardOffsetX: number,
    boardOffsetY: number
  ): void {
    this.boardEffects.shakeBoardEffect(board, boardOffsetX, boardOffsetY);
  }

  /**
   * 敵アクション開始時のオーバーレイを表示
   */
  showEnemyActionOverlay(boardOffsetX: number, boardOffsetY: number): void {
    this.boardEffects.showEnemyActionOverlay(boardOffsetX, boardOffsetY);
  }

  /**
   * 敵アクションオーバーレイをフェードアウトして非表示にする
   */
  hideEnemyActionOverlay(onComplete?: () => void): void {
    this.boardEffects.hideEnemyActionOverlay(onComplete);
  }

  /**
   * 敵アクションオーバーレイを即時破棄
   */
  destroyEnemyActionOverlay(): void {
    this.boardEffects.destroyEnemyActionOverlay();
  }

  // ===== CombatEffects への委譲 =====

  /**
   * ダメージポップアップ表示
   */
  showDamagePopup(damage: number, baseX: number, baseY: number): void {
    this.combatEffects.showDamagePopup(damage, baseX, baseY);
  }

  /**
   * 敵UIをシェイク
   */
  shakeEnemyUI(
    enemyContainer: Phaser.GameObjects.Container,
    baseX: number,
    baseY: number
  ): void {
    this.combatEffects.shakeEnemyUI(enemyContainer, baseX, baseY);
  }

  /**
   * 敵消滅アニメーション
   */
  playEnemyDeathAnimation(
    enemyContainer: Phaser.GameObjects.Container,
    onComplete: () => void
  ): void {
    this.combatEffects.playEnemyDeathAnimation(enemyContainer, onComplete);
  }

  /**
   * 敵スキル種別に応じた画面フラッシュを実行
   */
  flashEnemySkill(effectType: EnemySkillEffectType): void {
    this.combatEffects.flashEnemySkill(effectType);
  }

  /**
   * スキル効果エフェクト（ボム生成用）
   */
  showBombCreateSkillEffect(x: number, y: number): void {
    this.combatEffects.showBombCreateSkillEffect(x, y);
  }

  /**
   * スキル効果エフェクト（色変換用）
   */
  showColorConvertSkillEffect(x: number, y: number, toColor: number): void {
    this.combatEffects.showColorConvertSkillEffect(x, y, toColor);
  }

  /**
   * スキル効果エフェクト（オーブ生成用：白雪姫のアイスフィールド等）
   */
  showOrbGenerateSkillEffect(x: number, y: number): void {
    this.combatEffects.showOrbGenerateSkillEffect(x, y);
  }

  // ===== UIEffects への委譲 =====

  /**
   * ボーナスオーブ生成エフェクト
   */
  showBonusCreateEffect(x: number, y: number): void {
    this.uiEffects.showBonusCreateEffect(x, y);
  }
}
