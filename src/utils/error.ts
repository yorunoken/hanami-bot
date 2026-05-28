import { EmbedType, Client } from "lilybird";
import { logger } from "@utils/logger";
import { GuildInteraction, Message, ApplicationCommandData } from "@lilybird/transformers";

interface CommandErrorContext {
    client: Client;
    interaction?: GuildInteraction<ApplicationCommandData>;
    message?: Message;
    commandName: string;
    subCommand?: string;
    content?: string;
    prefix?: string;
}

export async function handleCommandError(error: Error, ctx: CommandErrorContext): Promise<void> {
    const { client, interaction, message, commandName, subCommand, content, prefix } = ctx;
    const isInteraction = !!interaction;

    // Send reply to user
    try {
        if (isInteraction) {
            await interaction!.reply(`Oops, you came across an error!\nHere's a summary of it:\n\`\`\`${error.stack}\`\`\`\nDon't worry, the same error log has been sent to the owner of this bot.`);
        } else {
            await message!.reply(`Oops, you came across an error!\nDon't worry, an error log has been sent to the owner of this bot.`, {
                allowed_mentions: { replied_user: false, parse: [], roles: [], users: [] },
            });
        }
    } catch (replyError) {
        logger.error("Failed to send error reply to user", replyError as Error);
    }

    const guildId = isInteraction ? interaction!.guildId : message!.guildId;
    const channelId = isInteraction ? interaction!.channelId : message!.channelId;
    const user = isInteraction ? interaction!.member.user : message!.author;
    
    let guildName = "Unknown Guild";
    try {
        if (guildId) {
            const guild = await client.rest.getGuild(guildId);
            guildName = guild.name;
        }
    } catch {
        // Ignored
    }

    // Build fields
    const fields = [
        { name: "User", value: `<@${user.id}> (${user.username})` },
        { name: "Guild", value: `[${guildName}](https://discord.com/channels/${guildId}/${channelId})` },
    ];

    if (!isInteraction && content) {
        fields.push({ name: "Message", value: content.length > 1024 ? content.slice(0, 1021) + "..." : content });
    }

    fields.push({ name: "Error", value: error.stack ? (error.stack.length > 1024 ? error.stack.slice(0, 1021) + "..." : error.stack) : "undefined (look at logs)" });

    const cmdDisplayName = isInteraction && subCommand ? `${commandName} -> ${subCommand}` : commandName;

    try {
        await client.rest.createMessage(process.env.ERROR_CHANNEL_ID as string, {
            content: `<@${process.env.OWNER_ID}> STACK ERROR, GET YOUR ASS TO WORK`,
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: `Runtime error on command${isInteraction ? ' (slash)' : ''}: ${cmdDisplayName}`,
                    fields,
                },
            ],
        });
    } catch (logChannelError) {
        logger.error("Failed to send error to log channel", logChannelError as Error);
    }

    const logPrefix = `[${guildName}] ${user.username} had an error in ${isInteraction ? 'slash' : 'prefix'} command \`${cmdDisplayName}\``;
    await logger.error(logPrefix, error, {
        guildId,
        guildName,
        userId: user.id,
        username: user.username,
        command: commandName,
        subCommand,
        prefix,
    });
}
