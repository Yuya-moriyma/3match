import { Chapter, Section, Dialogue } from '../types/story';
import chapter1_1Dialogues from './dialogues/chapter1-1.json';
import chapter1_2Dialogues from './dialogues/chapter1-2.json';
import chapter1_3Dialogues from './dialogues/chapter1-3.json';
import chapter1_4Dialogues from './dialogues/chapter1-4.json';

/**
 * ストーリーマスターデータ
 *
 * 会話データは src/data/dialogues/ 配下のJSONファイルで管理。
 * ファイル命名規則: {sectionId}.json
 *
 * 第1章: 赤ずきんの章（4節）
 * - 1-1: 目覚め - 会話 → 戦闘（スライム）
 * - 1-2: 童話騎士団 - 会話のみ
 * - 1-3: ゴブリンの長 - 会話 → 戦闘（ゴブリン）
 * - 1-4: フェンリル - 会話 → 戦闘（フェンリル）
 */

export const chapters: Chapter[] = [
  {
    id: 'chapter1',
    title: '第1章 赤ずきんの章',
    sections: [
      {
        id: 'chapter1-1',
        title: '目覚め',
        dialogues: chapter1_1Dialogues as Dialogue[],
        battle: {
          enemyId: 'slime',
          stageId: 'forest-1',
          expReward: 100,
        },
      },
      {
        id: 'chapter1-2',
        title: '童話騎士団',
        dialogues: chapter1_2Dialogues as Dialogue[],
        // 会話のみの節（戦闘なし）
      },
      {
        id: 'chapter1-3',
        title: 'ゴブリンの長',
        dialogues: chapter1_3Dialogues as Dialogue[],
        battle: {
          enemyId: 'goblin',
          stageId: 'forest-deep',
          expReward: 200,
        },
      },
      {
        id: 'chapter1-4',
        title: 'フェンリル',
        dialogues: chapter1_4Dialogues as Dialogue[],
        battle: {
          enemyId: 'fenrir',
          stageId: 'forest-boss',
          expReward: 300,
        },
      },
    ],
  },
];

/**
 * 章IDから章データを取得
 */
export function getChapterById(chapterId: string): Chapter | undefined {
  return chapters.find((c) => c.id === chapterId);
}

/**
 * 節IDから節データを取得
 */
export function getSectionById(sectionId: string): Section | undefined {
  for (const chapter of chapters) {
    const section = chapter.sections.find((s) => s.id === sectionId);
    if (section) return section;
  }
  return undefined;
}

/**
 * 節IDからその節が属する章を取得
 */
export function getChapterBySectionId(sectionId: string): Chapter | undefined {
  return chapters.find((chapter) =>
    chapter.sections.some((section) => section.id === sectionId)
  );
}

/**
 * 指定した節の次の節を取得
 * @returns 次の節、または章の最後の場合はnull
 */
export function getNextSection(sectionId: string): Section | null {
  for (const chapter of chapters) {
    const sectionIndex = chapter.sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex !== -1) {
      if (sectionIndex < chapter.sections.length - 1) {
        return chapter.sections[sectionIndex + 1];
      }
      // 章の最後の節の場合
      return null;
    }
  }
  return null;
}

/**
 * 最初の節を取得
 */
export function getFirstSection(): Section {
  return chapters[0].sections[0];
}

/**
 * 全章を取得
 */
export function getAllChapters(): Chapter[] {
  return chapters;
}
