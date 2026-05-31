import { expect, test, describe } from "bun:test";
import { safeParse } from "../../src/utils/safe-parse";

describe("safeParse", () => {
    test("returns success with valid data", async () => {
        const promise = Promise.resolve({ user: "yorunoken", score: 1000 });
        const result = await safeParse(promise);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.user).toBe("yorunoken");
            expect(result.data.score).toBe(1000);
        }
    });

    test("returns false when promise resolves with an error object", async () => {
        const promise = Promise.resolve({ error: "Invalid user" });
        const result = await safeParse(promise);

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    test("returns false when promise rejects", async () => {
        const promise = Promise.reject(new Error("Network error"));
        const result = await safeParse(promise);

        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
    });

    test("handles non-object successful resolves gracefully", async () => {
        const promise = Promise.resolve("Just a string");
        const result = await safeParse(promise);

        expect(result.success).toBe(true);
        expect(result.data).toBe("Just a string");
    });
});
