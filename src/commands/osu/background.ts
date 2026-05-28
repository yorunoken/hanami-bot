import { backgroundBuilder } from "@builders";
import { EmbedBuilderType } from "@type/builders";
import { CommandData, MessageCommand, ApplicationCommand } from "@type/commands";
import { Mode } from "@type/osu";
import { getCommandArgs, parseOsuArguments } from "@utils/args";
import { client } from "@utils/initialize";
import { getBeatmapIdFromContext } from "@utils/osu";
import { ApplicationCommandOptionType, EmbedType } from "lilybird";

export async function runMessage({ message, channel, args }: MessageCommand) {
    const { user } = parseOsuArguments(message, args, Mode.OSU);

    const beatmapId = user.beatmapId ?? (await getBeatmapIdFromContext({ message, client: message.client }));
    const embeds = await getEmbed(beatmapId, message.author.id);
    await channel.send({ embeds });
}

export async function runApplication({ interaction }: ApplicationCommand) {
    await interaction.deferReply();

    const { user } = getCommandArgs(interaction);

    const beatmapId = user.beatmapId ?? (await getBeatmapIdFromContext({ channelId: interaction.channelId, client: interaction.client }));
    const embeds = await getEmbed(beatmapId, interaction.member.user.id);
    await interaction.editReply({ embeds });
}

async function getEmbed(beatmapId: string | number | null, authorId: string) {
    if (typeof beatmapId === "undefined" || beatmapId === null) {
        return [
            {
                type: EmbedType.Rich,
                title: "Uh oh! :x:",
                description: "It seems like the beatmap ID couldn't be found :(\n",
            },
        ];
    }

    const beatmapRequest = await client.safeParse(client.beatmaps.getBeatmap(Number(beatmapId)));
    if (!beatmapRequest.success) {
        return [
            {
                type: EmbedType.Rich,
                title: "Uh oh! :x:",
                description: "It seems like this beatmap doesn't exist! :(",
            },
        ];
    }
    const beatmap = beatmapRequest.data;

    const embeds = backgroundBuilder({
        type: EmbedBuilderType.BACKGROUND,
        initiatorId: authorId,
        beatmap,
    });
    return embeds;
}

export const data = {
    name: "background",
    description: "Display background of a beatmap.",
    hasPrefixVariant: true,
    application: {
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: "map",
                description: "Specify a beatmap link (eg: https://osu.ppy.sh/b/72727)",
            },
        ],
    },
    message: {
        aliases: ["bg"],
    },
} satisfies CommandData;
