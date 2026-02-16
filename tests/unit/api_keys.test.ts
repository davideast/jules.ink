import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { GET } from "../../ui/src/pages/api/keys";
import fs from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

describe("API Keys Endpoint", () => {
  let originalEnv: string | null = null;

  beforeAll(async () => {
    try {
      originalEnv = await fs.readFile(ENV_PATH, "utf-8");
    } catch {
      originalEnv = null;
    }
  });

  afterAll(async () => {
    if (originalEnv !== null) {
      await fs.writeFile(ENV_PATH, originalEnv);
    } else {
      await fs.unlink(ENV_PATH).catch(() => {});
    }
  });

  test("GET /api/keys should not return keys", async () => {
    await fs.writeFile(ENV_PATH, "GEMINI_API_KEY=test_gemini\nJULES_API_KEY=test_jules\n");

    // We need to clear any cached env if possible, but readEnv reads from file every time

    const response = await GET({} as any);
    const data = await response.json();

    expect(data.configured).toBe(true);
    expect(data.geminiKey).toBeUndefined();
    expect(data.julesKey).toBeUndefined();
  });

  test("GET /api/keys should return configured: false if keys are missing", async () => {
    await fs.writeFile(ENV_PATH, "");

    const response = await GET({} as any);
    const data = await response.json();

    expect(data.configured).toBe(false);
    expect(data.geminiKey).toBeUndefined();
    expect(data.julesKey).toBeUndefined();
  });
});
