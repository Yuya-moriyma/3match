import { Equipment, EquipmentEffectType } from '../types';
import { getEquipmentById, DEFAULT_OWNED_EQUIPMENT_IDS } from '../data/equipment';
import { UserSession } from './UserSession';
import { UserDataService } from '../firebase/UserDataService';

export interface EquipmentBonuses {
  atk: number;
  skillCostReduction: number;
  hp: number;
  heal: number;
  attackCostReduction: number;
  healCostReduction: number;
}

export class EquipmentService {
  private static instance: EquipmentService | null = null;

  private ownedIds: string[] = [...DEFAULT_OWNED_EQUIPMENT_IDS];
  private equippedId: string | null = null;

  private constructor() {}

  static getInstance(): EquipmentService {
    if (!EquipmentService.instance) {
      EquipmentService.instance = new EquipmentService();
    }
    return EquipmentService.instance;
  }

  /** 外部からのデータで上書き */
  applyFirebaseData(ownedIds: string[], equippedId: string | null): void {
    this.ownedIds = [...ownedIds];
    this.equippedId = equippedId;
  }

  /** 所持装備品のEquipment[]を返す */
  getOwnedEquipment(): Equipment[] {
    const result: Equipment[] = [];
    for (const id of this.ownedIds) {
      const equip = getEquipmentById(id);
      if (equip) result.push(equip);
    }
    return result;
  }

  /** 装備中のIDを返す */
  getEquippedId(): string | null {
    return this.equippedId;
  }

  /** 装備中のEquipmentを返す */
  getEquipped(): Equipment | undefined {
    if (!this.equippedId) return undefined;
    return getEquipmentById(this.equippedId);
  }

  /** 装備変更してFirestoreに保存 */
  equip(equipmentId: string): void {
    this.equippedId = equipmentId;
    this.syncToFirebase();
  }

  /** 装備解除してFirestoreに保存 */
  unequip(): void {
    this.equippedId = null;
    this.syncToFirebase();
  }

  /** 装備品を入手 */
  addEquipment(equipmentId: string): void {
    this.ownedIds.push(equipmentId);
    this.syncToFirebase();
  }

  /** ATK加算値 */
  getAtkBonus(): number {
    const equip = this.getEquipped();
    if (equip && equip.effectType === EquipmentEffectType.ATK_UP) {
      return equip.effectValue;
    }
    return 0;
  }

  /** スキルコスト減算値 */
  getSkillCostReduction(): number {
    const equip = this.getEquipped();
    if (equip && equip.effectType === EquipmentEffectType.SKILL_COST_DOWN) {
      return equip.effectValue;
    }
    return 0;
  }

  /** HP加算値 */
  getHpBonus(): number {
    const equip = this.getEquipped();
    if (equip && equip.effectType === EquipmentEffectType.HP_UP) {
      return equip.effectValue;
    }
    return 0;
  }

  /** 回復力加算値 */
  getHealBonus(): number {
    const equip = this.getEquipped();
    if (equip && equip.effectType === EquipmentEffectType.HEAL_UP) {
      return equip.effectValue;
    }
    return 0;
  }

  /** 攻撃コスト減算値 */
  getAttackCostReduction(): number {
    const equip = this.getEquipped();
    if (equip && equip.effectType === EquipmentEffectType.ATK_COST_DOWN) {
      return equip.effectValue;
    }
    return 0;
  }

  /** 回復コスト減算値 */
  getHealCostReduction(): number {
    const equip = this.getEquipped();
    if (equip && equip.effectType === EquipmentEffectType.HEAL_COST_DOWN) {
      return equip.effectValue;
    }
    return 0;
  }

  /** 全バフ値を一括取得 */
  getBonuses(): EquipmentBonuses {
    return {
      atk: this.getAtkBonus(),
      skillCostReduction: this.getSkillCostReduction(),
      hp: this.getHpBonus(),
      heal: this.getHealBonus(),
      attackCostReduction: this.getAttackCostReduction(),
      healCostReduction: this.getHealCostReduction(),
    };
  }

  private syncToFirebase(): void {
    const userName = UserSession.getInstance().getUserName();
    if (!userName) return;

    UserDataService.getInstance()
      .saveEquipment(userName, {
        ownedIds: [...this.ownedIds],
        equippedId: this.equippedId,
      })
      .catch((error) => {
        console.warn('[EquipmentService] Firebase sync failed:', error);
      });
  }
}
