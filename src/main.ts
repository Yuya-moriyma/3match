import Phaser from 'phaser';
import { gameConfig } from './config';
import { UIManager } from './ui/UIManager';

// CSSスタイルをインポート
import './styles/theme.css';
import './styles/components.css';
import './styles/screens/username.css';
import './styles/screens/title.css';
import './styles/screens/menu.css';
import './styles/screens/settings.css';
import './styles/screens/result.css';
import './styles/screens/battle-prep.css';
import './styles/screens/story.css';
import './styles/screens/showcase.css';
import './styles/screens/panel-gallery.css';
import './styles/screens/theme-gallery.css';
import './styles/screens/quest.css';
import './styles/screens/battle-hud.css';
import './styles/screens/battle-effects.css';
import './styles/screens/equip-modal.css';
import './styles/screens/tutorial.css';

// UI Screens
import { UserNameScreen } from './ui/screens/UserNameScreen';
import { TitleScreen } from './ui/screens/TitleScreen';
import { MenuScreen } from './ui/screens/MenuScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { ResultScreen } from './ui/screens/ResultScreen';
import { BattlePrepScreen } from './ui/screens/BattlePrepScreen';
import { StoryScreen } from './ui/screens/StoryScreen';
import { ShowcaseScreen } from './ui/screens/ShowcaseScreen';
import { PanelGalleryScreen } from './ui/screens/PanelGalleryScreen';
import { ThemeGalleryScreen } from './ui/screens/ThemeGalleryScreen';
import { QuestScreen } from './ui/screens/QuestScreen';

// Phaserゲームインスタンスを作成
const game = new Phaser.Game(gameConfig);

// UIManagerを初期化
const uiContainer = document.getElementById('ui-layer');
if (uiContainer) {
  const uiManager = UIManager.init({
    container: uiContainer,
    phaserGame: game,
  });

  // 画面を登録
  uiManager.registerScreen('userName', new UserNameScreen());
  uiManager.registerScreen('title', new TitleScreen());
  uiManager.registerScreen('menu', new MenuScreen());
  uiManager.registerScreen('settings', new SettingsScreen());
  uiManager.registerScreen('result', new ResultScreen());
  uiManager.registerScreen('battlePrep', new BattlePrepScreen());
  uiManager.registerScreen('story', new StoryScreen());
  uiManager.registerScreen('showcase', new ShowcaseScreen());
  uiManager.registerScreen('panelGallery', new PanelGalleryScreen());
  uiManager.registerScreen('themeGallery', new ThemeGalleryScreen());
  uiManager.registerScreen('quest', new QuestScreen());

  // グローバルに公開（デバッグ用）
  (window as unknown as { uiManager: UIManager }).uiManager = uiManager;
}

// ローディング画面を非表示にする関数を公開
(window as unknown as { hideLoadingScreen: () => void }).hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    // アニメーション完了後にDOMから削除
    setTimeout(() => {
      loadingScreen.remove();
    }, 500);
  }
};
