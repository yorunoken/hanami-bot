import { expect, test, describe, beforeAll, mock, afterAll } from "bun:test";
import { run } from "../../../src/commands/osu/recent";
import { CommandContext } from "../../../src/utils/command-context";
import { initializeOsuApi } from "../../../src/utils/initialize";
import { initializeRedis, closeRedis } from "../../../src/utils/cache";

describe("recent command", () => {
    beforeAll(async () => {
        await initializeOsuApi();
        await initializeRedis();
    });

    afterAll(async () => {
        await closeRedis();
    });

    test("runs and returns an embed for a valid user (mrekk)", async () => {
        const mockClient = {
            rest: {
                getOriginalInteractionResponse: mock(() => Promise.resolve({ id: "test_msg_id" }))
            }
        } as any;

        const mockMessage = {
            author: { id: "123", username: "test_user" },
            channelId: "channel123",
            reply: mock(() => Promise.resolve({ edit: mock(() => Promise.resolve({ id: "test_msg_id" })) })),
        } as any;

        // Use a well-known active user to ensure they have recent plays, or at least test it handles correctly
        const ctx = new CommandContext(mockClient, undefined, mockMessage, ["mrekk"], "!", "recent");
        
        ctx.defer = mock(() => Promise.resolve());
        
        await run(ctx);

        expect(ctx.defer).toHaveBeenCalled();
        expect(mockMessage.reply).toHaveBeenCalled();
        
        const replyCall = mockMessage.reply.mock.calls[0][0];
        
        // It should either return an embed with their plays, OR an embed saying they don't have recent plays.
        expect(replyCall.embeds).toBeDefined();
        expect(replyCall.embeds.length).toBeGreaterThan(0);
        
        const firstEmbed = replyCall.embeds[0];
        if (firstEmbed.title === "Uh oh! :x:") {
            // It's possible mrekk hasn't played in 24 hours, so it's a valid response.
            expect(firstEmbed.description).toContain("doesn't have any recent plays");
        } else {
            // It should contain 'mrekk' in the author name
            expect(firstEmbed.author.name).toContain("mrekk");
            // It should contain pagination components
            expect(replyCall.components).toBeDefined();
        }
    }, 15000); // 15 seconds timeout since we're hitting live APIs

    test("runs and returns an error embed for a non-existent user", async () => {
        const mockClient = {} as any;

        const mockMessage = {
            author: { id: "123", username: "test_user" },
            channelId: "channel123",
            reply: mock(() => Promise.resolve({ edit: mock(() => Promise.resolve({ id: "test_msg_id" })) })),
        } as any;

        const fakeUsername = "asdfghjklqwertyuiop123456789";
        const ctx = new CommandContext(mockClient, undefined, mockMessage, [fakeUsername], "!", "recent");
        
        ctx.defer = mock(() => Promise.resolve());
        
        await run(ctx);

        const replyCall = mockMessage.reply.mock.calls[0][0];
        
        expect(replyCall.embeds).toBeDefined();
        expect(replyCall.embeds[0].title).toBe("Uh oh! :x:");
        expect(replyCall.embeds[0].description).toContain("doesn't exist");
    }, 15000);
});
