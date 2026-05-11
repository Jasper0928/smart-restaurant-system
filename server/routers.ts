import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  getRestaurant,
  getTablesByRestaurant,
  getActiveWaitlist,
  getReservations,
  getOrCreateCustomer,
  updateWaitlistStatus,
  updateTableStatus,
  updateReservationStatus,
  logNotification,
  getDb,
  getActiveWaitlistWithCustomer,
  getReservationsWithCustomer,
  getWaitlistEntryWithCustomer,
  getReservationsByDateWithCustomer,
  getOverlappingReservations,
} from "./db";
import { generateQRCode, generateQRCodeDataUrl } from "./qrcode";
import { calculateComprehensiveEWT, getAvailableTableCount, getConflictWindow, checkAvailability } from "./algorithms";
import { waitlist, reservations, customers, restaurants, tables } from "../drizzle/schema";
import { lineRouter } from "./routers/line";
import { pushLineMessage, createReservationConfirmationMessage, createWaitlistConfirmationMessage, createSeatingNotificationMessage, createReservationReminderMessage } from "./line";

export const appRouter = router({
  line: lineRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(({ input, ctx }) => {
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "密碼錯誤" });
        }
        const token = jwt.sign(
          { id: 1, name: "Admin 妳有咖啡", role: "admin" },
          ENV.cookieSecret,
          { expiresIn: "7d" }
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Restaurant Management Routers
  restaurant: router({
    getStatus: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        const restaurant = await getRestaurant(input.restaurantId);
        if (!restaurant) return null;

        const allTables = await getTablesByRestaurant(input.restaurantId);
        const activeWaitlist = await getActiveWaitlistWithCustomer(input.restaurantId);
        
        const now = new Date();
        const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const reservationList = await getReservationsByDateWithCustomer(input.restaurantId, todayString);

        const emptyTables = allTables.filter(t => t.status === "empty").length;
        const occupiedTables = allTables.filter(t => t.status === "occupied").length;
        const reservedTables = allTables.filter(t => t.status === "reserved").length;
        const cleaningTables = allTables.filter(t => t.status === "cleaning").length;

        return {
          restaurant,
          tables: allTables,
          waitlist: activeWaitlist,
          reservations: reservationList,
          stats: {
            totalTables: allTables.length,
            emptyTables,
            occupiedTables,
            reservedTables,
            cleaningTables,
            waitlistCount: activeWaitlist.filter((w: any) => w.notifiedStatus !== "cancelled").length,
          },
        };
      }),

    toggleWaitlist: protectedProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          isOpen: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(restaurants)
          .set({ isWaitlistOpen: input.isOpen })
          .where(eq(restaurants.id, input.restaurantId));
        return { success: true };
      }),
  }),

  // Table Management
  table: router({
    toggleStatus: protectedProcedure
      .input(z.object({ tableId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [current] = await db.select().from(tables).where(eq(tables.id, input.tableId)).limit(1);
        if (!current) throw new Error("找不到此桌座");
        const newStatus = current.status === "empty" ? "occupied" : "empty";
        await db.update(tables)
          .set({ status: newStatus, occupiedSince: newStatus === "occupied" ? new Date() : null })
          .where(eq(tables.id, input.tableId));
        return { success: true, newStatus };
      }),

    reorder: protectedProcedure
      .input(z.object({
        // Array of { id, sortOrder } to update
        order: z.array(z.object({ id: z.number(), sortOrder: z.number() }))
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        for (const item of input.order) {
          await db.update(tables)
            .set({ sortOrder: item.sortOrder })
            .where(eq(tables.id, item.id));
        }
        return { success: true };
      }),

    savePosition: protectedProcedure
      .input(z.object({ tableId: z.number(), gridCol: z.number().min(0).max(11), gridRow: z.number().min(0).max(4) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(tables).set({ gridCol: input.gridCol, gridRow: input.gridRow }).where(eq(tables.id, input.tableId));
        return { success: true };
      }),
  }),

  // Waitlist Management
  waitlist: router({
    create: publicProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          phone: z.string(),
          name: z.string(),
          partySize: z.number().min(1).max(20),
          lineUserId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const customer = await getOrCreateCustomer(input.phone, input.name, undefined, input.lineUserId);
        const qrCode = generateQRCode();

        const qrCodeUrl = await generateQRCodeDataUrl(qrCode);
        const lineQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`;

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const restaurant = await getRestaurant(input.restaurantId);
        if (!restaurant) throw new Error("找不到餐廳");
        
        if (!restaurant.isWaitlistOpen) {
          throw new Error("今日已停止接客，我們將於明日上午8:00重新開放候位。如有急需請來電洽詢。");
        }

        const insertResult = await db.insert(waitlist).values({
          restaurantId: input.restaurantId,
          customerId: customer.id,
          partySize: input.partySize,
          qrCode,
          notifiedStatus: "pending",
        }).returning();

        // Send LINE notification if customer has LINE user ID
        const lineUserIdToNotify = input.lineUserId || customer.lineUid;
        if (lineUserIdToNotify) {
          try {
            if (restaurant) {
              const message = createWaitlistConfirmationMessage(
                restaurant.branchName,
                input.partySize,
                lineQrCodeUrl,
                qrCode
              );
              pushLineMessage(lineUserIdToNotify, [message]).catch(err =>
                console.error("LINE waitlist notification failed:", err)
              );
            }
          } catch (error) {
            console.error("Failed to prepare LINE waitlist notification:", error);
          }
        }

        return {
          id: insertResult[0].id,
          qrCode,
        };
      }),

    getEWT: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        const restaurant = await getRestaurant(input.restaurantId);
        if (!restaurant) return null;

        const activeWaitlist = await getActiveWaitlist(input.restaurantId);
        const tables = await getTablesByRestaurant(input.restaurantId);
        const availableTableCount = getAvailableTableCount(tables, 1);

        const ewt = calculateComprehensiveEWT(
          activeWaitlist.length,
          1,
          restaurant,
          availableTableCount
        );

        return {
          ewt,
          queuePosition: activeWaitlist.length,
          availableTables: availableTableCount,
        };
      }),

    updateStatus: publicProcedure
      .input(
        z.object({
          waitlistId: z.number(),
          status: z.enum(["coming", "reserved_5min", "cancelled", "seated", "expired"]),
        })
      )
      .mutation(async ({ input }) => {
        await updateWaitlistStatus(input.waitlistId, input.status);
        return { success: true };
      }),

    notify: publicProcedure
      .input(
        z.object({
          waitlistId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const entry = await getWaitlistEntryWithCustomer(input.waitlistId);
        if (!entry || !entry.customer) {
          throw new Error("Waitlist entry or customer not found");
        }

        const customer = entry.customer;
        
        if (customer.lineUid) {
          try {
            const restaurant = await getRestaurant(entry.restaurantId);
            if (restaurant) {
              const message = createSeatingNotificationMessage(restaurant.branchName);
              await pushLineMessage(customer.lineUid, [message]);
            }
          } catch (error) {
            console.error("Failed to push LINE seating notification:", error);
            throw new Error("Failed to send LINE notification");
          }
        } else {
          throw new Error("Customer has no LINE account bound");
        }

        await updateWaitlistStatus(input.waitlistId, "notified", (entry.contactCount || 0) + 1);
        return { success: true };
      }),
  }),

  // Reservation Management
  reservation: router({
    create: publicProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          phone: z.string(),
          name: z.string(),
          partySize: z.number().min(1).max(20),
          scheduledAt: z.date(),
          highChairNeeded: z.number().default(0),
          specialRequests: z.string().optional(),
          email: z.string().optional(),
          lineUserId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // ── Capacity check ──
        const restaurant = await getRestaurant(input.restaurantId);
        if (!restaurant) throw new Error("找不到餐廳");

        const allTables = await getTablesByRestaurant(input.restaurantId);
        const totalTables = allTables.length;
        const walkInRatio = parseFloat(restaurant.walkInReserveRatio?.toString() ?? "0.40");

        const { start, end } = getConflictWindow(input.scheduledAt);
        const overlapping = await getOverlappingReservations(input.restaurantId, start, end);
        const overlappingPartySizes = overlapping.map(r => r.partySize);

        const availability = checkAvailability(totalTables, walkInRatio, input.partySize, overlappingPartySizes);
        if (!availability.available) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `該時段桌位已滿（可訂 ${availability.maxReservableTables} 桌，已佔 ${availability.usedTables} 桌，您需要 ${availability.tablesNeeded} 桌）。請選擇其他時段。`,
          });
        }

        const customer = await getOrCreateCustomer(input.phone, input.name, input.email, input.lineUserId);
        const qrCode = generateQRCode();
        const qrCodeUrl = await generateQRCodeDataUrl(qrCode);
        const lineQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`;

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const insertResult = await db.insert(reservations).values({
          restaurantId: input.restaurantId,
          customerId: customer.id,
          partySize: input.partySize,
          scheduledAt: input.scheduledAt,
          highChairNeeded: input.highChairNeeded,
          specialRequests: input.specialRequests,
          qrCode,
          status: "pending",
          confirmationSentAt: new Date(),
        }).returning();

        // Send LINE notification if customer has LINE user ID (either from input or persisted)
        const lineUserIdToNotify = input.lineUserId || customer.lineUid;
        if (lineUserIdToNotify) {
          try {
            const restaurant = await getRestaurant(input.restaurantId);
            if (restaurant) {
              const message = createReservationConfirmationMessage(
                restaurant.branchName,
                input.partySize,
                input.scheduledAt,
                lineQrCodeUrl,
                qrCode
              );
              // Send asynchronously (don't wait for completion)
              pushLineMessage(lineUserIdToNotify, [message]).catch(err =>
                console.error("LINE notification failed:", err)
              );
            }
          } catch (error) {
            console.error("Failed to prepare LINE notification:", error);
          }
        }

        return {
          id: insertResult[0].id,
          qrCode,
          qrCodeUrl,
        };
      }),

    list: protectedProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        return getReservations(input.restaurantId);
      }),

    listByDate: publicProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          dateString: z.string(), // "YYYY-MM-DD"
        })
      )
      .query(async ({ input }) => {
        return getReservationsByDateWithCustomer(input.restaurantId, input.dateString);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          reservationId: z.number(),
          status: z.enum(["confirmed", "seated", "completed", "cancelled", "noshow"]),
        })
      )
      .mutation(async ({ input }) => {
        await updateReservationStatus(input.reservationId, input.status);
        return { success: true };
      }),

    sendReminder: protectedProcedure
      .input(z.object({ reservationId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const results = await db
          .select({
            reservation: reservations,
            customer: customers,
            restaurant: restaurants,
          })
          .from(reservations)
          .leftJoin(customers, eq(reservations.customerId, customers.id))
          .leftJoin(restaurants, eq(reservations.restaurantId, restaurants.id))
          .where(eq(reservations.id, input.reservationId))
          .limit(1);

        const res = results[0];

        if (!res || !res.customer?.lineUid || !res.restaurant) {
          throw new Error("無法傳送提醒：找不到訂位或客人未綁定 LINE");
        }

        const message = createReservationReminderMessage(
          res.restaurant.branchName,
          new Date(res.reservation.scheduledAt)
        );

        await pushLineMessage(res.customer.lineUid, [message]);

        // 更新資料庫
        await db.update(reservations)
          .set({ reminderSentAt: new Date() })
          .where(eq(reservations.id, res.reservation.id));

        return { success: true };
      }),

    checkAvailability: publicProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          scheduledAt: z.date(),
          partySize: z.number().min(1).max(20),
        })
      )
      .query(async ({ input }) => {
        const restaurant = await getRestaurant(input.restaurantId);
        if (!restaurant) throw new Error("找不到餐廳");

        const allTables = await getTablesByRestaurant(input.restaurantId);
        const totalTables = allTables.length;
        const walkInRatio = parseFloat(restaurant.walkInReserveRatio?.toString() ?? "0.40");

        const { start, end } = getConflictWindow(input.scheduledAt);
        const overlapping = await getOverlappingReservations(input.restaurantId, start, end);
        const overlappingPartySizes = overlapping.map(r => r.partySize);

        return checkAvailability(totalTables, walkInRatio, input.partySize, overlappingPartySizes);
      }),
  }),

  // Restaurant Settings
  settings: router({
    updateWalkInRatio: protectedProcedure
      .input(
        z.object({
          restaurantId: z.number(),
          walkInReserveRatio: z.number().min(0).max(1),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(restaurants)
          .set({ walkInReserveRatio: input.walkInReserveRatio, updatedAt: new Date() })
          .where(eq(restaurants.id, input.restaurantId));
        return { success: true };
      }),

    getWalkInRatio: publicProcedure
      .input(z.object({ restaurantId: z.number() }))
      .query(async ({ input }) => {
        const restaurant = await getRestaurant(input.restaurantId);
        return {
          walkInReserveRatio: restaurant ? parseFloat(restaurant.walkInReserveRatio?.toString() ?? "0.40") : 0.40,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
