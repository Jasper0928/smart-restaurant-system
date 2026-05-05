import { describe, it, expect } from "vitest";
import {
  calculateEWT,
  isPeakHour,
  getASTByPartySize,
  getOptimalTableType,
  getAvailableTableCount,
} from "./algorithms";
import type { Table as TableType } from "../drizzle/schema";

describe("EWT Algorithm", () => {
  describe("calculateEWT", () => {
    it("should calculate basic EWT without peak hour", () => {
      const ewt = calculateEWT({
        queueAhead: 2,
        avgServiceTime: 90,
        availableTables: 3,
        peakHourMultiplier: 1.0,
      });

      // ((2 + 1) * 90 / 3) * 1.0 = (270 / 3) * 1.0 = 90
      expect(ewt).toBe(90);
    });

    it("should apply peak hour multiplier", () => {
      const ewt = calculateEWT({
        queueAhead: 2,
        avgServiceTime: 90,
        availableTables: 3,
        peakHourMultiplier: 1.2,
      });

      // ((2 + 1) * 90 / 3) * 1.2 = 90 * 1.2 = 108
      expect(ewt).toBe(108);
    });

    it("should return 999 when no tables available", () => {
      const ewt = calculateEWT({
        queueAhead: 5,
        avgServiceTime: 90,
        availableTables: 0,
        peakHourMultiplier: 1.0,
      });

      expect(ewt).toBe(999);
    });

    it("should handle empty queue", () => {
      const ewt = calculateEWT({
        queueAhead: 0,
        avgServiceTime: 90,
        availableTables: 5,
        peakHourMultiplier: 1.0,
      });

      // ((0 + 1) * 90 / 5) * 1.0 = 18
      expect(ewt).toBe(18);
    });
  });

  describe("isPeakHour", () => {
    it("should identify lunch peak hours (11:30-13:30)", () => {
      const lunchTime = new Date();
      lunchTime.setHours(12, 0, 0);
      expect(isPeakHour(lunchTime)).toBe(true);
    });

    it("should identify dinner peak hours (17:30-20:00)", () => {
      const dinnerTime = new Date();
      dinnerTime.setHours(18, 30, 0);
      expect(isPeakHour(dinnerTime)).toBe(true);
    });

    it("should not identify off-peak hours", () => {
      const offPeakTime = new Date();
      offPeakTime.setHours(15, 0, 0);
      expect(isPeakHour(offPeakTime)).toBe(false);
    });

    it("should handle boundary times", () => {
      const beforeLunch = new Date();
      beforeLunch.setHours(11, 29, 0);
      expect(isPeakHour(beforeLunch)).toBe(false);

      const afterLunch = new Date();
      afterLunch.setHours(13, 31, 0);
      expect(isPeakHour(afterLunch)).toBe(false);
    });
  });

  describe("getASTByPartySize", () => {
    it("should return base AST for 2-person party", () => {
      const ast = getASTByPartySize(90, 2);
      expect(ast).toBe(90);
    });

    it("should apply 1.1x multiplier for 4-person party", () => {
      const ast = getASTByPartySize(90, 4);
      expect(ast).toBe(100); // Math.ceil(90 * 1.1) = 100
    });

    it("should apply 1.25x multiplier for 6+ person party", () => {
      const ast = getASTByPartySize(90, 6);
      expect(ast).toBe(113); // Math.ceil(90 * 1.25)
    });
  });

  describe("getOptimalTableType", () => {
    it("should recommend 2-seat table for 1-2 people", () => {
      expect(getOptimalTableType(1)).toBe(2);
      expect(getOptimalTableType(2)).toBe(2);
    });

    it("should recommend 4-seat table for 3-4 people", () => {
      expect(getOptimalTableType(3)).toBe(4);
      expect(getOptimalTableType(4)).toBe(4);
    });

    it("should recommend 6-seat table for 5+ people", () => {
      expect(getOptimalTableType(5)).toBe(6);
      expect(getOptimalTableType(10)).toBe(6);
    });
  });

  describe("getAvailableTableCount", () => {
    const mockTables: TableType[] = [
      {
        id: 1,
        restaurantId: 1,
        tableNumber: "A1",
        maxSeats: 2,
        status: "empty",
        occupiedSince: null,
        reservedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        restaurantId: 1,
        tableNumber: "A2",
        maxSeats: 4,
        status: "empty",
        occupiedSince: null,
        reservedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        restaurantId: 1,
        tableNumber: "B1",
        maxSeats: 4,
        status: "occupied",
        occupiedSince: new Date(),
        reservedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        restaurantId: 1,
        tableNumber: "B2",
        maxSeats: 6,
        status: "empty",
        occupiedSince: null,
        reservedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should count available tables for party size", () => {
      const available = getAvailableTableCount(mockTables, 2);
      expect(available).toBe(3); // A1, A2, B2 are empty and have enough seats
    });

    it("should only count tables with sufficient seats", () => {
      const available = getAvailableTableCount(mockTables, 5);
      expect(available).toBe(1); // Only B2 has 6 seats
    });

    it("should not count occupied tables", () => {
      const available = getAvailableTableCount(mockTables, 4);
      expect(available).toBe(2); // A2 and B2, not B1 (occupied)
    });
  });
});
