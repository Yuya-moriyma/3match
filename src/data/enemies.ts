import { EnemyConfig } from '../types/story';

/**
 * 敵マスターデータ
 * 敵IDをキーとし、EnemyConfigを値とするMap
 */
const enemyMasterMap = new Map<string, EnemyConfig>([
  [
    'slime',
    {
      id: 'slime',
      name: 'スライム',
      hp: 100,
      normalAttack: 20,
      attackInterval: 2,
      skillInterval: 3,
    },
  ],
  [
    'goblin',
    {
      id: 'goblin',
      name: 'ゴブリン',
      hp: 200,
      normalAttack: 20,
      attackInterval: 2,
      skillInterval: 4,
    },
  ],
  [
    'fenrir',
    {
      id: 'fenrir',
      name: 'フェンリル',
      hp: 300,
      normalAttack: 30,
      attackInterval: 2,
      skillInterval: 3,
    },
  ],
]);

/**
 * 敵IDから敵データを取得
 */
export function getEnemyById(enemyId: string): EnemyConfig | undefined {
  return enemyMasterMap.get(enemyId);
}
