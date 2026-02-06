/**
 * PlayerPanel - 味方UIパネルのHTMLコンポーネント
 *
 * 機能:
 * - 縦長フレーム（PLAYERラベル、160x180px）
 * - HPバー（CSS transition でアニメーション）
 * - HPテキスト（"HP: XXX/YYY"）
 * - HP低下パルス（30%以下で点滅）
 * - 毒ステータス表示
 *
 * 通信:
 * - HP_UPDATE で {playerHp, playerMaxHp} を受信
 * - POISON_UPDATE で {isPoisoned} を受信
 * - SHOW_PLAYER_DAMAGE_POPUP で {damage} を受信
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';

export class PlayerPanel {
  private gameBridge: GameBridge;
  private container: HTMLElement;
  private panelRoot: HTMLElement | null = null;
  private barFill: HTMLElement | null = null;
  private hpText: HTMLElement | null = null;
  private poisonBadge: HTMLElement | null = null;

  private eventCleanups: Array<() => void> = [];

  constructor(container: HTMLElement, gameBridge: GameBridge) {
    this.gameBridge = gameBridge;
    this.container = container;
    this.setupEventListeners();
  }

  /**
   * 初期データで生成
   */
  public init(playerHp: number, playerMaxHp: number): void {
    this.container.innerHTML = '';
    this.panelRoot = this.createElement(playerHp, playerMaxHp);
    this.container.appendChild(this.panelRoot);
  }

  /**
   * DOM構造を生成
   */
  private createElement(hp: number, maxHp: number): HTMLElement {
    const root = document.createElement('div');
    root.className = 'player-panel';

    // PLAYERフレーム
    const frame = document.createElement('div');
    frame.className = 'player-panel__frame';

    const label = document.createElement('span');
    label.className = 'player-panel__label';
    label.textContent = 'PLAYER';
    frame.appendChild(label);

    root.appendChild(frame);

    // HPバー外枠
    const hpOuter = document.createElement('div');
    hpOuter.className = 'player-panel__hp-outer';

    const hpBg = document.createElement('div');
    hpBg.className = 'player-panel__hp-bg';

    this.barFill = document.createElement('div');
    this.barFill.className = 'player-panel__hp-fill';
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    this.barFill.style.width = `${ratio * 100}%`;
    if (ratio <= 0.3) {
      this.barFill.classList.add('player-panel__hp-fill--danger');
    }

    hpBg.appendChild(this.barFill);
    hpOuter.appendChild(hpBg);

    this.hpText = document.createElement('span');
    this.hpText.className = 'player-panel__hp-text';
    this.hpText.textContent = `HP: ${hp}/${maxHp}`;
    hpOuter.appendChild(this.hpText);

    root.appendChild(hpOuter);

    // 毒バッジ
    this.poisonBadge = document.createElement('span');
    this.poisonBadge.className = 'player-panel__poison';
    this.poisonBadge.textContent = '毒';
    root.appendChild(this.poisonBadge);

    return root;
  }

  /**
   * HPバーを更新
   */
  public update(hp: number, maxHp: number): void {
    if (!this.barFill || !this.hpText) return;

    const ratio = maxHp > 0 ? hp / maxHp : 0;
    this.barFill.style.width = `${ratio * 100}%`;
    this.hpText.textContent = `HP: ${hp}/${maxHp}`;

    if (ratio <= 0.3) {
      this.barFill.classList.add('player-panel__hp-fill--danger');
    } else {
      this.barFill.classList.remove('player-panel__hp-fill--danger');
    }
  }

  /**
   * 毒ステータスを更新
   */
  public updatePoison(isPoisoned: boolean): void {
    if (!this.poisonBadge) return;
    this.poisonBadge.classList.toggle('active', isPoisoned);
  }

  /**
   * ダメージポップアップを表示
   */
  public showDamagePopup(damage: number): void {
    if (!this.panelRoot) return;

    const el = document.createElement('div');
    el.className = 'player-panel__damage-popup';
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
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    const onHpUpdate = (data: { playerHp: number; playerMaxHp: number }) => {
      this.update(data.playerHp, data.playerMaxHp);
    };
    this.gameBridge.on(GameBridgeEvents.HP_UPDATE, onHpUpdate);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.HP_UPDATE, onHpUpdate));

    const onPoisonUpdate = (data: { isPoisoned: boolean }) => {
      this.updatePoison(data.isPoisoned);
    };
    this.gameBridge.on(GameBridgeEvents.POISON_UPDATE, onPoisonUpdate);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.POISON_UPDATE, onPoisonUpdate));

    const onDamagePopup = (data: { damage: number }) => {
      this.showDamagePopup(data.damage);
    };
    this.gameBridge.on(GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP, onDamagePopup);
    this.eventCleanups.push(() => this.gameBridge.off(GameBridgeEvents.SHOW_PLAYER_DAMAGE_POPUP, onDamagePopup));
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
    this.barFill = null;
    this.hpText = null;
    this.poisonBadge = null;
  }
}
