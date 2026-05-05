import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== Restaurant System Tables ====================

export const customers = sqliteTable("customers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  lineUid: text("lineUid").unique(), // LINE user ID for LIFF integration
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  loyaltyScore: integer("loyaltyScore", { mode: "number" }).default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export const restaurants = sqliteTable("restaurants", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  branchName: text("branchName").notNull(),
  location: text("location"),
  capacityConfig: text("capacityConfig", { mode: "json" }).$type<{
    table2Seats: number;
    table4Seats: number;
    table6Seats: number;
    avgServiceTime: number; // in minutes
  }>().notNull(),
  peakHourMultiplier: real("peakHourMultiplier").default(1.2).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

export const tables = sqliteTable("tables", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurantId", { mode: "number" }).notNull(),
  tableNumber: text("tableNumber").notNull(),
  maxSeats: integer("maxSeats", { mode: "number" }).notNull(),
  status: text("status", { enum: ["empty", "occupied", "cleaning", "reserved"] }).default("empty").notNull(),
  occupiedSince: integer("occupiedSince", { mode: "timestamp_ms" }),
  reservedUntil: integer("reservedUntil", { mode: "timestamp_ms" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;

export const waitlist = sqliteTable("waitlist", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurantId", { mode: "number" }).notNull(),
  customerId: integer("customerId", { mode: "number" }).notNull(),
  partySize: integer("partySize", { mode: "number" }).notNull(),
  entryTime: integer("entryTime", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  notifiedStatus: text("notifiedStatus", { enum: ["pending", "notified", "coming", "reserved_5min", "cancelled", "seated", "expired"] }).default("pending").notNull(),
  lastNotificationTime: integer("lastNotificationTime", { mode: "timestamp_ms" }),
  contactCount: integer("contactCount", { mode: "number" }).default(0).notNull(),
  qrCode: text("qrCode").unique(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = typeof waitlist.$inferInsert;

export const reservations = sqliteTable("reservations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurantId", { mode: "number" }).notNull(),
  customerId: integer("customerId", { mode: "number" }).notNull(),
  partySize: integer("partySize", { mode: "number" }).notNull(),
  scheduledAt: integer("scheduledAt", { mode: "timestamp_ms" }).notNull(),
  depositPaid: integer("depositPaid", { mode: "boolean" }).default(false).notNull(),
  depositAmount: real("depositAmount"),
  specialRequests: text("specialRequests"),
  highChairNeeded: integer("highChairNeeded", { mode: "number" }).default(0).notNull(),
  status: text("status", { enum: ["pending", "confirmed", "seated", "completed", "cancelled", "noshow"] }).default("pending").notNull(),
  confirmationSentAt: integer("confirmationSentAt", { mode: "timestamp_ms" }),
  reminderSentAt: integer("reminderSentAt", { mode: "timestamp_ms" }),
  qrCode: text("qrCode").unique(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

export const notificationLog = sqliteTable("notificationLog", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  customerId: integer("customerId", { mode: "number" }).notNull(),
  type: text("type", { enum: ["reservation_confirmation", "waitlist_update", "seating_notification", "reminder_24h", "noshow_warning"] }).notNull(),
  channel: text("channel", { enum: ["email", "sms", "line", "in_app"] }).notNull(),
  status: text("status", { enum: ["sent", "failed", "read"] }).default("sent").notNull(),
  content: text("content"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type NotificationLog = typeof notificationLog.$inferSelect;
export type InsertNotificationLog = typeof notificationLog.$inferInsert;