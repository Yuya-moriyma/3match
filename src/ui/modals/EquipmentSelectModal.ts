/**
 * EquipmentSelectModal - 装備選択モーダル共通コンポーネント
 *
 * BattlePrepScreenとQuestScreenで共通利用される装備選択モーダル。
 * 装備一覧のグリッド表示、詳細表示、選択・解除機能を提供する。
 */

import { Equipment } from '../../types';
import { EquipmentService } from '../../utils/EquipmentService';

export interface EquipmentSelectModalOptions {
  /** 装備変更時のコールバック（装備ID or null） */
  onEquipmentChange?: (equipmentId: string | null) => void;
  /** モーダル閉じ時のコールバック */
  onClose?: () => void;
}

export class EquipmentSelectModal {
  private options: EquipmentSelectModalOptions;
  private modalOverlay: HTMLElement | null = null;

  constructor(options: EquipmentSelectModalOptions = {}) {
    this.options = options;
  }

  /**
   * モーダルを表示する
   */
  show(parentElement: HTMLElement): void {
    if (this.modalOverlay) return;

    this.modalOverlay = this.createModalElement();
    parentElement.appendChild(this.modalOverlay);

    // 初期表示: 装備中アイテムがあれば説明パネルに表示
    const equipped = EquipmentService.getInstance().getEquipped();
    if (equipped) {
      this.updateEquipmentDetail(equipped);
    }

    this.attachEventHandlers();
  }

  /**
   * モーダルを閉じる
   */
  close(): void {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
      this.options.onClose?.();
    }
  }

  /**
   * モーダルが開いているか確認
   */
  isOpen(): boolean {
    return this.modalOverlay !== null;
  }

  /**
   * 装備名表示用ヘルパー（静的メソッド）
   */
  static getEquippedDisplayName(): string {
    const equipped = EquipmentService.getInstance().getEquipped();
    return equipped ? equipped.name : 'なし';
  }

  // ========================================
  // 内部メソッド
  // ========================================

  private createModalElement(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'equip-modal__overlay ui-modal__overlay ui-modal__overlay--visible';

    const dialog = document.createElement('div');
    dialog.className = 'equip-modal__dialog ui-modal__dialog ui-modal__dialog--visible ui-panel ui-panel--parchment';

    dialog.innerHTML = `
      <h2 class="equip-modal__title">~ 装備選択 ~</h2>
      <div class="equip-modal__divider"></div>
      <div class="equip-modal__detail">
        <p class="equip-modal__detail-placeholder">装備を選択してください</p>
      </div>
      <div class="equip-modal__grid">
        ${this.createEquipmentIcons()}
      </div>
      <div class="equip-modal__actions">
        <button class="equip-modal__close ui-btn ui-btn--ribbon-secondary">閉じる</button>
      </div>
    `;

    overlay.appendChild(dialog);
    return overlay;
  }

  private createEquipmentIcons(): string {
    const owned = EquipmentService.getInstance().getOwnedEquipment();
    const equippedId = EquipmentService.getInstance().getEquippedId();

    return owned
      .map((equip) => {
        const isEquipped = equip.id === equippedId;
        const selectedClass = isEquipped ? 'equip-modal__icon--selected' : '';
        const rarityClass = `equip-modal__icon--rarity-${equip.rarity} equip-panel--rarity-${equip.rarity}`;
        const rotateStyle = equip.iconRotate ? `transform: rotate(${equip.iconRotate}deg)` : '';

        return `
          <div class="equip-modal__icon ${rarityClass} ${selectedClass}" data-equipment-id="${equip.id}" aria-label="${equip.name}">
            <span class="equip-modal__icon-symbol material-symbols-outlined" style="${rotateStyle}">${equip.icon}</span>
            <span class="equip-modal__icon-name">${equip.name}</span>
          </div>
        `;
      })
      .join('');
  }

  private attachEventHandlers(): void {
    if (!this.modalOverlay) return;

    // 装備アイコンのイベント設定
    const icons = this.modalOverlay.querySelectorAll('.equip-modal__icon');
    icons.forEach((icon) => {
      icon.addEventListener('click', () => {
        const equipmentId = icon.getAttribute('data-equipment-id');
        if (equipmentId) {
          this.handleEquipmentClick(equipmentId);
        }
      });
    });

    // 閉じるボタン
    const closeBtn = this.modalOverlay.querySelector('.equip-modal__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // オーバーレイクリックで閉じる
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.close();
      }
    });
  }

  private handleEquipmentClick(equipmentId: string): void {
    const currentEquippedId = EquipmentService.getInstance().getEquippedId();

    if (currentEquippedId === equipmentId) {
      // 装備中のアイテムを再クリック → 外す
      EquipmentService.getInstance().unequip();
      this.updateSelectedState();
      this.updateEquipmentDetail(null);
      this.options.onEquipmentChange?.(null);
    } else {
      // 別のアイテムをクリック → 装備
      EquipmentService.getInstance().equip(equipmentId);
      this.updateSelectedState();
      const equip = EquipmentService.getInstance().getEquipped();
      this.updateEquipmentDetail(equip ?? null);
      this.options.onEquipmentChange?.(equipmentId);
    }
  }

  private updateSelectedState(): void {
    if (!this.modalOverlay) return;

    const equippedId = EquipmentService.getInstance().getEquippedId();
    const icons = this.modalOverlay.querySelectorAll('.equip-modal__icon');
    icons.forEach((icon) => {
      const cardId = icon.getAttribute('data-equipment-id');
      icon.classList.toggle('equip-modal__icon--selected', cardId === equippedId);
    });
  }

  private updateEquipmentDetail(equip: Equipment | null): void {
    if (!this.modalOverlay) return;

    const detailEl = this.modalOverlay.querySelector('.equip-modal__detail');
    if (!detailEl) return;

    if (equip) {
      const rotateStyle = equip.iconRotate ? `transform: rotate(${equip.iconRotate}deg)` : '';
      const rarityLabel = this.getRarityLabel(equip.rarity);
      detailEl.innerHTML = `
        <span class="equip-modal__detail-icon equip-icon--rarity-${equip.rarity} material-symbols-outlined" style="${rotateStyle}">${equip.icon}</span>
        <h3 class="equip-modal__detail-name">${equip.name}</h3>
        <span class="equip-modal__detail-rarity equip-rarity-badge equip-rarity-badge--${equip.rarity}">${rarityLabel}</span>
        <p class="equip-modal__detail-effect">${equip.description}</p>
      `;
    } else {
      detailEl.innerHTML = `
        <p class="equip-modal__detail-placeholder">装備を選択してください</p>
      `;
    }
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
}
