import { Equipment, EquipmentEffectType } from '../types';

/**
 * レアリティ別ドロップ確率
 * 合計100% (0.85 + 0.10 + 0.05 = 1.0)
 */
export const RARITY_DROP_RATES: Record<number, number> = {
  1: 0.85,  // 一般: 85%
  2: 0.10,  // レア: 10%
  3: 0.05,  // Sレア: 5%
};

/**
 * 装備品マスターデータ
 */
const equipmentList: Equipment[] = [
  // レアリティ1（銅系）
  {
    id: 'copper_sword',
    name: '銅の剣',
    description: 'ATK+3',
    effectType: EquipmentEffectType.ATK_UP,
    effectValue: 3,
    icon: 'colorize',
    iconRotate: 180,
    rarity: 1,
  },
  {
    id: 'copper_ring',
    name: '銅の指輪',
    description: 'スキル発動cost-1',
    effectType: EquipmentEffectType.SKILL_COST_DOWN,
    effectValue: 1,
    icon: 'diamond_shine',
    rarity: 1,
  },
  {
    id: 'copper_pendant',
    name: '銅のペンダント',
    description: '回復力+5',
    effectType: EquipmentEffectType.HEAL_UP,
    effectValue: 5,
    icon: 'filter_retrolux',
    rarity: 1,
  },
  {
    id: 'leather_gloves',
    name: '革のグローブ',
    description: '攻撃cost-1',
    effectType: EquipmentEffectType.ATK_COST_DOWN,
    effectValue: 1,
    icon: 'sports_mma',
    rarity: 1,
  },
  {
    id: 'green_herb',
    name: '緑のハーブ',
    description: '回復cost-1',
    effectType: EquipmentEffectType.HEAL_COST_DOWN,
    effectValue: 1,
    icon: 'spa',
    rarity: 1,
  },
  // レアリティ2（銀系）
  {
    id: 'silver_sword',
    name: '銀の剣',
    description: 'ATK+5',
    effectType: EquipmentEffectType.ATK_UP,
    effectValue: 5,
    icon: 'colorize',
    iconRotate: 180,
    rarity: 2,
  },
  {
    id: 'silver_ring',
    name: '銀の指輪',
    description: 'スキル発動cost-2',
    effectType: EquipmentEffectType.SKILL_COST_DOWN,
    effectValue: 2,
    icon: 'diamond_shine',
    rarity: 2,
  },
  {
    id: 'silver_pendant',
    name: '銀のペンダント',
    description: '回復力+10',
    effectType: EquipmentEffectType.HEAL_UP,
    effectValue: 10,
    icon: 'filter_retrolux',
    rarity: 2,
  },
  {
    id: 'silver_gloves',
    name: '銀のグローブ',
    description: '攻撃cost-2',
    effectType: EquipmentEffectType.ATK_COST_DOWN,
    effectValue: 2,
    icon: 'sports_mma',
    rarity: 2,
  },
  {
    id: 'silver_herb',
    name: '銀のハーブ',
    description: '回復cost-2',
    effectType: EquipmentEffectType.HEAL_COST_DOWN,
    effectValue: 2,
    icon: 'spa',
    rarity: 2,
  },
  // レアリティ3（金系）
  {
    id: 'gold_sword',
    name: '金の剣',
    description: 'ATK+10',
    effectType: EquipmentEffectType.ATK_UP,
    effectValue: 10,
    icon: 'colorize',
    iconRotate: 180,
    rarity: 3,
  },
  {
    id: 'gold_ring',
    name: '金の指輪',
    description: 'スキル発動cost-3',
    effectType: EquipmentEffectType.SKILL_COST_DOWN,
    effectValue: 3,
    icon: 'diamond_shine',
    rarity: 3,
  },
  {
    id: 'gold_pendant',
    name: '金のペンダント',
    description: '回復力+15',
    effectType: EquipmentEffectType.HEAL_UP,
    effectValue: 15,
    icon: 'filter_retrolux',
    rarity: 3,
  },
  {
    id: 'gold_gloves',
    name: '金のグローブ',
    description: '攻撃cost-3',
    effectType: EquipmentEffectType.ATK_COST_DOWN,
    effectValue: 3,
    icon: 'sports_mma',
    rarity: 3,
  },
  {
    id: 'gold_herb',
    name: '金のハーブ',
    description: '回復cost-3',
    effectType: EquipmentEffectType.HEAL_COST_DOWN,
    effectValue: 3,
    icon: 'spa',
    rarity: 3,
  },
];

const equipmentMap = new Map<string, Equipment>(
  equipmentList.map((e) => [e.id, e])
);

export function getEquipmentById(id: string): Equipment | undefined {
  return equipmentMap.get(id);
}

export function getAllEquipment(): Equipment[] {
  return [...equipmentList];
}

/** 初期所持装備品IDリスト（空配列：全装備品はドロップでのみ入手） */
export const DEFAULT_OWNED_EQUIPMENT_IDS: string[] = [];
