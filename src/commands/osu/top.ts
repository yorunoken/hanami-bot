import { playBuilder } from "@builders";
import { MessageReplyOptions } from "@lilybird/transformers";
import { EmbedBuilderType } from "@type/builders";
import { SuccessUser, UserType } from "@type/command-args";
import { CommandData, MessageCommand, ApplicationCommand } from "@type/commands";
import { Mode, PlayType } from "@type/osu";
import { getCommandArgs, parseOsuArguments } from "@utils/args";
import { createPaginationActionRow } from "@utils/pagination";
import { getUserScores } from "@utils/score-api";
import { client } from "@utils/initialize";
import { ApplicationCommandOptionType, EmbedType } from "lilybird";
import type { PlaysBuilderOptions } from "@type/builders";
import type { Mod } from "osu-web.js";

const modeAliases: Record<string, { mode: Mode }> = {
    t: { mode: Mode.OSU },
    top: { mode: Mode.OSU },
    topt: { mode: Mode.TAIKO },
    topm: { mode: Mode.MANIA },
    topc: { mode: Mode.FRUITS },
    toptaiko: { mode: Mode.TAIKO },
    topmania: { mode: Mode.MANIA },
    topcatch: { mode: Mode.FRUITS },
};

export async function runMessage({ message, args, channel, commandName, index }: MessageCommand & { index?: number }) {
    const { mode } = modeAliases[commandName];
    const { user, mods, flags } = parseOsuArguments(message, args, mode);
    if (user.type === UserType.FAIL) {
        await channel.send(user.failMessage);
        return;
    }

    let page = Number(flags.p ?? flags.page) - 1 || undefined;
    if (typeof page === "undefined" && typeof index === "undefined") page = 0;
    const isPage = typeof page !== "undefined";

    const reply = await getEmbeds(user, message.author.id, index, page, isPage, mods);
    await channel.send(reply);
}

export async function runApplication({ interaction }: ApplicationCommand) {
    await interaction.deferReply();

    const { user } = getCommandArgs(interaction);
    if (user.type === UserType.FAIL) {
        await interaction.editReply(user.failMessage);
        return;
    }

    let index = interaction.data.getInteger("index");
    let page = interaction.data.getInteger("page");

    if (typeof page === "undefined" && typeof index === "undefined") page = 1;
    if (page) page -= 1;
    if (index) index -= 1;

    const mod = interaction.data.getString("mods") as Mod;
    const modsAction = interaction.data.getString("mods_action");

    const mods = { exclude: false, forceInclude: false, include: false, name: mod };
    switch (modsAction) {
        case "include":
            mods.include = true;
            break;
        case "force_include":
            mods.forceInclude = true;
            break;
        case "exclude":
            mods.exclude = true;
            break;
        default:
            mods.include = true;
    }

    const isPage = typeof page !== "undefined";
    const reply = await getEmbeds(user, interaction.member.user.id, index, page, isPage, mods);
    await interaction.editReply(reply);
}

async function getEmbeds(user: SuccessUser, authorId: string, index: number | undefined, page: number | undefined, isPage: boolean, mods: any): Promise<MessageReplyOptions> {
    const osuUserRequest = await client.safeParse(client.users.getUser(user.banchoId, { urlParams: { mode: user.mode } }));
    if (!osuUserRequest.success) {
        return {
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: "Uh oh! :x:",
                    description: `It seems like the user **\`${user.banchoId}\`** doesn't exist! :(`,
                },
            ],
        };
    }
    const osuUser = osuUserRequest.data;

    const plays = await getUserScores(osuUser.id, PlayType.BEST, { query: { mode: user.mode, limit: 100 } }, user.authorDb);

    if (plays.length === 0) {
        return {
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: "Uh oh! :x:",
                    description: `It seems like \`${osuUser.username}\` doesn't have any plays, maybe they should go set some :)`,
                },
            ],
        };
    }

    const embedOptions: PlaysBuilderOptions = {
        type: EmbedBuilderType.PLAYS,
        initiatorId: authorId,
        user: osuUser,
        mode: user.mode,
        isMultiple: true,
        authorDb: user.authorDb,
        isPage,
        page,
        index,
        mods,
        plays,
    };

    const embeds = await playBuilder(embedOptions);
    return {
        embeds,
        components: createPaginationActionRow(embedOptions),
    };
}

export const data = {
    name: "top",
    description: "Display top play(s) of a user.",
    hasPrefixVariant: true,
    application: {
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: "username",
                description: "Specify an osu! username",
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "mode",
                description: "Specify an osu! mode",
                choices: [
                    { name: "osu", value: "osu" },
                    { name: "mania", value: "mania" },
                    { name: "taiko", value: "taiko" },
                    { name: "ctb", value: "fruits" },
                ],
            },
            {
                type: ApplicationCommandOptionType.INTEGER,
                name: "index",
                description: "Specify an index.",
                min_value: 1,
                max_value: 100,
            },
            {
                type: ApplicationCommandOptionType.INTEGER,
                name: "page",
                description: "Specify a page, defaults to 1.",
                min_value: 1,
                max_value: 20,
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "mods",
                description: "Specify a mods combination.",
                min_length: 2,
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "mods_action",
                description: "Specify the action to perform on the mods combination.",
                choices: [
                    {
                        name: "Include",
                        value: "include",
                    },
                    {
                        name: "Force Include",
                        value: "force_include",
                    },
                    {
                        name: "Exclude",
                        value: "exclude",
                    },
                ],
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: "grade",
                description: "Consider scores only with this grade.",
                choices: ["SS", "S", "A", "B", "C", "D"].map((grade) => ({ name: grade, value: grade })),
            },
            {
                type: ApplicationCommandOptionType.USER,
                name: "discord",
                description: "Specify a linked Discord user",
            },
        ],
    },
    message: {
        aliases: Object.keys(modeAliases),
    },
} satisfies CommandData;
