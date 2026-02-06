import { BaseScene } from './BaseScene';
import { SoundManager, SoundKeys } from '../utils/SoundManager';
import { UIManager } from '../ui/UIManager';

export class BootScene extends BaseScene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // ローディング表示（HTML側で行うため、Phaser側は最小限に）
    // プログレスバーはHTMLローディング画面で表示

    // バトルSE
    this.load.audio(SoundKeys.ORB_DROP, 'assets/sounds/battle/orb.mp3');
    this.load.audio(SoundKeys.ATTACK, 'assets/sounds/battle/attack.mp3');
    this.load.audio(SoundKeys.COUNT, 'assets/sounds/battle/count.mp3');
    this.load.audio(SoundKeys.ORB_DELETE, 'assets/sounds/battle/orb_delete.mp3');
    this.load.audio(SoundKeys.BOMB_DELETE, 'assets/sounds/battle/bomb.mp3');
    this.load.audio(SoundKeys.LINE_DELETE, 'assets/sounds/battle/line.mp3');
    this.load.audio(SoundKeys.TEN_COUNT, 'assets/sounds/battle/10count.mp3');
    this.load.audio(SoundKeys.HEAL, 'assets/sounds/battle/heal.mp3');
    this.load.audio(SoundKeys.DAMAGED, 'assets/sounds/battle/damaged.mp3');
    this.load.audio(SoundKeys.ENEMY_OUT, 'assets/sounds/battle/enemy_out.mp3');
    this.load.audio(SoundKeys.NOT_MOVE, 'assets/sounds/battle/not_move.mp3');

    // スキルSE
    this.load.audio(SoundKeys.SKILL_CHARACTER_1, 'assets/sounds/skill/character_1.mp3');
    this.load.audio(SoundKeys.SKILL_CHARACTER_2, 'assets/sounds/skill/character_2.mp3');
    this.load.audio(SoundKeys.SKILL_CHARACTER_3, 'assets/sounds/skill/character_3.mp3');
    this.load.audio(SoundKeys.SKILL_ENEMY_1, 'assets/sounds/skill/enemy_1.mp3');
    this.load.audio(SoundKeys.SKILL_ENEMY_2, 'assets/sounds/skill/enemy_2.mp3');
    this.load.audio(SoundKeys.SKILL_ENEMY_3, 'assets/sounds/skill/enemy_3.mp3');

    // UI SE
    this.load.audio(SoundKeys.LEVEL_UP, 'assets/sounds/ui/level_up.mp3');
    this.load.audio(SoundKeys.BUTTON, 'assets/sounds/ui/button.mp3');
    this.load.audio(SoundKeys.BUTTON_CHANGE_PAGE, 'assets/sounds/ui/button_change_page.mp3');

    // BGM
    this.load.audio(SoundKeys.MAIN_BGM, 'assets/sounds/bgm/main.mp3');
    this.load.audio(SoundKeys.RESULT_BGM, 'assets/sounds/bgm/result.mp3');
    this.load.audio(SoundKeys.BATTLE_BGM_1, 'assets/sounds/bgm/battle_bgm_1.mp3');
    this.load.audio(SoundKeys.BATTLE_BGM_2, 'assets/sounds/bgm/battle_bgm_2.mp3');
  }

  create(): void {
    super.create();

    // SoundManagerを初期化
    SoundManager.getInstance().initialize(this.sound);

    // HTMLローディング画面を非表示
    const hideLoadingScreen = (window as unknown as { hideLoadingScreen?: () => void }).hideLoadingScreen;
    if (hideLoadingScreen) {
      hideLoadingScreen();
    }

    // 毎回起動時にユーザー名入力画面を表示（自動ログイン廃止）
    try {
      const uiManager = UIManager.getInstance();
      uiManager.showScreen('userName');
    } catch (e) {
      console.error('UIManager not initialized:', e);
    }

    // Phaserのシーンは停止（バトル開始時に再開される）
    this.scene.stop();
  }
}
