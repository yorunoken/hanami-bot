import { DEFAULT_PREFIX, wysiEmoji } from "@utils/constants";
import { commandAliasesCache, commandsCache } from "@utils/cache";
import { logger } from "@utils/logger";
import { getEntry, insertData } from "@utils/database";
import { Tables } from "@type/database";
import { EmbedType } from "lilybird";
import type { Message } from "@lilybird/transformers";
import type { Event } from "@lilybird/handlers";
import { guildPrefixesCache, cooldownsCache } from "@utils/cache";
import { deprecatedEmbed } from "embed-builders/deprecated-prefix";

export default {
    event: "messageCreate",
    run,
} satisfies Event<"messageCreate">;

const CHANCE_TO_SEND_CUTE_KITTY_CAT_I_LOVE_CATS = 0.2;

async function run(message: Message): Promise<void> {
    const { content, guildId, client, author } = message;
    if (!content || !guildId || author.bot) return;

    // I guess this is fine since guilds can have a max of 10 prefixes
    const guildPrefixes: Array<string> = guildPrefixesCache.get(guildId) ?? DEFAULT_PREFIX;
    let chosenPrefix: string | null = null;
    for (const guildPrefix of guildPrefixes) {
        if (content.startsWith(guildPrefix)) {
            chosenPrefix = guildPrefix;
            break;
        }
    }

    if (chosenPrefix === null) {
        // nyann :3333
        if ((content === ":3" || content === "3:") && Math.random() < CHANCE_TO_SEND_CUTE_KITTY_CAT_I_LOVE_CATS) {
            await message.reply(message.content === ":3" ? "3:" : ":3", { allowed_mentions: { replied_user: false, parse: [], roles: [], users: [] } });
            return;
        }

        const wysiArr = ["727", "7,27", "72,7", "72.7", "7.27", "wysi"];
        if (wysiArr.some((wysi) => content.toLowerCase() === wysi)) {
            await message.react(wysiEmoji, true);
        }
        return;
    }

    const args = content.slice(chosenPrefix.length).trim().split(/ +/g);
    let commandName = args.shift()?.toLowerCase();
    if (typeof commandName === "undefined") return;

    let index: number | undefined;
    const match = /(\D+)(\d+)/.exec(commandName);
    if (match) {
        const [, extractedCommandName, extractedNumber] = match;
        commandName = extractedCommandName;
        index = parseInt(extractedNumber) - 1;
    }

    const alias = commandAliasesCache.get(commandName);
    const command = alias ? commandsCache.get(alias) : commandsCache.get(commandName);

    if (!command) return; // Removed fuzzy matching

    const { data } = command;

    // Check cooldown
    const cooldownExpiry = cooldownsCache.get(`${data.name}:${author.id}`);
    if (cooldownExpiry && cooldownExpiry > Date.now()) {
        const remainingTime = cooldownExpiry - Date.now();
        try {
            const sentMessage = await message.reply({
                content: `Please wait \`${remainingTime}ms\` before executing this command again`,
            });
            setTimeout(async () => {
                try {
                    await sentMessage.delete();
                } catch (deleteError) {
                    logger.warn("Could not delete cooldown message", { messageId: sentMessage.id, error: deleteError });
                }
            }, 1000);
        } catch (replyError) {
            logger.warn("Could not send cooldown message", { error: replyError });
        }
        return;
    }

    // return simple deprecation notice.
    if (!data.hasPrefixVariant || !command.runMessage) {
        const embed = deprecatedEmbed(data.name);
        await message.reply({ embeds: embed });
        return;
    }

    const channel = await message.fetchChannel();
    if (!channel.isText()) return;

    // normally this would need `await`, but I don't want the bot to wait while it's sending the request.
    client.rest.triggerTypingIndicator(channel.id);

    try {
        await command.runMessage({ client: client, message, args, prefix: chosenPrefix, index, commandName, channel });

        const guild = await client.rest.getGuild(guildId);
        await logger.info(`[${guild.name}] ${author.username} used prefix command \`${data.name}\``, {
            guildId,
            guildName: guild.name,
            userId: author.id,
            username: author.username,
            command: data.name,
            prefix: chosenPrefix,
        });
    } catch (error) {
        // handle errors
        const err = error as Error;

        await message.reply(`Oops, you came across an error!\nDon't worry, an error log has been sent to the owner of this bot.`, {
            allowed_mentions: { replied_user: false, parse: [], roles: [], users: [] },
        });

        const guild = await client.rest.getGuild(guildId);

        await client.rest.createMessage(process.env.ERROR_CHANNEL_ID, {
            content: `<@${process.env.OWNER_ID}> STACK ERROR, GET YOUR ASS TO WORK`,
            embeds: [
                {
                    type: EmbedType.Rich,
                    title: `Runtime error on command: ${data.name}`,
                    fields: [
                        {
                            name: "User",
                            value: `<@${author.id}> (${author.username})`,
                        },
                        {
                            name: "Guild",
                            value: `[${guild.name}](https://discord.com/channels/${guildId}/${message.channelId})`,
                        },
                        {
                            name: "Message",
                            value: content,
                        },
                        {
                            name: "Error",
                            value: err.stack ?? "undefined (look at logs)",
                        },
                    ],
                },
            ],
        });

        await logger.error(`[${guild.name}] ${author.username} had an error in prefix command \`${data.name}\``, err, {
            guildId,
            guildName: guild.name,
            userId: author.id,
            username: author.username,
            command: data.name,
            prefix: chosenPrefix,
        });
    } finally {
        const docs = getEntry(Tables.COMMAND, data.name);
        if (docs === null) insertData({ table: Tables.COMMAND, data: [{ key: "count", value: 1 }], id: data.name });
        else insertData({ table: Tables.COMMAND, data: [{ key: "count", value: Number(docs.count ?? 0) + 1 }], id: docs.id });
    }

    // set cooldown
    cooldownsCache.set(`${data.name}:${author.id}`, Date.now() + (data.message?.cooldown ?? 1000));
}
