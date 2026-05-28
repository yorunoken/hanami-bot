import { CommandData } from "@type/commands";

const voteLink = "https://top.gg/bot/995999045157916763";
const voteString = `You can vote for the bot using the following link:\n${voteLink}`;

import { CommandContext } from "@utils/command-context";

export async function run(ctx: CommandContext) {
    await ctx.reply(voteString);
}

export const data = {
    name: "vote",
    description: "Vote for the bot.",
    hasPrefixVariant: true,
} satisfies CommandData;
