import { getDb } from "./server/db";
import { reservations, customers } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;
  const res = await db.select().from(reservations).leftJoin(customers, eq(reservations.customerId, customers.id)).limit(1);
  console.log(res);
}
main().catch(console.error);
