/**
 * シンプルなテンプレートエンジン
 * Mustache/Handlebars風の記法をサポート
 */

export interface TemplateData {
  [key: string]: unknown;
}

/**
 * HTMLエスケープ（XSS対策）
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * ネストされたプロパティを取得
 * @example getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
 */
function getNestedValue(obj: TemplateData, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in (current as object)) {
      return (current as TemplateData)[key];
    }
    return undefined;
  }, obj);
}

/**
 * 値が truthy かどうかを判定
 */
function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

/**
 * テンプレート内のループ処理
 * {{#each items}}...{{/each}}
 */
function processEach(template: string, data: TemplateData): string {
  const eachRegex = /\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return template.replace(eachRegex, (_, arrayPath: string, innerTemplate: string) => {
    const array = getNestedValue(data, arrayPath);

    if (!Array.isArray(array)) {
      return '';
    }

    return array
      .map((item, index) => {
        // 配列要素をコンテキストとして設定
        const itemData: TemplateData =
          typeof item === 'object' && item !== null
            ? { ...data, ...item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 }
            : { ...data, '.': item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 };

        // 内部テンプレートを再帰的に処理
        return render(innerTemplate, itemData);
      })
      .join('');
  });
}

/**
 * テンプレート内の条件分岐処理
 * {{#if condition}}...{{/if}}
 * {{#if condition}}...{{else}}...{{/if}}
 */
function processIf(template: string, data: TemplateData): string {
  // else付きのif文
  const ifElseRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
  template = template.replace(ifElseRegex, (_, condition: string, trueContent: string, falseContent: string) => {
    const value = getNestedValue(data, condition);
    return isTruthy(value) ? render(trueContent, data) : render(falseContent, data);
  });

  // elseなしのif文
  const ifRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  template = template.replace(ifRegex, (_, condition: string, content: string) => {
    const value = getNestedValue(data, condition);
    return isTruthy(value) ? render(content, data) : '';
  });

  // unless（否定条件）
  const unlessRegex = /\{\{#unless\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
  template = template.replace(unlessRegex, (_, condition: string, content: string) => {
    const value = getNestedValue(data, condition);
    return !isTruthy(value) ? render(content, data) : '';
  });

  return template;
}

/**
 * 変数置換処理
 * {{variable}} - HTMLエスケープあり
 * {{{variable}}} - HTMLエスケープなし（rawHTML）
 */
function processVariables(template: string, data: TemplateData): string {
  // rawHTML出力（エスケープなし）
  template = template.replace(/\{\{\{(\w+(?:\.\w+)*)\}\}\}/g, (_, path: string) => {
    const value = getNestedValue(data, path);
    return value != null ? String(value) : '';
  });

  // 通常の変数置換（HTMLエスケープあり）
  template = template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
    const value = getNestedValue(data, path);
    if (value == null) {
      return '';
    }
    return escapeHtml(String(value));
  });

  return template;
}

/**
 * テンプレートをレンダリング
 * @param template テンプレート文字列
 * @param data データオブジェクト
 * @returns レンダリング済みHTML文字列
 */
export function render(template: string, data: TemplateData = {}): string {
  // 処理順序: each → if → variables
  let result = template;
  result = processEach(result, data);
  result = processIf(result, data);
  result = processVariables(result, data);
  return result;
}

/**
 * テンプレート文字列からDOM要素を生成
 * @param template テンプレート文字列
 * @param data データオブジェクト
 * @returns DOM要素
 */
export function renderToElement<T extends HTMLElement = HTMLElement>(
  template: string,
  data: TemplateData = {}
): T {
  const html = render(template, data);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();

  if (wrapper.children.length === 1) {
    return wrapper.firstElementChild as T;
  }

  // 複数のルート要素がある場合はDocumentFragmentを使う
  throw new Error('Template must have exactly one root element');
}

/**
 * パーシャルテンプレートを登録・管理するクラス
 */
export class TemplateRegistry {
  private partials: Map<string, string> = new Map();

  /**
   * パーシャルを登録
   */
  registerPartial(name: string, template: string): void {
    this.partials.set(name, template);
  }

  /**
   * パーシャルを取得
   */
  getPartial(name: string): string | undefined {
    return this.partials.get(name);
  }

  /**
   * パーシャル参照を解決してレンダリング
   * {{> partialName}}
   */
  renderWithPartials(template: string, data: TemplateData = {}): string {
    // パーシャル参照を解決
    const partialRegex = /\{\{>\s*(\w+)\}\}/g;
    let result = template.replace(partialRegex, (_, partialName: string) => {
      const partial = this.partials.get(partialName);
      if (!partial) {
        console.warn(`Partial "${partialName}" not found`);
        return '';
      }
      return partial;
    });

    // 通常のレンダリング処理
    return render(result, data);
  }
}

// デフォルトのレジストリインスタンス
export const templateRegistry = new TemplateRegistry();
