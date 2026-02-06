import Phaser from 'phaser';
import { EnemySkillEffectType } from '../../types';
import { GameBridgeEvents } from '../../ui/GameBridge';

/**
 * BattleTextEffects - テキスト演出（チェイン、スキル名、アクション）を管理
 */
export class BattleTextEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * チェインテキストを表示（GameBridge経由でHTML側に委譲）
   */
  showChainText(chainNumber: number): void {
    this.scene.game.events.emit(GameBridgeEvents.SHOW_CHAIN_TEXT, {
      chainNumber,
    });
  }

  /**
   * アクション効果テキストを表示（GameBridge経由でHTML側に委譲）
   */
  showActionEffectText(text: string, color: string): void {
    this.scene.game.events.emit(GameBridgeEvents.SHOW_ACTION_TEXT, {
      text,
      color,
    });
  }

  /**
   * スキル発動テキストを表示（GameBridge経由でHTML側に委譲）
   */
  showSkillActivationText(
    skillName: string,
    characterColor: number,
    _onComplete?: () => void
  ): void {
    const colorHex = '#' + characterColor.toString(16).padStart(6, '0');
    this.scene.game.events.emit(GameBridgeEvents.SHOW_SKILL_TEXT, {
      name: skillName,
      color: colorHex,
      isEnemy: false,
    });
  }

  /**
   * 対象なしテキストを表示（GameBridge経由でHTML側に委譲）
   */
  showNoTargetText(): void {
    this.scene.game.events.emit(GameBridgeEvents.SHOW_NO_TARGET);
  }

  /**
   * 敵スキル発動テキストを表示（GameBridge経由でHTML側に委譲）
   */
  showEnemySkillText(skillName: string, effectType: EnemySkillEffectType): void {
    const textColors: Record<EnemySkillEffectType, string> = {
      [EnemySkillEffectType.HEAVY_ATTACK]: '#ff4444',
      [EnemySkillEffectType.BOARD_SHUFFLE]: '#cc44ff',
      [EnemySkillEffectType.TILE_LOCK]: '#4488ff',
      [EnemySkillEffectType.POISON]: '#44cc44',
      [EnemySkillEffectType.OJAMA_CONVERT]: '#888888',
      [EnemySkillEffectType.FREEZE]: '#88ccff',
      [EnemySkillEffectType.POISON_CONVERT]: '#8844aa',
    };

    const color = textColors[effectType];

    this.scene.game.events.emit(GameBridgeEvents.SHOW_SKILL_TEXT, {
      name: skillName,
      color,
      isEnemy: true,
      effectType,
    });
  }
}
