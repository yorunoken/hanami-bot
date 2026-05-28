import { getEntry, insertData } from "@utils/database";
import { commandsCache } from "@utils/cache";
import { logger } from "@utils/logger";
import { ButtonStateCache } from "@utils/cache";
import { EmbedBuilderType } from "@type/builders";
import { createPaginationActionRow } from "@utils/pagination";
import { PaginationManager } from "@utils/pagination";
import { Tables } from "@type/database";
import { leaderboardBuilder, playBuilder, compareBuilder } from "@builders";
import { EmbedType } from "lilybird";
import type { Interaction, InteractionReplyOptions } from "@lilybird/transformers";
import type { Event } from "@lilybird/handlers";
import type { EmbedBuilderOptions } from "@type/builders";

export default {
    event: "interactionCreate",
    run,
} satisfies Event<"interactionCreate">;

async function run(interaction: Interaction): Promise<void> {
    await handleButton(interaction);

    if (interaction.isApplicationCommandInteraction() && interaction.inGuild()) {
        const { user } = interaction.member;

        const command = commandsCache.get(interaction.data.name);
        if (!command) return;

        try {
            await command.runApplication({ interaction });
            const guild = await interaction.client.rest.getGuild(interaction.guildId);
            await logger.info(`[${guild.name}] ${user.username} used slash command \`${command.data.name}\`${interaction.data.subCommand ? ` -> \`${interaction.data.subCommand}\`` : ""}`, {
                guildId: interaction.guildId,
                guildName: guild.name,
                userId: user.id,
                username: user.username,
                command: command.data.name,
                subCommand: interaction.data.subCommand,
            });
        } catch (error) {
            const err = error as Error;

            const guild = await interaction.client.rest.getGuild(interaction.guildId);

            await interaction.reply(`Oops, you came across an error!\nHere's a summary of it:\n\`\`\`${err.stack}\`\`\`\nDon't worry, the same error log has been sent to the owner of this bot.`);

            await interaction.client.rest.createMessage(interaction.channelId, {
                content: `<@${process.env.OWNER_ID}> STACK ERROR, GET YOUR ASS TO WORK`,
                embeds: [
                    {
                        type: EmbedType.Rich,
                        title: `Runtime error on command (slash): ${command.data.name}`,
                        fields: [
                            {
                                name: "User",
                                value: `<@${user.id}> (${user.username})`,
                            },
                            {
                                name: "Guild",
                                value: `[${guild.name}](https://discord.com/channels/${interaction.guildId}/${interaction.channelId})`,
                            },
                            {
                                name: "Error",
                                value: err.stack ?? "undefined (look at logs)",
                            },
                        ],
                    },
                ],
            });

            await logger.error(`[${guild.name}] ${user.username} had an error in slash command \`${command.data.name}\`${interaction.data.subCommand ? ` -> \`${interaction.data.subCommand}\`` : ""}`, err, {
                guildId: interaction.guildId,
                guildName: guild.name,
                userId: user.id,
                username: user.username,
                command: command.data.name,
                subCommand: interaction.data.subCommand,
            });
        } finally {
            const docs = getEntry(Tables.COMMAND_SLASH, interaction.data.name);
            if (docs === null) insertData({ table: Tables.COMMAND_SLASH, data: [{ key: "count", value: 1 }], id: command.data.name });
            else insertData({ table: Tables.COMMAND_SLASH, data: [{ key: "count", value: Number(docs.count ?? 0) + 1 }], id: docs.id });
        }
    }
}

async function handleButton(interaction: Interaction): Promise<void> {
    if (!interaction.isMessageComponentInteraction() || !interaction.data.isButton()) return;
    if (!interaction.inGuild()) return;

    const builderOptions = await ButtonStateCache.get<EmbedBuilderOptions>(interaction.message.id);
    if (builderOptions === null || builderOptions === undefined) {
        await interaction.reply({ ephemeral: true, content: "This button will not work because the message was created before a bot restart, so its data has been lost." });
        return;
    }

    if (builderOptions.initiatorId !== interaction.member.user.id) {
        await interaction.reply({ ephemeral: true, content: "You need to be the person who initialized the command to be able to click the buttons." });
        return;
    }

    // Temporarily disable all buttons during processing
    await interaction.deferComponentReply();

    if (interaction.data.id === "wildcard-page" || interaction.data.id === "wildcard-index") {
        await interaction.editReply({ content: "This feature has not been implemented yet." });
        return;
    }

    const buttonAction = PaginationManager.parseButtonAction(interaction.data.id);
    if (!buttonAction) {
        await interaction.editReply({ content: "Unknown button action." });
        return;
    }

    const updatedOptions = PaginationManager.updateBuilderOptions(builderOptions, buttonAction.action, buttonAction.type);

    await ButtonStateCache.set(interaction.message.id, updatedOptions);

    const options: InteractionReplyOptions = {};

    // Build the appropriate embed
    switch (updatedOptions.type) {
        case EmbedBuilderType.LEADERBOARD:
            options.embeds = await leaderboardBuilder(updatedOptions as any);
            break;
        case EmbedBuilderType.PLAYS:
            options.embeds = await playBuilder(updatedOptions as any);
            break;
        case EmbedBuilderType.COMPARE:
            options.embeds = await compareBuilder(updatedOptions as any);
            break;
        default:
            await interaction.reply({ ephemeral: true, content: "Unsupported builder type for pagination." });
            return;
    }

    // Create the action row with proper disabled states
    options.components = createPaginationActionRow(updatedOptions);

    await interaction.editReply(options);
}
