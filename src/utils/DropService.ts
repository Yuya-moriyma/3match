import { getEquipmentById, RARITY_DROP_RATES } from '../data/equipment';
import { getQuestById, DropTableEntry, RarityDropRates } from '../data/quests';

/**
 * DropService - クエストクリア時のドロップ判定を行う
 */
export class DropService {
  /**
   * クエストクリア時のドロップ判定を実行
   * @param questId クエストID
   * @returns ドロップした装備品ID、またはnull（入手なし）
   */
  static determineDroppedEquipment(questId: string): string | null {
    const quest = getQuestById(questId);
    if (!quest?.dropTable || quest.dropTable.length === 0) {
      return null;
    }

    // 1. レアリティを抽選（クエスト固有のレートがあれば使用）
    const selectedRarity = this.selectRarity(quest.rarityDropRates);

    // 2. 該当レアリティの装備品をdropTableから抽出
    const candidates = this.filterCandidatesByRarity(quest.dropTable, selectedRarity);
    if (candidates.length === 0) {
      // 該当レアリティの装備品がない場合は入手なし
      return null;
    }

    // 3. weight加重で1つ選択（所持済みでもドロップ可能）
    return this.selectByWeight(candidates);
  }

  /**
   * レアリティを抽選（クエスト固有のレートがあれば使用、なければデフォルト）
   */
  private static selectRarity(questRates?: RarityDropRates): number {
    const rates = questRates ?? RARITY_DROP_RATES;
    const rand = Math.random();
    let cumulative = 0;

    for (const [rarityStr, rate] of Object.entries(rates)) {
      cumulative += rate;
      if (rand < cumulative) {
        return parseInt(rarityStr, 10);
      }
    }

    // フォールバック（通常は到達しない）
    return 1;
  }

  /**
   * ドロップテーブルから指定レアリティの装備品を抽出
   */
  private static filterCandidatesByRarity(
    dropTable: DropTableEntry[],
    rarity: number
  ): DropTableEntry[] {
    return dropTable.filter((entry) => {
      const equip = getEquipmentById(entry.equipmentId);
      return equip && equip.rarity === rarity;
    });
  }

  /**
   * weight加重で1つ選択
   */
  private static selectByWeight(candidates: DropTableEntry[]): string {
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    const rand = Math.random() * totalWeight;

    let cumulative = 0;
    for (const candidate of candidates) {
      cumulative += candidate.weight;
      if (rand < cumulative) {
        return candidate.equipmentId;
      }
    }

    // フォールバック（最後の候補を返す）
    return candidates[candidates.length - 1].equipmentId;
  }
}
