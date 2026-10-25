import { Component, input, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkdownComponent, provideMarkdown, type StreamingAnimation } from 'shikidown';

// Chaque test a ses propres noms de balise : `customElements.define` est global.

/** Composant à état interne, pour vérifier qu'il survit aux fragments. */
@Component({
  selector: 'spec-stateful',
  template: `<button type="button" (click)="count.set(count() + 1)">{{ label() }} {{ count() }}</button>`,
})
class Stateful {
  readonly label = input('n');
  readonly count = signal(0);
}

@Component({
  imports: [MarkdownComponent],
  template: `<shikidown
    [content]="content()"
    [streaming]="streaming()"
    [animation]="animation()"
    [components]="components"
  />`,
})
class Host {
  readonly content = signal('');
  readonly streaming = signal(true);
  readonly animation = signal<StreamingAnimation | undefined>(undefined);
  components: Record<string, typeof Stateful> = {};
}

async function setup(components: Record<string, typeof Stateful> = {}): Promise<ComponentFixture<Host>> {
  TestBed.configureTestingModule({ providers: [provideMarkdown()] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.components = components;
  return fixture;
}

async function show(fixture: ComponentFixture<Host>, content: string): Promise<HTMLElement> {
  fixture.componentInstance.content.set(content);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const blocks = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.shikidown-block')];

describe('MarkdownComponent', () => {
  describe('while streaming', () => {
    it('keeps the elements of the blocks already rendered', async () => {
      const fixture = await setup();
      const el = await show(fixture, '# Titre\n\nUn paragraphe');
      const [heading, paragraph] = blocks(el);

      await show(fixture, '# Titre\n\nUn paragraphe qui continue\n\n- une liste');

      expect(blocks(el)).toHaveLength(3);
      expect(blocks(el)[0]).toBe(heading);
      // Le bloc qui s'allonge garde son élément, et même son nœud texte.
      expect(blocks(el)[1]).toBe(paragraph);
      expect(paragraph.textContent?.trim()).toBe('Un paragraphe qui continue');
    });

    it('keeps the state of an embedded component when text is appended', async () => {
      const fixture = await setup({ 'spec-stateful-a': Stateful });
      const el = await show(fixture, '<spec-stateful-a></spec-stateful-a>\n\nSuite');
      const button = el.querySelector('spec-stateful-a button') as HTMLButtonElement;
      button.click();
      button.click();
      await fixture.whenStable();

      await show(fixture, '<spec-stateful-a></spec-stateful-a>\n\nSuite du texte, **en gras');

      expect(el.querySelector('spec-stateful-a button')).toBe(button);
      expect(button.textContent).toContain('2');
      expect(el.querySelector('strong')?.textContent).toBe('en gras');
    });

    it('keeps a component that sits in the block being generated', async () => {
      const fixture = await setup({ 'spec-stateful-b': Stateful });
      const el = await show(fixture, 'Avant <spec-stateful-b></spec-stateful-b> après');
      const button = el.querySelector('spec-stateful-b button') as HTMLButtonElement;
      button.click();
      await fixture.whenStable();

      await show(fixture, 'Avant <spec-stateful-b></spec-stateful-b> après, et encore');

      expect(el.querySelector('spec-stateful-b button')).toBe(button);
      expect(button.textContent).toContain('1');
      expect(el.textContent).toContain('et encore');
    });

    it('renders identical blocks without key collisions', async () => {
      const fixture = await setup();
      const el = await show(fixture, 'même\n\nmême\n\nmême');
      expect(blocks(el).map((b) => b.textContent?.trim())).toEqual(['même', 'même', 'même']);
    });

    it('marks the active block and the busy state', async () => {
      const fixture = await setup();
      const el = await show(fixture, 'Un\n\nDeux');
      const host = el.querySelector('shikidown')!;

      expect(host.getAttribute('aria-busy')).toBe('true');
      expect(blocks(el).map((b) => b.hasAttribute('data-streaming'))).toEqual([false, true]);

      fixture.componentInstance.streaming.set(false);
      await fixture.whenStable();
      expect(host.hasAttribute('aria-busy')).toBe(false);
      expect(blocks(el).some((b) => b.hasAttribute('data-streaming'))).toBe(false);
    });

    it('shows repaired markdown, then the source once the stream ends', async () => {
      const fixture = await setup();
      const el = await show(fixture, 'Du **gras');
      expect(el.querySelector('strong')?.textContent).toBe('gras');

      fixture.componentInstance.streaming.set(false);
      await fixture.whenStable();
      expect(el.querySelector('strong')).toBeNull();
      expect(el.textContent).toContain('**gras');
    });

    it('applies the requested animation mode', async () => {
      const fixture = await setup();
      fixture.componentInstance.animation.set('caret');
      const el = await show(fixture, 'texte');
      expect(el.querySelector('shikidown')!.classList).toContain('shikidown-caret');
    });
  });

  describe('when blocks change', () => {
    it('drops the elements of removed blocks', async () => {
      const fixture = await setup({ 'spec-stateful-c': Stateful });
      const el = await show(fixture, 'Un\n\n<spec-stateful-c></spec-stateful-c>\n\nTrois');
      expect(el.querySelector('spec-stateful-c')).not.toBeNull();

      await show(fixture, 'Un\n\nTrois');
      expect(el.querySelector('spec-stateful-c')).toBeNull();
      expect(blocks(el).map((b) => b.textContent?.trim())).toEqual(['Un', 'Trois']);
    });

    it('keeps the element of a block that moved', async () => {
      const fixture = await setup();
      const el = await show(fixture, 'Un\n\nDeux');
      const two = blocks(el)[1];

      await show(fixture, 'Zéro\n\nUn\n\nDeux');
      expect(blocks(el)[2]).toBe(two);
    });
  });
});
