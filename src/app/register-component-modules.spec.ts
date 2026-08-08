import { Component, Directive, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { registerComponentModules, selectorUsedIn } from 'shikidown';

// `customElements.define` is global and irreversible, so every test uses its own
// tag names — otherwise a second registration of the same name would silently
// no-op (registerAsCustomElement guards on customElements.get) and the
// assertions would pass for the wrong reason.

@Component({ selector: 'spec-alpha', template: 'alpha' })
class Alpha {}

@Component({ selector: 'spec-beta', template: 'beta' })
class Beta {}

/** No dash: not a valid custom element name. */
@Component({ selector: 'specnodash', template: 'nope' })
class NoDash {}

/** Attribute selector: a module may legitimately export directives. */
@Directive({ selector: '[specAttribute]' })
class AttributeDirective {}

describe('registerComponentModules', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('registers exported components under their decorator selector', async () => {
    await registerComponentModules([{ Alpha, Beta }], injector);

    expect(customElements.get('spec-alpha')).toBeDefined();
    expect(customElements.get('spec-beta')).toBeDefined();
  });

  it('ignores exports that are not components', async () => {
    const module = {
      MOCK_DATA: [1, 2, 3],
      helper: () => 'not a component',
      nothing: undefined,
      Gamma: (() => {
        @Component({ selector: 'spec-gamma', template: 'gamma' })
        class Gamma {}
        return Gamma;
      })(),
    };

    // The point is that `nothing: undefined` does not throw: reflectComponentType
    // would fail on it, so non-functions have to be filtered out beforehand.
    await registerComponentModules([module], injector);

    expect(customElements.get('spec-gamma')).toBeDefined();
  });

  it('skips selectors that are not valid custom element names', async () => {
    await registerComponentModules([{ NoDash, AttributeDirective }], injector);

    expect(customElements.get('specnodash')).toBeUndefined();
    expect(customElements.get('[specAttribute]')).toBeUndefined();
  });

  it('resolves lazy module sources', async () => {
    @Component({ selector: 'spec-lazy', template: 'lazy' })
    class Lazy {}

    let loaded = false;
    const loader = () => {
      loaded = true;
      return Promise.resolve({ Lazy });
    };

    expect(loaded).toBe(false);
    await registerComponentModules([loader], injector);

    expect(loaded).toBe(true);
    expect(customElements.get('spec-lazy')).toBeDefined();
  });

  it('is idempotent across repeated calls', async () => {
    @Component({ selector: 'spec-twice', template: 'twice' })
    class Twice {}

    await registerComponentModules([{ Twice }], injector);
    const first = customElements.get('spec-twice');

    // A second call must not throw — customElements.define would reject a
    // duplicate name with a NotSupportedError.
    await registerComponentModules([{ Twice }], injector);

    expect(customElements.get('spec-twice')).toBe(first);
  });

  it('accepts eager and lazy sources in the same call', async () => {
    @Component({ selector: 'spec-mixed-eager', template: 'eager' })
    class MixedEager {}

    @Component({ selector: 'spec-mixed-lazy', template: 'lazy' })
    class MixedLazy {}

    await registerComponentModules([{ MixedEager }, () => Promise.resolve({ MixedLazy })], injector);

    expect(customElements.get('spec-mixed-eager')).toBeDefined();
    expect(customElements.get('spec-mixed-lazy')).toBeDefined();
  });

  describe('isUsed filter', () => {
    it('only registers selectors the document actually uses', async () => {
      @Component({ selector: 'spec-used', template: 'used' })
      class Used {}

      // A dialog mounted imperatively by the page: exported, but never written as a tag.
      @Component({ selector: 'spec-unused', template: 'unused' })
      class Unused {}

      const content = '# Page\n\n<spec-used></spec-used>\n';
      await registerComponentModules([{ Used, Unused }], injector, (selector) =>
        selectorUsedIn(content, selector),
      );

      expect(customElements.get('spec-used')).toBeDefined();
      // Defining it would make the browser upgrade — and re-instantiate — the host
      // element that `createComponent()` inserts, outside its call context.
      expect(customElements.get('spec-unused')).toBeUndefined();
    });

    it('registers everything when no filter is given', async () => {
      @Component({ selector: 'spec-nofilter', template: 'x' })
      class NoFilter {}

      await registerComponentModules([{ NoFilter }], injector);

      expect(customElements.get('spec-nofilter')).toBeDefined();
    });
  });

  describe('selectorUsedIn', () => {
    it('matches a tag whatever its closing form', () => {
      expect(selectorUsedIn('<demo-foo></demo-foo>', 'demo-foo')).toBe(true);
      expect(selectorUsedIn('<demo-foo />', 'demo-foo')).toBe(true);
      expect(selectorUsedIn('<demo-foo class="x">', 'demo-foo')).toBe(true);
    });

    it('does not let a selector match a longer one', () => {
      // The bug this guards: `<demo-foo-bar>` must not register `demo-foo`.
      expect(selectorUsedIn('<demo-foo-bar></demo-foo-bar>', 'demo-foo')).toBe(false);
    });

    it('is false for an absent selector', () => {
      expect(selectorUsedIn('# Title\n\ntext', 'demo-foo')).toBe(false);
    });
  });
});
