/**
 * ActionCountPanel - アクションカウント表示のHTMLコンポーネント
 *
 * 3分割パネル: 攻撃(⚔) | スキル(★) | 回復(♥)
 * 各セクション: アイコン + 発動回数 + 詳細テキスト
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';

interface ActionDisplay {
  triggers: number;
  remainder: number;
  threshold: number;
}

interface AnimateData {
  type: 'attack' | 'skill' | 'heal';
  fromValue: number;
  toValue: number;
  threshold: number;
  intervalMs: number;
}

export class ActionCountPanel {
  private gameBridge: GameBridge;
  private container: HTMLElement;

  // DOM参照
  private sections: Record<'attack' | 'skill' | 'heal', {
    triggersEl: HTMLElement | null;
    detailEl: HTMLElement | null;
    sectionEl: HTMLElement | null;
  }> = {
    attack: { triggersEl: null, detailEl: null, sectionEl: null },
    skill: { triggersEl: null, detailEl: null, sectionEl: null },
    heal: { triggersEl: null, detailEl: null, sectionEl: null },
  };

  // アニメーション用タイマーID
  private animationTimers: number[] = [];

  private eventCleanups: Array<() => void> = [];

  constructor(container: HTMLElement, gameBridge: GameBridge) {
    this.gameBridge = gameBridge;
    this.container = container;
    this.setupEventListeners();
  }

  /**
   * 初期表示を生成
   */
  public init(): void {
    this.container.innerHTML = '';
    this.container.appendChild(this.createElement());
  }

  /**
   * DOM構造を生成
   */
  private createElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'action-count';

    panel.appendChild(this.createSection('attack', 'swords', '0', '/0/10'));
    panel.appendChild(this.createSection('skill', 'star', '0', '/0/10'));
    panel.appendChild(this.createSection('heal', 'favorite', '0', '/0/10'));

    return panel;
  }

  /**
   * セクションを作成
   */
  private createSection(
    type: 'attack' | 'skill' | 'heal',
    icon: string,
    triggers: string,
    detail: string
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = `action-count__section action-count__section--${type}`;

    const iconEl = document.createElement('span');
    iconEl.className = 'action-count__icon material-symbols-outlined';
    iconEl.textContent = icon;
    section.appendChild(iconEl);

    const triggersEl = document.createElement('span');
    triggersEl.className = 'action-count__triggers';
    triggersEl.textContent = triggers;
    section.appendChild(triggersEl);

    const detailEl = document.createElement('span');
    detailEl.className = 'action-count__detail';
    detailEl.textContent = detail;
    section.appendChild(detailEl);

    this.sections[type] = { triggersEl, detailEl, sectionEl: section };

    return section;
  }

  /**
   * アクションカウントを更新
   */
  public update(attack: ActionDisplay, skill: ActionDisplay, heal: ActionDisplay): void {
    this.updateSection('attack', attack);
    this.updateSection('skill', skill);
    this.updateSection('heal', heal);
  }

  /**
   * 個別セクションを更新
   */
  private updateSection(type: 'attack' | 'skill' | 'heal', data: ActionDisplay): void {
    const { triggersEl, detailEl, sectionEl } = this.sections[type];
    if (!triggersEl || !detailEl || !sectionEl) return;

    triggersEl.textContent = `${data.triggers}`;
    detailEl.textContent = `/${data.remainder}/${data.threshold}`;

    // ハイライト（端数が閾値の70%以上）
    const highlight = data.remainder >= Math.floor(data.threshold * 0.7);
    sectionEl.classList.toggle('action-count__section--highlight', highlight);
  }

  /**
   * カウントアップアニメーション
   * 段階的にカウントを増やし、各ステップでテキストを更新 + パルス演出
   */
  private animateCountUp(data: AnimateData): void {
    const { type, fromValue, toValue, threshold, intervalMs } = data;
    const { triggersEl, detailEl, sectionEl } = this.sections[type];
    if (!triggersEl || !detailEl || !sectionEl) return;

    let index = 0;
    const sequence: number[] = [];
    for (let i = fromValue; i <= toValue; i++) {
      sequence.push(i);
    }

    const animateStep = () => {
      const currentValue = sequence[index];
      const triggers = Math.floor(currentValue / threshold);
      const remainder = currentValue % threshold;

      triggersEl.textContent = `${triggers}`;
      detailEl.textContent = `/${remainder}/${threshold}`;

      const highlight = remainder >= Math.floor(threshold * 0.7);
      sectionEl.classList.toggle('action-count__section--highlight', highlight);

      // パルスアニメーション（CSSクラス切り替え）
      triggersEl.classList.remove('action-count__triggers--pulse');
      // offsetWidth で reflow を強制し、クラス再付与でアニメーションを再トリガー
      void triggersEl.offsetWidth;
      triggersEl.classList.add('action-count__triggers--pulse');

      index++;
      if (index < sequence.length) {
        const timerId = window.setTimeout(animateStep, intervalMs);
        this.animationTimers.push(timerId);
      }
    };

    animateStep();
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    const onUpdate = (data: { attack: ActionDisplay; skill: ActionDisplay; heal: ActionDisplay }) => {
      this.update(data.attack, data.skill, data.heal);
    };
    this.gameBridge.on(GameBridgeEvents.ACTION_COUNT_UPDATE, onUpdate);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.ACTION_COUNT_UPDATE, onUpdate));

    const onAnimate = (data: AnimateData) => {
      this.animateCountUp(data);
    };
    this.gameBridge.on(GameBridgeEvents.ACTION_COUNT_ANIMATE, onAnimate);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.ACTION_COUNT_ANIMATE, onAnimate));
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    // アニメーションタイマーをクリア
    for (const timerId of this.animationTimers) {
      window.clearTimeout(timerId);
    }
    this.animationTimers = [];

    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];
    this.container.innerHTML = '';
  }
}
