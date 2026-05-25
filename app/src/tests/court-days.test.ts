import { describe, it, expect } from 'vitest';
import { calculateCourtDeadline } from '../lib/court-days/calculator';

describe('South African High Court Days Calculator', () => {
  const holidays = [
    '2026-01-01', // New Year's Day (Thursday)
    '2026-03-21', // Human Rights Day (Saturday)
    '2026-04-03', // Good Friday (Friday)
    '2026-04-06', // Family Day (Monday)
  ];

  it('should skip standard weekends', () => {
    // 2026-05-20 is Wednesday. Add 5 court days.
    // Thurs(1), Fri(2), Sat(skip), Sun(skip), Mon(3), Tues(4), Wed(5) -> 2026-05-27
    const trigger = new Date('2026-05-20T10:00:00.000Z');
    const { calculatedDeadline, daysSkipped } = calculateCourtDeadline(trigger, 5, holidays);

    expect(calculatedDeadline.toISOString().split('T')[0]).toBe('2026-05-27');
    expect(daysSkipped).toBe(2); // Saturday and Sunday
  });

  it('should skip South African public holidays', () => {
    // 2026-04-02 is Thursday. Add 2 court days.
    // Fri (2026-04-03 Good Friday - skip)
    // Sat (skip), Sun (skip)
    // Mon (2026-04-06 Family Day - skip)
    // Tue (2026-04-07 - day 1)
    // Wed (2026-04-08 - day 2) -> 2026-04-08
    const trigger = new Date('2026-04-02T08:00:00.000Z');
    const { calculatedDeadline, daysSkipped } = calculateCourtDeadline(trigger, 2, holidays);

    expect(calculatedDeadline.toISOString().split('T')[0]).toBe('2026-04-08');
    expect(daysSkipped).toBe(4); // Good Friday, Sat, Sun, Family Day
  });

  it('should calculate long court periods correctly', () => {
    // 2026-05-04 is Monday. Add 10 court days.
    // 10 court days = exactly 2 calendar weeks if no holidays.
    // Monday (trigger) -> Friday of next week (day 10) -> 2026-05-18
    const trigger = new Date('2026-05-04T09:00:00.000Z');
    const { calculatedDeadline, daysSkipped } = calculateCourtDeadline(trigger, 10, holidays);

    expect(calculatedDeadline.toISOString().split('T')[0]).toBe('2026-05-18');
    expect(daysSkipped).toBe(4); // 2 weekends
  });
});
