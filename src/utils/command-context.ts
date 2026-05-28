import { Client } from "lilybird";
import { GuildInteraction, Message, ApplicationCommandData, GuildTextChannel, User } from "@lilybird/transformers";

export class CommandContext {
    public readonly isInteraction: boolean;
    public readonly isMessage: boolean;

    constructor(
        public readonly client: Client,
        public readonly interaction?: GuildInteraction<ApplicationCommandData>,
        public readonly message?: Message,
        public readonly args: Array<string> = [],
        public readonly prefix?: string,
        public readonly commandName?: string,
        public readonly channel?: GuildTextChannel,
        public readonly index?: number
    ) {
        this.isInteraction = !!interaction;
        this.isMessage = !!message;
    }

    get user(): User {
        if (this.isInteraction) return this.interaction!.member.user;
        return this.message!.author;
    }

    get guildId(): string | undefined {
        if (this.isInteraction) return this.interaction!.guildId;
        return this.message!.guildId;
    }

    get channelId(): string {
        if (this.isInteraction) return this.interaction!.channelId;
        return this.message!.channelId;
    }

    private sentMessage?: any;

    async defer(): Promise<void> {
        if (this.isInteraction) {
            await this.interaction!.deferReply();
        } else if (this.channelId) {
            await this.client.rest.triggerTypingIndicator(this.channelId);
        }
    }

    async reply(options: any): Promise<any> {
        if (this.isInteraction) {
            this.sentMessage = await this.interaction!.reply(options as any);
            return this.sentMessage;
        } else {
            this.sentMessage = await this.message!.reply(options as any);
            return this.sentMessage;
        }
    }

    async editReply(options: any): Promise<any> {
        if (this.isInteraction) {
            return await this.interaction!.editReply(options as any);
        } else {
            if (this.sentMessage) {
                return await this.sentMessage.edit(options as any);
            } else {
                return await this.reply(options);
            }
        }
    }
}
