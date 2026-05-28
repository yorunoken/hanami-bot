import { CommandData, MessageCommand, ApplicationCommand } from "@type/commands";
import { ApplicationCommandOptionType } from "lilybird";
import { helpBuilder } from "@builders";

export async function runMessage({ message, args }: MessageCommand) {
    await message.reply({ embeds: helpBuilder(args[0]) });
}

export async function runApplication({ interaction }: ApplicationCommand) {
    await interaction.deferReply();

    const commandName = interaction.data.getString("command");
    await interaction.editReply({
        embeds: helpBuilder(commandName, true),
    });
}

export const data = {
    name: "help",
    description: "Get help about the bot or specific commands.",
    hasPrefixVariant: true,
    application: {
        options: [
            {
                name: "command",
                description: "Name of the command you want to get information on.",
                type: ApplicationCommandOptionType.STRING,
                required: false,
            },
        ],
    },
} satisfies CommandData;
