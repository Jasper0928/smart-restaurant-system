import cron from "node-cron";
import { eq, and, between, isNull, ne, notInArray } from "drizzle-orm";
import { getDb } from "./db";
import { reservations, customers, restaurants, waitlist, tables } from "../drizzle/schema";
import { pushLineMessage, createReservationConfirmationPromptMessage } from "./line";

export function initScheduler() {
  console.log("[Scheduler] Initializing automated tasks...");
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      const db = await getDb();
      if (!db) return;

      const now = new Date();
      // Only execute the 8 PM confirmation prompt logic if it's currently 8 PM
      if (now.getHours() === 20) {
        // Find tomorrow's start and end times
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startOfTomorrow = new Date(tomorrow);
        startOfTomorrow.setHours(0, 0, 0, 0);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        // Find reservations for tomorrow where confirmation hasn't been sent
        const pendingReservations = await db
          .select({
            reservation: reservations,
            customer: customers,
            restaurant: restaurants,
          })
          .from(reservations)
          .leftJoin(customers, eq(reservations.customerId, customers.id))
          .leftJoin(restaurants, eq(reservations.restaurantId, restaurants.id))
          .where(
            and(
              between(reservations.scheduledAt, startOfTomorrow, endOfTomorrow),
              isNull(reservations.confirmationSentAt),
              ne(reservations.status, "cancelled")
            )
          );

        console.log(`[Scheduler] Found ${pendingReservations.length} reservations for tomorrow at 8 PM.`);

        for (const req of pendingReservations) {
          if (!req.customer?.lineUid || !req.restaurant) continue;

          try {
            const message = createReservationConfirmationPromptMessage(
              req.restaurant.branchName,
              new Date(req.reservation.scheduledAt)
            );

            await pushLineMessage(req.customer.lineUid, [message]);
            
            // Mark as sent
            await db
              .update(reservations)
              .set({ confirmationSentAt: new Date() })
              .where(eq(reservations.id, req.reservation.id));
              
            console.log(`[Scheduler] Sent confirmation prompt to ${req.customer.name}`);
          } catch (error) {
            console.error(`[Scheduler] Failed to send to ${req.customer.name}:`, error);
          }
        }
      }

      // Re-open waitlist at 8:00 AM (08:00)
      if (now.getHours() === 8) {
        console.log(`[Scheduler] 8:00 AM - Reopening waitlists for all restaurants...`);
        await db.update(restaurants).set({ isWaitlistOpen: true });
        console.log(`[Scheduler] Waitlists reopened.`);
      }

      // Run waitlist cleanup at 11:00 PM (23:00)
      if (now.getHours() === 23) {
        console.log(`[Scheduler] 11:00 PM - Clearing all active waitlists...`);
        // We consider active waitlists as anything not already seated or expired
        const activeStates = ["pending", "notified", "coming", "reserved_5min", "cancelled"];
        
        await db.update(waitlist)
          .set({ notifiedStatus: "expired" })
          .where(notInArray(waitlist.notifiedStatus, ["seated", "expired"] as any));
          
        console.log(`[Scheduler] Waitlist cleared.`);

        // Also reset all tables to empty
        console.log(`[Scheduler] 11:00 PM - Resetting all tables to empty...`);
        await db.update(tables).set({ status: "empty", occupiedSince: null });
        console.log(`[Scheduler] All tables reset.`);
      }
    } catch (error) {
      console.error("[Scheduler] Error running cron job:", error);
    }
  });
}
