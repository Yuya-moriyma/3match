import Phaser from 'phaser';
import { TILE_SIZE, EnemySkillEffectType } from '../../types';
import { GameBridgeEvents } from '../../ui/GameBridge';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';

/**
 * CombatEffects - 戦闘演出（ダメージポップ、敵死亡、スキル発動）を管理
 */
export class CombatEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * ダメージポップアップ表示（GameBridge経由でHTML側に委譲）
   */
  showDamagePopup(damage: number, _baseX: number, _baseY: number): void {
    this.scene.game.events.emit(GameBridgeEvents.SHOW_DAMAGE_POPUP, { damage });
  }

  /**
   * 敵UIをシェイク（GameBridge経由でHTML側に委譲）
   */
  shakeEnemyUI(
    _enemyContainer: Phaser.GameObjects.Container,
    _baseX: number,
    _baseY: number
  ): void {
    this.scene.game.events.emit(GameBridgeEvents.ENEMY_SHAKE);
  }

  /**
   * 敵消滅アニメーション（GameBridge経由でHTML側に委譲）
   */
  playEnemyDeathAnimation(
    _enemyContainer: Phaser.GameObjects.Container,
    onComplete: () => void
  ): void {
    // HTML側で消滅アニメーション完了後にENEMY_DEATH_COMPLETEイベントが発火される
    const handler = () => {
      this.scene.game.events.off(GameBridgeEvents.ENEMY_DEATH_COMPLETE, handler);
      onComplete();
    };
    this.scene.game.events.on(GameBridgeEvents.ENEMY_DEATH_COMPLETE, handler);
    this.scene.game.events.emit(GameBridgeEvents.ENEMY_DEATH);
    SoundManager.getInstance().playSE(SoundKeys.ENEMY_OUT);
  }

  /**
   * 敵スキル種別に応じた画面フラッシュを実行
   */
  flashEnemySkill(effectType: EnemySkillEffectType): void {
    const flashColors: Record<EnemySkillEffectType, { r: number; g: number; b: number }> = {
      [EnemySkillEffectType.HEAVY_ATTACK]: { r: 200, g: 50, b: 50 },
      [EnemySkillEffectType.BOARD_SHUFFLE]: { r: 150, g: 50, b: 200 },
      [EnemySkillEffectType.TILE_LOCK]: { r: 50, g: 100, b: 200 },
      [EnemySkillEffectType.POISON]: { r: 50, g: 180, b: 50 },
      [EnemySkillEffectType.OJAMA_CONVERT]: { r: 120, g: 120, b: 120 },
      [EnemySkillEffectType.FREEZE]: { r: 100, g: 180, b: 255 },
      [EnemySkillEffectType.POISON_CONVERT]: { r: 100, g: 40, b: 120 },
    };

    const flash = flashColors[effectType];
    this.scene.cameras.main.flash(300, flash.r, flash.g, flash.b);
  }

  /**
   * スキル効果エフェクト（ボム生成用：赤とオレンジのフラッシュ＋拡大縮小）
   */
  showBombCreateSkillEffect(x: number, y: number): void {
    // 赤のフラッシュエフェクト（外側）
    const flashOuter = this.scene.add.graphics();
    flashOuter.fillStyle(0xff4500, 0.6); // オレンジレッド
    flashOuter.fillCircle(0, 0, TILE_SIZE * 0.7);
    flashOuter.setPosition(x, y);
    flashOuter.setDepth(59);

    this.scene.tweens.add({
      targets: flashOuter,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flashOuter.destroy();
      },
    });

    // 赤のフラッシュエフェクト（内側）
    const flashInner = this.scene.add.graphics();
    flashInner.fillStyle(0xff0000, 0.8); // 赤
    flashInner.fillCircle(0, 0, TILE_SIZE * 0.5);
    flashInner.setPosition(x, y);
    flashInner.setDepth(60);

    this.scene.tweens.add({
      targets: flashInner,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flashInner.destroy();
      },
    });

    // 輝くパーティクル（赤とオレンジ交互）
    for (let i = 0; i < 8; i++) {
      const angle = ((Math.PI * 2) / 8) * i;
      const particle = this.scene.add.graphics();
      // ダイヤモンド形状を描画（赤とオレンジを交互に）
      const color = i % 2 === 0 ? 0xff3300 : 0xff6600; // 赤とオレンジ
      particle.fillStyle(color, 1);
      particle.beginPath();
      particle.moveTo(0, -6);
      particle.lineTo(4, 0);
      particle.lineTo(0, 6);
      particle.lineTo(-4, 0);
      particle.closePath();
      particle.fillPath();
      particle.setPosition(x, y);
      particle.setDepth(61);

      const distance = TILE_SIZE * 1.2;
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  /**
   * スキル効果エフェクト（色変換用：波紋エフェクト）
   */
  showColorConvertSkillEffect(x: number, y: number, toColor: number): void {
    // 波紋エフェクト（3つの輪を順番に）
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        const ripple = this.scene.add.graphics();
        ripple.lineStyle(3, toColor, 1);
        ripple.strokeCircle(0, 0, TILE_SIZE * 0.3);
        ripple.setPosition(x, y);
        ripple.setDepth(60);

        this.scene.tweens.add({
          targets: ripple,
          scaleX: 2.5,
          scaleY: 2.5,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => {
            ripple.destroy();
          },
        });
      });
    }

    // 中心のフラッシュ
    const flash = this.scene.add.graphics();
    flash.fillStyle(toColor, 0.6);
    flash.fillCircle(0, 0, TILE_SIZE * 0.4);
    flash.setPosition(x, y);
    flash.setDepth(59);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * スキル効果エフェクト（オーブ生成用：水色と白のフラッシュ＋パーティクル）
   * 白雪姫の「アイスフィールド」スキル用
   */
  showOrbGenerateSkillEffect(x: number, y: number): void {
    // 水色のフラッシュエフェクト（外側）
    const flashOuter = this.scene.add.graphics();
    flashOuter.fillStyle(0x87ceeb, 0.6); // スカイブルー
    flashOuter.fillCircle(0, 0, TILE_SIZE * 0.7);
    flashOuter.setPosition(x, y);
    flashOuter.setDepth(59);

    this.scene.tweens.add({
      targets: flashOuter,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flashOuter.destroy();
      },
    });

    // 白のフラッシュエフェクト（内側）
    const flashInner = this.scene.add.graphics();
    flashInner.fillStyle(0xffffff, 0.8); // 白
    flashInner.fillCircle(0, 0, TILE_SIZE * 0.5);
    flashInner.setPosition(x, y);
    flashInner.setDepth(60);

    this.scene.tweens.add({
      targets: flashInner,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flashInner.destroy();
      },
    });

    // 輝くパーティクル（水色と白を交互に）
    for (let i = 0; i < 8; i++) {
      const angle = ((Math.PI * 2) / 8) * i;
      const particle = this.scene.add.graphics();
      // ダイヤモンド形状を描画（水色と白を交互に）
      const color = i % 2 === 0 ? 0x00bfff : 0xffffff; // ディープスカイブルーと白
      particle.fillStyle(color, 1);
      particle.beginPath();
      particle.moveTo(0, -6);
      particle.lineTo(4, 0);
      particle.lineTo(0, 6);
      particle.lineTo(-4, 0);
      particle.closePath();
      particle.fillPath();
      particle.setPosition(x, y);
      particle.setDepth(61);

      const distance = TILE_SIZE * 1.2;
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }
}
