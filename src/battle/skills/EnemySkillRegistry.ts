import { EnemySkillDef, EnemySkillEffectType } from '../../types';
import { SoundKeys } from '../../utils/SoundManager';

/**
 * 敵スキルレジストリ
 * 敵IDをキーとして、対応するEnemySkillDefを返すマッピング
 */
const enemySkillMap = new Map<string, EnemySkillDef>([
  [
    'slime',
    {
      id: 'slime_poison_convert',
      name: '毒の粘液',
      effectType: EnemySkillEffectType.POISON_CONVERT,
      skillSe: SoundKeys.SKILL_ENEMY_1,
      params: {
        poisonCount: 5,
      },
    },
  ],
  [
    'goblin',
    {
      id: 'goblin_heavy_attack',
      name: '殴打',
      effectType: EnemySkillEffectType.HEAVY_ATTACK,
      skillSe: SoundKeys.SKILL_ENEMY_2,
      params: {
        fixedDamage: 30,
      },
    },
  ],
  [
    'fenrir',
    {
      id: 'fenrir_freeze',
      name: '凍てつく眼光',
      effectType: EnemySkillEffectType.FREEZE,
      skillSe: SoundKeys.SKILL_ENEMY_3,
      params: {
        freezeCount: 5,
      },
    },
  ],
]);

/**
 * 敵IDからスキル定義を取得
 */
export function getEnemySkill(enemyId: string): EnemySkillDef | undefined {
  return enemySkillMap.get(enemyId);
}
