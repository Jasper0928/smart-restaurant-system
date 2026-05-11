/**
 * EWT (Estimated Wait Time) Algorithm
 * Calculates predicted wait time based on AST (Average Service Time)
 */

import type { Restaurant, Table as TableType } from "../drizzle/schema";

interface EWTInput {
  queueAhead: number;
  avgServiceTime: number;
  availableTables: number;
  peakHourMultiplier: number;
}

/**
 * Calculate EWT using the formula:
 * EWT = ((Q_ahead + 1) * AST / T_available) * C_peak
 */
export function calculateEWT(input: EWTInput): number {
  const { queueAhead, avgServiceTime, availableTables, peakHourMultiplier } = input;

  if (availableTables <= 0) {
    return 999;
  }

  const baseWaitTime = ((queueAhead + 1) * avgServiceTime) / availableTables;
  const adjustedWaitTime = Math.ceil(baseWaitTime * peakHourMultiplier);

  return Math.max(0, adjustedWaitTime);
}

/**
 * Determine if current time is peak hour
 */
export function isPeakHour(date: Date = new Date()): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const lunchStart = 11 * 60 + 30;
  const lunchEnd = 13 * 60 + 30;

  const dinnerStart = 17 * 60 + 30;
  const dinnerEnd = 20 * 60;

  return (timeInMinutes >= lunchStart && timeInMinutes <= lunchEnd) ||
         (timeInMinutes >= dinnerStart && timeInMinutes <= dinnerEnd);
}

/**
 * Get peak hour multiplier for current time
 */
export function getPeakHourMultiplier(restaurant: Restaurant): number {
  return isPeakHour() ? parseFloat(restaurant.peakHourMultiplier.toString()) : 1.0;
}

/**
 * Calculate available tables for a given party size
 */
export function getAvailableTableCount(
  tables: TableType[],
  partySize: number
): number {
  return tables.filter(t => {
    return t.status === "empty" && t.maxSeats >= partySize;
  }).length;
}

/**
 * Determine optimal table type for party size
 */
export function getOptimalTableType(partySize: number): number {
  if (partySize <= 2) return 2;
  if (partySize <= 4) return 4;
  return 6;
}

/**
 * Calculate average service time based on party size
 */
export function getASTByPartySize(
  baseAST: number,
  partySize: number
): number {
  if (partySize <= 2) return baseAST;
  if (partySize <= 4) return Math.ceil(baseAST * 1.1);
  return Math.ceil(baseAST * 1.25);
}

/**
 * Calculate comprehensive EWT with all factors
 */
export function calculateComprehensiveEWT(
  queueAhead: number,
  partySize: number,
  restaurant: Restaurant,
  availableTables: number
): number {
  const capacityConfig = restaurant.capacityConfig as any;
  const baseAST = capacityConfig.avgServiceTime || 90;

  const ast = getASTByPartySize(baseAST, partySize);
  const peakMultiplier = getPeakHourMultiplier(restaurant);

  return calculateEWT({
    queueAhead,
    avgServiceTime: ast,
    availableTables: Math.max(1, availableTables),
    peakHourMultiplier: peakMultiplier,
  });
}

// ==================== Reservation Capacity Algorithm ====================

const DINING_DURATION_HOURS = 2;

/**
 * Calculate how many tables a party needs.
 * Each table seats at most 2 people; 1 person still occupies 1 table.
 */
export function calculateTablesNeeded(partySize: number): number {
  return Math.ceil(partySize / 2);
}

/**
 * Calculate the maximum number of tables available for online reservations.
 * Deducts the walk-in reserve ratio from total tables.
 */
export function getMaxReservableTables(
  totalTables: number,
  walkInReserveRatio: number
): number {
  return Math.floor(totalTables * (1 - walkInReserveRatio));
}

/**
 * Given a target scheduledAt, count how many tables are already reserved
 * by overlapping reservations. Two reservations overlap when their
 * 2-hour dining windows intersect.
 *
 * For a new reservation at time T occupying [T, T+2h),
 * any existing reservation at time E occupying [E, E+2h)
 * overlaps iff E < T+2h AND T < E+2h  ⟹  |E - T| < 2h
 * So the conflict window is (T - 2h, T + 2h) exclusive endpoints.
 */
export function getConflictWindow(scheduledAt: Date): { start: Date; end: Date } {
  const ms = DINING_DURATION_HOURS * 60 * 60 * 1000;
  return {
    start: new Date(scheduledAt.getTime() - ms),
    end: new Date(scheduledAt.getTime() + ms),
  };
}

export interface ReservationAvailability {
  available: boolean;
  tablesNeeded: number;
  usedTables: number;
  maxReservableTables: number;
  remainingTables: number;
}

/**
 * Check whether a new reservation can be made for the given time and party size.
 * overlappingReservations should be pre-queried: all pending/confirmed reservations
 * whose scheduledAt falls within the conflict window.
 */
export function checkAvailability(
  totalTables: number,
  walkInReserveRatio: number,
  partySize: number,
  overlappingPartySizes: number[]
): ReservationAvailability {
  const maxReservableTables = getMaxReservableTables(totalTables, walkInReserveRatio);
  const usedTables = overlappingPartySizes.reduce(
    (sum, ps) => sum + calculateTablesNeeded(ps),
    0
  );
  const tablesNeeded = calculateTablesNeeded(partySize);
  const remainingTables = maxReservableTables - usedTables;

  return {
    available: remainingTables >= tablesNeeded,
    tablesNeeded,
    usedTables,
    maxReservableTables,
    remainingTables: Math.max(0, remainingTables),
  };
}
