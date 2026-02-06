---
name: architecture-design
description: |
    基本設計に関するスキル
    フロントエンド、バックエンドを含むディレクトリ構成や仕組みを開発する時に使用する。
---
# Architecture Design

## UI Design
* UIは共通化を意識する。

## Frontend Architecture Guide

### HTMLテンプレート分離方針
* TypeScriptの処理でDOM要素を生成する処理はなるべく避ける。
* 動的な表示内容の場合は、共通部分をhtmlファイルにまとめてテンプレートとし、その内容をコピーして動的な部分だけ更新するような仕組みにする。

### テンプレート配置場所
```
src/ui/
├── templates/           # 画面テンプレート
│   ├── title-screen.html
│   ├── menu-screen.html
│   └── partials/        # 部分テンプレート（モーダル等）
│       ├── character-select-modal.html
│       └── stage-select-modal.html
└── utils/
    ├── TemplateEngine.ts  # テンプレートエンジン
    └── index.ts
```

### テンプレートのインポート方法
Viteの`?raw`サフィックスを使用して文字列としてインポートする。
```typescript
import { renderToElement } from '../utils';
import titleScreenTemplate from '../templates/title-screen.html?raw';

protected createElement(): HTMLElement {
  const screen = renderToElement<HTMLDivElement>(titleScreenTemplate, {
    variableName: 'value'
  });
  return screen;
}
```

### テンプレート記法（Mustache/Handlebars風）
| 記法 | 説明 |
|------|------|
| `{{variable}}` | 変数置換（HTMLエスケープあり） |
| `{{{rawHtml}}}` | rawHTML出力（エスケープなし、信頼できるデータのみ） |
| `{{#if condition}}...{{/if}}` | 条件分岐 |
| `{{#if condition}}...{{else}}...{{/if}}` | 条件分岐（else付き） |
| `{{#unless condition}}...{{/unless}}` | 否定条件 |
| `{{#each items}}...{{/each}}` | 配列ループ（`@index`, `@first`, `@last`利用可） |

### 使い分けの指針
* **静的なHTML構造** → テンプレートファイルに記述
* **動的リスト生成（キャラクター一覧等）** → JS側で文字列生成してテンプレートに`{{{rawHtml}}}`で埋め込み
* **イベントハンドラ** → `setupEventHandlers()`でquerySelectorを使って設定
* **装飾要素（createOrnateDivider等）** → テンプレートにコンテナのみ用意し、JS側で追加

## Task Plan
* 作業はdev-task-planスキルに従う。
