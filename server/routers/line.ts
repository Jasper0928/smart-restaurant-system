/**
 * LINE webhook and messaging procedures
 */

import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  verifyLineSignature,
  pushLineMessage,
  createReservationConfirmationMessage,
  createSeatingNotificationMessage,
  handleCustomerResponse,
  createTextMessage,
} from "../line";
import { 
  getDb,
  getActiveReservationForCustomer,
  getActiveWaitlistForCustomer,
  updateReservationStatus,
  updateWaitlistStatus
} from "../db";
import {
  bindLineUserToCustomer,
  getCustomerByLineUid,
  bindLineUserByPhone,
  unbindLineUser,
  getLineBindingStatus,
} from "../db-line-binding";

export const lineRouter = router({
  /**
   * Handle LINE webhook events
   * This is called by LINE servers when events occur
   */
  webhook: publicProcedure
    .input(
      z.object({
        events: z.array(
          z.object({
            type: z.string(),
            message: z
              .object({
                type: z.string(),
                text: z.string().optional(),
                id: z.string(),
              })
              .optional(),
            replyToken: z.string().optional(),
            source: z.object({
              type: z.string(),
              userId: z.string(),
            }),
            timestamp: z.number(),
            mode: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const event of input.events) {
        // Handle follow events - auto-bind LINE user
        if (event.type === "follow") {
          try {
            const lineUserId = event.source.userId;
            // Store the follow event - customer can link later
            console.log(`[LINE] User ${lineUserId} followed`);
            // Send welcome message
            await pushLineMessage(lineUserId, [
              createTextMessage(
                "歡迎！請提供您的電話號碼以完成帳號綁定。"
              ),
            ]);
          } catch (error) {
            console.error("Failed to handle follow event:", error);
          }
        }

        // Handle message events
        if (event.type === "message" && event.message?.type === "text") {
          const lineUserId = event.source.userId;
          const text = event.message.text || "";

          // Check if message is a phone number (for binding)
          const phoneMatch = text.match(/^09\d{8}$|^0\d{9,10}$/);
          if (phoneMatch) {
            try {
              const success = await bindLineUserByPhone(lineUserId, text);
              if (success) {
                await pushLineMessage(lineUserId, [
                  createTextMessage("✅ 帳號綁定成功！您現在可以透過 LINE 進行預約和查詢候位狀態。"),
                ]);
              } else {
                await pushLineMessage(lineUserId, [
                  createTextMessage("❌ 找不到該電話號碼的帳號。請確認電話號碼是否正確。"),
                ]);
              }
            } catch (error) {
              console.error("Failed to bind LINE account:", error);
            }
          } else if (text === "取消訂位") {
            try {
              const customer = await getCustomerByLineUid(lineUserId);
              if (!customer) {
                await pushLineMessage(lineUserId, [
                  createTextMessage("沒有訂位紀錄，若需訂位，請按訂位鈕。")
                ]);
              } else {
                const reservation = await getActiveReservationForCustomer(customer.id);
                if (reservation) {
                  await updateReservationStatus(reservation.id, "cancelled");
                  const d = new Date(reservation.scheduledAt);
                  const dateStr = d.toLocaleString("zh-TW", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                  });
                  await pushLineMessage(lineUserId, [
                    createTextMessage(`${customer.name || '您'} 您好，已取消 ${dateStr} 的位置。希望下次還有機會為您服務。`)
                  ]);
                } else {
                  const waitlistEntry = await getActiveWaitlistForCustomer(customer.id);
                  if (waitlistEntry) {
                    await updateWaitlistStatus(waitlistEntry.id, "cancelled");
                    await pushLineMessage(lineUserId, [
                      createTextMessage("已為您取消侯位，很抱歉讓您久等了，希望下次有機會為您服務，謝謝。")
                    ]);
                  } else {
                    await pushLineMessage(lineUserId, [
                      createTextMessage("沒有訂位紀錄，若需訂位，請按訂位鈕。")
                    ]);
                  }
                }
              }
            } catch (error) {
              console.error("Failed to handle cancellation:", error);
            }
          } else {
            // Handle other messages (Quick Replies: coming, reserved_5min, cancelled)
            try {
              const response = handleCustomerResponse(text);
              console.log(`[LINE] User ${lineUserId} response status: ${response}`);
              
              if (response !== "unknown") {
                const customer = await getCustomerByLineUid(lineUserId);
                if (customer) {
                  const waitlistEntry = await getActiveWaitlistForCustomer(customer.id);
                  if (waitlistEntry) {
                    await updateWaitlistStatus(waitlistEntry.id, response);
                    
                    let ackMessage = "";
                    if (response === "coming") {
                      ackMessage = "收到！請小心前往，期待您的光臨。";
                    } else if (response === "reserved_5min") {
                      ackMessage = "收到！將為您保留座位 5 分鐘。";
                    } else if (response === "cancelled") {
                      ackMessage = "已為您取消候位，謝謝您的回覆。";
                    }
                    
                    if (ackMessage) {
                      await pushLineMessage(lineUserId, [createTextMessage(ackMessage)]);
                    }
                  } else if (response === "reservation_confirmed" || response === "reservation_cancelled") {
                    const reservation = await getActiveReservationForCustomer(customer.id);
                    if (reservation) {
                      const newStatus = response === "reservation_confirmed" ? "confirmed" : "cancelled";
                      await updateReservationStatus(reservation.id, newStatus);
                      
                      const ackMessage = response === "reservation_confirmed" 
                        ? "太棒了！已為您保留座位，期待您的光臨。" 
                        : "了解！已為您取消這筆訂位，希望能很快再為您服務。";
                        
                      await pushLineMessage(lineUserId, [createTextMessage(ackMessage)]);
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Failed to handle customer response:", error);
            }
          }
        }
      }

      return { success: true };
    }),

  /**
   * Send reservation confirmation via LINE
   */
  sendReservationConfirmation: publicProcedure
    .input(
      z.object({
        lineUserId: z.string(),
        restaurantName: z.string(),
        partySize: z.number(),
        scheduledAt: z.date(),
        qrCodeUrl: z.string(),
        qrCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const message = createReservationConfirmationMessage(
          input.restaurantName,
          input.partySize,
          input.scheduledAt,
          input.qrCodeUrl,
          input.qrCode
        );

        await pushLineMessage(input.lineUserId, [message]);
        return { success: true };
      } catch (error) {
        console.error("Failed to send reservation confirmation:", error);
        throw error;
      }
    }),

  /**
   * Send seating notification via LINE
   */
  sendSeatingNotification: publicProcedure
    .input(
      z.object({
        lineUserId: z.string(),
        restaurantName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const message = createSeatingNotificationMessage(
          input.restaurantName
        );

        await pushLineMessage(input.lineUserId, [message]);
        return { success: true };
      } catch (error) {
        console.error("Failed to send seating notification:", error);
        throw error;
      }
    }),

  /**
   * Send waitlist update via LINE
   */
  sendWaitlistUpdate: publicProcedure
    .input(
      z.object({
        lineUserId: z.string(),
        restaurantName: z.string(),
        position: z.number(),
        ewt: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const message = {
          type: "text",
          text: `${input.restaurantName}\n前方還有 ${input.position} 組客人\n預估等待時間: ${input.ewt} 分鐘`,
        };

        await pushLineMessage(input.lineUserId, [message]);
        return { success: true };
      } catch (error) {
        console.error("Failed to send waitlist update:", error);
        throw error;
      }
    }),

  /**
   * Bind LINE user ID to customer
   */
  bindAccount: publicProcedure
    .input(
      z.object({
        customerId: z.number(),
        lineUserId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const success = await bindLineUserToCustomer(
          input.customerId,
          input.lineUserId
        );
        return { success };
      } catch (error) {
        console.error("Failed to bind LINE account:", error);
        throw error;
      }
    }),

  /**
   * Bind LINE user by phone number
   */
  bindByPhone: publicProcedure
    .input(
      z.object({
        lineUserId: z.string(),
        phone: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const success = await bindLineUserByPhone(input.lineUserId, input.phone);
        return { success };
      } catch (error) {
        console.error("Failed to bind LINE account by phone:", error);
        throw error;
      }
    }),

  /**
   * Get customer info by LINE user ID
   */
  getCustomerByLineId: publicProcedure
    .input(z.object({ lineUserId: z.string() }))
    .query(async ({ input }) => {
      try {
        const customer = await getCustomerByLineUid(input.lineUserId);
        return customer;
      } catch (error) {
        console.error("Failed to get customer by LINE ID:", error);
        return null;
      }
    }),

  /**
   * Get LINE binding status for customer
   */
  getBindingStatus: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getLineBindingStatus(input.customerId);
      } catch (error) {
        console.error("Failed to get binding status:", error);
        return null;
      }
    }),

  /**
   * Unbind LINE account from customer
   */
  unbindAccount: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const success = await unbindLineUser(input.customerId);
        return { success };
      } catch (error) {
        console.error("Failed to unbind LINE account:", error);
        throw error;
      }
    }),
});
