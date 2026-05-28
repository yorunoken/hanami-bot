import { profileBuilder } from "@builders";
import { MessageReplyOptions } from "@lilybird/transformers";
import { EmbedBuilderType } from "@type/builders";
import { SuccessUser, UserType } from "@type/command-args";
import { CommandData, MessageCommand, ApplicationCommand } from "@type/commands";
import { Mode } from "@type/osu";
import { getCommandArgs, parseOsuArguments } from "@utils/args";
import { client } from "@utils/initialize";
import { ApplicationCommandOptionType, EmbedType } from "lilybird";

export async function runMessage({ message, args, channel, commandName }: MessageCommand) {
    if (commandName === "profile") commandName = Mode.OSU;

    const { user } = parseOsuArguments(message, args, commandName as Mode);
    if (user.type === UserType.FAIL) {
        await channel.send(user.failMessage);
        return;
    }

    const reply = await getEmbeds(user, message.author.id);
    await channel.send(reply);
}

export async function runApplication({ interaction }: ApplicationCommand) {
    await interaction.deferReply();

    const { user } = getCommandArgs(interaction);
    if (user.type === UserType.FAIL) {
        await interaction.editReply(user.failMessage);
        return;
    }

    const reply = await getEmbeds(user, interaction.member.user.id);
    await interaction.editReply(reply);
}

async function getEmbeds(user: SuccessUser, authorId: string): Promise<MessageReplyOptions> {
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

    const embeds = profileBuilder({
        type: EmbedBuilderType.PROFILE,
        initiatorId: authorId,
        user: osuUser,
        mode: user.mode,
    });

    return { embeds };
}

export const data = {
    name: "profile",
    description: "Display statistics of a user.",
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
                type: ApplicationCommandOptionType.USER,
                name: "discord",
                description: "Specify a linked Discord user",
            },
        ],
    },
    message: {
        aliases: ["osu", "mania", "taiko", "fruits"],
    },
} satisfies CommandData;
