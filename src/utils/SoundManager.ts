/**
 * SE/BGM キー定数
 * 新しいサウンドを追加する場合はここに定義
 */
export const SoundKeys = {
  // SE (効果音)
  ORB_DROP: 'orb-drop',
  ATTACK: 'attack',
  COUNT: 'count',
  ORB_DELETE: 'orb-delete',
  BOMB_DELETE: 'bomb-delete',
  LINE_DELETE: 'line-delete',
  TEN_COUNT: 'ten-count',
  HEAL: 'heal',
  DAMAGED: 'damaged',
  ENEMY_OUT: 'enemy-out',
  NOT_MOVE: 'not-move',

  // スキルSE
  SKILL_CHARACTER_1: 'skill-character-1',
  SKILL_CHARACTER_2: 'skill-character-2',
  SKILL_CHARACTER_3: 'skill-character-3',
  SKILL_ENEMY_1: 'skill-enemy-1',
  SKILL_ENEMY_2: 'skill-enemy-2',
  SKILL_ENEMY_3: 'skill-enemy-3',

  LEVEL_UP: 'level-up',

  BUTTON: 'button',
  BUTTON_CHANGE_PAGE: 'button-change-page',

  // BGM (背景音楽)
  MAIN_BGM: 'main-bgm',
  RESULT_BGM: 'result-bgm',
  BATTLE_BGM_1: 'battle-bgm-1',
  BATTLE_BGM_2: 'battle-bgm-2',
} as const;

export type SoundKey = (typeof SoundKeys)[keyof typeof SoundKeys];

import { PlayerPreferences } from './PlayerPreferences';

/**
 * サウンドマネージャー
 * ゲーム全体のサウンド再生を管理する汎用クラス
 */
export class SoundManager {
  private static instance: SoundManager | null = null;
  private soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private seVolume = 0.5;
  private bgmVolume = 0.5;
  private isMuted = false;
  private currentBGM: Phaser.Sound.BaseSound | null = null;
  private currentBGMKey: SoundKey | null = null;
  private battleBGMTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    // PlayerPreferencesから保存された音量を読み込み
    const prefs = PlayerPreferences.getInstance();
    this.seVolume = prefs.getSeVolume();
    this.bgmVolume = prefs.getBgmVolume();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Phaserのサウンドマネージャーで初期化
   * BootSceneのcreate()で呼び出す
   */
  initialize(soundManager: Phaser.Sound.BaseSoundManager): void {
    this.soundManager = soundManager;
  }

  /**
   * SE (効果音) を再生
   * @param key サウンドキー
   * @param config 追加設定（オプション）
   */
  playSE(key: SoundKey, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.soundManager || this.isMuted) return;

    this.soundManager.play(key, {
      volume: this.seVolume,
      ...config,
    });
  }

  /**
   * SE (効果音) を再生し、指定秒数後に停止
   * @param key サウンドキー
   * @param durationSec 再生秒数
   * @param config 追加設定（オプション）
   */
  playSEForDuration(key: SoundKey, durationSec: number, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.soundManager || this.isMuted) return;

    const sound = this.soundManager.add(key, {
      volume: this.seVolume,
      ...config,
    });
    sound.play();

    setTimeout(() => {
      if (sound.isPlaying) {
        sound.stop();
      }
      sound.destroy();
    }, durationSec * 1000);
  }

  /**
   * BGM をループ再生
   * @param key サウンドキー
   */
  playBGM(key: SoundKey): void {
    if (!this.soundManager || this.isMuted) return;

    // 既存のBGMを停止
    this.stopBGM();

    this.currentBGMKey = key;
    this.currentBGM = this.soundManager.add(key, {
      volume: this.bgmVolume,
      loop: true,
    });
    this.currentBGM.play();
  }

  /**
   * BGM を一度だけ再生（ループなし）
   * @param key サウンドキー
   */
  playBGMOnce(key: SoundKey): void {
    if (!this.soundManager || this.isMuted) return;

    // 既存のBGMを停止
    this.stopBGM();

    this.currentBGMKey = key;
    this.currentBGM = this.soundManager.add(key, {
      volume: this.bgmVolume,
      loop: false,
    });
    this.currentBGM.play();
  }

  /**
   * BGM を停止
   */
  stopBGM(): void {
    if (this.battleBGMTimer) {
      clearInterval(this.battleBGMTimer);
      this.battleBGMTimer = null;
    }
    if (this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM.destroy();
      this.currentBGM = null;
    }
    this.currentBGMKey = null;
  }

  /**
   * 現在再生中のBGMキーを取得
   */
  getCurrentBGMKey(): SoundKey | null {
    return this.currentBGMKey;
  }

  /**
   * 戦闘BGMを再生（BGM1の再生位置が指定秒数に達したらBGM2ループへ切り替え）
   * BGM1を再生し、実際の再生位置が切り替え時間に達した時点でBGM2をループ再生する
   * タブ切り替え等で再生が一時停止していても、実際の再生位置で判定する
   */
  playBattleBGM(): void {
    if (!this.soundManager || this.isMuted) return;

    // BGM1からBGM2へ切り替える再生位置（秒）
    const switchTimeSec = 100.5;

    // 既存のBGMを停止
    this.stopBGM();

    // BGM1を非ループで再生
    this.currentBGMKey = SoundKeys.BATTLE_BGM_1;
    this.currentBGM = this.soundManager.add(SoundKeys.BATTLE_BGM_1, {
      volume: this.bgmVolume,
      loop: false,
    });

    const bgm1 = this.currentBGM;

    // BGM1の実際の再生位置を定期的にチェックし、切り替え時間に達したらBGM2へ
    this.battleBGMTimer = setInterval(() => {
      if (!this.soundManager || this.currentBGM !== bgm1) {
        // 既に別のBGMに切り替わっている場合はタイマー停止
        if (this.battleBGMTimer) {
          clearInterval(this.battleBGMTimer);
          this.battleBGMTimer = null;
        }
        return;
      }

      const seek = (bgm1 as Phaser.Sound.WebAudioSound).seek ?? 0;
      if (seek >= switchTimeSec) {
        if (this.battleBGMTimer) {
          clearInterval(this.battleBGMTimer);
          this.battleBGMTimer = null;
        }
        this.switchToBattleBGM2(bgm1);
      }
    }, 200);

    // BGM1が切り替え時間未満で自然終了した場合もBGM2に切り替え
    this.currentBGM.on('complete', () => {
      if (this.battleBGMTimer) {
        clearInterval(this.battleBGMTimer);
        this.battleBGMTimer = null;
      }
      if (!this.soundManager) return;
      this.switchToBattleBGM2(bgm1);
    });

    this.currentBGM.play();
  }

  /**
   * BGM1を停止してBGM2のループ再生に切り替える
   */
  private switchToBattleBGM2(bgm1: Phaser.Sound.BaseSound): void {
    if (!this.soundManager || this.currentBGM !== bgm1) return;

    bgm1.stop();
    bgm1.destroy();

    this.currentBGMKey = SoundKeys.BATTLE_BGM_2;
    this.currentBGM = this.soundManager.add(SoundKeys.BATTLE_BGM_2, {
      volume: this.bgmVolume,
      loop: true,
    });
    this.currentBGM.play();
  }

  /**
   * SE 音量を設定
   * @param volume 0.0 - 1.0
   */
  setSEVolume(volume: number): void {
    this.seVolume = Math.max(0, Math.min(1, volume));
    // 設定を保存（Firebase同期）
    PlayerPreferences.getInstance().setSeVolume(this.seVolume);
  }

  /**
   * BGM 音量を設定
   * @param volume 0.0 - 1.0
   */
  setBGMVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.currentBGM && 'setVolume' in this.currentBGM) {
      (this.currentBGM as Phaser.Sound.WebAudioSound).setVolume(this.bgmVolume);
    }
    // 設定を保存（Firebase同期）
    PlayerPreferences.getInstance().setBgmVolume(this.bgmVolume);
  }

  /**
   * ミュート設定
   */
  setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.soundManager) {
      this.soundManager.mute = muted;
    }
  }

  /**
   * ミュート状態を取得
   */
  getMute(): boolean {
    return this.isMuted;
  }

  /**
   * SE音量を取得
   */
  getSEVolume(): number {
    return this.seVolume;
  }

  /**
   * BGM音量を取得
   */
  getBGMVolume(): number {
    return this.bgmVolume;
  }

  /**
   * PlayerPreferencesから最新の音量を再読み込み
   * Firebase読み込み後など、外部で音量が更新された場合に呼び出す
   */
  refreshVolumes(): void {
    const prefs = PlayerPreferences.getInstance();
    this.seVolume = prefs.getSeVolume();
    this.bgmVolume = prefs.getBgmVolume();

    // 再生中のBGMがあれば音量を即座に反映
    if (this.currentBGM && 'setVolume' in this.currentBGM) {
      (this.currentBGM as Phaser.Sound.WebAudioSound).setVolume(this.bgmVolume);
    }
  }
}
