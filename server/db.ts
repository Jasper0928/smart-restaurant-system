import { eq, and, inArray, notInArray, between } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import {
  InsertUser,
  users,
  customers,
  restaurants,
  tables,
  waitlist,
  reservations,
  notificationLog,
  Customer,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = createClient({ url: process.env.DATABASE_URL });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: any = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach(field => {
      const value = (user as any)[field];
      if (value !== undefined) {
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      }
    });

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== Restaurant System Queries ====================

export async function getCustomers(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).limit(limit);
}

export async function getOrCreateCustomer(phone: string, name: string, email?: string, lineUid?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    const customer = existing[0];
    // If we received a lineUid from LIFF and the customer doesn't have one yet, auto-bind it!
    if (lineUid && customer.lineUid !== lineUid) {
      const updated = await db
        .update(customers)
        .set({ lineUid })
        .where(eq(customers.id, customer.id))
        .returning();
      return updated[0];
    }
    return customer;
  }

  const result = await db.insert(customers).values({ phone, name, email, lineUid }).returning();
  return result[0];
}

export async function getRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getTablesByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tables).where(eq(tables.restaurantId, restaurantId));
}

export async function getWaitlist(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(waitlist)
    .where(eq(waitlist.restaurantId, restaurantId))
    .orderBy(waitlist.entryTime);
}

export async function getActiveWaitlistWithCustomer(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  const notInStates = ["seated", "expired"]; // "cancelled" removed so it can be displayed on dashboard
  const results = await db
    .select({
      waitlist: waitlist,
      customer: customers,
    })
    .from(waitlist)
    .leftJoin(customers, eq(waitlist.customerId, customers.id))
    .where(
      and(
        eq(waitlist.restaurantId, restaurantId),
        notInArray(waitlist.notifiedStatus, notInStates as any)
      )
    )
    .orderBy(waitlist.entryTime);
    
  return results.map(r => ({
    ...r.waitlist,
    customer: r.customer
  }));
}

export async function getWaitlistEntryWithCustomer(waitlistId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ waitlist: waitlist, customer: customers })
    .from(waitlist)
    .leftJoin(customers, eq(waitlist.customerId, customers.id))
    .where(eq(waitlist.id, waitlistId))
    .limit(1);
  return result.length > 0 ? { ...result[0].waitlist, customer: result[0].customer } : null;
}

export async function getActiveWaitlist(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  const notInStates = ["seated", "cancelled", "expired"];
  return db
    .select()
    .from(waitlist)
    .where(
      and(
        eq(waitlist.restaurantId, restaurantId),
        notInArray(waitlist.notifiedStatus, notInStates as any)
      )
    )
    .orderBy(waitlist.entryTime);
}

export async function getReservations(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reservations)
    .where(eq(reservations.restaurantId, restaurantId))
    .orderBy(reservations.scheduledAt);
}

export async function getReservationsWithCustomer(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  const results = await db
    .select({
      reservation: reservations,
      customer: customers,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(eq(reservations.restaurantId, restaurantId))
    .orderBy(reservations.scheduledAt);
    
  return results.map(r => ({
    ...r.reservation,
    customer: r.customer
  }));
}

export async function getReservationsByDateWithCustomer(restaurantId: number, dateString: string) {
  const db = await getDb();
  if (!db) return [];
  
  const startOfDay = new Date(dateString);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateString);
  endOfDay.setHours(23, 59, 59, 999);

  const results = await db
    .select({
      reservation: reservations,
      customer: customers,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(
      and(
        eq(reservations.restaurantId, restaurantId),
        between(reservations.scheduledAt, startOfDay, endOfDay)
      )
    )
    .orderBy(reservations.scheduledAt);
    
  return results.map(r => ({
    ...r.reservation,
    customer: r.customer
  }));
}

export async function getPendingReservations(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.restaurantId, restaurantId),
        inArray(reservations.status, ["pending", "confirmed"])
      )
    );
}

export async function getActiveReservationForCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.customerId, customerId),
        inArray(reservations.status, ["pending", "confirmed"])
      )
    )
    .orderBy(reservations.scheduledAt)
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getActiveWaitlistForCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return null;
  const notInStates = ["seated", "cancelled", "expired"];
  const result = await db
    .select()
    .from(waitlist)
    .where(
      and(
        eq(waitlist.customerId, customerId),
        notInArray(waitlist.notifiedStatus, notInStates as any)
      )
    )
    .orderBy(waitlist.entryTime)
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateWaitlistStatus(
  waitlistId: number,
  status: string,
  contactCount?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    notifiedStatus: status,
    updatedAt: new Date(),
  };

  if (contactCount !== undefined) {
    updateData.contactCount = contactCount;
  }

  if (status === "notified") {
    updateData.lastNotificationTime = new Date();
  }

  return db.update(waitlist).set(updateData).where(eq(waitlist.id, waitlistId));
}

export async function updateTableStatus(
  tableId: number,
  status: string,
  occupiedSince?: Date,
  reservedUntil?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (occupiedSince) updateData.occupiedSince = occupiedSince;
  if (reservedUntil) updateData.reservedUntil = reservedUntil;

  return db.update(tables).set(updateData).where(eq(tables.id, tableId));
}

export async function updateReservationStatus(
  reservationId: number,
  status: string,
  confirmationSentAt?: Date,
  reminderSentAt?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (confirmationSentAt) updateData.confirmationSentAt = confirmationSentAt;
  if (reminderSentAt) updateData.reminderSentAt = reminderSentAt;

  return db
    .update(reservations)
    .set(updateData)
    .where(eq(reservations.id, reservationId));
}

export async function logNotification(
  customerId: number,
  type: string,
  channel: string,
  status: string,
  content?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(notificationLog).values({
    customerId,
    type: type as any,
    channel: channel as any,
    status: status as any,
    content,
  });
}
