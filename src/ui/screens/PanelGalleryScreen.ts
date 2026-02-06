/**
 * PanelGalleryScreen - パネル確認画面（HTML版）
 *
 * 機能:
 * - 全装備品アイコンの表示（ゲームと同じサイズ・テーマ）
 * - 装備品詳細モーダル
 * - キャラクター選択パネルのプレビュー
 */

import { BaseScreen } from './BaseScreen';
import { Equipment } from '../../types';
import { Character } from '../../types';
import { getAllEquipment } from '../../data/equipment';
import { characters } from '../../data/characters';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';

export class PanelGalleryScreen extends BaseScreen {
  private modalOverlay: HTMLElement | null = null;

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'screen panel-gallery-screen dark-bg';

    screen.innerHTML = `
      <div class="panel-gallery-screen__content">
        <!-- ヘッダー -->
        <div class="screen-header">
          <div class="screen-header__back"></div>
          <h1 class="screen-header__title">Panel Gallery</h1>
        </div>

        <!-- ボディ -->
        <div class="screen-body">
          <div class="panel-gallery-screen__body-inner">
            <!-- 装備品セクション -->
            <section class="panel-gallery-screen__section">
              <h2 class="panel-gallery-screen__section-title">~ 装備品アイコン ~</h2>
              <div class="panel-gallery-screen__section-divider"></div>
              <div class="panel-gallery-screen__equip-grid">
                ${this.createEquipmentIcons()}
              </div>
            </section>

            <!-- キャラクターパネルセクション -->
            <section class="panel-gallery-screen__section">
              <h2 class="panel-gallery-screen__section-title">~ キャラクター選択パネル ~</h2>
              <div class="panel-gallery-screen__section-divider"></div>
              <div class="panel-gallery-screen__character-list">
                ${this.createCharacterCards()}
              </div>
            </section>
          </div>
        </div>
      </div>
    `;

    return screen;
  }

  private createEquipmentIcons(): string {
    const allEquipment = getAllEquipment();

    return allEquipment
      .map((equip) => {
        const rarityClass = `panel-gallery-screen__equip-icon--rarity-${equip.rarity} equip-panel--rarity-${equip.rarity}`;
        const rotateStyle = equip.iconRotate ? `transform: rotate(${equip.iconRotate}deg)` : '';

        return `
          <div class="panel-gallery-screen__equip-icon ${rarityClass}" data-equipment-id="${equip.id}" aria-label="${equip.name}">
            <span class="panel-gallery-screen__equip-icon-symbol material-symbols-outlined" style="${rotateStyle}">${equip.icon}</span>
            <span class="panel-gallery-screen__equip-icon-name">${equip.name}</span>
          </div>
        `;
      })
      .join('');
  }

  private createCharacterCards(): string {
    return characters
      .map((character) => {
        return `
          <div class="panel-gallery-screen__character-card" data-character-id="${character.id}">
            <h3 class="panel-gallery-screen__card-name">${character.name}</h3>
            <div class="panel-gallery-screen__card-stats">
              <span class="panel-gallery-screen__card-stat panel-gallery-screen__card-stat--attack">ATK ${character.attackPower}</span>
              <span class="panel-gallery-screen__card-stat panel-gallery-screen__card-stat--heal">HEAL ${character.healPower}</span>
            </div>
            <p class="panel-gallery-screen__card-skill-name">【${character.skill.name}】</p>
            <p class="panel-gallery-screen__card-skill-desc">${character.skill.description}</p>
            <p class="panel-gallery-screen__card-cost">必要★: ${character.skill.cost}</p>
          </div>
        `;
      })
      .join('');
  }

  protected setupEventHandlers(): void {
    // ヘッダー戻るボタン
    const backContainer = this.element?.querySelector('.screen-header__back');
    if (backContainer) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'ui-btn ui-btn--icon-diamond ui-btn--md';
      backBtn.innerHTML = '<span class="material-symbols-outlined ui-btn__icon">arrow_back</span>';
      backBtn.addEventListener('click', () => this.navigateTo('showcase'));
      backContainer.appendChild(backBtn);
    }

    // 装備品アイコンクリック
    const equipIcons = this.element?.querySelectorAll('.panel-gallery-screen__equip-icon');
    equipIcons?.forEach((icon) => {
      icon.addEventListener('click', () => {
        const equipmentId = icon.getAttribute('data-equipment-id');
        if (equipmentId) {
          SoundManager.getInstance().playSE(SoundKeys.BUTTON);
          const equipment = getAllEquipment().find((e) => e.id === equipmentId);
          if (equipment) {
            this.showEquipmentModal(equipment);
          }
        }
      });
    });

    // キャラクターカードクリック
    const charCards = this.element?.querySelectorAll('.panel-gallery-screen__character-card');
    charCards?.forEach((card) => {
      card.addEventListener('click', () => {
        const characterId = card.getAttribute('data-character-id');
        if (characterId) {
          SoundManager.getInstance().playSE(SoundKeys.BUTTON);
          const character = characters.find((c) => c.id === characterId);
          if (character) {
            this.showCharacterModal(character);
          }
        }
      });
    });
  }

  private showEquipmentModal(equipment: Equipment): void {
    if (this.modalOverlay) return;

    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'panel-gallery-screen__modal-overlay ui-modal__overlay ui-modal__overlay--visible';

    const rotateStyle = equipment.iconRotate ? `transform: rotate(${equipment.iconRotate}deg)` : '';
    const rarityLabel = this.getRarityLabel(equipment.rarity);

    this.modalOverlay.innerHTML = `
      <div class="panel-gallery-screen__modal-dialog ui-modal__dialog ui-modal__dialog--visible ui-panel ui-panel--parchment">
        <h2 class="panel-gallery-screen__modal-title">~ 装備品詳細 ~</h2>
        <div class="panel-gallery-screen__modal-divider"></div>

        <div class="panel-gallery-screen__equip-detail">
          <span class="panel-gallery-screen__equip-detail-icon equip-icon--rarity-${equipment.rarity} material-symbols-outlined" style="${rotateStyle}">${equipment.icon}</span>
          <h3 class="panel-gallery-screen__equip-detail-name">${equipment.name}</h3>
          <span class="panel-gallery-screen__equip-detail-rarity equip-rarity-badge equip-rarity-badge--${equipment.rarity}">${rarityLabel}</span>
          <p class="panel-gallery-screen__equip-detail-effect">${equipment.description}</p>
        </div>

        <button class="panel-gallery-screen__modal-close ui-btn ui-btn--ribbon-secondary">閉じる</button>
      </div>
    `;

    this.element?.appendChild(this.modalOverlay);
    this.setupModalCloseHandlers();
  }

  private showCharacterModal(character: Character): void {
    if (this.modalOverlay) return;

    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'panel-gallery-screen__modal-overlay ui-modal__overlay ui-modal__overlay--visible';

    this.modalOverlay.innerHTML = `
      <div class="panel-gallery-screen__modal-dialog ui-modal__dialog ui-modal__dialog--visible ui-panel ui-panel--parchment">
        <h2 class="panel-gallery-screen__modal-title">~ キャラクター詳細 ~</h2>
        <div class="panel-gallery-screen__modal-divider"></div>

        <div class="panel-gallery-screen__char-detail">
          <h3 class="panel-gallery-screen__char-detail-name">${character.name}</h3>
          <div class="panel-gallery-screen__char-detail-stats">
            <span class="panel-gallery-screen__card-stat panel-gallery-screen__card-stat--attack">ATK ${character.attackPower}</span>
            <span class="panel-gallery-screen__card-stat panel-gallery-screen__card-stat--heal">HEAL ${character.healPower}</span>
          </div>
          <div class="panel-gallery-screen__char-detail-skill">
            <p class="panel-gallery-screen__char-detail-skill-name">【${character.skill.name}】</p>
            <p class="panel-gallery-screen__char-detail-skill-desc">${character.skill.description}</p>
            <p class="panel-gallery-screen__char-detail-cost">必要★: ${character.skill.cost}</p>
          </div>
        </div>

        <button class="panel-gallery-screen__modal-close ui-btn ui-btn--ribbon-secondary">閉じる</button>
      </div>
    `;

    this.element?.appendChild(this.modalOverlay);
    this.setupModalCloseHandlers();
  }

  private setupModalCloseHandlers(): void {
    if (!this.modalOverlay) return;

    // 閉じるボタン
    const closeBtn = this.modalOverlay.querySelector('.panel-gallery-screen__modal-close');
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

  private getRarityLabel(rarity: number): string {
    switch (rarity) {
      case 1:
        return '★ Common';
      case 2:
        return '★★ Rare';
      case 3:
        return '★★★ S-Rare';
      default:
        return '';
    }
  }

  private closeModal(): void {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
  }

  protected async onAfterShow(): Promise<void> {
    const content = this.element?.querySelector('.panel-gallery-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }
  }

  protected async onBeforeHide(): Promise<void> {
    this.closeModal();
  }
}
