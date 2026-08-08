/**
 * Test environment shims.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, which components are entitled to
 * call — the navbar reads the `prefers-color-scheme` media query to pick its initial theme.
 * Without these, such a component throws on construction and the failure looks like a bug in
 * the component rather than a gap in the environment.
 */

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
