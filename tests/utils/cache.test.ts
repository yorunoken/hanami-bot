import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import {
    initializeRedis,
    closeRedis,
    ButtonStateCache,
    StateCache
} from "../../src/utils/cache";

describe("Cache Utilities", () => {
    beforeAll(async () => {
        // Use the real thing!
        // We ensure Redis is initialized before tests run
        await initializeRedis();
    });

    afterAll(async () => {
        // Clean up any test artifacts
        await StateCache.del("test_state_123");
        await closeRedis();
    });

    describe("ButtonStateCache", () => {
        test("sets and gets button state successfully", async () => {
            const messageId = "test_msg_999";
            const stateObj = { page: 1, type: "test" };

            // Set state
            const setSuccess = await ButtonStateCache.set(messageId, stateObj);
            expect(setSuccess).toBe(true);

            // Get state
            const retrievedState = await ButtonStateCache.get<{ page: number; type: string }>(messageId);
            expect(retrievedState).not.toBeNull();
            expect(retrievedState?.page).toBe(1);
            expect(retrievedState?.type).toBe("test");
        });

        test("returns null for non-existent button state", async () => {
            const retrievedState = await ButtonStateCache.get("non_existent_msg_000");
            expect(retrievedState).toBeNull();
        });
    });

    describe("StateCache", () => {
        test("sets, gets, and deletes state successfully", async () => {
            const stateId = "test_state_123";
            const discordId = "123456789012345678";

            // Set state
            const setSuccess = await StateCache.set(stateId, discordId);
            expect(setSuccess).toBe(true);

            // Get state
            const retrievedId = await StateCache.get(stateId);
            expect(retrievedId).toBe(discordId);

            // Delete state
            const delSuccess = await StateCache.del(stateId);
            expect(delSuccess).toBe(true);

            // Verify deletion
            const retrievedAfterDel = await StateCache.get(stateId);
            expect(retrievedAfterDel).toBeNull();
        });
    });
});
