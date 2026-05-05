/**
 * LINE Messaging API Integration
 * Handles webhook events, message sending, and push notifications
 */

import crypto from "crypto";
import axios from "axios";
import { ENV } from "./_core/env";

const LINE_API_BASE = "https://api.line.me/v2/bot";

interface LineWebhookEvent {
  type: string;
  message?: {
    type: string;
    text?: string;
    id: string;
  };
  replyToken?: string;
  source: {
    type: string;
    userId: string;
  };
  timestamp: number;
  mode: string;
}

interface LineWebhookBody {
  events: LineWebhookEvent[];
}

/**
 * Verify LINE webhook signature
 */
export function verifyLineSignature(
  body: string,
  signature: string
): boolean {
  if (!ENV.lineChannelSecret) {
    console.warn("LINE_CHANNEL_SECRET not configured");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", ENV.lineChannelSecret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

/**
 * Send reply message to user
 */
export async function replyLineMessage(
  replyToken: string,
  messages: any[]
): Promise<void> {
  if (!ENV.lineChannelAccessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  try {
    await axios.post(
      `${LINE_API_BASE}/message/reply`,
      { replyToken, messages },
      {
        headers: {
          Authorization: `Bearer ${ENV.lineChannelAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to reply LINE message:", error);
    throw error;
  }
}

/**
 * Push message to user (one-way notification)
 */
export async function pushLineMessage(
  userId: string,
  messages: any[]
): Promise<void> {
  if (!ENV.lineChannelAccessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  try {
    await axios.post(
      `${LINE_API_BASE}/message/push`,
      { to: userId, messages },
      {
        headers: {
          Authorization: `Bearer ${ENV.lineChannelAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Failed to push LINE message:", error);
    throw error;
  }
}

/**
 * Create text message
 */
export function createTextMessage(text: string) {
  return {
    type: "text",
    text,
  };
}

/**
 * Create flex message for rich formatting
 */
export function createFlexMessage(altText: string, contents: any) {
  return {
    type: "flex",
    altText,
    contents,
  };
}

/**
 * Create quick reply with buttons
 */
export function createQuickReply(items: any[]) {
  return {
    type: "quickReply",
    items,
  };
}

/**
 * Create quick reply button
 */
export function createQuickReplyButton(label: string, text: string) {
  return {
    type: "action",
    action: {
      type: "message",
      label,
      text,
    },
  };
}

/**
 * Create reservation confirmation message
 */
export function createReservationConfirmationMessage(
  restaurantName: string,
  partySize: number,
  scheduledAt: Date,
  qrCodeUrl: string,
  qrCode: string
) {
  const flexContent = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "預約確認",
          weight: "bold",
          size: "xl",
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "餐廳",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: restaurantName,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "人數",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${partySize} 人`,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "時間",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: scheduledAt.toLocaleString("zh-TW"),
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
          ],
        },
        {
          type: "image",
          url: qrCodeUrl,
          size: "full",
          aspectRatio: "1:1",
          aspectMode: "cover",
        },
        {
          type: "text",
          text: `QR Code: ${qrCode}`,
          size: "xs",
          color: "#aaaaaa",
          align: "center",
          wrap: true,
        },
      ],
    },
  };

  return createFlexMessage("預約確認", flexContent);
}

export function createWaitlistConfirmationMessage(
  restaurantName: string,
  partySize: number,
  qrCodeUrl: string,
  qrCode: string
) {
  const flexContent = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "候位登記成功",
          weight: "bold",
          size: "xl",
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "餐廳",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: restaurantName,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "人數",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${partySize} 人`,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
          ],
        },
        {
          type: "image",
          url: qrCodeUrl,
          size: "full",
          aspectRatio: "1:1",
          aspectMode: "cover",
        },
        {
          type: "text",
          text: `專屬候位號碼: ${qrCode}`,
          size: "xs",
          color: "#aaaaaa",
          align: "center",
          wrap: true,
        },
      ],
    },
  };

  return createFlexMessage("候位登記成功", flexContent);
}

/**
 * Create waitlist status update message
 */
export function createWaitlistStatusMessage(
  queuePosition: number,
  ewt: number,
  restaurantName: string
) {
  const flexContent = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "候位更新",
          weight: "bold",
          size: "xl",
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "前方隊伍",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${queuePosition} 組`,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "預估等待",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 1,
                },
                {
                  type: "text",
                  text: `${ewt} 分鐘`,
                  wrap: true,
                  color: "#666666",
                  size: "sm",
                  flex: 5,
                },
              ],
            },
          ],
        },
      ],
    },
  };

  return createFlexMessage("候位更新", flexContent);
}

/**
 * Create seating notification message with quick reply
 */
export function createSeatingNotificationMessage(restaurantName: string) {
  const message = {
    type: "text",
    text: `${restaurantName} 已為您準備好桌位！請問您現在可以入座嗎？`,
    quickReply: createQuickReply([
      createQuickReplyButton("我正前往", "我正前往"),
      createQuickReplyButton("保留 5 分鐘", "保留 5 分鐘"),
      createQuickReplyButton("取消候位", "取消候位"),
    ]),
  };

  return message;
}

/**
 * Handle customer response to seating notification
 */
export function handleCustomerResponse(text?: string): string {
  if (!text) return "unknown";
  // Waitlist quick replies
  if (text === "我正前往") return "coming";
  if (text === "保留 5 分鐘") return "reserved_5min";
  if (text === "取消候位") return "cancelled";
  
  // Reservation quick replies
  if (text === "確定保留") return "reservation_confirmed";
  if (text === "需要取消") return "reservation_cancelled";
  
  return "unknown";
}

/**
 * Create confirmation prompt message with quick replies
 */
export function createReservationConfirmationPromptMessage(
  restaurantName: string,
  scheduledAt: Date
) {
  const timeString = scheduledAt.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  
  return {
    type: "text",
    text: `您好！這裡是 ${restaurantName}。\n提醒您，您預約了明天 ${timeString} 的位置。\n請問是否確定保留您的訂位？`,
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "message",
            label: "確定保留",
            text: "確定保留"
          }
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "需要取消",
            text: "需要取消"
          }
        }
      ]
    }
  };
}

/**
 * Create same-day reminder message
 */
export function createReservationReminderMessage(
  restaurantName: string,
  scheduledAt: Date
) {
  const timeString = scheduledAt.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  
  return {
    type: "text",
    text: `您好！這裡是 ${restaurantName}。\n貼心提醒您，您預約了今天 ${timeString} 的位置，請記得準時前來唷！期待為您服務。`
  };
}
