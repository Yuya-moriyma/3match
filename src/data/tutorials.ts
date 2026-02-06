/**
 * チュートリアルマスターデータ
 * 初回表示用のチュートリアル定義
 */

export interface TutorialPage {
  text: string;
  image?: string;  // 将来的な画像対応用（オプション）
}

export interface TutorialDefinition {
  id: string;
  title: string;
  pages: TutorialPage[];
}

/**
 * チュートリアル定義マップ
 */
const tutorialMasterMap = new Map<string, TutorialDefinition>([
  [
    'quest_first_visit',
    {
      id: 'quest_first_visit',
      title: 'クエスト画面へようこそ',
      pages: [
        {
          text: 'ここはクエスト画面です。\n様々なモンスターと何度でも戦うことができます。',
        },
        {
          text: '画面左側でキャラクターを選択し、\n右側で装備を選択してください。',
        },
        {
          text: '準備ができたら「バトル開始」ボタンを\nタップして戦闘を始めましょう！',
        },
      ],
    },
  ],
  [
    'story_first_visit',
    {
      id: 'story_first_visit',
      title: 'ストーリー画面へようこそ',
      pages: [
        {
          text: 'ここはストーリー画面です。\n物語を進めながらモンスターと戦います。',
        },
        {
          text: '画面左側でキャラクターを選択し、\n右側で装備を選択してください。',
        },
        {
          text: 'ストーリーをクリアすると\n新しいステージが解放されます。',
        },
      ],
    },
  ],
  [
    'poison_panel_first',
    {
      id: 'poison_panel_first',
      title: '毒パネルについて',
      pages: [
        {
          text: '紫色のパネルは「毒パネル」です。\nこれを消すとプレイヤーがダメージを受けます。',
        },
        {
          text: '毒パネルは敵の攻撃によって生成されます。\n消さずに残しておくか、\n覚悟して消すかはあなた次第です。',
        },
      ],
    },
  ],
]);

/**
 * チュートリアルIDからチュートリアル定義を取得
 */
export function getTutorialById(id: string): TutorialDefinition | undefined {
  return tutorialMasterMap.get(id);
}

/**
 * 全チュートリアル定義を取得
 */
export function getAllTutorials(): TutorialDefinition[] {
  return Array.from(tutorialMasterMap.values());
}
