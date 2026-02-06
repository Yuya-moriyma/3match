/**
 * BattleTooltip - 敵情報ツールチップのHTMLコンポーネント
 *
 * Phase 2: Phaser側のpointerdownイベントからSHOW_TOOLTIPで発火。
 * Phase 4以降: HTML化された敵カウンターとのDOM連携に切り替え。
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';
import { EnemySkillDef, EnemySkillEffectType } from '../../types';

export interface EnemyInfoForTooltip {
  normalAttack: number;
  attackInterval: number;
  skillDef?: EnemySkillDef;
}

interface TooltipShowData {
  type: 'attack' | 'skill';
}

export class BattleTooltip {
  private gameBridge: GameBridge;
  private overlayContainer: HTMLElement;
  private enemyInfo: EnemyInfoForTooltip | null = null;
  private activeType: 'attack' | 'skill' | null = null;
  private enemyCounterFrozen = false;
  private enemyCounterFreezeRemaining = 0;

  // イベントクリーンアップ
  private eventCleanups: Array<() => void> = [];

  constructor(overlayContainer: HTMLElement, gameBridge: GameBridge) {
    this.gameBridge = gameBridge;
    this.overlayContainer = overlayContainer;
    this.setupEventListeners();
  }

  /**
   * 敵情報を設定
   */
  public setEnemyInfo(info: EnemyInfoForTooltip): void {
    this.enemyInfo = info;
  }

  /**
   * カウンター停止情報を更新
   */
  public setFreezeInfo(frozen: boolean, remainingTurns: number): void {
    this.enemyCounterFrozen = frozen;
    this.enemyCounterFreezeRemaining = remainingTurns;
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    const onShow = (data: TooltipShowData) => {
      this.toggle(data.type);
    };
    this.gameBridge.on(GameBridgeEvents.SHOW_TOOLTIP, onShow);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.SHOW_TOOLTIP, onShow));

    const onHide = () => {
      this.hide();
    };
    this.gameBridge.on(GameBridgeEvents.HIDE_TOOLTIP, onHide);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.HIDE_TOOLTIP, onHide));
  }

  /**
   * ツールチップの表示/非表示をトグル
   */
  public toggle(type: 'attack' | 'skill'): void {
    if (this.activeType === type) {
      this.hide();
      return;
    }

    this.hide();
    this.show(type);
  }

  /**
   * ツールチップを表示
   */
  private show(type: 'attack' | 'skill'): void {
    if (!this.enemyInfo) return;

    const data = this.buildTooltipData(type);
    if (!data) return;

    this.activeType = type;
    this.overlayContainer.innerHTML = '';

    // クリックで閉じるための透明背景
    const backdrop = document.createElement('div');
    backdrop.className = 'battle-tooltip__backdrop';
    backdrop.addEventListener('pointerdown', () => this.hide());
    this.overlayContainer.appendChild(backdrop);

    // ツールチップパネル
    const panel = document.createElement('div');
    const typeClass = type === 'attack' ? 'battle-tooltip__panel--attack' : 'battle-tooltip__panel--skill';
    panel.className = `battle-tooltip__panel ${typeClass}`;

    // 敵UIと味方UIの中間に配置
    const root = this.overlayContainer.closest('#battle-hud-root');
    const enemyArea = root?.querySelector('.battle-hud__enemy-area');
    const playerArea = root?.querySelector('.battle-hud__player-area');

    if (root && enemyArea && playerArea) {
      const rootRect = root.getBoundingClientRect();
      const enemyRect = enemyArea.getBoundingClientRect();
      const playerRect = playerArea.getBoundingClientRect();

      const centerX = (enemyRect.right + playerRect.left) / 2 - rootRect.left;
      const centerY = (enemyRect.top + enemyRect.bottom) / 2 - rootRect.top;

      panel.style.position = 'absolute';
      panel.style.top = `${centerY}px`;
      panel.style.left = `${centerX}px`;
      panel.style.transform = 'translate(-50%, -50%)';
    }

    // タイトル
    const title = document.createElement('div');
    title.className = 'battle-tooltip__title';
    title.textContent = data.title;
    panel.appendChild(title);

    // 区切り線
    const separator = document.createElement('hr');
    separator.className = 'battle-tooltip__separator';
    panel.appendChild(separator);

    // 本文
    const body = document.createElement('div');
    body.className = 'battle-tooltip__body';
    body.textContent = data.body;
    panel.appendChild(body);

    this.overlayContainer.appendChild(panel);
    this.overlayContainer.classList.add('active');
  }

  /**
   * ツールチップを非表示
   */
  public hide(): void {
    this.overlayContainer.classList.remove('active');
    this.overlayContainer.innerHTML = '';
    this.activeType = null;
  }

  /**
   * ツールチップ表示データを構築
   */
  private buildTooltipData(type: 'attack' | 'skill'): { title: string; body: string } | null {
    if (!this.enemyInfo) return null;

    const freezeSuffix = this.enemyCounterFrozen
      ? `\nカウント停止中：あと${this.enemyCounterFreezeRemaining}ターン`
      : '';

    if (type === 'attack') {
      return {
        title: '通常攻撃',
        body: `ダメージ: ${this.enemyInfo.normalAttack}\n${this.enemyInfo.attackInterval}ターンごとに攻撃${freezeSuffix}`,
      };
    }

    const skillDef = this.enemyInfo.skillDef;
    if (!skillDef) return null;

    const description = this.getSkillEffectDescription(skillDef);
    return {
      title: skillDef.name,
      body: `${description}${freezeSuffix}`,
    };
  }

  /**
   * スキル効果の日本語説明を生成
   */
  private getSkillEffectDescription(skillDef: EnemySkillDef): string {
    const p = skillDef.params;

    const descriptionMap: Record<EnemySkillEffectType, () => string> = {
      [EnemySkillEffectType.HEAVY_ATTACK]: () =>
        `強力な攻撃（通常の${p.multiplier ?? '?'}倍ダメージ）`,
      [EnemySkillEffectType.BOARD_SHUFFLE]: () => '盤面のオーブをランダムに並び替える',
      [EnemySkillEffectType.TILE_LOCK]: () =>
        `${p.count ?? '?'}個のオーブを${p.duration ?? '?'}操作の間ロックする`,
      [EnemySkillEffectType.POISON]: () =>
        `${p.duration ?? '?'}ターンの間、毎操作${p.damagePerTurn ?? '?'}ダメージ`,
      [EnemySkillEffectType.OJAMA_CONVERT]: () =>
        `${p.ojamaCount ?? '?'}個のオーブをお邪魔オーブに変換する`,
      [EnemySkillEffectType.FREEZE]: () =>
        `${p.freezeCount ?? '?'}個のオーブを氷漬けにする（入れ替え不可）`,
      [EnemySkillEffectType.POISON_CONVERT]: () =>
        `${p.poisonCount ?? '?'}個のオーブを毒オーブに変換する`,
    };

    return descriptionMap[skillDef.effectType]();
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    this.hide();
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];
  }
}
