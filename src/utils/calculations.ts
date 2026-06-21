// ============================================================
// GTA Scrub — Business Calculations
// ============================================================

import { isWithinInterval, startOfMonth, endOfMonth, startOfDay, endOfDay, previousSunday, nextSaturday, isSunday } from 'date-fns';
import type { Shift, User, Payment, Expense } from '../types';

/**
 * Calculate earnings for a single completed shift.
 * Returns 0 if the shift has no duration recorded.
 */
export function calculateShiftEarnings(shift: Shift, user: User): number {
  if (shift.durationMinutes === null || shift.durationMinutes <= 0) return 0;
  return (shift.durationMinutes / 60) * user.hourlyRate;
}

/**
 * Calculate total labour cost for a site within a date range.
 * Sums up earnings from all completed shifts at the given site.
 */
export function calculateSiteLabourCost(
  siteId: string,
  shifts: Shift[],
  users: User[],
  from: Date,
  to: Date,
): number {
  const userMap = new Map<string, User>();
  for (const u of users) {
    userMap.set(u.id, u);
  }

  const interval = { start: startOfDay(from), end: endOfDay(to) };

  return shifts.reduce((total, shift) => {
    if (shift.siteId !== siteId) return total;
    if (shift.status !== 'completed') return total;

    const shiftDate = new Date(shift.clockInTime);
    if (!isWithinInterval(shiftDate, interval)) return total;

    const user = userMap.get(shift.userId);
    if (!user) return total;

    return total + calculateShiftEarnings(shift, user);
  }, 0);
}

/**
 * Calculate full profit breakdown for a site in a date range.
 */
export function calculateSiteProfit(
  siteId: string,
  payments: Payment[],
  shifts: Shift[],
  users: User[],
  expenses: Expense[],
  from: Date,
  to: Date,
): { revenue: number; labourCost: number; expenses: number; net: number; margin: number } {
  const interval = { start: startOfDay(from), end: endOfDay(to) };

  // Revenue: sum of payments for this site within the range
  const revenue = payments.reduce((sum, payment) => {
    if (payment.siteId !== siteId) return sum;
    const paymentDate = new Date(payment.date);
    if (!isWithinInterval(paymentDate, interval)) return sum;
    return sum + payment.amount;
  }, 0);

  // Labour cost
  const labourCost = calculateSiteLabourCost(siteId, shifts, users, from, to);

  // Expenses linked to this site within the range
  const expenseTotal = expenses.reduce((sum, expense) => {
    if (expense.siteId !== siteId) return sum;
    const expenseDate = new Date(expense.date);
    if (!isWithinInterval(expenseDate, interval)) return sum;
    return sum + expense.amount;
  }, 0);

  // Net profit
  const net = revenue - labourCost - expenseTotal;

  // Margin percentage (0 if no revenue to avoid division by zero)
  const margin = revenue > 0 ? (net / revenue) * 100 : 0;

  return {
    revenue,
    labourCost,
    expenses: expenseTotal,
    net,
    margin,
  };
}

/**
 * Calculate total hours worked by an employee within a date range.
 * Only counts completed shifts.
 */
export function calculateEmployeeHours(
  userId: string,
  shifts: Shift[],
  from: Date,
  to: Date,
): number {
  const interval = { start: startOfDay(from), end: endOfDay(to) };

  return shifts.reduce((total, shift) => {
    if (shift.userId !== userId) return total;
    if (shift.status !== 'completed') return total;
    if (shift.durationMinutes === null) return total;

    const shiftDate = new Date(shift.clockInTime);
    if (!isWithinInterval(shiftDate, interval)) return total;

    return total + shift.durationMinutes / 60;
  }, 0);
}

/**
 * Calculate employee pay for a given period.
 */
export function calculateEmployeePay(
  userId: string,
  shifts: Shift[],
  user: User,
  from: Date,
  to: Date,
): number {
  const hours = calculateEmployeeHours(userId, shifts, from, to);
  return hours * user.hourlyRate;
}

/**
 * Get current pay period start and end dates.
 * - biweekly: current 2-week period aligned to Sun–Sat weeks
 * - monthly: 1st to last day of current month
 */
export function getPayPeriodDates(payPeriod: 'biweekly' | 'monthly'): { start: Date; end: Date } {
  const now = new Date();

  if (payPeriod === 'monthly') {
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  }

  // Biweekly: find the current 2-week period (Sunday to Saturday)
  // Use a fixed epoch Sunday to determine even/odd weeks
  const epochSunday = new Date(2024, 0, 7); // Jan 7 2024 is a Sunday

  // Find the most recent Sunday (start of current week)
  let currentSunday: Date;
  if (isSunday(now)) {
    currentSunday = startOfDay(now);
  } else {
    currentSunday = startOfDay(previousSunday(now));
  }

  // Calculate weeks since epoch to determine if this is an even or odd week
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceEpoch = Math.floor(
    (currentSunday.getTime() - epochSunday.getTime()) / msPerWeek,
  );

  // If odd number of weeks since epoch, the biweekly period started last week
  const isSecondWeek = weeksSinceEpoch % 2 !== 0;

  let periodStart: Date;
  if (isSecondWeek) {
    // This is the second week of the period, so go back one week
    periodStart = new Date(currentSunday);
    periodStart.setDate(periodStart.getDate() - 7);
  } else {
    // This is the first week of the period
    periodStart = currentSunday;
  }

  // Period ends on the Saturday of the second week (13 days after period start)
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 13);

  return {
    start: startOfDay(periodStart),
    end: endOfDay(periodEnd),
  };
}
