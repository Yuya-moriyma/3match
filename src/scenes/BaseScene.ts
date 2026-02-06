import Phaser from 'phaser';
import { THEME } from '../theme';

/**
 * 全シーンの基底クラス
 * shutdownイベント時のクリーンアップ処理を共通化
 * Classic Parchment テーマのヘルパーメソッドを提供
 */
export class BaseScene extends Phaser.Scene {
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  /**
   * create時にshutdownイベントリスナーを登録
   * サブクラスは必ずsuper.create()を呼び出すこと
   */
  create(): void {
    // シーン離脱時に一度だけクリーンアップを実行
    this.events.once('shutdown', () => {
      this.onShutdown();
    });
  }

  /**
   * shutdown時に呼ばれる内部メソッド
   * 共通クリーンアップ処理を実行後、cleanup()を呼び出す
   */
  private onShutdown(): void {
    // 全tweenを停止
    this.tweens.killAll();

    // タイマーイベントを全て削除
    this.time.removeAllEvents();

    // サブクラス固有のクリーンアップを実行
    this.cleanup();
  }

  /**
   * サブクラスでオーバーライド可能なクリーンアップメソッド
   * シーン固有のリソース解放処理を実装する
   */
  protected cleanup(): void {
    // 基底クラスでは何もしない
    // サブクラスで必要に応じてオーバーライド
  }

  // =====================================================
  // Classic Parchment テーマ ヘルパーメソッド
  // =====================================================

  /**
   * 羊皮紙風グラデーション背景を描画
   */
  protected drawParchmentBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const graphics = this.add.graphics();

    // グラデーション背景
    const gradientSteps = 20;
    const stepHeight = height / gradientSteps;

    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      // 上から下へのグラデーション
      const topR = (THEME.backgroundGradientTop >> 16) & 0xff;
      const topG = (THEME.backgroundGradientTop >> 8) & 0xff;
      const topB = THEME.backgroundGradientTop & 0xff;
      const bottomR = (THEME.backgroundGradientBottom >> 16) & 0xff;
      const bottomG = (THEME.backgroundGradientBottom >> 8) & 0xff;
      const bottomB = THEME.backgroundGradientBottom & 0xff;

      const r = Math.floor(topR + (bottomR - topR) * ratio);
      const g = Math.floor(topG + (bottomG - topG) * ratio);
      const b = Math.floor(topB + (bottomB - topB) * ratio);
      const color = (r << 16) | (g << 8) | b;

      graphics.fillStyle(color, 1);
      graphics.fillRect(0, i * stepHeight, width, stepHeight + 1);
    }

    // 装飾的なパーティクル（星のような輝き）
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const alpha = Phaser.Math.FloatBetween(0.05, 0.15);
      const size = Phaser.Math.Between(1, 2);
      graphics.fillStyle(THEME.parchmentLight, alpha);
      graphics.fillCircle(x, y, size);
    }
  }

  /**
   * 装飾的なタイトルフレームを描画
   */
  protected drawOrnamentFrame(x: number, y: number, w: number, h: number): void {
    const graphics = this.add.graphics();

    // 外枠の装飾線
    graphics.lineStyle(2, THEME.accentLight, 1);
    graphics.strokeRect(x - w / 2, y - h / 2, w, h);

    // 角の装飾
    const cornerSize = 12;
    const corners = [
      { x: x - w / 2, y: y - h / 2 },
      { x: x + w / 2, y: y - h / 2 },
      { x: x - w / 2, y: y + h / 2 },
      { x: x + w / 2, y: y + h / 2 },
    ];

    corners.forEach(corner => {
      graphics.fillStyle(THEME.accentLight, 1);
      graphics.fillCircle(corner.x, corner.y, cornerSize / 2);
    });
  }

  /**
   * 装飾的な線（両端に丸い装飾）を描画
   */
  protected drawDecorativeLine(x: number, y: number, width: number): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, THEME.accent, 1);
    graphics.lineBetween(x, y, x + width, y);

    // 端の装飾
    graphics.fillStyle(THEME.accent, 1);
    graphics.fillCircle(x, y, 4);
    graphics.fillCircle(x + width, y, 4);
    graphics.fillCircle(x + width / 2, y, 3);

    return graphics;
  }

  /**
   * 巻物風のボタンを作成
   */
  protected createScrollButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width: number = 280
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const halfWidth = width / 2;

    // 巻物の両端
    const scrollEndL = this.add.circle(-halfWidth, 0, 25, THEME.accent);
    scrollEndL.setStrokeStyle(2, THEME.accentDark);
    container.add(scrollEndL);

    const scrollEndR = this.add.circle(halfWidth, 0, 25, THEME.accent);
    scrollEndR.setStrokeStyle(2, THEME.accentDark);
    container.add(scrollEndR);

    // 巻物本体
    const scrollBody = this.add.rectangle(0, 0, width, 40, THEME.parchment);
    scrollBody.setStrokeStyle(2, THEME.accentLight);
    scrollBody.setInteractive({ useHandCursor: true });
    container.add(scrollBody);

    // ラベル
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Kaisei Opti, sans-serif',
      fontSize: '22px',
      color: THEME.textPrimary,
      fontStyle: 'bold',
      padding: { top: 4, bottom: 2, left: 0, right: 0 },
    }).setOrigin(0.5, 0.5);
    container.add(text);

    // ホバーエフェクト
    scrollBody.on('pointerover', () => {
      scrollBody.setFillStyle(THEME.parchmentDark);
    });

    scrollBody.on('pointerout', () => {
      scrollBody.setFillStyle(THEME.parchment);
    });

    scrollBody.on('pointerdown', onClick);

    return container;
  }

  /**
   * 羊皮紙風パネルを作成
   */
  protected createParchmentPanel(
    x: number,
    y: number,
    w: number,
    h: number,
    options?: { interactive?: boolean }
  ): { outer: Phaser.GameObjects.Rectangle; inner: Phaser.GameObjects.Rectangle } {
    // 外枠
    const outer = this.add.rectangle(x, y, w + 20, h + 20, THEME.border);
    outer.setStrokeStyle(3, THEME.accentDark);

    // 内側の羊皮紙
    const inner = this.add.rectangle(x, y, w, h, THEME.parchment);
    inner.setStrokeStyle(2, THEME.parchmentDark);

    if (options?.interactive) {
      inner.setInteractive({ useHandCursor: true });
    }

    // 羊皮紙の質感を出すための内側の影
    this.add.rectangle(x + 3, y + 3, w - 4, h - 4, THEME.parchmentDark, 0.3);

    return { outer, inner };
  }

  /**
   * テーマに合ったテキストスタイルを取得
   * 日本語フォントの上部見切れ防止のため padding を設定
   */
  protected getTextStyle(type: 'title' | 'subtitle' | 'body' | 'accent' | 'light' = 'body'): Phaser.Types.GameObjects.Text.TextStyle {
    const baseStyle = {
      fontFamily: 'Kaisei Opti, sans-serif',
      padding: { top: 4, bottom: 2, left: 0, right: 0 },
    };

    switch (type) {
      case 'title':
        return {
          ...baseStyle,
          fontSize: '36px',
          color: THEME.textLight,
          fontStyle: 'bold',
        };
      case 'subtitle':
        return {
          ...baseStyle,
          fontSize: '24px',
          color: THEME.textAccent,
          fontStyle: 'italic',
        };
      case 'accent':
        return {
          ...baseStyle,
          fontSize: '28px',
          color: THEME.textAccent,
          fontStyle: 'bold',
        };
      case 'light':
        return {
          ...baseStyle,
          fontSize: '20px',
          color: THEME.textLight,
        };
      case 'body':
      default:
        return {
          ...baseStyle,
          fontSize: '20px',
          color: THEME.textPrimary,
        };
    }
  }

  /**
   * ファンタジー風ボタンを作成（パネル風）
   */
  protected createFantasyButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick: () => void,
    isDanger: boolean = false
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bgColor = isDanger ? 0x5c2020 : THEME.border;
    const borderColor = isDanger ? THEME.danger : THEME.accent;
    const textColor = isDanger ? '#d88080' : THEME.textAccent;

    const graphics = this.add.graphics();

    // ボタン背景
    graphics.fillStyle(bgColor, 1);
    graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

    // ボーダー
    graphics.lineStyle(2, borderColor, 1);
    graphics.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    container.add(graphics);

    // ラベル
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Kaisei Opti, sans-serif',
      fontSize: '18px',
      color: textColor,
      fontStyle: 'bold',
      padding: { top: 4, bottom: 2, left: 0, right: 0 },
    }).setOrigin(0.5, 0.5);
    container.add(text);

    // インタラクティブ領域
    const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => {
      graphics.clear();
      graphics.fillStyle(isDanger ? 0x7a3030 : THEME.accent, 1);
      graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      graphics.lineStyle(2, isDanger ? 0xc06060 : THEME.accentLight, 1);
      graphics.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    });
    hitArea.on('pointerout', () => {
      graphics.clear();
      graphics.fillStyle(bgColor, 1);
      graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      graphics.lineStyle(2, borderColor, 1);
      graphics.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    });
    container.add(hitArea);

    return container;
  }
}
