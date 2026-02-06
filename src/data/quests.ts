/**
 * クエストマスターデータ
 * 特定の敵と何回でも戦えるクエストモードの定義
 */

/** 目標タイプ: 将来的に 'survive' | 'score' 等を追加可能 */
export type ObjectiveType = 'defeat';

/** ドロップテーブルエントリ */
export interface DropTableEntry {
  equipmentId: string;  // 装備品ID
  weight: number;       // 同一レアリティ内での相対確率
}

/** レアリティ別ドロップ確率 */
export type RarityDropRates = Record<number, number>;

/** クエスト定義 */
export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  enemyId: string;
  objectiveType: ObjectiveType;
  objectiveParams?: Record<string, unknown>;
  /** 戦闘クリア時の獲得経験値 */
  expReward?: number;
  /** ドロップテーブル */
  dropTable?: DropTableEntry[];
  /** レアリティ別ドロップ確率（未指定時はデフォルト値を使用） */
  rarityDropRates?: RarityDropRates;
}

const questMasterMap = new Map<string, QuestDefinition>([
  [
    'quest_slime',
    {
      id: 'quest_slime',
      name: 'スライム討伐',
      description: '森に潜むスライムを倒せ！',
      enemyId: 'slime',
      objectiveType: 'defeat',
      expReward: 100,
      // スライム: 一般85%, レア10%, Sレア5%
      rarityDropRates: { 1: 0.00, 2: 0.00, 3: 1.00 },
      dropTable: [
        // rarity 1
        { equipmentId: 'copper_sword', weight: 1 },
        { equipmentId: 'copper_ring', weight: 1 },
        // rarity 2
        { equipmentId: 'silver_sword', weight: 1 },
        { equipmentId: 'silver_ring', weight: 1 },
        // rarity 3
        { equipmentId: 'gold_sword', weight: 1 },
        { equipmentId: 'gold_ring', weight: 1 },
      ],
    },
  ],
  [
    'quest_goblin',
    {
      id: 'quest_goblin',
      name: 'ゴブリン討伐',
      description: 'ゴブリンの長を倒せ！',
      enemyId: 'goblin',
      objectiveType: 'defeat',
      expReward: 200,
      // ゴブリン: 一般70%, レア20%, Sレア10%
      rarityDropRates: { 1: 0.70, 2: 0.20, 3: 0.10 },
      dropTable: [
        // rarity 1
        { equipmentId: 'copper_sword', weight: 1 },
        { equipmentId: 'copper_pendant', weight: 1 },
        // rarity 2
        { equipmentId: 'silver_sword', weight: 1 },
        { equipmentId: 'silver_pendant', weight: 1 },
        // rarity 3
        { equipmentId: 'gold_sword', weight: 1 },
        { equipmentId: 'gold_pendant', weight: 1 },
      ],
    },
  ],
  [
    'quest_fenrir',
    {
      id: 'quest_fenrir',
      name: 'フェンリル討伐',
      description: '伝説の魔獣フェンリルに挑め！',
      enemyId: 'fenrir',
      objectiveType: 'defeat',
      expReward: 300,
      // フェンリル: 一般50%, レア30%, Sレア20%
      rarityDropRates: { 1: 0.50, 2: 0.30, 3: 0.20 },
      dropTable: [
        // rarity 1
        { equipmentId: 'copper_sword', weight: 1 },
        { equipmentId: 'copper_ring', weight: 1 },
        { equipmentId: 'copper_pendant', weight: 1 },
        // rarity 2
        { equipmentId: 'silver_sword', weight: 1 },
        { equipmentId: 'silver_ring', weight: 1 },
        { equipmentId: 'silver_pendant', weight: 1 },
        // rarity 3
        { equipmentId: 'gold_sword', weight: 1 },
        { equipmentId: 'gold_ring', weight: 1 },
        { equipmentId: 'gold_pendant', weight: 1 },
      ],
    },
  ],
]);

/**
 * クエストIDからクエストデータを取得
 */
export function getQuestById(questId: string): QuestDefinition | undefined {
  return questMasterMap.get(questId);
}

/**
 * 全クエストデータを取得
 */
export function getAllQuests(): QuestDefinition[] {
  return Array.from(questMasterMap.values());
}
