# 戦闘画面 Phaser/HTML ハイブリッド設計 調査報告書

## 概要

戦闘画面の責務分担について調査した結果をまとめる。
盤面の操作ロジック・アニメーションはPhaserに残し、味方/敵UI・ポーズ画面等をHTML/CSS/JSに移行する設計の検討。

---

## 現状の構成

| レイヤー | 担当 | 技術 |
|---------|------|------|
| 非戦闘画面（メニュー、ストーリー、クエスト等） | HTML/CSS | UIManager + GameBridge |
| **戦闘画面すべて** | **Phaser** | BattleHUD, BoardView, 各種Display |

戦闘中のUI（敵HP、味方HP、アクションカウント、ポーズメニュー等）はすべてPhaserのGameObjectとして描画されている。

### 技術スタック

- TypeScript 5.4.5
- Phaser 3.80.1
- CSS3 + Custom Properties + Bootstrap 5.3.3
- Vite 5.2.11
- React/Vue等のUIフレームワークなし

### 既存の通信基盤

- `src/ui/UIManager.ts` — HTML画面のライフサイクル管理
- `src/ui/GameBridge.ts` — Phaser↔HTML間のイベントベース通信
- `src/styles/theme.css` — CSS変数によるテーマ管理
- `index.html` — `#game`(z-index:0) / `#ui-layer`(z-index:10) の2レイヤー構造

---

## 判断基準

| 判断基準 | Phaser向き | HTML/CSS向き |
|----------|-----------|-------------|
| 更新頻度 | 毎フレーム(60fps) | イベント駆動(秒数回) |
| 位置の依存先 | 盤面のタイル座標に連動 | 画面上の固定位置 |
| 他のゲームオブジェクトとの同期 | タイル削除・移動と同時進行 | 状態変更の通知を受けるだけ |
| アニメーションの複雑さ | パーティクル、物理演算風 | 単純なtransition/keyframe |
| インタラクション | ドラッグ、隣接タイル判定 | クリック、ホバー |

---

## 1. Phaserに残すもの（盤面＋ゲームコアエフェクト）

### 1-1. 盤面本体

| 要素 | 現ファイル | アニメーション | 理由 |
|------|-----------|-------------|------|
| 盤面フレーム（羊皮紙枠+角装飾） | `src/battle/board/BoardView.ts` | なし（静的） | タイルの座標基準 |
| 8x8タイルグリッド（通常/ボーナス/ボム/お邪魔） | `src/battle/board/TileFactory.ts` | なし（生成時） | パズルの中核、複雑な多層描画 |
| タイル選択グロー | `BoardView.ts:83-104` | scale 1→1.15, alpha 0.35→0.15, 400ms yoyo | タイル座標に連動 |
| タイルホバーグロー | `TileFactory.ts:323-357` | alpha 0.5→0.2, 400ms yoyo | タイル座標に連動 |
| タイルクリック判定 | `TileFactory.ts` | なし | 隣接タイル判定ロジック直結 |
| タイルスワップ | `BoardView.ts:120-143` | x,y移動（duration可変） | 2タイルの同時座標移動 |
| タイル落下 | `BoardView.ts:148-163` | y移動, Bounce.easeOut | 重力演出 |
| 新タイル生成+落下 | `BoardView.ts:168-192` | 上方から落下, Bounce.easeOut | 盤面座標に連動 |
| 凍結/ロックオーバーレイ | `TileOverlayManager` | タイル上の視覚状態 | タイル座標に密結合 |

### 1-2. 盤面エフェクト

| 要素 | 現ファイル | アニメーション | 理由 |
|------|-----------|-------------|------|
| タイル消滅パーティクル | `ExplosionEffects.ts` | 8方向パーティクル放出 500ms | タイル座標から発火 |
| ライン発動エフェクト | `ExplosionEffects.ts` | 行/列全体に閃光 | 盤面座標に連動 |
| ボム爆発エフェクト | `ExplosionEffects.ts` | 中心から波紋+パーティクル | 盤面座標に連動 |
| 氷割れエフェクト | `ExplosionEffects.ts` | パーティクル放出 | タイル座標に連動 |
| 盤面シェイク（被ダメージ時） | `BoardEffects.ts:21-42` | 全タイル位置オフセット ±INTENSITY | 全タイルcontainerを直接操作 |
| ボーナスオーブ生成 | `UIEffects.ts:90-131` | グロー拡大300ms + 6パーティクル400ms | タイル座標に連動 |
| ボム生成スキルエフェクト | `CombatEffects.ts:169-219` | 黄色フラッシュ300ms + 8ダイヤモンドパーティクル500ms | タイル座標に連動 |
| 色変換スキルエフェクト | `CombatEffects.ts:224-266` | 3連波紋400ms + 中心フラッシュ300ms | タイル座標に連動 |

### 1-3. 盤面テキストエフェクト

| 要素 | 現ファイル | アニメーション | 理由 |
|------|-----------|-------------|------|
| チェインテキスト（"2 CHAIN!"） | `BattleTextEffects.ts` | スケールイン→フェードアウト | 盤面上部に表示、チェイン処理と密結合 |
| アクション効果テキスト（ダメージ/回復数値） | `BattleTextEffects.ts` | フロート上昇→フェードアウト | 盤面中央に表示 |

### 1-4. ゲームフロー制御オーバーレイ

| 要素 | 現ファイル | アニメーション | 理由 |
|------|-----------|-------------|------|
| バトル開始演出 | `UIEffects.ts:19-85` | 暗転→"BATTLE START"スケールイン300ms→バウンス150ms→維持600ms→フェードアウト400ms | isProcessingフラグと直結、入力ブロック必要 |
| 敵アクションオーバーレイ | `BoardEffects.ts:71-144` | フェードイン200ms→テキストスケール300ms→パルス400ms yoyo | 盤面上に表示、ゲーム状態遷移と密結合 |
| カメラフラッシュ（敵スキル発動時） | `CombatEffects.ts:152-164` | Phaser.Camera.flash 300ms | Phaser Camera API直接使用 |

### 1-5. 背景

| 要素 | 現ファイル | アニメーション | 理由 |
|------|-----------|-------------|------|
| 羊皮紙グラデーション背景 | `BattleScene.ts:90-113` | なし（静的） | Phaser canvasの背景 |
| 装飾パーティクル（20個） | `BattleScene.ts:116-123` | なし（静的） | 背景の一部 |

---

## 2. HTMLに移すもの（情報表示UI + ポーズ系）

### 2-1. 味方HPエリア

| 要素 | 現ファイル | 現アニメーション | HTML化後のアニメーション |
|------|-----------|---------------|---------------------|
| HPバー外枠（羊皮紙風） | `PlayerHpDisplay.ts:28-38` | なし | CSS border + border-radius |
| HPバー本体（緑→赤） | `PlayerHpDisplay.ts:41-48` | scaleX 300ms Quad.easeOut | CSS `transition: width 300ms ease-out` |
| HPテキスト（"HP: XXX/YYY"） | `PlayerHpDisplay.ts:51-58` | なし | textContent更新 |
| HP低下パルス（≤30%） | `PlayerHpDisplay.ts:102-108` | alpha 0.7, 600ms yoyo | CSS `@keyframes pulse { opacity }` |
| 毒ステータス（"毒"） | `PlayerHpDisplay.ts:64-73` | visible切替 | CSS `display: none/block` |

### 2-2. 敵UIエリア

| 要素 | 現ファイル | 現アニメーション | HTML化後のアニメーション |
|------|-----------|---------------|---------------------|
| 敵フレーム（羊皮紙枠） | `BattleHUD.ts:114-127` | なし | CSS border + background |
| "ENEMY"ラベル | `BattleHUD.ts:129-136` | なし | HTML text |
| 敵HPバー本体（赤） | `EnemyHpDisplay.ts:54-56` | scaleX 300ms Quad.easeOut | CSS `transition: width 300ms` |
| 敵HPテキスト | `EnemyHpDisplay.ts:59-67` | なし | textContent更新 |
| 攻撃カウンターアイコン（丸形） | `EnemyCounterDisplay.ts:68-75` | なし（静的部分） | CSS circle + SVG/emoji |
| スキルカウンターアイコン（丸形） | `EnemyCounterDisplay.ts:80-87` | なし（静的部分） | CSS circle + SVG/emoji |
| カウンター数値テキスト | `EnemyCounterDisplay.ts:153-163` | なし | textContent更新 |
| カウンター警告色変更（残1=赤, 残2=黄） | `EnemyCounterDisplay.ts:246-302` | 即時色変更 | CSS class切替 (`.warning`, `.danger`) |
| カウンターシェイク（残1到達時） | `EnemyCounterDisplay.ts:271-282` | x+2, 100ms yoyo ×2 | CSS `@keyframes shake` |
| カウンター凍結スタイル（金色化） | `EnemyCounterDisplay.ts:307-399` | 即時色変更 | CSS class切替 (`.frozen`) |
| カウンターホバーグロー | `EnemyCounterDisplay.ts:185-206` | alpha 0.5→0.2, 400ms yoyo | CSS `transition` + `box-shadow` |
| ダメージポップアップ（"-XX"） | `CombatEffects.ts:17-67` | scale 0.5→1.2(100ms)→1(50ms)→上昇+フェード(600ms) | CSS `@keyframes damagePopup` |
| 敵UIシェイク（被ダメージ） | `CombatEffects.ts:72-97` | x±6, 30ms×4往復 | CSS `@keyframes shake` |
| 敵消滅アニメーション | `CombatEffects.ts:103-147` | シェイク200ms→下方移動+フェード500ms | CSS `@keyframes death` |

### 2-3. アクションカウントエリア

| 要素 | 現ファイル | 現アニメーション | HTML化後のアニメーション |
|------|-----------|---------------|---------------------|
| 3分割パネル背景（羊皮紙風） | `ActionCountDisplay.ts:59-85` | なし | CSS border + flexbox 3分割 |
| アイコン（⚔/★/♥） | `ActionCountDisplay.ts:130-138` | なし | HTML/CSS text |
| 発動回数テキスト（大） | `ActionCountDisplay.ts:141-149` | なし | textContent更新 |
| 詳細テキスト（/remainder/threshold） | `ActionCountDisplay.ts:152-160` | なし | textContent更新 |
| ハイライト（70%超で拡大+全透明度変更） | `ActionCountDisplay.ts:196-198` | scale 1→1.1 即時 | CSS `transform: scale(1.1)` + `transition` |
| パルスアニメ（閾値接近時） | `ActionCountDisplay.ts:218-241` | scale 1→1.08, 800ms yoyo | CSS `@keyframes pulse` |

### 2-4. テキスト演出（盤面外）

| 要素 | 現ファイル | 現アニメーション | HTML化後のアニメーション |
|------|-----------|---------------|---------------------|
| スキル発動テキスト（味方） | `BattleTextEffects.ts` | スケールイン+フェード | CSS `@keyframes skillActivation` |
| 敵スキル発動テキスト | `BattleTextEffects.ts` | フロート表示+フェード | CSS `@keyframes enemySkill` |
| "No Target"テキスト | `BattleTextEffects.ts` | フロート表示+フェード | CSS `@keyframes noTarget` |

### 2-5. ポーズ系

| 要素 | 現ファイル | 現アニメーション | HTML化後のアニメーション |
|------|-----------|---------------|---------------------|
| ポーズボタン（リボン型） | `BattleHUD.ts:231-290` | なし | CSS hexagon clip-path |
| ポーズオーバーレイ（半透明黒） | `PauseMenu.ts:68` | なし | CSS backdrop |
| ポーズダイアログ（羊皮紙） | `PauseMenu.ts:72-100` | なし | CSS panel |
| "PAUSED"タイトル | `PauseMenu.ts:92-100` | なし | HTML text |
| BGM音量スライダー | `PauseMenu.ts:104-107` | ドラッグ操作 | HTML `<input type="range">` |
| SE音量スライダー | `PauseMenu.ts:108-111` | ドラッグ操作 | HTML `<input type="range">` |
| 再開ボタン | `PauseMenu.ts:125-129` | なし | CSS button |
| リタイアボタン | `PauseMenu.ts:133-146` | なし | CSS button |
| ツールチップ（攻撃/スキル情報） | `TooltipManager.ts:76-160` | なし（即時表示） | CSS popup |
| ツールチップオーバーレイ | `TooltipManager.ts:95-98` | なし | CSS overlay |

---

## 3. 責務境界の全体図

```
┌─────────────────────── HTML Layer (#ui-layer, z-index:10) ───────────────────────┐
│                                                                                   │
│  ┌──── PAUSEボタン ────┐                                                          │
│  │ [ribbon CSS]        │                                                          │
│  └─────────────────────┘                                                          │
│                                                                                   │
│  ┌──────────────────── 敵UIエリア (.enemy-ui) ────────────────────────┐            │
│  │  [スキルカウンター]  ┌─────────────────────────┐ [攻撃カウンター]   │           │
│  │  丸型 CSS circle     │ 羊皮紙フレーム CSS      │  丸型 CSS circle   │           │
│  │  シェイク: CSS anim   │ "ENEMY"  HPバー         │  シェイク: CSS anim │          │
│  │  ホバー: CSS hover    │ HPテキスト              │  ホバー: CSS hover  │          │
│  │  ツールチップ: popup  │ 減少: CSS transition    │  ツールチップ: popup│          │
│  │                      └─────────────────────────┘                   │           │
│  │  ダメージポップアップ: CSS @keyframes                               │           │
│  │  敵消滅: CSS @keyframes (shake→translate+fade)                     │           │
│  └────────────────────────────────────────────────────────────────────┘           │
│                                                                                   │
│  ┌──── 味方HPバー (.player-hp) ────────────────────────────────┐ [毒]            │
│  │  HPバー (CSS transition: width)  HPテキスト  低HP: CSS pulse │                  │
│  └─────────────────────────────────────────────────────────────┘                  │
│                                                                                   │
│  ┌──── アクションカウント (.action-count) ─────────────────────┐                  │
│  │  ⚔ ATK  |  ★ SKL  |  ♥ HEL   (CSS flexbox 3分割)          │                  │
│  │  パルス: CSS @keyframes                                      │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
│                                                                                   │
│  ┌──── テキスト演出 (.battle-text-overlay) ────────────────────┐                  │
│  │  スキル発動テキスト / 敵スキルテキスト / NoTarget            │                  │
│  │  CSS @keyframes (scale+fade)                                 │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
│                                                                                   │
│  ┌──── ポーズメニュー (.pause-overlay) ────────────────────────┐                  │
│  │  オーバーレイ → ダイアログ → スライダー/ボタン               │                  │
│  └──────────────────────────────────────────────────────────────┘                  │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────── Phaser Canvas (#game, z-index:0) ─────────────────────────┐
│                                                                                   │
│  背景（羊皮紙グラデーション + 装飾パーティクル）                                   │
│                                                                                   │
│  ┌──────────────── 盤面フレーム (BoardView) ──────────────────┐                   │
│  │  ┌──┬──┬──┬──┬──┬──┬──┬──┐                                │                   │
│  │  │  │  │  │  │  │  │  │  │  8x8 タイルグリッド             │                   │
│  │  ├──┼──┼──┼──┼──┼──┼──┼──┤  タイルスワップアニメ           │                   │
│  │  │  │  │  │  │  │  │  │  │  タイル落下アニメ               │                   │
│  │  ├──┼──┼──┼──┼──┼──┼──┼──┤  選択グロー                    │                   │
│  │  │  │  │  │  │  │  │  │  │  ホバーグロー                   │                   │
│  │  ├──┼──┼──┼──┼──┼──┼──┼──┤  爆発パーティクル              │                   │
│  │  │  │  │  │  │  │  │  │  │  ライン/ボム/氷エフェクト       │                   │
│  │  ├──┼──┼──┼──┼──┼──┼──┼──┤  ボーナス生成エフェクト        │                   │
│  │  │  │  │  │  │  │  │  │  │  盤面シェイク                   │                   │
│  │  └──┴──┴──┴──┴──┴──┴──┴──┘  チェインテキスト              │                   │
│  └────────────────────────────────────────────────────────────┘                   │
│                                                                                   │
│  [バトル開始演出] [敵アクションオーバーレイ] [カメラフラッシュ]                    │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phaser→HTML 通信設計

GameBridgeに追加するイベント：

| イベント | 方向 | データ | トリガー |
|---------|------|--------|---------|
| `BATTLE_HUD_INIT` | Phaser→HTML | playerHp, enemyHp, enemyInfo, counters, etc. | バトル初期化完了 |
| `HP_UPDATE` | Phaser→HTML | {playerHp, playerMaxHp, enemyHp, enemyMaxHp} | HP変動時 |
| `COUNTER_UPDATE` | Phaser→HTML | {attackCounter, skillCounter} | カウンター変動時 |
| `ACTION_COUNT_UPDATE` | Phaser→HTML | {attack, skill, heal}のtriggers/remainder/threshold | アクションカウント変動時 |
| `POISON_UPDATE` | Phaser→HTML | {isPoisoned: boolean} | 毒状態変更時 |
| `COUNTER_FROZEN` | Phaser→HTML | {frozen, remainingTurns} | カウンター停止/解除時 |
| `SHOW_DAMAGE_POPUP` | Phaser→HTML | {damage, position} | 敵へのダメージ時 |
| `ENEMY_SHAKE` | Phaser→HTML | — | 敵ダメージ時 |
| `ENEMY_DEATH` | Phaser→HTML | — (callback付き) | 敵撃破時 |
| `SHOW_SKILL_TEXT` | Phaser→HTML | {name, color, isEnemy} | スキル発動時 |
| `SHOW_NO_TARGET` | Phaser→HTML | — | 無効操作時 |
| `PAUSE_TOGGLE` | HTML→Phaser | — | ポーズボタンクリック |
| `RESUME` | HTML→Phaser | — | 再開ボタンクリック |
| `RETIRE` | HTML→Phaser | — | リタイアボタンクリック |
| `VOLUME_CHANGE` | HTML→Phaser | {type: 'bgm'\|'se', value: number} | スライダー操作 |

### 完了コールバックが必要なアニメーション

以下のアニメーションは完了後にゲームフローに復帰する必要がある。
HTMLの `animationend` イベントで対処する。

| アニメーション | 完了後のフロー |
|--------------|--------------|
| 敵消滅アニメーション | `emitBattleEnd(victory: true)` を呼ぶ |
| スキル発動テキスト | スキル効果の実行に進む |

---

## 5. 影響を受けるファイル一覧

### 削除対象（HTML化により不要になるもの）

| ファイル | 理由 |
|---------|------|
| `src/battle/ui/PlayerHpDisplay.ts` | HTML版に置換 |
| `src/battle/ui/EnemyHpDisplay.ts` | HTML版に置換 |
| `src/battle/ui/ActionCountDisplay.ts` | HTML版に置換 |
| `src/battle/ui/EnemyCounterDisplay.ts` | HTML版に置換 |
| `src/battle/ui/TooltipManager.ts` | HTML版に置換 |
| `src/battle/ui/PauseMenu.ts` | HTML版に置換 |

### 大幅改修対象

| ファイル | 変更内容 |
|---------|---------|
| `src/battle/ui/BattleHUD.ts` | ファサードからイベント発火層へ変更。Phaser描画コードを全削除し、GameBridge経由でHTMLに状態通知するだけに |
| `src/battle/BattleController.ts` | BattleHUD呼び出し箇所をイベント発火に変更。PauseMenu関連をイベントリスナー化 |
| `src/battle/effects/CombatEffects.ts` | `showDamagePopup`, `shakeEnemyUI`, `playEnemyDeathAnimation` をイベント発火に変更 |
| `src/battle/effects/BattleTextEffects.ts` | `showSkillActivationText`, `showEnemySkillText`, `showNoTargetText` をイベント発火に変更 |
| `src/ui/GameBridge.ts` | 新規イベント定義の追加 |
| `src/ui/UIManager.ts` | 戦闘中もHTML UIを表示するよう変更 |

### 新規作成

| ファイル | 内容 |
|---------|------|
| `src/ui/screens/BattleHUDScreen.ts` | 戦闘中HTML UIのルートコンポーネント |
| `src/ui/components/PlayerHpBar.ts` | 味方HPバー HTML版 |
| `src/ui/components/EnemyPanel.ts` | 敵UIエリア HTML版 |
| `src/ui/components/ActionCountPanel.ts` | アクションカウント HTML版 |
| `src/ui/components/BattlePauseMenu.ts` | ポーズメニュー HTML版 |
| `src/ui/components/BattleTooltip.ts` | ツールチップ HTML版 |
| `src/ui/components/BattleTextOverlay.ts` | テキスト演出 HTML版 |
| `src/styles/screens/battle-hud.css` | 戦闘HUD用スタイル |

---

## 6. 工数見積もり

### 段階別の移行順序（推奨）

| フェーズ | 内容 | 工数 |
|---------|------|------|
| Phase 1 | ポーズメニューのHTML化 | 1日 |
| Phase 2 | ツールチップのHTML化 | 0.5日 |
| Phase 3 | 味方HPバーのHTML化 | 0.5日 |
| Phase 4 | 敵UIエリア（HP+カウンター）のHTML化 | 1.5日 |
| Phase 5 | アクションカウント表示のHTML化 | 1日 |
| Phase 6 | テキスト演出（スキル名等）のHTML化 | 1日 |
| Phase 7 | ダメージポップアップ・敵消滅アニメのHTML化 | 1日 |
| Phase 8 | BattleHUD/BattleControllerリファクタ + GameBridge拡張 | 1日 |
| Phase 9 | CSS調整・テスト・バグ修正 | 1.5〜2日 |
| **合計** | | **約8〜9.5日** |

### 段階的移行のメリット

- Phase 1（ポーズメニュー）だけで通信パターンが確立でき、以降のフェーズに横展開可能
- 各フェーズは独立してテスト可能
- 途中で方針変更しても、移行済みの部分だけで成立する

---

## 7. 設計の所感

### メリット

- Phaserの責務が「盤面とゲームエフェクト」に明確化される
- HPバーやカウンターのような「数値表示＋軽量アニメ」はCSS transition/keyframesで十分表現でき、コードが大幅に簡潔になる
- ポーズメニューは現在約250行のPhaser描画コード → HTML/CSSなら`<input type="range">`で済む
- ツールチップはHTMLの方が圧倒的にテキストレンダリングが得意
- 既存のCSS変数（`theme.css`）やUIManager/GameBridgeパターンをそのまま活用できる
- ブラウザDevToolsでのデバッグが容易になる
- 将来的なUI改修（レイアウト変更、レスポンシブ対応等）がCSS変更だけで済む

### 注意点

- 「敵消滅アニメーション」「敵UIシェイク」は、完了コールバックでゲームフローに復帰する必要がある → CSS animationの`animationend`イベントで対応可能
- ダメージポップアップの表示位置は敵UIエリア基準なので、HTML要素同士のため問題なし
- 「バトル開始演出」「敵アクションオーバーレイ」「カメラフラッシュ」はPhaser側に残す（ゲーム状態遷移のタイミング制御が複雑なため）
- HTMLレイヤーがPhaser canvasの上に被さるため、ポインターイベントの伝播設定（`pointer-events: none` をデフォルトにし、インタラクティブ要素のみ `auto`）が必要

---

## 8. 調査対象ファイル一覧

本報告書の作成にあたり、以下のファイルを全文読み込んで分析した。

- `src/scenes/BattleScene.ts`
- `src/battle/BattleController.ts`
- `src/battle/board/BoardView.ts`
- `src/battle/board/TileFactory.ts`
- `src/battle/ui/BattleHUD.ts`
- `src/battle/ui/PlayerHpDisplay.ts`
- `src/battle/ui/EnemyHpDisplay.ts`
- `src/battle/ui/ActionCountDisplay.ts`
- `src/battle/ui/EnemyCounterDisplay.ts`
- `src/battle/ui/TooltipManager.ts`
- `src/battle/ui/PauseMenu.ts`
- `src/battle/effects/EffectManager.ts`
- `src/battle/effects/ExplosionEffects.ts`
- `src/battle/effects/BattleTextEffects.ts`
- `src/battle/effects/BoardEffects.ts`
- `src/battle/effects/CombatEffects.ts`
- `src/battle/effects/UIEffects.ts`
- `src/ui/GameBridge.ts`
- `src/ui/UIManager.ts`
