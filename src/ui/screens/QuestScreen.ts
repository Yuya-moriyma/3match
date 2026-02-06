/**
 * QuestScreen - クエスト画面
 *
 * 機能:
 * - カルーセル式クエスト選択UI
 * - キャラクター選択モーダル
 * - 装備選択モーダル
 * - クエストバトルの開始
 */

import { BaseScreen } from './BaseScreen';
import { Button } from '../components/Button';
import { Character } from '../../types';
import { characters, defaultCharacter } from '../../data/characters';
import { getAllQuests, QuestDefinition } from '../../data/quests';
import { getEnemyById } from '../../data/enemies';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';
import { PlayerStatus } from '../../utils/PlayerStatus';
import { EquipmentSelectModal } from '../modals/EquipmentSelectModal';
import { TutorialModal } from '../components/TutorialModal';
import { renderToElement } from '../utils';
import questScreenTemplate from '../templates/quest-screen.html?raw';

const LAST_QUEST_INDEX_KEY = 'lastQuestIndex';

export class QuestScreen extends BaseScreen {
  private selectedCharacter: Character = defaultCharacter;
  private modalOverlay: HTMLElement | null = null;
  private currentQuestIndex: number = 0;
  private quests: QuestDefinition[] = [];
  private isAnimating: boolean = false;
  private equipmentModal: EquipmentSelectModal | null = null;

  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(questScreenTemplate, {
      characterName: this.selectedCharacter.name,
      equipmentName: EquipmentSelectModal.getEquippedDisplayName(),
    });

    return screen;
  }

  protected setupEventHandlers(): void {
    // ヘッダー戻るボタン
    const backContainer = this.element?.querySelector('.screen-header__back');
    if (backContainer) {
      const backBtn = new Button({
        icon: 'arrow_back',
        variant: 'icon-diamond',
        onClick: () => this.navigateTo('menu'),
      });
      backContainer.appendChild(backBtn.getElement());
    }

    // カルーセル左矢印
    const prevContainer = this.element?.querySelector('.quest-screen__carousel-prev');
    if (prevContainer) {
      const prevBtn = new Button({
        icon: 'chevron_left',
        variant: 'icon-diamond',
        onClick: () => {
          if (this.isAnimating) return;
          SoundManager.getInstance().playSE(SoundKeys.BUTTON);
          this.navigateCarousel(-1);
        },
      });
      prevContainer.appendChild(prevBtn.getElement());
    }

    // カルーセル右矢印
    const nextContainer = this.element?.querySelector('.quest-screen__carousel-next');
    if (nextContainer) {
      const nextBtn = new Button({
        icon: 'chevron_right',
        variant: 'icon-diamond',
        onClick: () => {
          if (this.isAnimating) return;
          SoundManager.getInstance().playSE(SoundKeys.BUTTON);
          this.navigateCarousel(1);
        },
      });
      nextContainer.appendChild(nextBtn.getElement());
    }

    // キャラクター選択ボタン
    const characterBtn = this.element?.querySelector('.quest-screen__character-btn');
    if (characterBtn) {
      characterBtn.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.showCharacterSelectModal();
      });
    }

    // 装備選択ボタン
    const equipmentBtn = this.element?.querySelector('.quest-screen__equipment-btn');
    if (equipmentBtn) {
      equipmentBtn.addEventListener('click', () => {
        SoundManager.getInstance().playSE(SoundKeys.BUTTON);
        this.showEquipmentSelectModal();
      });
    }

    // 出撃ボタン
    const sortieBtn = this.element?.querySelector('.quest-screen__sortie-btn');
    if (sortieBtn) {
      sortieBtn.addEventListener('click', () => {
        this.startQuestBattle();
      });
    }
  }

  protected async onBeforeShow(): Promise<void> {
    this.quests = getAllQuests();
    this.currentQuestIndex = this.loadLastQuestIndex();
    this.isAnimating = false;
    this.updateEquipmentName();

    // ビューポートに初期パネルを配置
    const viewport = this.element?.querySelector('.quest-screen__panel-viewport');
    if (viewport) {
      viewport.innerHTML = '';
      viewport.appendChild(this.createPanelElement(this.currentQuestIndex));
    }

    this.updateCarouselButtons();
    this.buildCarouselIndicators();
    this.updateCarouselIndicators();
  }

  // ========================================
  // クエストインデックス永続化
  // ========================================

  private loadLastQuestIndex(): number {
    const saved = localStorage.getItem(LAST_QUEST_INDEX_KEY);
    if (saved === null) return 0;
    const index = parseInt(saved, 10);
    if (isNaN(index) || index < 0 || index >= this.quests.length) return 0;
    return index;
  }

  private saveLastQuestIndex(): void {
    localStorage.setItem(LAST_QUEST_INDEX_KEY, String(this.currentQuestIndex));
  }

  // ========================================
  // カルーセル
  // ========================================

  private createPanelElement(questIndex: number): HTMLElement {
    const quest = this.quests[questIndex];
    const enemy = quest ? getEnemyById(quest.enemyId) : undefined;

    const panel = document.createElement('div');
    panel.className = 'quest-screen__stage-panel ui-panel ui-panel--parchment';
    panel.innerHTML = `
      <p class="quest-screen__quest-label">~ ${quest?.name ?? 'クエスト'} ~</p>
      <div class="quest-screen__quest-divider"></div>
      <p class="quest-screen__quest-description">${quest?.description ?? ''}</p>
      <p class="quest-screen__quest-enemy">敵: ${enemy?.name ?? '不明'}</p>
      <p class="quest-screen__quest-reward">報酬: ${quest?.expReward ?? 0} EXP</p>
    `;
    return panel;
  }

  private navigateCarousel(direction: number): void {
    const newIndex = this.currentQuestIndex + direction;
    if (newIndex < 0 || newIndex >= this.quests.length) return;
    if (this.isAnimating) return;

    const viewport = this.element?.querySelector('.quest-screen__panel-viewport') as HTMLElement | null;
    const oldPanel = viewport?.querySelector('.quest-screen__stage-panel') as HTMLElement | null;
    if (!viewport || !oldPanel) return;

    this.isAnimating = true;

    // 状態を即更新（ボタン・インジケーター連動）
    this.currentQuestIndex = newIndex;
    this.updateCarouselButtons();
    this.updateCarouselIndicators();

    // ビューポート高さを固定（遷移中の崩壊防止）
    viewport.style.height = `${viewport.offsetHeight}px`;

    const newPanel = this.createPanelElement(newIndex);

    // アニメーション対象パネル（transitionendを監視する要素）
    let animatingPanel: HTMLElement;

    if (direction > 0) {
      // 次へ: 新パネルが右からスライドインし旧パネルの上に重なる
      oldPanel.classList.add('quest-screen__stage-panel--exiting');
      newPanel.classList.add('quest-screen__stage-panel--entering');
      newPanel.style.transform = 'translateX(100%)';
      viewport.appendChild(newPanel);

      void newPanel.offsetHeight;
      newPanel.classList.add('quest-screen__stage-panel--sliding');
      newPanel.style.transform = 'translateX(0)';
      animatingPanel = newPanel;
    } else {
      // 前へ: 旧パネルが右にスライドアウトし下の新パネルが露出する
      newPanel.classList.add('quest-screen__stage-panel--exiting');
      viewport.insertBefore(newPanel, oldPanel);
      oldPanel.classList.add('quest-screen__stage-panel--entering');
      oldPanel.style.transform = 'translateX(0)';

      void oldPanel.offsetHeight;
      oldPanel.classList.add('quest-screen__stage-panel--sliding');
      oldPanel.style.transform = 'translateX(100%)';
      animatingPanel = oldPanel;
    }

    // トランジション完了後のクリーンアップ
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      oldPanel.remove();
      newPanel.classList.remove('quest-screen__stage-panel--entering', 'quest-screen__stage-panel--sliding', 'quest-screen__stage-panel--exiting');
      newPanel.style.transform = '';
      viewport.style.height = '';
      this.isAnimating = false;
    };

    animatingPanel.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform') cleanup();
    }, { once: true });
    setTimeout(cleanup, 350);
  }

  private updateCarouselButtons(): void {
    const prevContainer = this.element?.querySelector('.quest-screen__carousel-prev');
    const nextContainer = this.element?.querySelector('.quest-screen__carousel-next');

    const prevBtn = prevContainer?.querySelector('button') as HTMLButtonElement | null;
    const nextBtn = nextContainer?.querySelector('button') as HTMLButtonElement | null;

    if (prevBtn) prevBtn.disabled = this.currentQuestIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentQuestIndex >= this.quests.length - 1;
  }

  private buildCarouselIndicators(): void {
    const container = this.element?.querySelector('.quest-screen__carousel-indicators');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < this.quests.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'quest-screen__carousel-dot';
      container.appendChild(dot);
    }
  }

  private updateCarouselIndicators(): void {
    const dots = this.element?.querySelectorAll('.quest-screen__carousel-dot');
    if (!dots) return;

    dots.forEach((dot, i) => {
      dot.classList.toggle('quest-screen__carousel-dot--active', i === this.currentQuestIndex);
    });
  }

  // ========================================
  // キャラクター選択
  // ========================================

  private showCharacterSelectModal(): void {
    if (this.modalOverlay) return;

    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'quest-screen__modal-overlay ui-modal__overlay ui-modal__overlay--visible';

    const dialog = document.createElement('div');
    dialog.className = 'quest-screen__modal-dialog ui-modal__dialog ui-modal__dialog--visible ui-panel ui-panel--parchment';

    dialog.innerHTML = `
      <h2 class="quest-screen__modal-title">~ キャラクター選択 ~</h2>
      <div class="quest-screen__modal-divider"></div>
      <div class="quest-screen__character-list">
        ${this.createCharacterCards()}
      </div>
      <button class="quest-screen__modal-close ui-btn ui-btn--ribbon-secondary">閉じる</button>
    `;

    this.modalOverlay.appendChild(dialog);
    this.element?.appendChild(this.modalOverlay);

    // キャラクターカードのイベント設定
    const cards = dialog.querySelectorAll('.quest-screen__character-card');
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
    const closeBtn = dialog.querySelector('.quest-screen__modal-close');
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
        const selectedClass = isSelected ? 'quest-screen__character-card--selected' : '';

        return `
          <div class="quest-screen__character-card ${selectedClass}" data-character-id="${character.id}">
            <h3 class="quest-screen__card-name">${character.name}</h3>
            <div class="quest-screen__card-stats">
              <span class="quest-screen__card-stat quest-screen__card-stat--attack">ATK ${character.attackPower}</span>
              <span class="quest-screen__card-stat quest-screen__card-stat--heal">HEAL ${character.healPower}</span>
            </div>
            <p class="quest-screen__card-skill-name">【${character.skill.name}】</p>
            <p class="quest-screen__card-skill-desc">${character.skill.description}</p>
            <p class="quest-screen__card-cost">必要★: ${character.skill.cost}</p>
            ${isSelected ? '<span class="quest-screen__card-check">&#10003;</span>' : ''}
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

    const cards = this.modalOverlay.querySelectorAll('.quest-screen__character-card');
    cards.forEach((card) => {
      const characterId = card.getAttribute('data-character-id');
      const isSelected = characterId === this.selectedCharacter.id;

      card.classList.toggle('quest-screen__character-card--selected', isSelected);

      const existingCheck = card.querySelector('.quest-screen__card-check');
      if (isSelected && !existingCheck) {
        const check = document.createElement('span');
        check.className = 'quest-screen__card-check';
        check.innerHTML = '&#10003;';
        card.appendChild(check);
      } else if (!isSelected && existingCheck) {
        existingCheck.remove();
      }
    });
  }

  private updateCharacterName(): void {
    const nameSpan = this.element?.querySelector('.quest-screen__character-name');
    if (nameSpan) {
      nameSpan.textContent = this.selectedCharacter.name;
    }
  }

  // ========================================
  // 装備選択
  // ========================================

  private updateEquipmentName(): void {
    const nameSpan = this.element?.querySelector('.quest-screen__equipment-name');
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

  // ========================================
  // バトル開始
  // ========================================

  private startQuestBattle(): void {
    const quest = this.quests[this.currentQuestIndex];
    if (!quest) return;

    const enemyConfig = getEnemyById(quest.enemyId);
    if (!enemyConfig) return;

    this.saveLastQuestIndex();

    this.startBattle({
      stageId: quest.id,
      characterId: this.selectedCharacter.id,
      enemyConfig,
      questId: quest.id,
      playerLevel: PlayerStatus.getInstance().getLevel(),
      expReward: quest.expReward,
    });
  }

  // ========================================
  // モーダル共通
  // ========================================

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
    const content = this.element?.querySelector('.quest-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }

    // チュートリアル表示（初回のみ）
    TutorialModal.getInstance().show('quest_first_visit');
  }

  protected async onBeforeHide(): Promise<void> {
    this.closeModal();
    this.isAnimating = false;
  }
}
