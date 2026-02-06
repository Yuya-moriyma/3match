/**
 * BattleHUDScreen - 戦闘中HTML UIのルートコンテナ
 *
 * BaseScreenを継承しない軽量クラス。
 * Phaser canvasと同時表示し、GameBridgeイベントを購読して
 * 各HTMLサブコンポーネントに配信する。
 *
 * ライフサイクル: show() → (バトル中) → hide() → destroy()
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';
import { BattlePauseMenu } from '../components/BattlePauseMenu';
import { BattleTooltip, EnemyInfoForTooltip } from '../components/BattleTooltip';
import { PlayerPanel } from '../components/PlayerPanel';
import { EnemyPanel } from '../components/EnemyPanel';
import { ActionCountPanel } from '../components/ActionCountPanel';
import { TutorialModal } from '../components/TutorialModal';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

export class BattleHUDScreen {
  private container: HTMLElement;
  private gameBridge: GameBridge;
  private rootElement: HTMLElement | null = null;
  private eventCleanups: Array<() => void> = [];

  // サブコンポーネント
  private pauseMenu: BattlePauseMenu | null = null;
  private tooltip: BattleTooltip | null = null;
  private playerPanel: PlayerPanel | null = null;
  private enemyPanel: EnemyPanel | null = null;
  private actionCountPanel: ActionCountPanel | null = null;

  constructor(container: HTMLElement, gameBridge: GameBridge) {
    this.container = container;
    this.gameBridge = gameBridge;
  }

  /**
   * HUD UIを生成して表示
   */
  public show(): void {
    if (this.rootElement) return;

    this.rootElement = this.createElement();
    this.container.appendChild(this.rootElement);
    this.initComponents();
    this.setupEventListeners();
  }

  /**
   * HUD UIを非表示
   */
  public hide(): void {
    if (this.rootElement) {
      this.rootElement.style.display = 'none';
    }
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    // サブコンポーネントを破棄
    if (this.actionCountPanel) {
      this.actionCountPanel.destroy();
      this.actionCountPanel = null;
    }
    if (this.enemyPanel) {
      this.enemyPanel.destroy();
      this.enemyPanel = null;
    }
    if (this.playerPanel) {
      this.playerPanel.destroy();
      this.playerPanel = null;
    }
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
      this.pauseMenu = null;
    }

    // イベントリスナーを全解除
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];

    // DOM要素を削除
    if (this.rootElement) {
      this.rootElement.remove();
      this.rootElement = null;
    }
  }

  /**
   * ルートDOM要素を取得（サブコンポーネントが参照する用）
   */
  public getRoot(): HTMLElement | null {
    return this.rootElement;
  }

  /**
   * サブコンポーネントを初期化
   */
  private initComponents(): void {
    if (!this.rootElement) return;

    const pauseBtnArea = this.rootElement.querySelector('.battle-hud__pause-btn') as HTMLElement;
    const pauseOverlay = this.rootElement.querySelector('.battle-hud__pause-overlay') as HTMLElement;

    this.pauseMenu = new BattlePauseMenu(pauseBtnArea, pauseOverlay, this.gameBridge);

    const tooltipOverlay = this.rootElement.querySelector('.battle-hud__tooltip-overlay') as HTMLElement;
    this.tooltip = new BattleTooltip(tooltipOverlay, this.gameBridge);

    const playerArea = this.rootElement.querySelector('.battle-hud__player-area') as HTMLElement;
    this.playerPanel = new PlayerPanel(playerArea, this.gameBridge);

    const enemyArea = this.rootElement.querySelector('.battle-hud__enemy-area') as HTMLElement;
    this.enemyPanel = new EnemyPanel(enemyArea, this.gameBridge);

    const actionCountArea = this.rootElement.querySelector('.battle-hud__action-count') as HTMLElement;
    this.actionCountPanel = new ActionCountPanel(actionCountArea, this.gameBridge);
  }

  /**
   * DOM構造を生成
   */
  private createElement(): HTMLElement {
    const root = document.createElement('div');
    root.id = 'battle-hud-root';

    // ポーズボタン領域
    const pauseBtn = document.createElement('div');
    pauseBtn.className = 'battle-hud__pause-btn';
    root.appendChild(pauseBtn);

    // ボードプロキシ（Phaser盤面と同位置・同サイズの透明DOM要素）
    const boardProxy = document.createElement('div');
    boardProxy.className = 'battle-hud__board-proxy';

    // 上部横並びコンテナ（敵UI左・味方UI右）- ボードプロキシ内で相対配置
    const upperRow = document.createElement('div');
    upperRow.className = 'battle-hud__upper-row';

    const enemyArea = document.createElement('div');
    enemyArea.className = 'battle-hud__enemy-area';
    upperRow.appendChild(enemyArea);

    const playerArea = document.createElement('div');
    playerArea.className = 'battle-hud__player-area';
    upperRow.appendChild(playerArea);

    boardProxy.appendChild(upperRow);

    // アクションカウント領域（Phase 5で実装）- ボードプロキシ内で相対配置
    const actionCount = document.createElement('div');
    actionCount.className = 'battle-hud__action-count';
    boardProxy.appendChild(actionCount);

    root.appendChild(boardProxy);

    // ダメージ表示レイヤー（Phase 7で実装）
    const damageLayer = document.createElement('div');
    damageLayer.className = 'battle-hud__damage-layer';
    root.appendChild(damageLayer);

    // ツールチップオーバーレイ（Phase 2で実装）
    const tooltipOverlay = document.createElement('div');
    tooltipOverlay.className = 'battle-hud__tooltip-overlay';
    root.appendChild(tooltipOverlay);

    // ポーズメニューオーバーレイ（Phase 1で実装）
    const pauseOverlay = document.createElement('div');
    pauseOverlay.className = 'battle-hud__pause-overlay';
    root.appendChild(pauseOverlay);

    return root;
  }

  /**
   * GameBridgeイベントリスナーを設定
   * Phase 1〜7で各サブコンポーネントへの配信を追加していく
   */
  private setupEventListeners(): void {
    // BATTLE_HUD_INIT: バトル初期化データ受信
    this.listenBridge(GameBridgeEvents.BATTLE_HUD_INIT, (data: {
      playerHp: number;
      playerMaxHp: number;
      enemyHp: number;
      enemyMaxHp: number;
      enemyAttackCounter: number;
      enemySkillCounter: number;
      enemyInfo: EnemyInfoForTooltip;
      boardGeometry?: {
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
        gameWidth: number;
        gameHeight: number;
      };
    }) => {
      // ボードプロキシのCSS変数を設定
      if (data.boardGeometry && this.rootElement) {
        const { offsetX, offsetY, width, height, gameWidth, gameHeight } = data.boardGeometry;
        this.rootElement.style.setProperty('--board-left', `${(offsetX / gameWidth) * 100}%`);
        this.rootElement.style.setProperty('--board-top', `${(offsetY / gameHeight) * 100}%`);
        this.rootElement.style.setProperty('--board-width', `${(width / gameWidth) * 100}%`);
        this.rootElement.style.setProperty('--board-height', `${(height / gameHeight) * 100}%`);
      }

      if (this.actionCountPanel) {
        this.actionCountPanel.init();
      }
      if (this.tooltip && data.enemyInfo) {
        this.tooltip.setEnemyInfo(data.enemyInfo);
      }
      if (this.playerPanel) {
        this.playerPanel.init(data.playerHp, data.playerMaxHp);
      }
      if (this.enemyPanel) {
        this.enemyPanel.init({
          enemyHp: data.enemyHp,
          enemyMaxHp: data.enemyMaxHp,
          enemyAttackCounter: data.enemyAttackCounter,
          enemySkillCounter: data.enemySkillCounter,
          hasSkill: !!data.enemyInfo?.skillDef,
        });
      }
    });

    // HP_UPDATE: HP変動（PlayerPanel, EnemyPanel が自前リスニング）
    this.listenBridge(GameBridgeEvents.HP_UPDATE, () => {});

    // COUNTER_UPDATE: 敵カウンター変動（EnemyPanel が自前リスニング）
    this.listenBridge(GameBridgeEvents.COUNTER_UPDATE, () => {});

    // ACTION_COUNT_UPDATE: アクションカウント変動（ActionCountPanel が自前リスニング）
    this.listenBridge(GameBridgeEvents.ACTION_COUNT_UPDATE, () => {});

    // POISON_UPDATE: 毒状態変更（PlayerPanel が自前リスニング）
    this.listenBridge(GameBridgeEvents.POISON_UPDATE, (_data: unknown) => {
      // PlayerPanelが直接リスニング
    });

    // COUNTER_FROZEN: カウンター凍結
    this.listenBridge(GameBridgeEvents.COUNTER_FROZEN, (data: { frozen: boolean; remainingTurns: number }) => {
      if (this.tooltip) {
        this.tooltip.setFreezeInfo(data.frozen, data.remainingTurns);
      }
      // Phase 4で敵カウンターUIの凍結スタイルを追加
    });

    // SHOW_DAMAGE_POPUP: ダメージポップアップ（EnemyPanel が自前リスニング）
    this.listenBridge(GameBridgeEvents.SHOW_DAMAGE_POPUP, () => {});

    // ENEMY_SHAKE: 敵シェイク（EnemyPanel が自前リスニング）
    this.listenBridge(GameBridgeEvents.ENEMY_SHAKE, () => {});

    // ENEMY_DEATH: 敵撃破（EnemyPanel が自前リスニング）
    this.listenBridge(GameBridgeEvents.ENEMY_DEATH, () => {});

    // BATTLE_READY: バトル開始暗転完了
    this.listenBridge(GameBridgeEvents.BATTLE_READY, () => {
      // HUD要素は最初から表示済み
    });

    // POISON_PANEL_SPAWNED: 毒パネル生成時のチュートリアル表示（敵ターン完了後0.25秒遅延）
    this.listenBridge(GameBridgeEvents.POISON_PANEL_SPAWNED, () => {
      setTimeout(() => {
        TutorialModal.getInstance().show('poison_panel_first', () => {
          // チュートリアル完了時にBattleControllerへ通知
          this.gameBridge.emit(GameBridgeEvents.TUTORIAL_CLOSED);
        });
      }, 250);
    });
  }

  /**
   * GameBridgeイベントを購読（destroy時に自動解除）
   */
  private listenBridge(event: string, callback: EventCallback): void {
    this.gameBridge.on(event, callback);
    this.eventCleanups.push(() => this.gameBridge.off(event, callback));
  }
}
