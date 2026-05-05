import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  handleCustomerResponse,
  createTextMessage,
  createQuickReply,
  createQuickReplyButton,
} from "./line";

describe("LINE Integration", () => {
  describe("handleCustomerResponse", () => {
    it("should recognize 我正前往 response", () => {
      const result = handleCustomerResponse("我正前往");
      expect(result).toBe("coming");
    });

    it("should recognize 保留 5 分鐘 response", () => {
      const result = handleCustomerResponse("保留 5 分鐘");
      expect(result).toBe("reserved_5min");
    });

    it("should recognize 取消候位 response", () => {
      const result = handleCustomerResponse("取消候位");
      expect(result).toBe("cancelled");
    });

    it("should return unknown for unrecognized text", () => {
      const result = handleCustomerResponse("random text");
      expect(result).toBe("unknown");
    });

    it("should handle undefined text", () => {
      const result = handleCustomerResponse(undefined);
      expect(result).toBe("unknown");
    });

    it("should handle empty string", () => {
      const result = handleCustomerResponse("");
      expect(result).toBe("unknown");
    });
  });

  describe("Message Creation", () => {
    it("should create text message", () => {
      const message = createTextMessage("Hello");
      expect(message).toEqual({
        type: "text",
        text: "Hello",
      });
    });

    it("should create quick reply button", () => {
      const button = createQuickReplyButton("Label", "text");
      expect(button).toEqual({
        type: "action",
        action: {
          type: "message",
          label: "Label",
          text: "text",
        },
      });
    });

    it("should create quick reply with multiple items", () => {
      const items = [
        createQuickReplyButton("Button 1", "text1"),
        createQuickReplyButton("Button 2", "text2"),
      ];

      const quickReply = createQuickReply(items);
      expect(quickReply.type).toBe("quickReply");
      expect(quickReply.items).toHaveLength(2);
      expect(quickReply.items[0].action.label).toBe("Button 1");
      expect(quickReply.items[1].action.label).toBe("Button 2");
    });

    it("should create seating notification message with quick reply buttons", () => {
      const items = [
        createQuickReplyButton("我正前往", "我正前往"),
        createQuickReplyButton("保留 5 分鐘", "保留 5 分鐘"),
        createQuickReplyButton("取消候位", "取消候位"),
      ];

      const quickReply = createQuickReply(items);
      expect(quickReply.items).toHaveLength(3);

      // Verify all three response options are available
      const labels = quickReply.items.map((item: any) => item.action.label);
      expect(labels).toContain("我正前往");
      expect(labels).toContain("保留 5 分鐘");
      expect(labels).toContain("取消候位");
    });
  });
});
