import { ExpCurveConfig, ExpTables } from '../types';

/**
 * 経験値カーブ計算エンジン
 *
 * 10Lv帯ごとに倍率が段階的に上がる指数カーブ方式。
 * 逆関数は使わず、累計EXPテーブル＋二分探索でレベルを算出（境界ズレ事故を防止）。
 * need(1)=needAtLevel1、need(maxLevel-1)=needAtLevelMaxMinus1 を端点固定で保証。
 *
 * チューニングガイド:
 *   q を上げると「10Lvごとの急さ」が増す
 *   1.03（穏やか）/ 1.05（標準）/ 1.08（かなりキツい）/ 1.10（地獄）
 *   端点固定のため q を変えても Lv1→2 と Lv(max-1)→max は不変
 */

const DEFAULT_EXP_CONFIG: ExpCurveConfig = {
    maxLevel: 40,
    needAtLevel1: 500,
    needAtLevelMaxMinus1: 500_000,
    q: 1.05,
    rounding: 'round',
};

export interface AddExpResult {
    totalExp: number;
    level: number;
    leveledUp: boolean;
    levelsGained: number;
    progress: number;
    expToNext: number;
    expInCurrentLevel: number;
}

export class ExperienceSystem {
    private readonly config: Required<ExpCurveConfig>;
    private readonly tables: ExpTables;

    constructor(config?: Partial<ExpCurveConfig>) {
        this.config = {
            ...DEFAULT_EXP_CONFIG,
            ...config,
            rounding: config?.rounding ?? DEFAULT_EXP_CONFIG.rounding ?? 'round',
        } as Required<ExpCurveConfig>;

        this.tables = this.buildTables();
    }

    /**
     * カーブ生成アルゴリズム
     *
     * 帯構成（maxLevel=40の場合）:
     *   Lv1..10:  基本倍率 r1 を10回適用
     *   Lv11..20: r1×q を10回適用
     *   Lv21..30: r1×q² を10回適用
     *   Lv31..39: r1×q³ を8回適用（計38回で端点を満たすよう r1 を正規化）
     *
     * needAtLevelMaxMinus1 / needAtLevel1 = r1^steps × q^sumBand から r1 を逆算
     * 末尾（Lv(max-1)→max）は指定値で強制固定し、丸め誤差を防止
     */
    private buildTables(): ExpTables {
        const { maxLevel, needAtLevel1, needAtLevelMaxMinus1, rounding } = this.config;
        const q = this.config.q;
        const totalSteps = maxLevel - 2; // Lv1→2 ... Lv(max-2)→(max-1) の回数（末尾は固定）
        const bandSize = 10;

        // 各ステップが属する帯番号と、帯番号の合計を計算
        let sumBand = 0;
        for (let step = 0; step < totalSteps; step++) {
            const bandIndex = Math.floor(step / bandSize);
            sumBand += bandIndex;
        }

        // r1 を逆算: need(max-2) / need(0) = r1^totalSteps × q^sumBand
        // ※ need(0) = needAtLevel1, need(max-2) = needAtLevelMaxMinus1 ではなく
        //   need(0) から need(totalSteps-1) まで r1^step × q^band で成長させ、
        //   最後の need(totalSteps) = needAtLevelMaxMinus1 は固定
        // 正確には: need(totalSteps-1) / need(0) = r1^(totalSteps-1) × q^sumBand'
        // ただし末尾固定なので、totalSteps-1 ステップ分の成長で
        // need(totalSteps-1) がどうなるかを使い、末尾は強制固定する

        // needAtLevelMaxMinus1 / needAtLevel1 の比率を totalSteps ステップで分配
        const ratio = needAtLevelMaxMinus1 / needAtLevel1;
        const r1 = Math.pow(ratio / Math.pow(q, sumBand), 1 / totalSteps);

        const roundFn = rounding === 'floor' ? Math.floor
            : rounding === 'ceil' ? Math.ceil
            : Math.round;

        // needToNext[i] = Lv(i+1)→Lv(i+2) に必要なEXP（インデックス0 = Lv1→2）
        const needToNext: number[] = new Array(maxLevel - 1);
        needToNext[0] = needAtLevel1; // 端点固定

        for (let step = 1; step < totalSteps; step++) {
            const raw = needAtLevel1 * Math.pow(r1, step) * Math.pow(q, this.sumBandUpTo(step, bandSize));
            needToNext[step] = roundFn(raw);
        }

        // 末尾を強制固定
        needToNext[maxLevel - 2] = needAtLevelMaxMinus1;

        // totalToReach[i] = Lv(i+1) 到達に必要な累計EXP（Lv1 = 0）
        const totalToReach: number[] = new Array(maxLevel);
        totalToReach[0] = 0; // Lv1到達 = 0
        for (let i = 1; i < maxLevel; i++) {
            totalToReach[i] = totalToReach[i - 1] + needToNext[i - 1];
        }

        return { needToNext, totalToReach };
    }

    /** step番目までの帯番号の合計 */
    private sumBandUpTo(step: number, bandSize: number): number {
        let sum = 0;
        for (let s = 0; s < step; s++) {
            sum += Math.floor(s / bandSize);
        }
        return sum;
    }

    /** LvL→L+1 の必要EXP */
    needExpToNext(level: number): number {
        if (level < 1 || level >= this.config.maxLevel) return 0;
        return this.tables.needToNext[level - 1];
    }

    /** LvL 到達に必要な累計EXP（Lv1は0） */
    totalExpToReach(level: number): number {
        if (level <= 1) return 0;
        if (level >= this.config.maxLevel) return this.tables.totalToReach[this.config.maxLevel - 1];
        return this.tables.totalToReach[level - 1];
    }

    /** 累計EXPから現在Lvを二分探索で返す（上限maxLevel） */
    levelFromTotalExp(totalExp: number): number {
        const { totalToReach } = this.tables;
        const maxLevel = this.config.maxLevel;

        if (totalExp <= 0) return 1;
        if (totalExp >= totalToReach[maxLevel - 1]) return maxLevel;

        // 二分探索: totalToReach[i] <= totalExp < totalToReach[i+1] となる i を探す
        let lo = 0;
        let hi = maxLevel - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (totalToReach[mid] <= totalExp) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }

        return lo + 1; // インデックス0 = Lv1
    }

    /** Lv内の進捗率 [0..1]（maxLevelでは常に1） */
    progressInLevel(totalExp: number): number {
        const level = this.levelFromTotalExp(totalExp);
        if (level >= this.config.maxLevel) return 1;

        const currentLevelTotal = this.tables.totalToReach[level - 1];
        const needed = this.tables.needToNext[level - 1];
        if (needed <= 0) return 1;

        return (totalExp - currentLevelTotal) / needed;
    }

    /** EXP加算結果を返す */
    addExp(totalExp: number, gained: number): AddExpResult {
        const oldLevel = this.levelFromTotalExp(totalExp);
        const maxTotalExp = this.tables.totalToReach[this.config.maxLevel - 1];
        const newTotalExp = Math.min(totalExp + gained, maxTotalExp);
        const newLevel = this.levelFromTotalExp(newTotalExp);

        const progress = this.progressInLevel(newTotalExp);
        const expToNext = this.needExpToNext(newLevel);
        const currentLevelTotal = this.tables.totalToReach[newLevel - 1];
        const expInCurrentLevel = newTotalExp - currentLevelTotal;

        return {
            totalExp: newTotalExp,
            level: newLevel,
            leveledUp: newLevel > oldLevel,
            levelsGained: newLevel - oldLevel,
            progress,
            expToNext,
            expInCurrentLevel,
        };
    }

    /** テーブルを外部に返す（デバッグ・バランス調整用） */
    getTables(): ExpTables {
        return this.tables;
    }
}
