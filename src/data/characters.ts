import { Character, SkillEffectType, TileType } from '../types';
import { SoundKeys } from '../utils/SoundManager';

// キャラクターマスターデータ
export const characters: Character[] = [
  {
    id: 'red_riding_hood',
    name: '赤ずきん',
    attackPower: 25,
    healPower: 15,
    skill: {
      name: 'ファイアボム',
      description: '盤面のランダムなマス1つをボムに変える',
      cost: 10,
      effectType: SkillEffectType.CREATE_BOMB,
      effectParams: {
        count: 1,
      },
    },
    color: 0xe74c3c, // 赤色
    skillSe: SoundKeys.SKILL_CHARACTER_1,
  },
  {
    id: 'snow_white',
    name: '白雪姫',
    attackPower: 15,
    healPower: 25,
    skill: {
      name: 'アイスフィールド',
      description: '盤面に青色オーブを10個生成',
      cost: 20,
      effectType: SkillEffectType.GENERATE_COLOR,
      effectParams: {
        targetColor: TileType.BLUE,
        count: 10,
      },
    },
    color: 0x3498db, // 青色
    skillSe: SoundKeys.SKILL_CHARACTER_2,
  },
  {
    id: 'cinderella',
    name: 'シンデレラ',
    attackPower: 20,
    healPower: 20,
    skill: {
      name: 'あの鐘が鳴るまで',
      description: '3ターンの間、敵の行動カウントを停止する',
      cost: 20,
      effectType: SkillEffectType.FREEZE_ENEMY_COUNTER,
      effectParams: {
        duration: 3,
      },
    },
    color: 0x87ceeb, // 水色系
    skillSe: SoundKeys.SKILL_CHARACTER_3,
    skillSeDuration: 1.5,
  },
];

// デフォルトキャラクター（赤ずきん）
export const defaultCharacter: Character = characters[0];

// IDからキャラクターを取得
export function getCharacterById(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}
