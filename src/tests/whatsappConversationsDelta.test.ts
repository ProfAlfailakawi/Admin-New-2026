import { describe, expect, it } from 'vitest';
import { latestConversationStamp, mergeConversationDelta } from '../utils/whatsappConversationsDelta';

describe('whatsapp conversations delta', () => {
  const a = { id: 'a', lastMessageAt: '2026-11-07T10:00:00.000Z', unreadCount: 0 };
  const b = { id: 'b', lastMessageAt: '2026-11-07T09:00:00.000Z', unreadCount: 1 };

  it('finds the newest stamp and ignores missing ones', () => {
    expect(latestConversationStamp([a, b, { id: 'c' }])).toBe('2026-11-07T10:00:00.000Z');
    expect(latestConversationStamp([])).toBe('');
  });

  it('returns the same list when nothing changed', () => {
    const list = [a, b];
    expect(mergeConversationDelta(list, [])).toBe(list);
  });

  it('updates a changed conversation and puts it first', () => {
    const updated = { id: 'b', lastMessageAt: '2026-11-07T11:00:00.000Z', unreadCount: 2 };
    const merged = mergeConversationDelta([a, b], [updated]);
    expect(merged.map((x) => x.id)).toEqual(['b', 'a']);
    expect(merged[0].unreadCount).toBe(2);
  });

  it('adds new conversations and respects the cap', () => {
    const fresh = { id: 'n', lastMessageAt: '2026-11-07T12:00:00.000Z', unreadCount: 1 };
    const merged = mergeConversationDelta([a, b], [fresh], 2);
    expect(merged.map((x) => x.id)).toEqual(['n', 'a']);
  });
});
