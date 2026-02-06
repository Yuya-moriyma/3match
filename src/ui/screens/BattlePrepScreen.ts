/**
 * BattlePrepScreen - バトル準備画面（HTML版）
 *
 * 機能:
 * - 章・節選択UI
 * - ステージ情報の表示（選択した節に基づく）
 * - キャラクター選択（モーダル）
 * - 出撃ボタン（ストーリーへ遷移）
 * - DEVボタン（バトルへ直接遷移）
 * - 戻るボタン
 */

import { BaseScreen } from './BaseScreen';
import { Character } from '../../types';
import { Section, Chapter } from '../../types/story';
import { characters, defaultCharacter } from '../../data/characters';
import { getAllChapters, getChapterBySectionId, getFirstSection } from '../../data/story';
import { getEnemyById } from '../../data/enemies';
import { StoryProgress } from '../../utils/StoryProgress';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';
import { EquipmentSelectModal } from '../modals/EquipmentSelectModal';
import { TutorialModal } from '../components/TutorialModal';
import { render, renderToElement } from '../utils';
import battlePrepScreenTemplate from '../templates/battle-prep-screen.html?raw';
import stageSelectModalTemplate from '../templates/partials/stage-select-modal.html?raw';
import characterSelectModalTemplate from '../templates/partials/character-select-modal.html?raw';

interface BattlePrepScreenData {
  character?: Character;
}

export class BattlePrepScreen extends BaseScreen {
  private selectedCharacter: Character = defaultCharacter;
  private selectedSection: Section | null = null;
  private selectedChapter: Chapter | null = null;
  private modalOverlay: HTMLElement | null = null;
  private bgmTimer: number | null = null;
  private storyProgress: StoryProgress = StoryProgress.getInstance();
  private equipmentModal: EquipmentSelectModal | null = null;

  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(battlePrepScreenTemplate, {
      characterName: this.selectedCharacter.name,
      equipmentName: EquipmentSelectModal.getEquippedDisplayName(),
    });

    return screen;
  }

  protected setupEventHandlers(): void {
    // ヘッダー戻るボタン
    const backContainer = this.element?.querySelector('.screen-header__back');
    if (backContainer) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'ui-btn ui-btn--icon-diamond ui-btn--md';
      backBtn.innerHTML = '<span class="material-symbols-outlined ui-btn__icon">arrow_back</span>';
      backBtn.addEventListener('click', () => this.navigateTo('menu'));
      backContainer.appendChild(backBtn);
    }

    // キャラクター選択ボタン
    const characterBtn = this.element?.querySelector('.battle-prep-screen__character-btn');
    if (characterBtn) {
      characterBtn.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.showCharacterSelectModal();
      });
    }

    // 装備選択ボタン
    const equipmentBtn = this.element?.querySelector('.battle-prep-screen__equipment-btn');
    if (equipmentBtn) {
      equipmentBtn.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.showEquipmentSelectModal();
      });
    }

    // 出撃ボタン（ストーリーへ）
    const sortieBtn = this.element?.querySelector('.battle-prep-screen__sortie-btn');
    if (sortieBtn) {
      sortieBtn.addEventListener('click', () => {
        if (this.selectedSection) {
          this.navigateTo('story', {
            character: this.selectedCharacter,
            section: this.selectedSection,
          });
        }
      });
    }

    // ステージ名クリックで選択モーダルを開く
    const stageNameEl = this.element?.querySelector('.battle-prep-screen__stage-name');
    if (stageNameEl) {
      stageNameEl.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.showStageSelectModal();
      });
    }
  }

  protected async onBeforeShow(data?: unknown): Promise<void> {
    const prepData = data as BattlePrepScreenData | undefined;
    if (prepData?.character) {
      this.selectedCharacter = prepData.character;
      this.updateCharacterName();
    }

    // 次にプレイすべき節を初期選択（全クリア済みの場合は最初の節にフォールバック）
    const nextSection = this.storyProgress.getNextPlayableSection() ?? getFirstSection();
    this.selectSection(nextSection);
  }

  private showStageSelectModal(): void {
    if (this.modalOverlay) return;

    const stageListHtml = this.createStageList();
    const modalHtml = render(stageSelectModalTemplate, { stageListHtml });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml.trim();
    this.modalOverlay = wrapper.firstElementChild as HTMLElement;

    this.element?.appendChild(this.modalOverlay);

    // 節カードのイベント設定
    const sectionCards = this.modalOverlay.querySelectorAll('.battle-prep-screen__section-card:not(.battle-prep-screen__section-card--locked)');
    sectionCards.forEach((card) => {
      card.addEventListener('click', () => {
        const sectionId = card.getAttribute('data-section-id');
        if (sectionId) {
          SoundManager.getInstance().playSE(SoundKeys.BUTTON);
          this.selectSectionById(sectionId);
          this.closeModal();
        }
      });
    });

    // 閉じるボタン
    const closeBtn = this.modalOverlay.querySelector('.battle-prep-screen__modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.closeModal();
      });
    }

    // オーバーレイクリックで閉じる
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.closeModal();
      }
    });
  }

  private createStageList(): string {
    const chapters = getAllChapters();
    let html = '';

    for (const chapter of chapters) {
      const isChapterUnlocked = this.storyProgress.isChapterUnlocked(chapter.id);

      html += `
        <div class="battle-prep-screen__chapter ${!isChapterUnlocked ? 'battle-prep-screen__chapter--locked' : ''}">
          <h3 class="battle-prep-screen__chapter-title">${chapter.title}</h3>
          <div class="battle-prep-screen__section-list">
      `;

      for (const section of chapter.sections) {
        const isUnlocked = this.storyProgress.isSectionUnlocked(section.id);
        const isSelected = this.selectedSection?.id === section.id;
        const isCleared = this.isSectionCleared(section.id);
        const hasBattle = !!section.battle;

        const lockedClass = !isUnlocked ? 'battle-prep-screen__section-card--locked' : '';
        const selectedClass = isSelected ? 'battle-prep-screen__section-card--selected' : '';
        const clearedClass = isCleared ? 'battle-prep-screen__section-card--cleared' : '';

        html += `
          <div class="battle-prep-screen__section-card ${lockedClass} ${selectedClass} ${clearedClass}" data-section-id="${section.id}">
            <span class="battle-prep-screen__section-title">${section.title}</span>
            ${hasBattle ? `<span class="battle-prep-screen__section-enemy">敵: ${getEnemyById(section.battle!.enemyId)?.name ?? '不明'}</span>` : '<span class="battle-prep-screen__section-type">会話のみ</span>'}
            ${!isUnlocked ? '<span class="battle-prep-screen__section-lock">&#128274;</span>' : ''}
            ${isCleared ? '<span class="battle-prep-screen__section-check">&#10003;</span>' : ''}
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    return html;
  }

  private isSectionCleared(sectionId: string): boolean {
    const lastCleared = this.storyProgress.getLastClearedSectionId();
    if (!lastCleared) return false;

    // 全章・全節を順番に走査してクリア済みかチェック
    const chapters = getAllChapters();
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        if (section.id === sectionId) {
          return true; // この節より前ならクリア済み
        }
        if (section.id === lastCleared) {
          return true; // lastClearedまではクリア済み
        }
      }
    }
    return false;
  }

  private selectSectionById(sectionId: string): void {
    const chapters = getAllChapters();
    for (const chapter of chapters) {
      const section = chapter.sections.find((s) => s.id === sectionId);
      if (section) {
        this.selectSection(section);
        return;
      }
    }
  }

  private selectSection(section: Section): void {
    this.selectedSection = section;
    this.selectedChapter = getChapterBySectionId(section.id) ?? null;
    this.updateStageInfo();
    this.updateSortieButton();
  }

  private updateStageInfo(): void {
    const stageLabelEl = this.element?.querySelector('.battle-prep-screen__stage-label');
    const stageNameEl = this.element?.querySelector('.battle-prep-screen__stage-name');

    if (this.selectedSection && this.selectedChapter) {
      // 章番号と節番号を取得
      const chapterIndex = this.getChapterIndex(this.selectedChapter.id);
      const sectionIndex = this.getSectionIndex(this.selectedChapter, this.selectedSection.id);

      if (stageLabelEl) {
        const chapterNum = this.toKanjiNumber(chapterIndex + 1);
        const sectionNum = this.toKanjiNumber(sectionIndex + 1);
        stageLabelEl.textContent = `~ 第${chapterNum}章 第${sectionNum}節 ~`;
      }
      if (stageNameEl) {
        stageNameEl.textContent = this.selectedSection.title;
      }
    } else {
      if (stageLabelEl) {
        stageLabelEl.textContent = '~ ストーリー ~';
      }
      if (stageNameEl) {
        stageNameEl.textContent = '節を選択してください';
      }
    }
  }

  private getChapterIndex(chapterId: string): number {
    const chapters = getAllChapters();
    return chapters.findIndex((c) => c.id === chapterId);
  }

  private getSectionIndex(chapter: Chapter, sectionId: string): number {
    return chapter.sections.findIndex((s) => s.id === sectionId);
  }

  private toKanjiNumber(num: number): string {
    const kanjiDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

    if (num <= 0) return '〇';
    if (num < 10) return kanjiDigits[num];
    if (num === 10) return '十';
    if (num < 20) return `十${kanjiDigits[num - 10]}`;
    if (num < 100) {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      return `${kanjiDigits[tens]}十${ones > 0 ? kanjiDigits[ones] : ''}`;
    }
    return num.toString();
  }

  private updateSortieButton(): void {
    const sortieBtn = this.element?.querySelector('.battle-prep-screen__sortie-btn') as HTMLButtonElement | null;
    if (sortieBtn) {
      sortieBtn.disabled = !this.selectedSection;
    }
  }

  private showCharacterSelectModal(): void {
    if (this.modalOverlay) return;

    const characterCardsHtml = this.createCharacterCards();
    const modalHtml = render(characterSelectModalTemplate, { characterCardsHtml });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHtml.trim();
    this.modalOverlay = wrapper.firstElementChild as HTMLElement;

    this.element?.appendChild(this.modalOverlay);

    // キャラクターカードのイベント設定
    const cards = this.modalOverlay.querySelectorAll('.battle-prep-screen__character-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const characterId = card.getAttribute('data-character-id');
        const character = characters.find((c) => c.id === characterId);
        if (character) {
          SoundManager.getInstance().playSE(SoundKeys.BUTTON);
          this.selectCharacter(character);
        }
      });
    });

    // 閉じるボタン
    const closeBtn = this.modalOverlay.querySelector('.battle-prep-screen__modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.closeModal();
      });
    }

    // オーバーレイクリックで閉じる
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.closeModal();
      }
    });
  }

  private createCharacterCards(): string {
    return characters
      .map((character) => {
        const isSelected = this.selectedCharacter.id === character.id;
        const selectedClass = isSelected ? 'battle-prep-screen__character-card--selected' : '';

        return `
          <div class="battle-prep-screen__character-card ${selectedClass}" data-character-id="${character.id}">
            <h3 class="battle-prep-screen__card-name">${character.name}</h3>
            <div class="battle-prep-screen__card-stats">
              <span class="battle-prep-screen__card-stat battle-prep-screen__card-stat--attack">ATK ${character.attackPower}</span>
              <span class="battle-prep-screen__card-stat battle-prep-screen__card-stat--heal">HEAL ${character.healPower}</span>
            </div>
            <p class="battle-prep-screen__card-skill-name">【${character.skill.name}】</p>
            <p class="battle-prep-screen__card-skill-desc">${character.skill.description}</p>
            <p class="battle-prep-screen__card-cost">必要★: ${character.skill.cost}</p>
            ${isSelected ? '<span class="battle-prep-screen__card-check">&#10003;</span>' : ''}
          </div>
        `;
      })
      .join('');
  }

  private selectCharacter(character: Character): void {
    this.selectedCharacter = character;
    this.updateCharacterName();
    this.updateCharacterCards();
  }

  private updateCharacterCards(): void {
    if (!this.modalOverlay) return;

    const cards = this.modalOverlay.querySelectorAll('.battle-prep-screen__character-card');
    cards.forEach((card) => {
      const characterId = card.getAttribute('data-character-id');
      const isSelected = characterId === this.selectedCharacter.id;

      card.classList.toggle('battle-prep-screen__character-card--selected', isSelected);

      const existingCheck = card.querySelector('.battle-prep-screen__card-check');
      if (isSelected && !existingCheck) {
        const check = document.createElement('span');
        check.className = 'battle-prep-screen__card-check';
        check.innerHTML = '&#10003;';
        card.appendChild(check);
      } else if (!isSelected && existingCheck) {
        existingCheck.remove();
      }
    });
  }

  private updateCharacterName(): void {
    const nameSpan = this.element?.querySelector('.battle-prep-screen__character-name');
    if (nameSpan) {
      nameSpan.textContent = this.selectedCharacter.name;
    }
  }

  private updateEquipmentName(): void {
    const nameSpan = this.element?.querySelector('.battle-prep-screen__equipment-name');
    if (nameSpan) {
      nameSpan.textContent = EquipmentSelectModal.getEquippedDisplayName();
    }
  }

  private showEquipmentSelectModal(): void {
    if (this.equipmentModal?.isOpen()) return;

    this.equipmentModal = new EquipmentSelectModal({
      onEquipmentChange: () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.updateEquipmentName();
      },
      onClose: () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
      },
    });

    if (this.element) {
      this.equipmentModal.show(this.element);
    }
  }

  private closeModal(): void {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
    if (this.equipmentModal?.isOpen()) {
      this.equipmentModal.close();
    }
  }

  protected async onAfterShow(): Promise<void> {
    const content = this.element?.querySelector('.battle-prep-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }

    // main BGMが再生中でなければ1秒後に再生開始
    const soundManager = SoundManager.getInstance();
    if (soundManager.getCurrentBGMKey() !== SoundKeys.MAIN_BGM) {
      this.bgmTimer = window.setTimeout(() => {
        this.bgmTimer = null;
        soundManager.playBGM(SoundKeys.MAIN_BGM);
      }, 1000);
    }

    // ストーリーモードチュートリアル表示（初回のみ）
    TutorialModal.getInstance().show('story_first_visit');
  }

  protected async onBeforeHide(): Promise<void> {
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.closeModal();
  }
}
