import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { THEME } from '../theme';
import { BattleController } from '../battle/BattleController';
import { Character } from '../types';
import { EnemyConfig } from '../types/story';
import { defaultCharacter, getCharacterById } from '../data/characters';
import { SoundManager } from '../utils/SoundManager';

interface BattleSceneData {
  character?: Character;
  characterId?: string;
  /** ストーリーモード用: 敵データ */
  enemyConfig?: EnemyConfig;
  /** ストーリーモード用: 節ID */
  sectionId?: string;
  /** クエストモード用: クエストID */
  questId?: string;
  /** ステージID */
  stageId?: string;
  /** プレイヤーレベル */
  playerLevel?: number;
  /** 獲得経験値 */
  expReward?: number;
}

/**
 * BattleScene - バトル画面のエントリポイント
 * MVPパターンを採用し、ゲームロジックはBattleControllerに委譲
 */
export class BattleScene extends BaseScene {
  private controller!: BattleController;
  private selectedCharacter: Character = defaultCharacter;
  private enemyConfig?: EnemyConfig;
  private sectionId?: string;
  private questId?: string;
  private stageId?: string;
  private playerLevel?: number;
  private expReward?: number;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: BattleSceneData): void {
    // 優先順位: 1. characterオブジェクト直接渡し, 2. characterIdから変換, 3. デフォルト
    if (data.character) {
      this.selectedCharacter = data.character;
    } else if (data.characterId) {
      this.selectedCharacter = getCharacterById(data.characterId) ?? defaultCharacter;
    } else {
      this.selectedCharacter = defaultCharacter;
    }

    // ストーリーモード用データ
    this.enemyConfig = data.enemyConfig;
    this.sectionId = data.sectionId;
    this.questId = data.questId;
    this.stageId = data.stageId;
    this.playerLevel = data.playerLevel;
    this.expReward = data.expReward;
  }

  create(): void {
    super.create();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Classic Parchment風の背景を描画
    this.createParchmentBattleBackground(width, height);

    // BattleControllerを初期化（敵データがあれば渡す）
    this.controller = new BattleController(
      this,
      this.selectedCharacter,
      this.enemyConfig,
      this.sectionId,
      this.questId,
      this.stageId,
      this.playerLevel,
      this.expReward
    );
    this.controller.initialize();
  }

  /**
   * Classic Parchment風の背景を描画
   */
  private createParchmentBattleBackground(width: number, height: number): void {
    const graphics = this.add.graphics();

    // グラデーション背景
    const gradientSteps = 20;
    const stepHeight = height / gradientSteps;

    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const topR = (THEME.backgroundGradientTop >> 16) & 0xff;
      const topG = (THEME.backgroundGradientTop >> 8) & 0xff;
      const topB = THEME.backgroundGradientTop & 0xff;
      const bottomR = (THEME.backgroundGradientBottom >> 16) & 0xff;
      const bottomG = (THEME.backgroundGradientBottom >> 8) & 0xff;
      const bottomB = THEME.backgroundGradientBottom & 0xff;

      const r = Math.floor(topR + (bottomR - topR) * ratio);
      const g = Math.floor(topG + (bottomG - topG) * ratio);
      const b = Math.floor(topB + (bottomB - topB) * ratio);
      const color = (r << 16) | (g << 8) | b;

      graphics.fillStyle(color, 1);
      graphics.fillRect(0, i * stepHeight, width, stepHeight + 1);
    }

    // 装飾的なパーティクル（ほのかな輝き）
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height - 400);
      const alpha = Phaser.Math.FloatBetween(0.05, 0.15);
      const size = Phaser.Math.Between(1, 2);
      graphics.fillStyle(THEME.parchmentLight, alpha);
      graphics.fillCircle(x, y, size);
    }
  }

  /**
   * BattleScene固有のクリーンアップ処理
   */
  protected cleanup(): void {
    SoundManager.getInstance().stopBGM();
    if (this.controller) {
      this.controller.cleanup();
    }
  }
}
