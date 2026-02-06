/**
 * Decorations - 装飾要素コンポーネント
 *
 * フレーム、区切り線、オーナメントなど
 */

/**
 * 装飾付きフレームを作成
 */
export function createDecorativeFrame(content?: HTMLElement | string): HTMLDivElement {
  const frame = document.createElement('div');
  frame.className = 'ui-decorative-frame';

  // コーナー装飾
  frame.innerHTML = `
    <div class="ui-decorative-frame__corner ui-decorative-frame__corner--tl"></div>
    <div class="ui-decorative-frame__corner ui-decorative-frame__corner--tr"></div>
    <div class="ui-decorative-frame__corner ui-decorative-frame__corner--bl"></div>
    <div class="ui-decorative-frame__corner ui-decorative-frame__corner--br"></div>
    <div class="ui-decorative-frame__content"></div>
  `;

  const contentContainer = frame.querySelector('.ui-decorative-frame__content') as HTMLDivElement;

  if (content) {
    if (typeof content === 'string') {
      contentContainer.innerHTML = content;
    } else {
      contentContainer.appendChild(content);
    }
  }

  return frame;
}

/**
 * 装飾付き区切り線を作成
 */
export function createOrnateDivider(ornament?: string): HTMLDivElement {
  const divider = document.createElement('div');
  divider.className = 'ui-ornate-divider';

  if (ornament) {
    divider.innerHTML = `
      <span class="ui-ornate-divider__line"></span>
      <span class="ui-ornate-divider__ornament">${ornament}</span>
      <span class="ui-ornate-divider__line"></span>
    `;
  } else {
    divider.innerHTML = `
      <span class="ui-ornate-divider__line"></span>
      <span class="ui-ornate-divider__symbol">&#10022;</span>
      <span class="ui-ornate-divider__line"></span>
    `;
  }

  return divider;
}

/**
 * シンプルな区切り線を作成
 */
export function createSimpleDivider(): HTMLHRElement {
  const hr = document.createElement('hr');
  hr.className = 'ui-simple-divider';
  return hr;
}

/**
 * タイトルバナーを作成
 */
export function createTitleBanner(
  title: string,
  subtitle?: string
): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = 'ui-title-banner';

  let html = `<h1 class="ui-title-banner__title">${title}</h1>`;

  if (subtitle) {
    html += `<p class="ui-title-banner__subtitle">${subtitle}</p>`;
  }

  banner.innerHTML = html;

  return banner;
}

/**
 * スクロール風コンテナを作成
 */
export function createScrollContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'ui-scroll-container';

  container.innerHTML = `
    <div class="ui-scroll-container__top"></div>
    <div class="ui-scroll-container__content"></div>
    <div class="ui-scroll-container__bottom"></div>
  `;

  return container;
}

/**
 * スクロール風コンテナのコンテンツ領域を取得
 */
export function getScrollContainerContent(container: HTMLDivElement): HTMLDivElement {
  return container.querySelector('.ui-scroll-container__content') as HTMLDivElement;
}

/**
 * アイコンバッジを作成
 */
export function createIconBadge(
  icon: string,
  color?: 'gold' | 'silver' | 'bronze'
): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'ui-icon-badge';

  if (color) {
    badge.classList.add(`ui-icon-badge--${color}`);
  }

  badge.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`;

  return badge;
}

/**
 * ステータスインジケーターを作成
 */
export function createStatusIndicator(
  status: 'success' | 'warning' | 'danger' | 'info'
): HTMLSpanElement {
  const indicator = document.createElement('span');
  indicator.className = `ui-status-indicator ui-status-indicator--${status}`;
  return indicator;
}
