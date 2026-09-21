import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// Ensure our mocks are loaded
import "./mocks/supabase";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver for Radix UI
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock PointerEvent
if (typeof window.PointerEvent === 'undefined') {
  class PointerEvent extends Event {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId || 1;
      this.pointerType = params.pointerType || 'mouse';
    }
  }
  window.PointerEvent = PointerEvent as any;
}

afterEach(() => {
  vi.clearAllMocks();
});
