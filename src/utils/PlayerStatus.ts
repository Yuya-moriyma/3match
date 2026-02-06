import { ExperienceSystem, AddExpResult } from './ExperienceSystem';
import { UserSession } from './UserSession';
import { UserDataService } from '../firebase/UserDataService';

const INITIAL_PLAYER_HP = 100;
const HP_PER_LEVEL = 10;

export class PlayerStatus {
    private static instance: PlayerStatus | null = null;

    private level: number = 1;
    private currentExp: number = 0;
    private readonly expSystem: ExperienceSystem;

    private constructor() {
        this.expSystem = new ExperienceSystem();
    }

    static getInstance(): PlayerStatus {
        if (!PlayerStatus.instance) {
            PlayerStatus.instance = new PlayerStatus();
        }
        return PlayerStatus.instance;
    }

    /** 経験値を加算し、レベルアップ判定を行う。Firebase同期も実行 */
    addExp(amount: number): AddExpResult {
        const result = this.expSystem.addExp(this.currentExp, amount);
        this.level = result.level;
        this.currentExp = result.totalExp;
        this.syncToFirebase();
        return result;
    }

    /** 現在レベルを返す */
    getLevel(): number {
        return this.level;
    }

    /** 現在の累計経験値を返す */
    getCurrentExp(): number {
        return this.currentExp;
    }

    /** レベルに応じたHP最大値を返す */
    getMaxHp(): number {
        return INITIAL_PLAYER_HP + (this.level - 1) * HP_PER_LEVEL;
    }

    /** 現在レベル内の進捗率 [0..1] を返す */
    getProgress(): number {
        return this.expSystem.progressInLevel(this.currentExp);
    }

    /** 次レベルまでの残りEXPを返す */
    getExpToNext(): number {
        return this.expSystem.needExpToNext(this.level);
    }

    /** 外部からのデータで上書き */
    applyFirebaseData(level: number, currentExp: number): void {
        this.level = level;
        this.currentExp = currentExp;
    }

    private syncToFirebase(): void {
        const userName = UserSession.getInstance().getUserName();
        if (!userName) return;

        UserDataService.getInstance()
            .savePlayerStatus(userName, {
                level: this.level,
                currentExp: this.currentExp,
            })
            .catch((error) => {
                console.warn('[PlayerStatus] Firebase sync failed:', error);
            });
    }
}
