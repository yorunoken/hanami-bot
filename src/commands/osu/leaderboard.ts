import { leaderboardBuilder } from "@builders";
import { MessageReplyOptions } from "@lilybird/transformers";
import { EmbedBuilderType } from "@type/builders";
import { CommandData, MessageCommand, ApplicationCommand } from "@type/commands";
import { Mode } from "@type/osu";
import { getCommandArgs, parseOsuArguments } from "@utils/args";
import { getBeatmapIdFromContext, getBeatmapTopScores } from "@utils/osu";
import { createPaginationActionRow } from "@utils/pagination";
import { ButtonStateCache } from "@utils/cache";
import { client } from "@utils/initialize";
import { ApplicationCommandOptionType, EmbedType } from "lilybird";
import type { LeaderboardBuilderOptions } from "@type/builders";
import type { Mod } from "osu-web.js";

const modeAliases: Record<string, { isGlobal: boolean }> = {
    leaderboard: { isGlobal: true },
    lb: { isGlobal: true },
    countryleaderboard: { isGlobal: false },
    countrylb: { isGlobal: false },
    clb: { isGlobal: false },
    ct: { isGlobal: false },
};

export async function runMessage({ message, args, channel, commandName }: MessageCommand) {
    const { isGlobal } = modeAliases[commandName];
    const { user, mods, flags } = parseOsuArguments(message, args, Mode.OSU);

    const page = Number(flags.p ?? flags.page ?? 1) - 1;
    const reply = await getEmbeds(user.beatmapId ?? undefined, message.author.id, mods, isGlobal, page, { message, client: message.client });
    await channel.send(reply);
}

export async function runApplication({ interaction }: ApplicationCommand) {
    await interaction.deferReply();

    const { user, mods } = getCommandArgs(interaction);
    const isGlobal = (interaction.data.getString("type") ?? "global") === "global";
    const page = (interaction.data.getNumber("page") ?? 1) - 1;

    const reply = await getEmbeds(user.beatmapId ?? undefined, interaction.member.user.id, mods, isGlobal, page, { channelId: interaction.channelId, client: interaction.client });
    await interaction.editReply(reply);
}

async function getEmbeds(beatmapId: string | undefined, authorId: string, mods: any, isGlobal: boolean, page: number, context: any): Promise<MessageReplyOptions> {
    const resolvedBeatmapId = beatmapId ?? (await getBeatmapIdFromContext(context));
    if (typeof resolvedBeatmapId === "undefined" || resolvedBeatmapId === null) {
        return {
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: "Uh oh! :x:",
                    description: "It seems like the beatmap ID couldn't be found :(\n",
                },
            ],
        };
    }

    const beatmapRequest = await client.safeParse(client.beatmaps.getBeatmap(Number(resolvedBeatmapId)));
    if (!beatmapRequest.success) {
        return {
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: "Uh oh! :x:",
                    description: "It seems like this beatmap doesn't exist! :(",
                },
            ],
        };
    }
    const beatmap = beatmapRequest.data;

    if (beatmap.status === "pending" || beatmap.status === "wip" || beatmap.status === "graveyard") {
        return {
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: "Uh oh! :x:",
                    description: "It seems like this beatmap's leaderboard doesn't exist! :(",
                },
            ],
        };
    }

    const scores = await getBeatmapTopScores({
        beatmapId: Number(resolvedBeatmapId),
        mode: beatmap.mode,
        isGlobal,
        mods: mods.name ? (mods.name.match(/.{1,2}/g) as Array<Mod>) : undefined,
    });

    if (scores.length === 0) {
        return {
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: "Uh oh! :x:",
                    description: "It seems like this beatmap's leaderboard doesn't exist! :(",
                },
            ],
        };
    }

    const embedOptions: LeaderboardBuilderOptions = {
        type: EmbedBuilderType.LEADERBOARD,
        initiatorId: authorId,
        page,
        beatmap,
        scores,
    };

    const embeds = await leaderboardBuilder(embedOptions);
    const messageOptions: MessageReplyOptions = {
        embeds,
        components: createPaginationActionRow(embedOptions),
    };

    // Cache for pagination if it's an application command
    if (context.channelId) {
        // This is a bit of a hack to handle caching for application commands
        // We'll need to cache after the reply is sent
        setTimeout(async () => {
            const sentMessage = await context.client.channels.getMessage(context.channelId, context.id);
            if (sentMessage) {
                await ButtonStateCache.set(sentMessage.id, embedOptions);
            }
        }, 100);
    }

    return messageOptions;
}

export const data = {
    name: "leaderboard",
    description: "Display the leaderboard of a beatmap",
    hasPrefixVariant: true,
    application: {
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: "type",
                description: "The type of the leaderboard.",
                choices: [
                    { name: "Global Leaderboard", value: "global" },
                    { name: "Turkish Leaderboard", value: "country" },
                ],
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "map",
                description: "Specify a beatmap link (eg: https://osu.ppy.sh/b/72727)",
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "mods",
                description: "Specify a mods combination.",
                min_length: 2,
            },
            {
                type: ApplicationCommandOptionType.NUMBER,
                name: "page",
                description: "Specify a page.",
            },
        ],
    },
    message: {
        aliases: Object.keys(modeAliases),
    },
} satisfies CommandData;
