import Phaser from 'phaser';
import {
  BonusType,
  Character,
} from '../types';
import { SoundManager, SoundKeys } from '../utils/SoundManager';
import { Tile } from './board/types';
import { BoardModel } from './board/BoardModel';
import { BoardView } from './board/BoardView';
import { TileFactory } from './board/TileFactory';
import { MatchDetector } from './board/MatchDetector';
import { EffectManager } from './effects/EffectManager';
import { BattleHUD, EnemyInfo } from './ui/BattleHUD';
import { ActionSystem } from './actions/ActionSystem';
import { SkillExecutor } from './skills/SkillExecutor';
import { EnemySkillExecutor } from './skills/EnemySkillExecutor';
import { getEnemySkill } from './skills/EnemySkillRegistry';
import { StatusEffectManager } from './StatusEffectManager';
import { TileSwapHandler } from './TileSwapHandler';
import { TileDropHandler } from './TileDropHandler';
import { StatusEffectController } from './StatusEffectController';
import { EnemyTurnController } from './EnemyTurnController';
import { ActionEffectHandler } from './ActionEffectHandler';
import { MatchProcessor } from './MatchProcessor';
import { BonusExplosionHandler } from './BonusExplosionHandler';
import { defaultCharacter } from '../data/characters';
import { EquipmentService } from '../utils/EquipmentService';
import { DropService } from '../utils/DropService';
import {
  INITIAL_PLAYER_HP,
  INITIAL_ENEMY_HP,
  INITIAL_ENEMY_ACTION_COUNTER,
  INITIAL_ENEMY_ATTACK_INTERVAL,
  ENEMY_ATTACK_DAMAGE,
} from './constants';
import { GameBridgeEvents, BattleResultData } from '../ui/GameBridge';
import { EnemyConfig } from '../types/story';

/**
 * BattleController - バトル進行を統合管理
 * MVPパターンのController層として、ゲームロジックと各コンポーネントを統合
 */
export class BattleController {
  private scene: Phaser.Scene;
  private character: Character;

  // コンポーネント
  private boardModel: BoardModel;
  private boardView: BoardView;
  private tileFactory: TileFactory;
  private effectManager: EffectManager;
  private battleHUD: BattleHUD;
  private isPaused = false;
  private actionSystem: ActionSystem;
  private skillExecutor: SkillExecutor;
  private enemySkillExecutor: EnemySkillExecutor;
  private statusEffectManager: StatusEffectManager;
  private tileSwapHandler: TileSwapHandler;
  private tileDropHandler: TileDropHandler;
  private statusEffectController: StatusEffectController;
  private enemyTurnController: EnemyTurnController;
  private actionEffectHandler: ActionEffectHandler;
  private matchProcessor: MatchProcessor;
  private bonusExplosionHandler: BonusExplosionHandler;

  // ゲーム状態
  private isProcessing = false;
  private chainCount = 0;
  private lastSwappedTile: { row: number; col: number } | null = null;

  // HP・カウンター
  private playerHp: number;
  private playerMaxHp: number;
  private enemyHp: number;
  private enemyMaxHp: number;
  private enemySkillCounter: number;
  private enemySkillInterval: number;
  private enemyNormalAttack: number;
  private enemyAttackCounter: number;
  private enemyAttackInterval: number;

  // 敵ID（レジストリ参照用）
  private enemyId: string;

  // 敵撃破フラグ
  private isEnemyDefeated = false;

  // ストーリーモード用
  private sectionId?: string;
  // クエストモード用
  private questId?: string;
  // ステージID
  private stageIdValue?: string;
  // 獲得経験値
  private expReward?: number;

  // HP計算用定数（PlayerStatus.tsと同値。層の依存方向を維持するため独自定義）
  private static readonly HP_PER_LEVEL = 10;

  constructor(
    scene: Phaser.Scene,
    character: Character = defaultCharacter,
    enemyConfig?: EnemyConfig,
    sectionId?: string,
    questId?: string,
    stageId?: string,
    playerLevel?: number,
    expReward?: number
  ) {
    this.scene = scene;
    this.character = character;
    this.sectionId = sectionId;
    this.questId = questId;
    this.stageIdValue = stageId;
    this.expReward = expReward;

    // 装備バフを取得
    const equipmentBonuses = EquipmentService.getInstance().getBonuses();

    // 敵データを設定（外部から渡された場合はそれを使用、なければデフォルト）
    this.playerMaxHp = INITIAL_PLAYER_HP + ((playerLevel ?? 1) - 1) * BattleController.HP_PER_LEVEL + equipmentBonuses.hp;
    this.playerHp = this.playerMaxHp;
    this.enemyMaxHp = enemyConfig?.hp ?? INITIAL_ENEMY_HP;
    this.enemyHp = this.enemyMaxHp;
    this.enemySkillInterval = enemyConfig?.skillInterval ?? INITIAL_ENEMY_ACTION_COUNTER;
    this.enemySkillCounter = this.enemySkillInterval;
    this.enemyNormalAttack = enemyConfig?.normalAttack ?? ENEMY_ATTACK_DAMAGE;
    this.enemyAttackInterval = enemyConfig?.attackInterval ?? INITIAL_ENEMY_ATTACK_INTERVAL;
    this.enemyAttackCounter = this.enemyAttackInterval;
    this.enemyId = enemyConfig?.id ?? '';

    // コンポーネント初期化
    this.boardModel = new BoardModel();
    this.tileFactory = new TileFactory(scene);
    this.boardView = new BoardView(scene, this.boardModel, this.tileFactory);
    this.effectManager = new EffectManager(scene);
    this.battleHUD = new BattleHUD(scene);
    this.actionSystem = new ActionSystem(scene);
    this.skillExecutor = new SkillExecutor(this.boardModel, this.tileFactory, scene);
    this.enemySkillExecutor = new EnemySkillExecutor(scene, this.boardModel);
    this.statusEffectManager = new StatusEffectManager(this.boardModel);
    this.tileSwapHandler = new TileSwapHandler(
      this.boardModel,
      this.boardView,
      this.statusEffectManager
    );
    this.tileSwapHandler.setCallbacks({
      onSwapComplete: (tile1, tile2) => this.onSwapComplete(tile1, tile2),
      onBonusActivate: (bonusTile) => this.activateBonusOrb(bonusTile),
      getIsProcessing: () => this.isProcessing,
      getIsPaused: () => this.isPaused,
    });
    this.tileDropHandler = new TileDropHandler(
      this.scene,
      this.boardModel,
      this.tileFactory
    );
    this.tileDropHandler.setCallbacks({
      onTileClick: (row, col, pointer) => this.onTilePointerDown(row, col, pointer),
      onDropComplete: (isPlayerMove) => this.onDropComplete(isPlayerMove),
    });
    this.statusEffectController = new StatusEffectController(
      this.scene,
      this.boardModel,
      this.tileFactory,
      this.effectManager
    );
    this.statusEffectController.setCallbacks({
      onTileClick: (row, col, pointer) => this.onTilePointerDown(row, col, pointer),
    });
    this.enemyTurnController = new EnemyTurnController(
      this.scene,
      this.boardModel,
      this.effectManager,
      this.battleHUD,
      this.enemySkillExecutor,
      this.statusEffectManager,
      this.statusEffectController
    );
    this.enemyTurnController.setCallbacks({
      getPlayerHp: () => this.playerHp,
      setPlayerHp: (hp) => { this.playerHp = hp; },
      getPlayerMaxHp: () => this.playerMaxHp,
      getEnemyNormalAttack: () => this.enemyNormalAttack,
      getEnemyAttackCounter: () => this.enemyAttackCounter,
      setEnemyAttackCounter: (counter) => { this.enemyAttackCounter = counter; },
      getEnemyAttackInterval: () => this.enemyAttackInterval,
      getEnemySkillCounter: () => this.enemySkillCounter,
      setEnemySkillCounter: (counter) => { this.enemySkillCounter = counter; },
      getEnemySkillInterval: () => this.enemySkillInterval,
      getEnemyId: () => this.enemyId,
      isEnemyDefeated: () => this.isEnemyDefeated,
      updateHUD: () => this.updateHUD(),
      emitBattleEnd: (victory) => this.emitBattleEnd(victory),
    });
    this.actionEffectHandler = new ActionEffectHandler(
      this.scene,
      this.boardModel,
      this.effectManager,
      this.battleHUD,
      this.actionSystem,
      this.skillExecutor,
      this.statusEffectManager,
      this.character
    );
    this.actionEffectHandler.setAtkBonus(equipmentBonuses.atk);
    this.actionEffectHandler.setHealBonus(equipmentBonuses.heal);
    this.actionEffectHandler.setLevelMultiplier(playerLevel ?? 1);
    this.actionEffectHandler.setCallbacks({
      getPlayerHp: () => this.playerHp,
      setPlayerHp: (hp) => { this.playerHp = hp; },
      getPlayerMaxHp: () => this.playerMaxHp,
      getEnemyHp: () => this.enemyHp,
      setEnemyHp: (hp) => { this.enemyHp = hp; },
      isEnemyDefeated: () => this.isEnemyDefeated,
      setEnemyDefeated: (value) => { this.isEnemyDefeated = value; },
      updateHUD: () => this.updateHUD(),
      emitBattleEnd: (victory) => this.emitBattleEnd(victory),
      onTileClick: (row, col, pointer) => this.onTilePointerDown(row, col, pointer),
    });
    this.bonusExplosionHandler = new BonusExplosionHandler(
      this.scene,
      this.boardModel,
      this.effectManager,
      this.actionSystem,
      this.statusEffectController
    );
    this.bonusExplosionHandler.setCallbacks({
      dropTiles: (isPlayerMove) => this.tileDropHandler.dropTiles(isPlayerMove),
      getChainMultiplier: () => this.getChainMultiplier(),
      updateHUD: () => this.updateHUD(),
    });
    this.matchProcessor = new MatchProcessor(
      this.scene,
      this.boardModel,
      this.tileFactory,
      this.effectManager,
      this.actionSystem,
      this.statusEffectController
    );
    this.matchProcessor.setCallbacks({
      onTileClick: (row, col, pointer) => this.onTilePointerDown(row, col, pointer),
      dropTiles: (isPlayerMove) => this.tileDropHandler.dropTiles(isPlayerMove),
      processChainBonusExplosions: (bonusOrbs, isPlayerMove) => this.bonusExplosionHandler.processChainBonusExplosions(bonusOrbs, isPlayerMove),
      getChainMultiplier: () => this.getChainMultiplier(),
      getLastSwappedTile: () => this.lastSwappedTile,
    });
  }

  /**
   * バトルを初期化
   */
  initialize(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 演出中はタイル操作を無効化
    this.isProcessing = true;

    // 盤面オフセットを設定
    this.boardModel.setOffset(width, height);

    // 敵情報を構築（ツールチップ表示用）
    const enemyInfo: EnemyInfo = {
      normalAttack: this.enemyNormalAttack,
      attackInterval: this.enemyAttackInterval,
      skillDef: getEnemySkill(this.enemyId),
    };

    // GameBridgeイベントリスナーを設定（HTML UI → Phaser）
    this.setupBridgeListeners();

    // バトルUIを作成
    this.battleHUD.createBattleUI(
      width,
      this.boardModel.offsetX,
      this.boardModel.offsetY,
      this.playerHp,
      this.playerMaxHp,
      this.enemyHp,
      this.enemyMaxHp,
      this.enemySkillCounter,
      this.enemyAttackCounter,
      enemyInfo
    );

    // 盤面フレームを描画
    this.boardView.createBoardFrame();

    // 盤面を初期化（フリック対応のためpointerも渡す）
    this.boardView.initBoard((row, col, pointer) => this.onTilePointerDown(row, col, pointer));

    // フリック検出用のsceneレベルイベントを登録
    this.setupFlickListeners();

    // 初期マッチを除去
    this.tileDropHandler.removeInitialMatches();

    // アクションシステムにキャラクター情報を設定
    this.actionSystem.setCharacter(this.character);
    this.actionSystem.setSkillCostReduction(EquipmentService.getInstance().getSkillCostReduction());
    this.actionSystem.setAttackCostReduction(EquipmentService.getInstance().getAttackCostReduction());
    this.actionSystem.setHealCostReduction(EquipmentService.getInstance().getHealCostReduction());

    // 初期アクションカウント表示を正しい閾値で送信（装備効果反映）
    const initialDisplay = this.actionSystem.getDisplayValues();
    this.battleHUD.updateActionCountUI(initialDisplay.attack, initialDisplay.skill, initialDisplay.heal);

    // バトル開始演出をHTML Effectsレイヤーに委譲
    this.scene.game.events.emit(GameBridgeEvents.BATTLE_START_EFFECT);
  }

  /**
   * タイルポインターダウン処理（フリック対応）
   */
  private onTilePointerDown(row: number, col: number, pointer?: Phaser.Input.Pointer): void {
    if (pointer) {
      this.tileSwapHandler.onTilePointerDown(row, col, pointer);
    }
  }

  /**
   * フリック検出用のsceneレベルイベントを登録
   */
  private setupFlickListeners(): void {
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.tileSwapHandler.onPointerUp(pointer);
    });
  }

  /**
   * タイル落下・補充完了時のコールバック
   */
  private onDropComplete(isPlayerMove: boolean): void {
    const newMatches = MatchDetector.findMatches(this.boardModel.getRawBoard());
    if (newMatches.length > 0) {
      this.chainCount++;
      this.effectManager.showChainText(this.chainCount + 1);
      this.matchProcessor.processMatches(newMatches, isPlayerMove);
    } else {
      this.executeQueuedActions(() => {
        if (isPlayerMove) {
          this.enemyTurnController.onMoveComplete(() => {
            this.isProcessing = false;
          });
        } else {
          this.isProcessing = false;
        }
      });
    }
  }

  /**
   * スワップ完了時のコールバック
   */
  private onSwapComplete(tile1: Tile, tile2: Tile): void {
    this.isProcessing = true;
    this.chainCount = 0;
    this.lastSwappedTile = { row: tile2.row, col: tile2.col };

    const matches = MatchDetector.findMatches(this.boardModel.getRawBoard());
    if (matches.length > 0) {
      this.matchProcessor.processMatches(matches, true);
    } else {
      SoundManager.getInstance().playSE(SoundKeys.NOT_MOVE);
      this.tileSwapHandler.swapBack(tile1, tile2, () => {
        this.isProcessing = false;
      });
    }
  }

  /**
   * ボーナスオーブを発動
   */
  private activateBonusOrb(bonusTile: Tile): void {
    this.isProcessing = true;
    this.chainCount = 0;

    if (bonusTile.bonusType === BonusType.BOMB) {
      this.bonusExplosionHandler.triggerBombExplosion(bonusTile, true);
    } else {
      this.bonusExplosionHandler.triggerBonusExplosion(bonusTile, true);
    }
  }



  /**
   * アクション発動キューを実行（ActionEffectHandlerに委譲）
   */
  private executeQueuedActions(onComplete: () => void): void {
    this.actionEffectHandler.executeQueuedActions(onComplete);
  }

  /**
   * GameBridgeイベントリスナーを設定（HTML UI → Phaser方向）
   */
  private setupBridgeListeners(): void {
    // ポーズトグル
    this.scene.game.events.on(GameBridgeEvents.PAUSE_TOGGLE, () => {
      this.isPaused = true;
    });

    // 再開
    this.scene.game.events.on(GameBridgeEvents.RESUME, () => {
      this.isPaused = false;
    });

    // リタイア
    this.scene.game.events.on(GameBridgeEvents.RETIRE, () => {
      this.isPaused = false;
      this.requestScreen('menu');
    });

    // バトル開始演出完了
    this.scene.game.events.on(GameBridgeEvents.BATTLE_START_EFFECT_COMPLETE, () => {
      this.isProcessing = false;
      SoundManager.getInstance().playBattleBGM();
      this.scene.game.events.emit(GameBridgeEvents.BATTLE_READY);
    });

    // チュートリアル閉じ完了
    this.scene.game.events.on(GameBridgeEvents.TUTORIAL_CLOSED, () => {
      this.isProcessing = false;
    });
  }

  /**
   * HUDを更新
   */
  private updateHUD(): void {
    const displayValues = this.actionSystem.getDisplayValues();
    this.battleHUD.updateActionCountUI(displayValues.attack, displayValues.skill, displayValues.heal);
    this.battleHUD.updateHpBars(
      this.playerHp,
      this.playerMaxHp,
      this.enemyHp,
      this.enemyMaxHp,
      this.enemySkillCounter,
      this.enemyAttackCounter
    );
  }

  /**
   * チェイン倍率を取得
   */
  private getChainMultiplier(): number {
    return Math.min(this.chainCount + 1, 3);
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    // GameBridgeイベントリスナーを解除
    this.scene.game.events.off(GameBridgeEvents.PAUSE_TOGGLE);
    this.scene.game.events.off(GameBridgeEvents.RESUME);
    this.scene.game.events.off(GameBridgeEvents.RETIRE);
    this.scene.game.events.off(GameBridgeEvents.BATTLE_START_EFFECT_COMPLETE);
    this.scene.game.events.off(GameBridgeEvents.TUTORIAL_CLOSED);

    // フリック検出用イベントリスナーを解除
    this.scene.input.off('pointerup');

    this.battleHUD.cleanup();

    for (const { tile } of this.boardModel.iterateTiles()) {
      if (tile) {
        tile.container.destroy();
      }
    }

    this.boardModel.reset();
    this.tileSwapHandler.resetSelection();
    this.actionSystem.reset();
    this.statusEffectManager.cleanup();
  }

  /**
   * バトル終了イベントを発火
   */
  private emitBattleEnd(victory: boolean): void {
    // 画面遷移前にBGMを停止
    SoundManager.getInstance().stopBGM();

    // 勝利時かつクエストモードの場合、ドロップ判定を実行
    let droppedEquipmentId: string | null = null;
    if (victory && this.questId) {
      droppedEquipmentId = DropService.determineDroppedEquipment(this.questId);
    }

    const result: BattleResultData = {
      victory,
      score: 0, // TODO: スコア計算
      turns: 0, // TODO: ターン数追跡
      maxCombo: 0, // TODO: 最大コンボ追跡
      stageId: this.stageIdValue ?? 'stage1',
      characterId: this.character.id,
      sectionId: this.sectionId,
      questId: this.questId,
      expReward: this.expReward,
      droppedEquipmentId,
    };
    this.scene.game.events.emit(GameBridgeEvents.BATTLE_END, result);
  }

  /**
   * 画面遷移をリクエスト
   */
  private requestScreen(screenName: string): void {
    SoundManager.getInstance().stopBGM();
    this.scene.game.events.emit(GameBridgeEvents.REQUEST_SCREEN, screenName);
  }
}
