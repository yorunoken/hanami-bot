import { CommandData, MessageCommand, ApplicationCommand } from "@type/commands";

const voteLink = "https://top.gg/bot/995999045157916763";
const voteString = `You can vote for the bot using the following link:\n${voteLink}`;

export async function runMessage({ message }: MessageCommand) {
    await message.reply(voteString);
}

export async function runApplication({ interaction }: ApplicationCommand) {
    await interaction.reply(voteString);
}

export const data = {
    name: "vote",
    description: "Vote for the bot.",
    hasPrefixVariant: true,
} satisfies CommandData;
