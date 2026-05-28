import type { Mod } from "./mods";
import type {
    UserScore as UserScore_,
    UserScoreV2 as UserScoreV2_,
    UserBestScore as UserBestScore_,
    UserBestScoreV2 as UserBestScoreV2_,
    Score as Score_,
    ScoreV2 as ScoreV2_,
    Beatmapset,
    Fails,
    Beatmap as BeatmapWeb,
    Country,
    Cover,
    UserCompact,
    Rank,
    ISOTimestamp,
} from "osu-web.js";
import type { Beatmap as BeatmapRosu, BeatmapAttributes, PerformanceAttributes } from "rosu-pp-js";

export const enum Mode {
    OSU = "osu",
    MANIA = "mania",
    TAIKO = "taiko",
    FRUITS = "fruits",
}

export const enum PlayType {
    BEST = "best",
    RECENT = "recent",
    FIRSTS = "firsts",
}

export interface ProfileInfo {
    username: string;
    userCover: string;
    avatarUrl: string;
    userUrl: string;
    bannerUrl: string;
    flagUrl: string;
    countryCode: string;
    globalRank: string;
    countryRank: string;
    peakGlobalRank: string;
    peakGlobalRankTime: number;
    pp: string;
    rankedScore: string;
    totalScore: string;
    objectsHit: string;
    occupation: string | null;
    interest: string | null;
    location: string | null;
    recommendedStarRating: string;
    joinedAgo: string;
    joinedAt: string;
    accuracy: string;
    level: string;
    playCount: string;
    playHours: string;
    followers: string;
    maxCombo: string;
    rankS: string;
    rankA: string;
    rankSs: string;
    rankSh: string;
    rankSsh: string;
}

export interface ScoresInfo {
    position: number;
    songNameFormatted: string;
    songArtist: string;
    songName: string;
    retries: number | undefined;
    percentagePassed: string | null;
    difficultyName: string;
    score: string;
    accuracy: string;
    mapLink: string;
    coverLink: string;
    listLink: string;
    thumbLink: string;
    grade: string;
    hitValues: string;
    fcHitValues: string;
    fcAccuracy: string | undefined;
    isFc: boolean;
    mapAuthor: string;
    mapStatus: string;
    mods: Array<string>;
    drainLength: string;
    stars: string;
    rulesetEmote: string;
    pp: number;
    ppFormatted: string;
    playSubmitted: string;
    ifFcHanami: string | null;
    ifFcBathbot: string | null;
    ifFcOwo: string | null;
    comboValues: string;
    performance: PerformanceInfo;
    user: string | undefined;
    userId: number | undefined;
}

export interface PerformanceInfo {
    mapValues: BeatmapRosu;
    difficultyAttrs: BeatmapAttributes;
    perfect: PerformanceAttributes;
    current: PerformanceAttributes;
    fc: PerformanceAttributes;
    mapId: number;
    mods: Array<string>;
}

export type AuthScope = "public" | "chat.write" | "delegate" | "forum.write" | "friends.read" | "identify";

export interface AccessTokenJSON {
    access_token: string;
    expires_in: number;
}

export interface ScoreStatisticsV2 {
    perfect: number | null;
    great: number | null;
    good?: number;
    ignore_hit?: number;
    ignore_miss?: number;
    large_bonus?: number;
    large_tick_hit?: number;
    legacy_combo_increase?: number;
    meh?: number;
    miss?: number;
    ok?: number;
    small_bonus?: number;
    small_tick_hit?: number;
    small_tick_miss?: number;
}

export interface LeaderboardScore {
    position?: number;
    ranked: boolean;
    preserve: boolean;
    maximum_statistics: {
        great: number;
        legacy_combo_increase: number;
    };
    mods: Array<Mod>;
    statistics: ScoreStatisticsV2;
    beatmap_id: number;
    best_id: number | null;
    id: number;
    rank: Rank;
    type: string;
    user_id: number;
    accuracy: number;
    build_id: number | null;
    ended_at: ISOTimestamp;
    has_replay: boolean;
    is_perfect_combo: boolean;
    legacy_perfect: boolean;
    legacy_score_id: number;
    legacy_total_score: number;
    max_combo: number;
    passed: boolean;
    pp: number;
    ruleset_id: 0 | 1 | 2 | 3;
    started_at: string | null;
    total_score: number;
    replay: boolean;
    current_user_attributes: {
        pin: number | null;
    } | null;
    user: UserCompact & {
        country: Country;
        cover: Cover;
    };
}

export type Beatmap = BeatmapWeb & {
    beatmapset: Beatmapset & {
        ratings: Array<number>;
    };
    checksum: string | null;
    failtimes: Fails;
    max_combo: number;
};

export interface LeaderboardScoresRaw {
    scores: Array<LeaderboardScore>;
}

export interface UserScore extends UserScore_ {
    position: number;
}

export interface UserBestScore extends UserBestScore_ {
    position: number;
}

export interface UserScoreV2 extends Omit<UserScoreV2_, "statistics"> {
    statistics: ScoreStatisticsV2;
    position: number;
}


export interface UserBestScoreV2 extends Omit<UserBestScoreV2_, "statistics"> {
    statistics: ScoreStatisticsV2;
    position: number;
}

export interface Score extends Score_ {
    position: number;
}

export interface ScoreV2 extends Omit<ScoreV2_, "statistics"> {
    statistics: ScoreStatisticsV2;
    position: number;
}
