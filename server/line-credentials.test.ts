import { describe, it, expect } from "vitest";
import axios from "axios";
import { ENV } from "./_core/env";

/**
 * LINE Credential Validation Tests
 * Validates that LINE Messaging API credentials are correctly configured
 */

describe("LINE Credentials Validation", () => {
  it("should have LINE_CHANNEL_ID configured", () => {
    expect(ENV.lineChannelId).toBeTruthy();
    expect(ENV.lineChannelId).toMatch(/^\d+$/);
  });

  it("should have LINE_CHANNEL_SECRET configured", () => {
    expect(ENV.lineChannelSecret).toBeTruthy();
    expect(ENV.lineChannelSecret.length).toBeGreaterThan(0);
  });

  it("should have LINE_CHANNEL_ACCESS_TOKEN configured", () => {
    expect(ENV.lineChannelAccessToken).toBeTruthy();
    expect(ENV.lineChannelAccessToken.length).toBeGreaterThan(0);
  });

  it("should validate LINE credentials format", () => {
    // Channel ID should be numeric
    expect(ENV.lineChannelId).toMatch(/^\d+$/);

    // Channel Secret should be alphanumeric
    expect(ENV.lineChannelSecret).toMatch(/^[a-zA-Z0-9]+$/);

    // Access Token should be a long string
    expect(ENV.lineChannelAccessToken.length).toBeGreaterThan(50);
  });

  /**
   * NOTE: The following test requires valid LINE credentials to run
   * It will be skipped if credentials are not properly configured
   * Uncomment and run with valid credentials to validate API connectivity
   */
  it.skip("should validate LINE API connectivity with valid credentials", async () => {
    if (!ENV.lineChannelAccessToken || ENV.lineChannelAccessToken === "") {
      console.log("Skipping LINE API connectivity test - credentials not configured");
      return;
    }

    try {
      // Try to get bot info - a lightweight endpoint that validates credentials
      const response = await axios.get("https://api.line.biz/v2/bot/info", {
        headers: {
          Authorization: `Bearer ${ENV.lineChannelAccessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("userId");
      expect(response.data).toHaveProperty("basicId");
      expect(response.data).toHaveProperty("displayName");
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("LINE credentials are invalid - check Channel Access Token");
      }
      if (error.response?.status === 403) {
        throw new Error("LINE credentials lack required permissions");
      }
      throw error;
    }
  });
});
