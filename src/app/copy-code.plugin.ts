import type { MarkdownItInstance } from 'shikidown';

export function copyCodePlugin(md: MarkdownItInstance): void {
  const original = md.renderer.rules['fence'];

  md.renderer.rules['fence'] = (tokens, idx, options, env, self) => {
    const rendered = original
      ? original(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);

    return (
      `<div class="code-block relative group">` +
      rendered +
      `<button ` +
      `class="absolute top-3 right-3 z-10 px-2 py-0.5 text-xs rounded ` +
      `opacity-0 group-hover:opacity-100 transition-opacity ` +
      `bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-900 ` +
      `dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-400 dark:hover:text-white" ` +
      `onclick="const pre=this.closest('.code-block').querySelector('pre');` +
      `const text=pre.querySelector('code')?.textContent??pre.textContent;` +
      `navigator.clipboard.writeText(text).then(()=>{` +
      `this.textContent='✓';` +
      `setTimeout(()=>this.textContent='Copy',2000)` +
      `})" ` +
      `aria-label="Copy code">Copy</button>` +
      `</div>`
    );
  };
}
