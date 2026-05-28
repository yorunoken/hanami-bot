import type { ApplicationCommandData, GuildInteraction, GuildTextChannel, Message } from "@lilybird/transformers";
import type { Client, ApplicationCommand } from "lilybird";

type Awaitable<T> = Promise<T> | T;

interface MessageData {
    cooldown?: number;
    usage?: string;
    aliases?: Array<string>;
    details?: string;
    flags?: string;
}

export interface CommandData {
    name: string;
    description: string;
    hasPrefixVariant: boolean;
    message?: MessageData;
    application?: Omit<ApplicationCommand.Create.ApplicationCommandJSONParams, "name" | "description">;
}

export interface MessageCommand {
    client: Client;
    message: Message;
    args: Array<string>;
    prefix: string;
    index: number | undefined;
    commandName: string;
    channel: GuildTextChannel;
}

export interface ApplicationCommand {
    interaction: GuildInteraction<ApplicationCommandData>;
}

export interface CommandFileData {
    data: CommandData;
    runMessage?: (ctx: MessageCommand) => Awaitable<void>;
    runApplication: (ctx: ApplicationCommand) => Awaitable<void>;
}
