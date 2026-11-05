import { describe, expect, it } from 'vitest';
import { getKuwaitEvents, getCurrentAndUpcomingEvents, getSeasonalInsight } from '../lib/kuwait-calendar';

describe('getKuwaitEvents', () => {
  it('stamps every event id with the year and keeps start <= end', () => {
    const events = getKuwaitEvents(2026);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.id.endsWith('2026')).toBe(true);
      expect(e.startDate.getTime()).toBeLessThanOrEqual(e.endDate.getTime());
    }
    expect(new Set(events.map(e => e.id)).size).toBe(events.length);
  });

  it('places the national and liberation days on 25 and 26 February', () => {
    const events = getKuwaitEvents(2026);
    const national = events.find(e => e.id === 'national-day-2026');
    const liberation = events.find(e => e.id === 'liberation-day-2026');
    expect([national?.startDate.getMonth(), national?.startDate.getDate()]).toEqual([1, 25]);
    expect([liberation?.startDate.getMonth(), liberation?.startDate.getDate()]).toEqual([1, 26]);
  });
});

describe('getCurrentAndUpcomingEvents', () => {
  it('partitions every event of the surrounding three years exactly once', () => {
    const now = new Date(2026, 3, 10, 12);
    const total = [2025, 2026, 2027].reduce((n, y) => n + getKuwaitEvents(y).length, 0);
    const { current, upcoming, past } = getCurrentAndUpcomingEvents(now);
    expect(current.length + upcoming.length + past.length).toBe(total);
  });

  it('treats a single-day event as current for the whole day', () => {
    const { current } = getCurrentAndUpcomingEvents(new Date(2026, 1, 25, 23, 30));
    expect(current.map(e => e.id)).toContain('national-day-2026');
  });

  it('sorts upcoming ascending and past most-recent-first', () => {
    const { upcoming, past } = getCurrentAndUpcomingEvents(new Date(2026, 3, 10, 12));
    for (let i = 1; i < upcoming.length; i++) expect(upcoming[i - 1].startDate.getTime()).toBeLessThanOrEqual(upcoming[i].startDate.getTime());
    for (let i = 1; i < past.length; i++) expect(past[i - 1].endDate.getTime()).toBeGreaterThanOrEqual(past[i].endDate.getTime());
  });

  it('includes the summer season in mid-July', () => {
    const { current } = getCurrentAndUpcomingEvents(new Date(2026, 6, 15, 12));
    expect(current.map(e => e.id)).toContain('summer-peak-2026');
  });
});

describe('getSeasonalInsight', () => {
  it('describes one of the current events during National Day', () => {
    const now = new Date(2026, 1, 25, 12);
    const { current } = getCurrentAndUpcomingEvents(now);
    const insight = getSeasonalInsight(now);
    expect(current.length).toBeGreaterThan(0);
    expect(insight.title.startsWith('موسم')).toBe(true);
    expect(current.some(e => e.opportunityAr === insight.detail && JSON.stringify(e.suggestedProductsAr) === JSON.stringify(insight.products))).toBe(true);
  });

  it('always returns a title, detail and product list', () => {
    for (const m of [0, 3, 6, 9, 11]) {
      const insight = getSeasonalInsight(new Date(2026, m, 15, 12));
      expect(insight.title).toBeTruthy();
      expect(insight.detail).toBeTruthy();
      expect(Array.isArray(insight.products)).toBe(true);
    }
  });
});
