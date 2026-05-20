import { describe, expect, it } from 'vitest';
import { parseHistoricalCSV, buildHistoricalSnapshots } from '../historicalImport';

describe('parseHistoricalCSV', () => {
  it('parses valid CSV with all columns', () => {
    const csv = [
      'date,ticker,price,currency',
      '2024-01-15,VTI,245.50,USD',
      '2024-02-15,VTI,248.30,USD',
      '2024-03-15,BND,72.10,USD',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'USD');
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);
    expect(result.summary.uniqueTickers).toBe(2);
    expect(result.summary.dateRange?.earliest).toBe('2024-01-15');
    expect(result.summary.dateRange?.latest).toBe('2024-03-15');
  });

  it('handles CSV without currency column, using default', () => {
    const csv = [
      'date,ticker,price',
      '2024-01-15,VTI,245.50',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'CAD');
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].currency).toBe('CAD');
  });

  it('rejects empty CSV', () => {
    const result = parseHistoricalCSV('', 'USD');
    expect(result.errors).toContain('CSV file is empty');
    expect(result.rows).toHaveLength(0);
  });

  it('rejects CSV missing required columns', () => {
    const csv = [
      'date,name,value',
      '2024-01-15,VTI,245.50',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'USD');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it('rejects invalid date format', () => {
    const csv = [
      'date,ticker,price',
      'not-a-date,VTI,245.50',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'USD');
    expect(result.errors.some((e) => e.includes('invalid date'))).toBe(true);
  });

  it('rejects negative prices', () => {
    const csv = [
      'date,ticker,price',
      '2024-01-15,VTI,-10.00',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'USD');
    expect(result.errors.some((e) => e.includes('negative price'))).toBe(true);
  });

  it('deduplicates by date+ticker', () => {
    const csv = [
      'date,ticker,price',
      '2024-01-15,VTI,245.50',
      '2024-01-15,VTI,248.00',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'USD');
    expect(result.warnings.some((w) => w.includes('duplicate'))).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].price).toBe(245.50);
  });

  it('normalizes currency to uppercase', () => {
    const csv = [
      'date,ticker,price,currency',
      '2024-01-15,VTI,245.50,usd',
      '2024-02-15,VTI,248.30,cad',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'USD');
    expect(result.rows[0].currency).toBe('USD');
    expect(result.rows[1].currency).toBe('CAD');
  });

  it('strips whitespace from tickers', () => {
    const csv = [
      'date,ticker,price',
      '2024-01-15,  VTI  ,245.50',
    ].join('\n');

    const result = parseHistoricalCSV(csv, 'USD');
    expect(result.rows[0].ticker).toBe('VTI');
  });
});

describe('buildHistoricalSnapshots', () => {
  it('builds snapshot objects from parsed rows', () => {
    const rows = [
      { date: '2024-01-15', ticker: 'VTI', price: 245.50, currency: 'USD' },
    ];

    const snapshots = buildHistoricalSnapshots(rows);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].id).toBe('hist:VTI:2024-01-15');
    expect(snapshots[0].ticker).toBe('VTI');
    expect(snapshots[0].price).toBe(245.50);
    expect(snapshots[0].currency).toBe('USD');
    expect(snapshots[0].recordedAt).toBeGreaterThan(0);
  });

  it('generates unique IDs per row', () => {
    const rows = [
      { date: '2024-01-15', ticker: 'VTI', price: 245.50 },
      { date: '2024-02-15', ticker: 'VTI', price: 248.30 },
    ];

    const snapshots = buildHistoricalSnapshots(rows);
    expect(snapshots[0].id).not.toBe(snapshots[1].id);
  });
});
