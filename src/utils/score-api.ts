import { client } from "@utils/initialize";
import { type User, ScoreData } from "@type/database";
import type { UserScore, UserBestScore, UserScoreV2, UserBestScoreV2, Score, ScoreV2, PlayType, Mode } from "@type/osu";

function shouldUseLazerApi(authorDb: User | null): boolean {
    return (authorDb?.score_data ?? ScoreData.Stable) === ScoreData.Lazer;
}

// Gets user scores using either V1 (stable) or V2 (lazer) API based on user preference
export async function getUserScores(
    userId: number,
    type: PlayType,
    options: { query: { mode: Mode; limit: number; include_fails?: boolean } },
    authorDb: User | null,
): Promise<Array<UserBestScoreV2 | UserScoreV2 | UserBestScore | UserScore>> {
    if (shouldUseLazerApi(authorDb)) {
        const scores = (await client.users.getUserScoresV2(userId, type, options)) as unknown as Array<UserBestScoreV2 | UserScoreV2>;
        return scores.map((score, index) => ({ ...score, position: index + 1 }));
    } else {
        const scores = await client.users.getUserScores(userId, type, options);
        return scores.map((score, index) => ({ ...score, position: index + 1 }));
    }
}

// Gets beatmap user scores using either V1 (stable) or V2 (lazer) API based on user preference
export async function getBeatmapUserScores(beatmapId: number, userId: number, options: { query: { mode: Mode } }, authorDb: User | null): Promise<Array<Score | ScoreV2>> {
    if (shouldUseLazerApi(authorDb)) {
        const scores = (await client.beatmaps.getBeatmapUserScoresV2(beatmapId, userId, options)) as unknown as Array<ScoreV2>;
        return scores.map((score, index) => ({ ...score, position: index + 1 }));
    } else {
        const scores = await client.beatmaps.getBeatmapUserScores(beatmapId, userId, options);
        return scores.map((score, index) => ({ ...score, position: index + 1 }));
    }
}
