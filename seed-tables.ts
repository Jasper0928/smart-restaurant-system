import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { tables } from "./drizzle/schema";
import dotenv from "dotenv";

dotenv.config();

const TABLE_LIST = [
  { tableNumber: "C1",  maxSeats: 4, gridCol: 0,  gridRow: 0 },
  { tableNumber: "M1",  maxSeats: 4, gridCol: 2,  gridRow: 0 },
  { tableNumber: "M2",  maxSeats: 4, gridCol: 4,  gridRow: 0 },
  { tableNumber: "F1",  maxSeats: 4, gridCol: 6,  gridRow: 0 },
  { tableNumber: "F2",  maxSeats: 4, gridCol: 8,  gridRow: 0 },
  { tableNumber: "F3",  maxSeats: 4, gridCol: 0,  gridRow: 1 },
  { tableNumber: "F4",  maxSeats: 4, gridCol: 2,  gridRow: 1 },
  { tableNumber: "E1",  maxSeats: 4, gridCol: 4,  gridRow: 1 },
  { tableNumber: "E2",  maxSeats: 4, gridCol: 6,  gridRow: 1 },
  { tableNumber: "E3",  maxSeats: 4, gridCol: 8,  gridRow: 1 },
  { tableNumber: "E4",  maxSeats: 4, gridCol: 0,  gridRow: 2 },
  { tableNumber: "H1",  maxSeats: 6, gridCol: 2,  gridRow: 2 },
  { tableNumber: "Q2",  maxSeats: 4, gridCol: 4,  gridRow: 2 },
  { tableNumber: "Q1",  maxSeats: 4, gridCol: 6,  gridRow: 2 },
  { tableNumber: "L1",  maxSeats: 6, gridCol: 8,  gridRow: 2 },
  { tableNumber: "B1",  maxSeats: 4, gridCol: 0,  gridRow: 3 },
  { tableNumber: "Z1",  maxSeats: 2, gridCol: 2,  gridRow: 3 },
  { tableNumber: "Z2",  maxSeats: 2, gridCol: 4,  gridRow: 3 },
  { tableNumber: "Z3",  maxSeats: 2, gridCol: 6,  gridRow: 3 },
  { tableNumber: "Z4",  maxSeats: 2, gridCol: 8,  gridRow: 3 },
];

async function seedTables() {
  const client = createClient({ url: process.env.DATABASE_URL! });
  const db = drizzle(client);

  console.log("Clearing existing tables...");
  await db.delete(tables);

  console.log("Inserting 20 tables...");
  await db.insert(tables).values(
    TABLE_LIST.map((t, i) => ({
      restaurantId: 1,
      tableNumber: t.tableNumber,
      maxSeats: t.maxSeats,
      status: "empty" as const,
      sortOrder: i,
      gridCol: t.gridCol,
      gridRow: t.gridRow,
    }))
  );

  console.log("✅ Done! Tables seeded:", TABLE_LIST.map(t => t.tableNumber).join(", "));
  process.exit(0);
}

seedTables().catch((e) => { console.error(e); process.exit(1); });
