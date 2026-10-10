// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import { DnaStepper } from '../components/dna/DnaKit';
import { journeyStepMs, resetJourneyPlayed } from '../components/dna/useJourneyReveal';

let observers: Array<{ cb: IntersectionObserverCallback; el?: Element }> = [];

class FakeIO {
  entry: { cb: IntersectionObserverCallback; el?: Element };
  constructor(cb: IntersectionObserverCallback) {
    this.entry = { cb };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.el = el;
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

const setReducedMotion = (on: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
};

let elHeight = 100;
const intersectAll = (ratio = 1) => observers.forEach((o) => o.el && o.cb([{ isIntersecting: true, intersectionRatio: ratio, target: o.el } as any], {} as any));

const steps = (payment: 'done' | 'current' | 'blocked' | 'returned') => [
  { key: 'a', label: 'استلام الطلب', state: 'done' as const },
  { key: 'b', label: 'الدفع', state: payment },
  { key: 'c', label: 'فاتورة', state: 'pending' as const },
];

const settle = () => { for (let i = 0; i < 12; i++) act(() => void vi.advanceTimersByTime(700)); };

// visual state (what is drawn); semantics are asserted separately via data-state / aria-current / sr text
const states = (c: HTMLElement) => Array.from(c.querySelectorAll('li.dna-stepi')).map((li) => li.getAttribute('data-shown'));

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  (window as any).IntersectionObserver = FakeIO;
  setReducedMotion(false);
  resetJourneyPlayed();
  elHeight = 100;
  Element.prototype.getBoundingClientRect = function () { return { height: elHeight, width: 300, top: 0, left: 0, right: 300, bottom: elHeight, x: 0, y: 0, toJSON() {} } as DOMRect; };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('journeyStepMs', () => {
  it('clamps to 350..750 ms per station', () => {
    expect(journeyStepMs(2)).toBe(750);
    expect(journeyStepMs(4)).toBe(750);
    expect(journeyStepMs(8)).toBe(500);
    expect(journeyStepMs(20)).toBe(350);
  });
});

describe('DnaStepper reveal', () => {
  it('without reveal nothing changes (no journey attributes, real states)', () => {
    const { container } = render(<DnaStepper steps={steps('current')} />);
    const ol = container.querySelector('ol')!;
    expect(ol.hasAttribute('data-journey')).toBe(false);
    expect(states(container)).toEqual(['done', 'current', 'pending']);
  });

  it('reduced motion renders the final state immediately', () => {
    setReducedMotion(true);
    const { container } = render(<DnaStepper reveal playKey="rm" steps={steps('current')} />);
    expect(states(container)).toEqual(['done', 'current', 'pending']);
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done');
  });

  it('waits for the view, then lights stations one by one and never past the real current station', () => {
    const { container } = render(<DnaStepper reveal playKey="o1" stepMs={500} steps={steps('current')} />);
    expect(states(container)).toEqual(['pending', 'pending', 'pending']);
    act(() => intersectAll());
    act(() => void vi.advanceTimersByTime(130));
    expect(states(container)).toEqual(['done', 'pending', 'pending']);
    act(() => void vi.advanceTimersByTime(500));
    expect(states(container)).toEqual(['done', 'current', 'pending']);
    act(() => void vi.advanceTimersByTime(500));
    expect(states(container)).toEqual(['done', 'current', 'pending']); // third station is really pending: never lit
    act(() => void vi.advanceTimersByTime(2000));
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done');
    expect(states(container)).toEqual(['done', 'current', 'pending']);
  });

  it('a blocked station keeps its blocked state and is not turned into a fill', () => {
    const { container } = render(<DnaStepper reveal playKey="o2" stepMs={400} steps={steps('blocked')} />);
    act(() => intersectAll());
    settle();
    expect(states(container)).toEqual(['done', 'blocked', 'pending']);
  });

  it('does not replay for the same playKey after a remount or re-render', () => {
    const first = render(<DnaStepper reveal playKey="same" stepMs={400} steps={steps('current')} />);
    act(() => intersectAll());
    settle();
    first.unmount();
    const { container, rerender } = render(<DnaStepper reveal playKey="same" stepMs={400} steps={steps('current')} />);
    expect(states(container)).toEqual(['done', 'current', 'pending']);
    rerender(<DnaStepper reveal playKey="same" stepMs={400} steps={steps('current')} />);
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done');
  });

  it('a later real change after the intro only changes that station (no replay)', () => {
    const { container, rerender } = render(<DnaStepper reveal playKey="live" stepMs={400} steps={steps('current')} />);
    act(() => intersectAll());
    settle();
    rerender(<DnaStepper reveal playKey="live" stepMs={400} steps={steps('done')} />);
    expect(states(container)).toEqual(['done', 'done', 'pending']);
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done');
  });

  it('ignores a barely-visible entry (ratio below the threshold) and does not start', () => {
    const { container } = render(<DnaStepper reveal playKey="ratio" stepMs={400} steps={steps('current')} />);
    act(() => intersectAll(0.02));
    act(() => void vi.advanceTimersByTime(2000));
    expect(states(container)).toEqual(['pending', 'pending', 'pending']);
    act(() => intersectAll(0.9));
    settle();
    expect(states(container)).toEqual(['done', 'current', 'pending']);
  });

  it('an element taller than the viewport still arms with an attainable threshold', () => {
    elHeight = 5000;
    const { container } = render(<DnaStepper reveal playKey="tall" stepMs={400} steps={steps('current')} />);
    act(() => intersectAll(0.15));
    settle();
    expect(states(container)).toEqual(['done', 'current', 'pending']);
  });

  it('never hides the real state forever if no entry ever arrives', () => {
    const { container } = render(<DnaStepper reveal playKey="never" stepMs={400} steps={steps('current')} />);
    expect(states(container)).toEqual(['pending', 'pending', 'pending']);
    settle();
    expect(states(container)).toEqual(['done', 'current', 'pending']);
  });

  it('plays when data arrives after the first render (all pending -> reached)', () => {
    const { container, rerender } = render(<DnaStepper reveal playKey="late" stepMs={400} steps={[{ key: 'a', label: 'a', state: 'pending' }, { key: 'b', label: 'b', state: 'pending' }]} />);
    act(() => intersectAll());
    settle();
    rerender(<DnaStepper reveal playKey="late" stepMs={400} steps={[{ key: 'a', label: 'a', state: 'done' }, { key: 'b', label: 'b', state: 'current' }]} />);
    settle();
    expect(states(container)).toEqual(['done', 'current']);
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done');
  });

  it('re-arms per playKey when a mounted stepper is reused for another entity', () => {
    const { container, rerender } = render(<DnaStepper reveal playKey="e1" stepMs={400} steps={steps('current')} />);
    act(() => intersectAll());
    settle();
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done');
    rerender(<DnaStepper reveal playKey="e2" stepMs={400} steps={steps('current')} />);
    expect(states(container)).toEqual(['pending', 'pending', 'pending']); // new key arms its own intro
    act(() => intersectAll());
    settle();
    expect(states(container)).toEqual(['done', 'current', 'pending']);
    rerender(<DnaStepper reveal playKey="e1" stepMs={400} steps={steps('current')} />);
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done'); // e1 remembered: no replay
  });

  it('a remembered key renders settled (data-reveal=done, no data-just) so no halo can replay', () => {
    const first = render(<DnaStepper reveal playKey="mem" stepMs={400} steps={steps('current')} />);
    act(() => intersectAll());
    settle();
    first.unmount();
    const { container } = render(<DnaStepper reveal playKey="mem" stepMs={400} steps={steps('current')} />);
    expect(container.querySelector('ol')!.getAttribute('data-reveal')).toBe('done');
    expect(container.querySelector('[data-just]')).toBeNull();
  });

  it('keeps real semantics (data-state, aria-current, sr text) while the intro has not lit a station yet', () => {
    const { container } = render(<DnaStepper reveal playKey="sem" steps={steps('current')} />);
    expect(states(container)).toEqual(['pending', 'pending', 'pending']);
    const lis = Array.from(container.querySelectorAll('li.dna-stepi'));
    expect(lis.map((l) => l.getAttribute('data-state'))).toEqual(['done', 'current', 'pending']);
    expect(lis[1].getAttribute('aria-current')).toBe('step');
    expect(lis[0].getAttribute('aria-current')).toBeNull();
    expect(lis[0].querySelector('.dna-sr:last-child')!.textContent).toBe('مكتملة');
    expect(lis[1].querySelector('.dna-sr:last-child')!.textContent).toBe('الحالية');
  });

  it('survives React StrictMode setup/cleanup/setup and still plays', () => {
    const { container } = render(
      <React.StrictMode>
        <DnaStepper reveal playKey="strict" stepMs={400} steps={steps('current')} />
      </React.StrictMode>,
    );
    expect(states(container)).toEqual(['pending', 'pending', 'pending']);
    act(() => intersectAll());
    settle();
    expect(states(container)).toEqual(['done', 'current', 'pending']);
  });
});
