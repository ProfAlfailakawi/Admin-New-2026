import { describe, it, expect } from 'vitest';
import { isCachedVersionStale, shouldApplyCachedVersion } from '../lib/cacheFreshness';

// A deleted unpaid invoice came back after logging out and in: the server served its
// in-memory copy from before the delete. These rules make it reload what Firestore has
// changed and never let a late listener event roll the copy back.

describe('reloading before serving', () => {
  it('reloads a document Firestore updated after the cached copy', () => {
    expect(isCachedVersionStale(2_000, 1_000)).toBe(true);
  });
  it('reloads when the cached version is unknown', () => {
    expect(isCachedVersionStale(2_000, 0)).toBe(true);
  });
  it('keeps a copy that is already current', () => {
    expect(isCachedVersionStale(2_000, 2_000)).toBe(false);
    expect(isCachedVersionStale(1_000, 2_000)).toBe(false);
  });
  it('does nothing when Firestore reports no update time', () => {
    expect(isCachedVersionStale(0, 0)).toBe(false);
  });
});

describe('applying a value to the cache', () => {
  it('rejects an older value arriving after a newer one (the delete would come back)', () => {
    expect(shouldApplyCachedVersion(1_000, 2_000)).toBe(false);
  });
  it('accepts the same or a newer version', () => {
    expect(shouldApplyCachedVersion(2_000, 2_000)).toBe(true);
    expect(shouldApplyCachedVersion(3_000, 2_000)).toBe(true);
  });
  it('accepts values whose version is unknown, and anything over an unknown version', () => {
    expect(shouldApplyCachedVersion(0, 2_000)).toBe(true);
    expect(shouldApplyCachedVersion(1_000, 0)).toBe(true);
  });
});
