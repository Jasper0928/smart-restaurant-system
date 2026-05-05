import "dotenv/config";
import { getDb, getOrCreateCustomer } from "./server/db";
import { reservations } from "./drizzle/schema";

async function run() {
  const db = await getDb();
  if (!db) {
    console.log("DB connection failed.");
    return;
  }
  
  const customer = await getOrCreateCustomer("0912345678", "Test User");
  
  await db.insert(reservations).values({
    restaurantId: 1,
    customerId: customer.id,
    partySize: 2,
    scheduledAt: new Date(),
    highChairNeeded: 0,
    qrCode: "test_qr_" + Date.now(),
    status: "pending",
  });
  
  console.log("Reservation inserted successfully!");
}

run().catch(console.error);
