import type { ApplicationCommandData, GuildInteraction, GuildTextChannel, Message } from "@lilybird/transformers";
import type { Client, ApplicationCommand as LilybirdApplicationCommand } from "lilybird";
import type { CommandContext } from "@utils/command-context";

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
    isDeprecatedPrefix?: boolean;
    message?: MessageData;
    application?: Omit<LilybirdApplicationCommand.Create.ApplicationCommandJSONParams, "name" | "description">;
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
    runApplication?: (ctx: ApplicationCommand) => Awaitable<void>;
    run?: (ctx: CommandContext) => Awaitable<void>;
}
