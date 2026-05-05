import { getDb } from "./server/db";
import { restaurants, tables } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function seed() {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(restaurants).limit(1);
  let restaurantId = 1;
  
  if (existing.length === 0) {
    console.log("Creating default restaurant...");
    const res = await db.insert(restaurants).values({
      branchName: "妳有咖啡 neo cafe",
      location: "台北市萬華區武昌街二段83-9號2樓",
      capacityConfig: {
        table2Seats: 5,
        table4Seats: 5,
        table6Seats: 2,
        avgServiceTime: 120
      }
    }).returning();
    restaurantId = res[0].id;
    console.log("Restaurant created with ID:", restaurantId);

    // Create some tables
    console.log("Creating tables...");
    const tableValues = [];
    for (let i = 1; i <= 5; i++) {
      tableValues.push({ restaurantId, tableNumber: `T2-${i}`, maxSeats: 2 });
    }
    for (let i = 1; i <= 5; i++) {
      tableValues.push({ restaurantId, tableNumber: `T4-${i}`, maxSeats: 4 });
    }
    await db.insert(tables).values(tableValues);
    console.log("Tables created.");
  } else {
    console.log("Restaurant already exists.");
  }
}

seed().catch(console.error);
