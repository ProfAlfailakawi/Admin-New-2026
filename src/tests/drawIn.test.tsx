// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import { DnaCountUp, DnaRing, DnaSegmented } from '../components/dna/DnaKit';
import { parseCountText, formatCountFrame, useChangeFlash } from '../components/dna/useDrawIn';
import { resetJourneyPlayed } from '../components/dna/useJourneyReveal';

let observers: Array<{ cb: IntersectionObserverCallback; el?: Element }> = [];
class FakeIO {
  entry: { cb: IntersectionObserverCallback; el?: Element };
  constructor(cb: IntersectionObserverCallback) {
    this.entry = { cb };
    observers.push(this.entry);
  }
  observe(el: Element) { this.entry.el = el; }
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
}
const setReducedMotion = (on: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
};
const intersectAll = () => act(() => observers.forEach((o) => o.el && o.cb([{ isIntersecting: true, intersectionRatio: 1, target: o.el } as any], {} as any)));

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  (window as any).IntersectionObserver = FakeIO;
  setReducedMotion(false);
  resetJourneyPlayed();
  try { window.sessionStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('parseCountText / formatCountFrame', () => {
  it('keeps the final text byte-for-byte', () => {
    for (const t of ['1,234.500 د.ك', '12.5%', '0.000', '٤٥٪', '42', 'ش 7']) {
      const p = parseCountText(t)!;
      expect(formatCountFrame(p, p.target)).toBe(t);
    }
  });
  it('returns null without digits', () => {
    expect(parseCountText('—')).toBeNull();
  });
});

describe('DnaCountUp', () => {
  it('renders the final text when IntersectionObserver is missing', () => {
    delete (window as any).IntersectionObserver;
    const { container } = render(<DnaCountUp text="1,234.500" playKey="t1" />);
    expect(container.textContent).toBe('1,234.500');
  });
  it('renders the final text under reduced motion', () => {
    setReducedMotion(true);
    const { container } = render(<DnaCountUp text="88.250" playKey="t2" />);
    expect(container.textContent).toBe('88.250');
  });
  it('starts at zero, lands on the final value, and exposes the final text to assistive tech', () => {
    const { container } = render(<DnaCountUp text="500.000" playKey="t3" durationMs={100} />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('0.000');
    expect(container.textContent).toContain('500.000');
    intersectAll();
    act(() => void vi.advanceTimersByTime(2000));
    expect(container.textContent).toBe('500.000');
  });
  it('plays once per playKey: a remount shows the final value at once', () => {
    const first = render(<DnaCountUp text="75" playKey="t4" durationMs={50} />);
    intersectAll();
    act(() => void vi.advanceTimersByTime(2000));
    first.unmount();
    const second = render(<DnaCountUp text="75" playKey="t4" />);
    expect(second.container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(second.container.textContent).toBe('75');
  });
  it('snaps (no re-roll) when the value changes after it has played', () => {
    const view = render(<DnaCountUp text="10" playKey="t5" durationMs={50} />);
    intersectAll();
    act(() => void vi.advanceTimersByTime(2000));
    view.rerender(<DnaCountUp text="25" playKey="t5" />);
    expect(view.container.textContent).toBe('25');
  });
  it('does not animate without a playKey', () => {
    const { container } = render(<DnaCountUp text="9" />);
    expect(container.textContent).toBe('9');
  });
});

describe('DnaRing draw', () => {
  it('is unchanged without playKey and armed (empty) with one until it is seen', () => {
    const plain = render(<DnaRing value={50} />);
    expect(plain.container.querySelector('.dna-ring')?.getAttribute('data-draw')).toBeNull();
    const armed = render(<DnaRing value={50} playKey="r1" />);
    const ring = armed.container.querySelector('.dna-ring')!;
    expect(ring.getAttribute('data-draw')).toBe('pre');
    intersectAll();
    expect(ring.getAttribute('data-draw')).toBe('play');
    act(() => void vi.advanceTimersByTime(3000));
    expect(ring.getAttribute('data-draw')).toBeNull();
  });
  it('shows the final ring under reduced motion', () => {
    setReducedMotion(true);
    const { container } = render(<DnaRing value={50} playKey="r2" />);
    expect(container.querySelector('.dna-ring')?.getAttribute('data-draw')).toBeNull();
  });
});

describe('DnaSegmented count tint', () => {
  const opts = (n: number) => [{ value: 'a', label: 'A', count: n }];
  it('tints only when a count rises after first paint', () => {
    const view = render(<DnaSegmented options={opts(3)} value="a" onChange={() => {}} />);
    expect(view.container.querySelector('[data-rise]')).toBeNull();
    view.rerender(<DnaSegmented options={opts(4)} value="a" onChange={() => {}} />);
    expect(view.container.querySelector('[data-rise="true"]')).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1500));
    expect(view.container.querySelector('[data-rise]')).toBeNull();
    view.rerender(<DnaSegmented options={opts(2)} value="a" onChange={() => {}} />);
    expect(view.container.querySelector('[data-rise]')).toBeNull();
  });
});

describe('useChangeFlash', () => {
  it('clears the flash when a follow-up change fails the predicate', () => {
    vi.useFakeTimers();
    const Probe = ({ n }: { n: number }) => {
      const on = useChangeFlash(n, { when: (a, b) => b > a });
      return <span data-testid="p" data-on={on ? '1' : '0'} />;
    };
    const { getByTestId, rerender } = render(<Probe n={1} />);
    expect(getByTestId('p').getAttribute('data-on')).toBe('0');
    rerender(<Probe n={2} />);
    expect(getByTestId('p').getAttribute('data-on')).toBe('1');
    rerender(<Probe n={1} />); // decrease before ms elapsed: predicate rejects
    expect(getByTestId('p').getAttribute('data-on')).toBe('0');
    rerender(<Probe n={3} />); // later increase can retrigger
    expect(getByTestId('p').getAttribute('data-on')).toBe('1');
    vi.useRealTimers();
  });
});
