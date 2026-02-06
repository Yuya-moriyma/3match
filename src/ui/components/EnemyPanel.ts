/**
 * EnemyPanel - 敵UIエリアのHTMLコンポーネント
 *
 * 機能:
 * - 敵フレーム（羊皮紙風パネル + ENEMYラベル）
 * - 敵HPバー（CSS transition）
 * - 攻撃カウンター（丸型アイコン + 警告色）
 * - スキルカウンター（スキル持ちの敵のみ）
 * - カウンターホバーグロー
 * - カウンタークリック → ツールチップ表示
 * - 敵UIシェイク（CSSアニメーション）
 * - 凍結スタイル（金色化）
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';

interface EnemyPanelInitData {
  enemyHp: number;
  enemyMaxHp: number;
  enemyAttackCounter: number;
  enemySkillCounter: number;
  hasSkill: boolean;
}

export class EnemyPanel {
  private gameBridge: GameBridge;
  private container: HTMLElement;

  // DOM参照
  private panelRoot: HTMLElement | null = null;
  private hpBarFill: HTMLElement | null = null;
  private hpText: HTMLElement | null = null;
  private attackCounterText: HTMLElement | null = null;
  private attackCounterIcon: HTMLElement | null = null;
  private skillCounterText: HTMLElement | null = null;
  private skillCounterIcon: HTMLElement | null = null;

  private isFrozen = false;
  private eventCleanups: Array<() => void> = [];

  constructor(container: HTMLElement, gameBridge: GameBridge) {
    this.gameBridge = gameBridge;
    this.container = container;
    this.setupEventListeners();
  }

  /**
   * 初期データで生成
   */
  public init(data: EnemyPanelInitData): void {
    this.container.innerHTML = '';
    this.panelRoot = this.createElement(data);
    this.container.appendChild(this.panelRoot);
  }

  /**
   * DOM構造を生成
   */
  private createElement(data: EnemyPanelInitData): HTMLElement {
    const root = document.createElement('div');
    root.className = 'enemy-panel';

    // 敵フレーム
    const frame = document.createElement('div');
    frame.className = 'enemy-panel__frame';

    const label = document.createElement('span');
    label.className = 'enemy-panel__label';
    label.textContent = 'ENEMY';
    frame.appendChild(label);

    root.appendChild(frame);

    // カウンターアイコン行（フレームの下に配置）
    const counterRow = document.createElement('div');
    counterRow.className = 'enemy-panel__counter-row';

    // スキルカウンター（左）
    if (data.hasSkill) {
      this.skillCounterIcon = this.createCounterIcon('skill', 'skull', data.enemySkillCounter);
      counterRow.appendChild(this.skillCounterIcon);
    }

    // スペーサー
    const spacer = document.createElement('div');
    spacer.className = 'enemy-panel__counter-spacer';
    counterRow.appendChild(spacer);

    // 攻撃カウンター（右）
    this.attackCounterIcon = this.createCounterIcon('attack', 'swords', data.enemyAttackCounter);
    counterRow.appendChild(this.attackCounterIcon);

    root.appendChild(counterRow);

    // 敵HPバー
    const hpOuter = document.createElement('div');
    hpOuter.className = 'enemy-panel__hp-outer';

    const hpBg = document.createElement('div');
    hpBg.className = 'enemy-panel__hp-bg';

    this.hpBarFill = document.createElement('div');
    this.hpBarFill.className = 'enemy-panel__hp-fill';
    const ratio = data.enemyMaxHp > 0 ? data.enemyHp / data.enemyMaxHp : 0;
    this.hpBarFill.style.width = `${ratio * 100}%`;

    hpBg.appendChild(this.hpBarFill);
    hpOuter.appendChild(hpBg);

    this.hpText = document.createElement('span');
    this.hpText.className = 'enemy-panel__hp-text';
    this.hpText.textContent = `${data.enemyHp}/${data.enemyMaxHp}`;
    hpOuter.appendChild(this.hpText);

    root.appendChild(hpOuter);

    return root;
  }

  /**
   * 丸型カウンターアイコンを作成
   */
  private createCounterIcon(type: 'attack' | 'skill', symbol: string, count: number): HTMLElement {
    const icon = document.createElement('div');
    icon.className = `enemy-counter enemy-counter--${type}`;
    icon.setAttribute('data-type', type);

    const symbolEl = document.createElement('span');
    symbolEl.className = 'enemy-counter__symbol material-symbols-outlined';
    symbolEl.textContent = symbol;
    icon.appendChild(symbolEl);

    const countEl = document.createElement('span');
    countEl.className = 'enemy-counter__count';
    countEl.textContent = `${count}`;
    icon.appendChild(countEl);

    if (type === 'attack') {
      this.attackCounterText = countEl;
    } else {
      this.skillCounterText = countEl;
    }

    // 警告状態を初期設定
    this.applyCounterWarning(icon, count);

    // クリック → ツールチップ
    icon.addEventListener('pointerdown', () => {
      this.gameBridge.emit(GameBridgeEvents.SHOW_TOOLTIP, { type });
    });

    return icon;
  }

  /**
   * カウンター警告状態を適用
   */
  private applyCounterWarning(icon: HTMLElement, count: number): void {
    icon.classList.remove('enemy-counter--danger', 'enemy-counter--warning');
    if (this.isFrozen) return;

    if (count === 1) {
      icon.classList.add('enemy-counter--danger');
    } else if (count === 2) {
      icon.classList.add('enemy-counter--warning');
    }
  }

  /**
   * HPバーを更新
   */
  public updateHp(hp: number, maxHp: number): void {
    if (!this.hpBarFill || !this.hpText) return;
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    this.hpBarFill.style.width = `${ratio * 100}%`;
    this.hpText.textContent = `${hp}/${maxHp}`;
  }

  /**
   * カウンターを更新
   */
  public updateCounters(attackCounter: number, skillCounter?: number): void {
    if (this.attackCounterText && this.attackCounterIcon) {
      this.attackCounterText.textContent = `${attackCounter}`;
      this.applyCounterWarning(this.attackCounterIcon, attackCounter);
    }
    if (this.skillCounterText && this.skillCounterIcon && skillCounter !== undefined) {
      this.skillCounterText.textContent = `${skillCounter}`;
      this.applyCounterWarning(this.skillCounterIcon, skillCounter);
    }
  }

  /**
   * 凍結スタイルを適用/解除
   */
  public setFrozenStyle(frozen: boolean): void {
    this.isFrozen = frozen;
    if (this.attackCounterIcon) {
      this.attackCounterIcon.classList.toggle('enemy-counter--frozen', frozen);
      if (!frozen) {
        // 凍結解除時に警告状態を再評価
        const count = parseInt(this.attackCounterText?.textContent || '0', 10);
        this.applyCounterWarning(this.attackCounterIcon, count);
      }
    }
    if (this.skillCounterIcon) {
      this.skillCounterIcon.classList.toggle('enemy-counter--frozen', frozen);
      if (!frozen) {
        const count = parseInt(this.skillCounterText?.textContent || '0', 10);
        this.applyCounterWarning(this.skillCounterIcon, count);
      }
    }
  }

  /**
   * シェイクアニメーション発火
   */
  public shake(): void {
    if (!this.panelRoot) return;
    this.panelRoot.classList.remove('enemy-panel--shaking');
    void this.panelRoot.offsetWidth;
    this.panelRoot.classList.add('enemy-panel--shaking');
    this.panelRoot.addEventListener('animationend', () => {
      this.panelRoot?.classList.remove('enemy-panel--shaking');
    }, { once: true });
  }

  /**
   * ダメージポップアップを表示
   */
  public showDamagePopup(damage: number): void {
    if (!this.panelRoot) return;

    const el = document.createElement('div');
    el.className = 'enemy-panel__damage-popup';
    el.textContent = `-${damage}`;

    // ランダムなオフセット（HPバー上部付近に表示）
    const offsetX = Math.floor(Math.random() * 40) - 20;
    const offsetY = Math.floor(Math.random() * 20) - 10;
    el.style.left = `calc(50% + ${offsetX}px)`;
    el.style.top = `${160 + offsetY}px`;

    this.panelRoot.appendChild(el);

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      el.remove();
    };
    el.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 1200);
  }

  /**
   * 敵消滅アニメーション
   */
  public playDeathAnimation(): void {
    if (!this.panelRoot) return;
    this.panelRoot.classList.add('enemy-panel--dying');

    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      this.gameBridge.emit(GameBridgeEvents.ENEMY_DEATH_COMPLETE);
    };

    this.panelRoot.addEventListener('animationend', complete, { once: true });
    // フォールバック: アニメーション時間(750ms) + マージン(250ms)
    setTimeout(complete, 1000);
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    const onHpUpdate = (data: { enemyHp: number; enemyMaxHp: number }) => {
      this.updateHp(data.enemyHp, data.enemyMaxHp);
    };
    this.gameBridge.on(GameBridgeEvents.HP_UPDATE, onHpUpdate);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.HP_UPDATE, onHpUpdate));

    const onCounterUpdate = (data: { attackCounter: number; skillCounter?: number }) => {
      this.updateCounters(data.attackCounter, data.skillCounter);
    };
    this.gameBridge.on(GameBridgeEvents.COUNTER_UPDATE, onCounterUpdate);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.COUNTER_UPDATE, onCounterUpdate));

    const onCounterFrozen = (data: { frozen: boolean }) => {
      this.setFrozenStyle(data.frozen);
    };
    this.gameBridge.on(GameBridgeEvents.COUNTER_FROZEN, onCounterFrozen);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.COUNTER_FROZEN, onCounterFrozen));

    const onShake = () => {
      this.shake();
    };
    this.gameBridge.on(GameBridgeEvents.ENEMY_SHAKE, onShake);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.ENEMY_SHAKE, onShake));

    const onDamagePopup = (data: { damage: number }) => {
      this.showDamagePopup(data.damage);
    };
    this.gameBridge.on(GameBridgeEvents.SHOW_DAMAGE_POPUP, onDamagePopup);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.SHOW_DAMAGE_POPUP, onDamagePopup));

    const onEnemyDeath = () => {
      this.playDeathAnimation();
    };
    this.gameBridge.on(GameBridgeEvents.ENEMY_DEATH, onEnemyDeath);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.ENEMY_DEATH, onEnemyDeath));
  }

  /**
   * リソースを解放
   */
  public destroy(): void {
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];
    this.container.innerHTML = '';
    this.panelRoot = null;
    this.hpBarFill = null;
    this.hpText = null;
    this.attackCounterText = null;
    this.attackCounterIcon = null;
    this.skillCounterText = null;
    this.skillCounterIcon = null;
  }
}
