/**
 * StoryScreen - ストーリー画面（HTML版）
 *
 * 機能:
 * - ストーリーテキストの表示（データ駆動型）
 * - テキストウィンドウのタップで次へ
 * - AUTOモード（自動進行）
 * - SKIPボタン（バトルへスキップ）
 * - 会話終了後、戦闘または次節への遷移
 */

import { BaseScreen } from './BaseScreen';
import { Character } from '../../types';
import { Section, Dialogue } from '../../types/story';
import { defaultCharacter } from '../../data/characters';
import { getFirstSection } from '../../data/story';
import { getEnemyById } from '../../data/enemies';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';
import { PlayerStatus } from '../../utils/PlayerStatus';
import { renderToElement } from '../utils';
import storyScreenTemplate from '../templates/story-screen.html?raw';

export interface StoryScreenData {
  character?: Character;
  /** 表示する節 */
  section?: Section;
}

export class StoryScreen extends BaseScreen {
  private dialogueIndex = 0;
  private dialogues: Dialogue[] = [];
  private isAutoMode = false;
  private autoTimer: number | null = null;
  private selectedCharacter: Character = defaultCharacter;
  private currentSection: Section | null = null;

  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(storyScreenTemplate);
    return screen;
  }

  protected setupEventHandlers(): void {
    // AUTOボタン
    const autoBtn = this.element?.querySelector('.story-screen__auto-btn');
    if (autoBtn) {
      autoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.toggleAutoMode();
      });
    }

    // SKIPボタン
    const skipBtn = this.element?.querySelector('.story-screen__skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipDialogue();
      });
    }

    // テキストウィンドウクリックで次へ
    const textWindow = this.element?.querySelector('.story-screen__text-window');
    if (textWindow) {
      textWindow.addEventListener('click', () => {
        if (!this.isAutoMode) {
          // 途中の会話進行時のみボタンSE（最後の会話は画面遷移SEが鳴る）
          if (this.dialogueIndex < this.dialogues.length - 1) {
            SoundManager.getInstance().playSE(SoundKeys.BUTTON);
          }
          this.nextDialogue();
        }
      });
    }
  }

  protected async onBeforeShow(data?: unknown): Promise<void> {
    // ストーリー画面では別BGMを使用するため、再生中のBGMを停止
    SoundManager.getInstance().stopBGM();

    const storyData = data as StoryScreenData | undefined;
    this.selectedCharacter = storyData?.character ?? defaultCharacter;

    // 節データを設定（なければ最初の節）
    this.currentSection = storyData?.section ?? getFirstSection();
    this.dialogues = this.currentSection.dialogues ?? [];

    // 状態をリセット
    this.dialogueIndex = 0;
    this.isAutoMode = false;
    this.clearAutoTimer();

    // 会話がない場合は即座に遷移
    if (this.dialogues.length === 0) {
      this.onDialogueEnd();
      return;
    }

    // 初期テキストを表示
    this.updateDialogue();
    this.updateAutoButton();
  }

  protected async onAfterShow(): Promise<void> {
    const content = this.element?.querySelector('.story-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }
  }

  protected async onBeforeHide(): Promise<void> {
    this.clearAutoTimer();
  }

  private updateDialogue(): void {
    const speakerEl = this.element?.querySelector('.story-screen__speaker-name');
    const messageEl = this.element?.querySelector('.story-screen__message');
    const dividerEl = this.element?.querySelector('.story-screen__text-divider');

    if (this.dialogueIndex < this.dialogues.length) {
      const dialogue = this.dialogues[this.dialogueIndex];

      // 話者名を表示（空文字の場合はナレーション）
      if (speakerEl) {
        speakerEl.textContent = dialogue.speaker || '';
        if (dialogue.speaker) {
          speakerEl.classList.remove('story-screen__speaker-name--hidden');
        } else {
          speakerEl.classList.add('story-screen__speaker-name--hidden');
        }
      }

      // 話者がいる場合のみ区切り線を表示
      if (dividerEl) {
        if (dialogue.speaker) {
          (dividerEl as HTMLElement).style.display = 'block';
        } else {
          (dividerEl as HTMLElement).style.display = 'none';
        }
      }

      // メッセージを表示
      if (messageEl) {
        messageEl.textContent = dialogue.text;
      }
    }

    // 次へインジケーターの表示/非表示
    const indicator = this.element?.querySelector('.story-screen__next-indicator');
    if (indicator) {
      if (this.dialogueIndex < this.dialogues.length - 1) {
        indicator.classList.remove('story-screen__next-indicator--hidden');
      } else {
        indicator.classList.add('story-screen__next-indicator--hidden');
      }
    }
  }

  private nextDialogue(): void {
    this.dialogueIndex++;
    if (this.dialogueIndex < this.dialogues.length) {
      this.updateDialogue();
    } else {
      // 会話終了
      this.onDialogueEnd();
    }
  }

  private onDialogueEnd(): void {
    this.clearAutoTimer();

    if (!this.currentSection) {
      // 節がない場合はBattlePrepに戻る
      this.navigateTo('battlePrep', { character: this.selectedCharacter });
      return;
    }

    // 戦闘設定がある場合はバトルへ
    if (this.currentSection.battle) {
      const enemyConfig = getEnemyById(this.currentSection.battle.enemyId);
      if (!enemyConfig) {
        console.error(`Enemy not found: ${this.currentSection.battle.enemyId}`);
        return;
      }
      this.startBattle({
        stageId: this.currentSection.battle.stageId ?? this.currentSection.id,
        characterId: this.selectedCharacter.id,
        enemyConfig,
        sectionId: this.currentSection.id,
        playerLevel: PlayerStatus.getInstance().getLevel(),
        expReward: this.currentSection.battle.expReward,
      });
    } else {
      // 戦闘なしの場合はリザルト画面へ（節クリアとして表示）
      this.navigateTo('result', {
        victory: true,
        score: 0,
        turns: 0,
        maxCombo: 0,
        stageId: this.currentSection.id,
        characterId: this.selectedCharacter.id,
        sectionId: this.currentSection.id,
        hasBattle: false,
      });
    }
  }

  private toggleAutoMode(): void {
    this.isAutoMode = !this.isAutoMode;
    this.updateAutoButton();

    if (this.isAutoMode) {
      this.startAutoTimer();
    } else {
      this.clearAutoTimer();
    }
  }

  private updateAutoButton(): void {
    const autoBtn = this.element?.querySelector('.story-screen__auto-btn');
    if (autoBtn) {
      if (this.isAutoMode) {
        autoBtn.classList.add('story-screen__auto-btn--active');
        autoBtn.textContent = 'AUTO ON';
      } else {
        autoBtn.classList.remove('story-screen__auto-btn--active');
        autoBtn.textContent = 'AUTO';
      }
    }
  }

  private startAutoTimer(): void {
    this.clearAutoTimer();
    this.autoTimer = window.setInterval(() => {
      this.nextDialogue();
    }, 2000);
  }

  private clearAutoTimer(): void {
    if (this.autoTimer !== null) {
      window.clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  private skipDialogue(): void {
    this.clearAutoTimer();
    this.onDialogueEnd();
  }
}
