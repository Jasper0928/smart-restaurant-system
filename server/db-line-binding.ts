/**
 * LINE Account Binding Functions
 * Manages linking between LINE User IDs and customer records
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { customers } from "../drizzle/schema";

/**
 * Bind LINE user ID to a customer
 */
export async function bindLineUserToCustomer(
  customerId: number,
  lineUserId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(customers)
      .set({ lineUid: lineUserId })
      .where(eq(customers.id, customerId));
    return true;
  } catch (error) {
    console.error("Failed to bind LINE user:", error);
    return false;
  }
}

/**
 * Get customer by LINE user ID
 */
export async function getCustomerByLineUid(lineUserId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.lineUid, lineUserId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Bind LINE user ID to customer by phone number
 * Used when customer provides phone during LINE interaction
 */
export async function bindLineUserByPhone(
  lineUserId: string,
  phone: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db
      .update(customers)
      .set({ lineUid: lineUserId })
      .where(eq(customers.phone, phone));

    return true;
  } catch (error) {
    console.error("Failed to bind LINE user by phone:", error);
    return false;
  }
}

/**
 * Unbind LINE user ID from customer
 */
export async function unbindLineUser(customerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(customers)
      .set({ lineUid: null })
      .where(eq(customers.id, customerId));
    return true;
  } catch (error) {
    console.error("Failed to unbind LINE user:", error);
    return false;
  }
}

/**
 * Check if LINE user is already bound to a customer
 */
export async function isLineUserBound(lineUserId: string): Promise<boolean> {
  const customer = await getCustomerByLineUid(lineUserId);
  return customer !== null;
}

/**
 * Get binding status for a customer
 */
export async function getLineBindingStatus(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ lineUid: customers.lineUid })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (result.length === 0) return null;

  return {
    isBound: result[0].lineUid !== null,
    lineUid: result[0].lineUid,
  };
}
