/**
 * BattleTextOverlay - 盤面外テキスト演出（スキル発動名、敵スキル名、対象なし）
 *
 * GameBridgeイベントを自前でリスニングし、
 * CSS animationでテキスト演出を行う。
 */

import { GameBridge, GameBridgeEvents } from '../GameBridge';
import { EnemySkillEffectType } from '../../types';

/** SHOW_SKILL_TEXT イベントデータ */
interface SkillTextData {
  name: string;
  color: string; // hex color e.g. '#ff4444'
  isEnemy: boolean;
  effectType?: EnemySkillEffectType;
}

/** SHOW_ACTION_TEXT イベントデータ */
interface ActionTextData {
  text: string;
  color: string; // hex color e.g. '#ff4444'
}

/** SHOW_CHAIN_TEXT イベントデータ */
interface ChainTextData {
  chainNumber: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

export class BattleTextOverlay {
  private gameBridge: GameBridge;
  private container: HTMLElement;
  private eventCleanups: Array<() => void> = [];

  constructor(container: HTMLElement, gameBridge: GameBridge) {
    this.container = container;
    this.gameBridge = gameBridge;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.listen(GameBridgeEvents.SHOW_SKILL_TEXT, (data: SkillTextData) => {
      if (data.isEnemy) {
        this.showEnemySkillText(data.name, data.color);
      } else {
        this.showSkillActivationText(data.name, data.color);
      }
    });

    this.listen(GameBridgeEvents.SHOW_NO_TARGET, () => {
      this.showNoTargetText();
    });

    this.listen(GameBridgeEvents.SHOW_ACTION_TEXT, (data: ActionTextData) => {
      this.showActionEffectText(data.text, data.color);
    });

    this.listen(GameBridgeEvents.SHOW_CHAIN_TEXT, (data: ChainTextData) => {
      this.showChainText(data.chainNumber);
    });
  }

  /**
   * 味方スキル発動テキスト: スケールイン → 表示維持 → フェードアウト
   */
  private showSkillActivationText(name: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'text-overlay__skill-activation';
    el.textContent = name;
    el.style.color = color;

    // グロー効果の色もスキル色に合わせる
    el.style.setProperty('--skill-glow-color', color);

    this.container.appendChild(el);

    // CSSアニメーション完了時にDOM削除 + 完了通知
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      el.remove();
      this.gameBridge.emit(GameBridgeEvents.SKILL_TEXT_COMPLETE);
    };

    el.addEventListener('animationend', complete, { once: true });

    // フォールバック: アニメーション時間(1300ms) + マージン(200ms)
    setTimeout(complete, 1500);
  }

  /**
   * 敵スキル発動テキスト: フロート表示 → フェードアウト
   */
  private showEnemySkillText(name: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'text-overlay__enemy-skill';
    el.textContent = name;
    el.style.color = color;

    this.container.appendChild(el);

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
   * "対象なし" テキスト: フェードイン → 表示維持 → フェードアウト
   */
  private showNoTargetText(): void {
    const el = document.createElement('div');
    el.className = 'text-overlay__no-target';
    el.textContent = '対象なし';

    this.container.appendChild(el);

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      el.remove();
    };

    el.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 1300);
  }

  /**
   * アクション効果テキスト（"ATTACK!" / "HEAL!"）: スケールイン → バウンス → フェードアウト
   */
  private showActionEffectText(text: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'text-overlay__action-effect';
    el.textContent = text;
    el.style.color = color;

    this.container.appendChild(el);

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
   * チェインテキスト（"CHAIN xN"）: スケールイン → バウンス → フェードアウト
   */
  private showChainText(chainNumber: number): void {
    const el = document.createElement('div');
    el.className = 'text-overlay__chain';
    el.textContent = `CHAIN x${chainNumber}`;

    this.container.appendChild(el);

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      el.remove();
    };

    el.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 1300);
  }

  private listen(event: string, callback: EventCallback): void {
    this.gameBridge.on(event, callback);
    this.eventCleanups.push(() => this.gameBridge.off(event, callback));
  }

  public destroy(): void {
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];
    this.container.innerHTML = '';
  }
}
