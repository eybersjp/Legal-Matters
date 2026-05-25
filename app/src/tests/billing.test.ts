import { describe, it, expect } from 'vitest';

const VAT_RATE = 0.15; // 15% South African standard VAT rate

function calculateTaxTotals(entries: { duration_minutes: number; hourly_rate_zar: number }[]) {
  let totalExVat = 0;
  entries.forEach((e) => {
    const fee = (e.duration_minutes / 60) * e.hourly_rate_zar;
    totalExVat += fee;
  });

  const vatAmount = totalExVat * VAT_RATE;
  const totalIncVat = totalExVat + vatAmount;

  return {
    exVat: parseFloat(totalExVat.toFixed(2)),
    vat: parseFloat(vatAmount.toFixed(2)),
    incVat: parseFloat(totalIncVat.toFixed(2)),
  };
}

describe('South African 15% VAT Billing Calculations', () => {
  it('should compute exact billing fees and 15% VAT for a single entry', () => {
    // 120 minutes (2 hours) at R1000/hour = R2000.00
    // VAT = R300.00
    // Total inc VAT = R2300.00
    const entries = [{ duration_minutes: 120, hourly_rate_zar: 1000 }];
    const totals = calculateTaxTotals(entries);

    expect(totals.exVat).toBe(2000.00);
    expect(totals.vat).toBe(300.00);
    expect(totals.incVat).toBe(2300.00);
  });

  it('should compute exact billing fees and 15% VAT for multiple entries with odd durations', () => {
    // Entry 1: 45 minutes at R1500/hour = (45/60)*1500 = R1125.00
    // Entry 2: 90 minutes at R2500/hour = (90/60)*2500 = R3750.00
    // Total Ex VAT = R4875.00
    // VAT (15%) = 4875 * 0.15 = R731.25
    // Total Inc VAT = R5606.25
    const entries = [
      { duration_minutes: 45, hourly_rate_zar: 1500 },
      { duration_minutes: 90, hourly_rate_zar: 2500 },
    ];
    const totals = calculateTaxTotals(entries);

    expect(totals.exVat).toBe(4875.00);
    expect(totals.vat).toBe(731.25);
    expect(totals.incVat).toBe(5606.25);
  });

  it('should handle zero duration or rates gracefully', () => {
    const entries = [{ duration_minutes: 0, hourly_rate_zar: 1000 }];
    const totals = calculateTaxTotals(entries);

    expect(totals.exVat).toBe(0.00);
    expect(totals.vat).toBe(0.00);
    expect(totals.incVat).toBe(0.00);
  });
});
