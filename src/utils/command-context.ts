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

    async sendWithPagination(options: any, embedOptions: any): Promise<void> {
        const { ButtonStateCache } = await import("./cache");
        const sentMessage = await this.editReply(options);
        
        if (this.isMessage && sentMessage && sentMessage.id) {
            await ButtonStateCache.set(sentMessage.id, embedOptions);
        } else if (this.isInteraction) {
            setTimeout(async () => {
                try {
                    const message = await this.client.rest.getOriginalInteractionResponse(this.interaction!.applicationId, this.interaction!.token);
                    if (message && message.id) {
                        await ButtonStateCache.set(message.id, embedOptions);
                    }
                } catch {
                    // Ignore errors if the message couldn't be fetched or cached
                }
            }, 100);
        }
    }
}
