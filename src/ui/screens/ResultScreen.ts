/**
 * ResultScreen - リザルト画面（HTML版）
 *
 * 機能:
 * - 勝利/敗北の結果表示
 * - 獲得報酬の表示（勝利時）
 * - 次へ/リトライ/撤退ボタン
 * - ストーリーモード: 進行度更新、次節への遷移
 */

import { BaseScreen } from './BaseScreen';
import type { BattleResultData } from '../GameBridge';
import { StoryProgress } from '../../utils/StoryProgress';
import { PlayerPreferences } from '../../utils/PlayerPreferences';
import { getNextSection, getSectionById } from '../../data/story';
import { getCharacterById } from '../../data/characters';
import { getQuestById } from '../../data/quests';
import { getEnemyById } from '../../data/enemies';
import { SoundManager, SoundKeys } from '../../utils/SoundManager';
import { PlayerStatus } from '../../utils/PlayerStatus';
import type { AddExpResult } from '../../utils/ExperienceSystem';
import { getEquipmentById } from '../../data/equipment';
import { createModal } from '../components/Modal';
import { EquipmentService } from '../../utils/EquipmentService';
import { renderToElement } from '../utils';
import resultScreenTemplate from '../templates/result-screen.html?raw';

export class ResultScreen extends BaseScreen {
  private resultData: BattleResultData | null = null;
  private bgmTimer: number | null = null;
  private expResult: AddExpResult | null = null;

  protected createElement(): HTMLElement {
    const screen = renderToElement<HTMLDivElement>(resultScreenTemplate);
    return screen;
  }

  protected async onBeforeShow(data?: unknown): Promise<void> {
    this.resultData = data as BattleResultData | null;
    this.expResult = null;

    // 勝利時かつsectionIdがある場合、進行度を更新
    // クエストモード時はストーリー進行度を更新しない
    // テストモードON時はストーリーが進行しない
    if (this.resultData?.victory && this.resultData?.sectionId && !this.resultData?.questId) {
      const isTestMode = PlayerPreferences.getInstance().getTestMode();
      if (!isTestMode) {
        const storyProgress = StoryProgress.getInstance();
        storyProgress.markSectionCleared(this.resultData.sectionId);
      }
    }

    // 勝利時かつexpRewardがある場合、経験値を付与
    if (this.resultData?.victory && this.resultData?.expReward) {
      const isTestMode = PlayerPreferences.getInstance().getTestMode();
      if (!isTestMode) {
        this.expResult = PlayerStatus.getInstance().addExp(this.resultData.expReward);
      }
    }

    // ドロップ装備品がある場合、未所持なら所持装備に追加（所持済みは表示のみ）
    if (this.resultData?.droppedEquipmentId) {
      const isTestMode = PlayerPreferences.getInstance().getTestMode();
      if (!isTestMode) {
        const equipService = EquipmentService.getInstance();
        const ownedIds = new Set(equipService.getOwnedEquipment().map((e) => e.id));
        if (!ownedIds.has(this.resultData.droppedEquipmentId)) {
          equipService.addEquipment(this.resultData.droppedEquipmentId);
        }
      }
    }

    this.updateContent();
  }

  private updateContent(): void {
    if (!this.element) return;

    const isVictory = this.resultData?.victory ?? false;
    const hasBattle = this.resultData?.hasBattle ?? true;
    const isQuestMode = !!this.resultData?.questId;

    if (isQuestMode) {
      if (isVictory) {
        this.element.innerHTML = this.createQuestVictoryContent();
      } else {
        this.element.innerHTML = this.createQuestDefeatContent();
      }
    } else if (isVictory) {
      if (hasBattle) {
        this.element.innerHTML = this.createVictoryContent();
      } else {
        this.element.innerHTML = this.createStageClearContent();
      }
    } else {
      this.element.innerHTML = this.createDefeatContent();
    }

    // イベントハンドラを再設定
    this.setupEventHandlers();
  }

  private createVictoryContent(): string {
    // 次の節があるかどうか
    const hasNextSection = this.resultData?.sectionId
      ? getNextSection(this.resultData.sectionId) !== null
      : false;

    return `
      ${this.createLevelUpOverlay()}
      <div class="result-screen__content">
        <!-- 勝利タイトル -->
        <div class="result-screen__title-frame result-screen__title-frame--victory">
          <h1 class="result-screen__title result-screen__title--victory">VICTORY!</h1>
        </div>

        <!-- 獲得報酬パネル -->
        <div class="result-screen__panel ui-panel ui-panel--parchment ui-panel--decorated">
          <h2 class="result-screen__panel-title">獲得報酬</h2>
          <div class="result-screen__panel-divider"></div>
          ${this.createLootSection()}
          ${this.createExpRewardSection()}
        </div>

        <!-- ボタン -->
        <div class="result-screen__buttons">
          ${
            hasNextSection
              ? `<button class="result-screen__btn result-screen__btn--next-section ui-btn ui-btn--ribbon ui-btn--lg">
              次の節へ
            </button>`
              : ''
          }
          <button class="result-screen__btn result-screen__btn--next ui-btn ui-btn--ribbon${hasNextSection ? '-secondary' : ''} ui-btn--lg">
            ステージ選択
          </button>
        </div>
      </div>
    `;
  }

  private createStageClearContent(): string {
    // 次の節があるかどうか
    const hasNextSection = this.resultData?.sectionId
      ? getNextSection(this.resultData.sectionId) !== null
      : false;

    return `
      <div class="result-screen__content">
        <!-- 節クリアタイトル -->
        <div class="result-screen__title-frame result-screen__title-frame--victory">
          <h1 class="result-screen__title result-screen__title--victory">STAGE CLEAR!</h1>
          <div class="result-screen__stars">
            <span class="result-screen__star">★</span>
            <span class="result-screen__star result-screen__star--large">★</span>
            <span class="result-screen__star">★</span>
          </div>
        </div>

        <!-- メッセージパネル -->
        <div class="result-screen__panel ui-panel ui-panel--parchment">
          <p class="result-screen__message">会話パートをクリアしました</p>
        </div>

        <!-- ボタン -->
        <div class="result-screen__buttons">
          ${
            hasNextSection
              ? `<button class="result-screen__btn result-screen__btn--next-section ui-btn ui-btn--ribbon ui-btn--lg">
              次の節へ
            </button>`
              : ''
          }
          <button class="result-screen__btn result-screen__btn--next ui-btn ui-btn--ribbon${hasNextSection ? '-secondary' : ''} ui-btn--lg">
            ステージ選択
          </button>
        </div>
      </div>
    `;
  }

  private createDefeatContent(): string {
    return `
      <div class="result-screen__content">
        <!-- 敗北タイトル -->
        <div class="result-screen__title-frame result-screen__title-frame--defeat">
          <h1 class="result-screen__title result-screen__title--defeat">DEFEAT...</h1>
        </div>

        <!-- メッセージパネル -->
        <div class="result-screen__panel ui-panel ui-panel--parchment">
          <p class="result-screen__message">敵を倒せなかった...</p>
          <p class="result-screen__message-sub">もう一度挑戦しますか？</p>
        </div>

        <!-- ボタン -->
        <div class="result-screen__buttons result-screen__buttons--defeat">
          <button class="result-screen__btn result-screen__btn--retry ui-btn ui-btn--ribbon ui-btn--lg">
            リトライ
          </button>
          <button class="result-screen__btn result-screen__btn--retreat ui-btn ui-btn--ribbon-secondary ui-btn--lg">
            撤退
          </button>
        </div>
      </div>
    `;
  }

  private createQuestVictoryContent(): string {
    return `
      ${this.createLevelUpOverlay()}
      <div class="result-screen__content">
        <!-- 勝利タイトル -->
        <div class="result-screen__title-frame result-screen__title-frame--victory">
          <h1 class="result-screen__title result-screen__title--victory">VICTORY!</h1>
        </div>

        <!-- 獲得報酬パネル -->
        <div class="result-screen__panel ui-panel ui-panel--parchment ui-panel--decorated">
          <h2 class="result-screen__panel-title">獲得報酬</h2>
          <div class="result-screen__panel-divider"></div>
          ${this.createLootSection()}
          ${this.createExpRewardSection()}
        </div>

        <!-- ボタン -->
        <div class="result-screen__buttons">
          <button class="result-screen__btn result-screen__btn--quest-retry ui-btn ui-btn--ribbon ui-btn--lg">
            リトライ
          </button>
          <button class="result-screen__btn result-screen__btn--quest-back ui-btn ui-btn--ribbon-secondary ui-btn--lg">
            クエスト選択に戻る
          </button>
        </div>
      </div>
    `;
  }

  private createQuestDefeatContent(): string {
    return `
      <div class="result-screen__content">
        <!-- 敗北タイトル -->
        <div class="result-screen__title-frame result-screen__title-frame--defeat">
          <h1 class="result-screen__title result-screen__title--defeat">DEFEAT...</h1>
        </div>

        <!-- メッセージパネル -->
        <div class="result-screen__panel ui-panel ui-panel--parchment">
          <p class="result-screen__message">敵を倒せなかった...</p>
          <p class="result-screen__message-sub">もう一度挑戦しますか？</p>
        </div>

        <!-- ボタン -->
        <div class="result-screen__buttons result-screen__buttons--defeat">
          <button class="result-screen__btn result-screen__btn--quest-retry ui-btn ui-btn--ribbon ui-btn--lg">
            リトライ
          </button>
          <button class="result-screen__btn result-screen__btn--quest-back ui-btn ui-btn--ribbon-secondary ui-btn--lg">
            クエスト選択に戻る
          </button>
        </div>
      </div>
    `;
  }

  protected setupEventHandlers(): void {
    // 次の節へボタン（勝利時・ストーリーモード）
    const nextSectionBtn = this.element?.querySelector('.result-screen__btn--next-section');
    if (nextSectionBtn) {
      nextSectionBtn.addEventListener('click', () => {
        this.goToNextSection();
      });
    }

    // ステージ選択ボタン（勝利時）
    const nextBtn = this.element?.querySelector('.result-screen__btn--next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.navigateTo('battlePrep');
      });
    }

    // リトライボタン（敗北時）
    const retryBtn = this.element?.querySelector('.result-screen__btn--retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.retryBattle();
      });
    }

    // 撤退ボタン（敗北時）
    const retreatBtn = this.element?.querySelector('.result-screen__btn--retreat');
    if (retreatBtn) {
      retreatBtn.addEventListener('click', () => {
        this.navigateTo('battlePrep');
      });
    }

    // クエストモード: リトライボタン
    const questRetryBtn = this.element?.querySelector('.result-screen__btn--quest-retry');
    if (questRetryBtn) {
      questRetryBtn.addEventListener('click', () => {
        this.retryQuestBattle();
      });
    }

    // クエストモード: クエスト選択に戻るボタン
    const questBackBtn = this.element?.querySelector('.result-screen__btn--quest-back');
    if (questBackBtn) {
      questBackBtn.addEventListener('click', () => {
        this.navigateTo('quest');
      });
    }

    // 戦利品パネルのクリック → 装備詳細モーダル
    const lootItems = this.element?.querySelectorAll<HTMLElement>('.result-screen__loot-item[data-equipment-id]');
    lootItems?.forEach((item) => {
      item.addEventListener('click', () => {
        const equipId = item.getAttribute('data-equipment-id');
        if (equipId) this.openEquipmentDetail(equipId);
      });
    });
  }

  /**
   * 次の節へ進む
   */
  private goToNextSection(): void {
    if (!this.resultData?.sectionId) {
      this.navigateTo('battlePrep');
      return;
    }

    const nextSection = getNextSection(this.resultData.sectionId);
    if (!nextSection) {
      // 章クリア時はステージ選択へ
      this.navigateTo('battlePrep');
      return;
    }

    // キャラクターを取得
    const character = this.resultData.characterId
      ? getCharacterById(this.resultData.characterId)
      : undefined;

    // 次の節のストーリーを表示
    this.navigateTo('story', {
      character,
      section: nextSection,
    });
  }

  /**
   * 同じ節をリトライ
   */
  private retryBattle(): void {
    if (!this.resultData?.sectionId) {
      // ストーリーモードでない場合は直接バトル
      this.startBattle({
        stageId: this.resultData?.stageId ?? 'stage1',
        characterId: this.resultData?.characterId ?? 'hero',
      });
      return;
    }

    // ストーリーモードの場合は同じ節のストーリーから再開
    const section = getSectionById(this.resultData.sectionId);
    if (!section) {
      this.navigateTo('battlePrep');
      return;
    }

    const character = this.resultData.characterId
      ? getCharacterById(this.resultData.characterId)
      : undefined;

    this.navigateTo('story', {
      character,
      section,
    });
  }

  /**
   * クエストモードのリトライ
   */
  private retryQuestBattle(): void {
    if (!this.resultData?.questId) return;

    const quest = getQuestById(this.resultData.questId);
    if (!quest) {
      this.navigateTo('quest');
      return;
    }

    const enemyConfig = getEnemyById(quest.enemyId);
    if (!enemyConfig) {
      this.navigateTo('quest');
      return;
    }

    this.startBattle({
      stageId: quest.id,
      characterId: this.resultData.characterId,
      enemyConfig,
      questId: quest.id,
      playerLevel: PlayerStatus.getInstance().getLevel(),
      expReward: quest.expReward,
    });
  }

  /**
   * 戦利品（ドロップアイテム）セクションのHTMLを生成
   */
  private createLootSection(): string {
    const droppedId = this.resultData?.droppedEquipmentId;

    // ドロップがない場合
    if (!droppedId) {
      return `
        <div class="result-screen__loot-empty">
          <p>戦利品なし</p>
        </div>
      `;
    }

    // ドロップした装備品を表示
    const equip = getEquipmentById(droppedId);
    if (!equip) {
      return `
        <div class="result-screen__loot-empty">
          <p>戦利品なし</p>
        </div>
      `;
    }

    const rotateStyle = equip.iconRotate ? ` style="transform: rotate(${equip.iconRotate}deg)"` : '';
    const rarityClass = `result-screen__loot-item--rarity-${equip.rarity}`;
    return `
      <div class="result-screen__loot-grid">
        <div class="result-screen__loot-item ${rarityClass}" data-equipment-id="${equip.id}" role="button" tabindex="0">
          <div class="result-screen__loot-icon">
            <span class="material-symbols-outlined"${rotateStyle}>${equip.icon}</span>
          </div>
          <div class="result-screen__loot-name">${equip.name}</div>
        </div>
      </div>
    `;
  }

  /**
   * 戦利品パネルクリック時の装備詳細モーダルを表示
   * EquipmentSelectModal の詳細パネルと同じ構造・スタイルを使用
   */
  private openEquipmentDetail(equipmentId: string): void {
    const equip = getEquipmentById(equipmentId);
    if (!equip) return;

    const rotateStyle = equip.iconRotate ? `transform: rotate(${equip.iconRotate}deg)` : '';
    const rarityLabels: Record<number, string> = { 1: '★ Common', 2: '★★ Rare', 3: '★★★ S-Rare' };
    const rarityLabel = rarityLabels[equip.rarity] || '';

    const modal = createModal({
      closable: false,
      className: 'result-screen__equip-modal',
    });

    // equip-modal.css の .equip-modal__detail 構造に合わせる
    modal.setContent(`
      <h2 class="equip-modal__title">装備詳細</h2>
      <div class="equip-modal__divider"></div>
      <div class="equip-modal__detail">
        <span class="equip-modal__detail-icon equip-icon--rarity-${equip.rarity} material-symbols-outlined" style="${rotateStyle}">${equip.icon}</span>
        <h3 class="equip-modal__detail-name">${equip.name}</h3>
        <span class="equip-modal__detail-rarity equip-rarity-badge equip-rarity-badge--${equip.rarity}">${rarityLabel}</span>
        <p class="equip-modal__detail-effect">${equip.description}</p>
      </div>
      <button class="equip-modal__close ui-btn ui-btn--ribbon-secondary">閉じる</button>
    `);

    const closeBtn = modal.getContentContainer().querySelector('.equip-modal__close');
    closeBtn?.addEventListener('click', () => modal.close());

    modal.open();
  }

  /**
   * 経験値報酬セクション（経験値テキスト + EXPバー）のHTMLを生成
   */
  private createExpRewardSection(): string {
    if (!this.expResult) return '';

    const progressPercent = Math.round(this.expResult.progress * 100);
    const expToNext = this.expResult.expToNext;
    const level = this.expResult.level;

    return `
      <div class="result-screen__exp-reward">
        <div class="result-screen__reward-item">
          <span class="result-screen__reward-icon">✦</span>
          <span>経験値: +${this.resultData?.expReward ?? 0}</span>
        </div>
        <div class="result-screen__exp-section">
          <div class="result-screen__exp-bar">
            <div class="result-screen__exp-bar-fill" style="width: 0%" data-target-width="${progressPercent}%"></div>
            <div class="result-screen__exp-bar-text">
              <span>Lv.${level}</span>
              <span>残りEXP: ${expToNext.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * レベルアップ演出オーバーレイのHTMLを生成
   */
  private createLevelUpOverlay(): string {
    if (!this.expResult?.leveledUp) return '';

    const oldLevel = this.expResult.level - this.expResult.levelsGained;
    const particleCount = 16;
    const particles = Array.from({ length: particleCount }, () => '<span></span>').join('');

    return `
      <div class="result-screen__levelup-overlay">
        <div class="result-screen__levelup-particles">${particles}</div>
        <div class="result-screen__levelup-burst"></div>
        <div class="result-screen__levelup-text">
          <div class="result-screen__levelup-label">LEVEL UP!</div>
          <div class="result-screen__levelup-levels">Lv.${oldLevel} → Lv.${this.expResult.level}</div>
          <div class="result-screen__levelup-hint">Tap to continue</div>
        </div>
      </div>
    `;
  }

  protected async onAfterShow(): Promise<void> {
    const overlay = this.element?.querySelector('.result-screen__levelup-overlay') as HTMLElement;
    const hasLevelUp = !!overlay;

    if (hasLevelUp) {
      // レベルアップ演出あり: オーバーレイ演出完了後にコンテンツを表示
      await this.playLevelUpAnimation(overlay);
    }

    // 表示アニメーション
    const content = this.element?.querySelector('.result-screen__content');
    if (content) {
      content.classList.add('animate-fade-in');
    }

    // タイトルフレームのアニメーション
    const titleFrame = this.element?.querySelector('.result-screen__title-frame');
    if (titleFrame) {
      titleFrame.classList.add('animate-slide-in-up');
    }

    // result BGMを1秒後に一度だけ再生（レベルアップ演出中はBGMが既に鳴っていないため演出後に再生）
    this.bgmTimer = window.setTimeout(() => {
      this.bgmTimer = null;
      SoundManager.getInstance().playBGMOnce(SoundKeys.RESULT_BGM);
    }, hasLevelUp ? 0 : 1000);

    // EXP進捗バーのアニメーション
    const expBarFill = this.element?.querySelector('.result-screen__exp-bar-fill') as HTMLElement;
    if (expBarFill) {
      const targetWidth = expBarFill.getAttribute('data-target-width') ?? '0%';
      requestAnimationFrame(() => {
        expBarFill.style.width = targetWidth;
      });
    }
  }

  /**
   * レベルアップオーバーレイ演出を再生し、完了を待つ
   */
  private playLevelUpAnimation(overlay: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      // 演出開始: CSSアニメーションは自動再生される
      // レベルアップSE再生
      SoundManager.getInstance().playSE(SoundKeys.LEVEL_UP);
      // クリック待ち: 演出が十分表示された後にクリックで消去可能にする
      let canDismiss = false;

      setTimeout(() => {
        canDismiss = true;
        // ヒントテキストを表示
        const hint = overlay.querySelector('.result-screen__levelup-hint') as HTMLElement;
        if (hint) {
          hint.classList.add('result-screen__levelup-hint--visible');
        }
      }, 2000);

      const dismiss = (): void => {
        if (!canDismiss) return;
        overlay.removeEventListener('click', dismiss);
        // darkenアニメーションのforwardsで保持されていたbackgroundを
        // インラインスタイルで固定し、animation上書き時に背景が消えるのを防止
        overlay.style.background = 'rgba(0, 0, 0, 0.85)';
        overlay.classList.add('result-screen__levelup-overlay--fade-out');

        // フェードアウト完了後（0.5秒）にオーバーレイを非表示
        setTimeout(() => {
          overlay.style.display = 'none';
          resolve();
        }, 500);
      };

      overlay.addEventListener('click', dismiss);
    });
  }

  protected async onBeforeHide(): Promise<void> {
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
