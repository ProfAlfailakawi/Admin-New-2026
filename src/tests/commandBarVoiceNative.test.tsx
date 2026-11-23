// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import CommandBar from '../components/CommandBar';

const data = { orders: [], invoices: [], customers: [], products: [], suppliers: [], expenses: [], settings: {} };
beforeEach(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
  (Element.prototype as any).scrollIntoView = () => {};
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); (globalThis as any).Capacitor = undefined; });

const mount = () => render(<CommandBar isOpen onClose={() => {}} onNavigate={() => {}} data={data} userRole="admin" />);

describe('command bar voice search', () => {
  it('has no microphone button inside the native iOS app', () => {
    (globalThis as any).Capacitor = { isNativePlatform: () => true };
    mount();
    expect(document.querySelector('.command-voice-button')).toBeNull();
  });
  it('keeps the microphone button in a browser', () => {
    (globalThis as any).Capacitor = undefined;
    mount();
    expect(document.querySelector('.command-voice-button')).not.toBeNull();
  });
});
