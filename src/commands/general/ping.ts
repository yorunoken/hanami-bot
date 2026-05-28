import { CommandData, MessageCommand, ApplicationCommand } from "@type/commands";
import { client } from "@utils/initialize";

export async function runMessage({ message }: MessageCommand) {
    const newMessage = await message.reply({
        content: "🏓...",
    });

    const { ws, rest } = await message.client.ping();

    const osuDuration = await getOsuResponseTime();
    await newMessage.edit({
        content: `🏓 WebSocket: \`${ws.toFixed()}ms\` | Rest: \`${rest.toFixed()}ms\`\nosu! API: \`${osuDuration.toFixed()}ms\``,
    });
}

export async function runApplication({ interaction }: ApplicationCommand) {
    await interaction.deferReply();

    const { ws, rest } = await interaction.client.ping();

    const osuDuration = await getOsuResponseTime();
    await interaction.editReply({
        content: `🏓 WebSocket: \`${ws.toFixed()}ms\` | Rest: \`${rest.toFixed()}ms\`\nosu! API: \`${osuDuration.toFixed()}ms\``,
    });
}

async function getOsuResponseTime() {
    const userId = 38246594; // :>

    const osuStart = Date.now();
    await client.safeParse(client.users.getUser(userId));
    const osuEnd = Date.now();

    return osuEnd - osuStart;
}

export const data = { name: "ping", description: "Replies with a pong followed by latency information", hasPrefixVariant: true } satisfies CommandData;
