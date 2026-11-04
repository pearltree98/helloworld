import { h, clear } from '../ui.js';
import { aboutContent } from '../i18n.js';

export function aboutView(root) {
  const a = aboutContent();
  clear(root).append(
    h('article', { class: 'article prose' },
      h('h1', {}, a.title),
      h('p', { class: 'lead' }, a.intro),
      h('blockquote', {}, a.quote),
      ...a.sections.map((s) => h('section', { class: 'section' },
        h('h2', {}, s.h),
        s.items ? h('dl', {}, ...s.items.flatMap((i) => [h('dt', {}, i.term), h('dd', {}, i.def)])) : null,
        ...(s.p ?? []).map((p) => h('p', {}, p)),
        s.steps ? h('ol', {}, ...s.steps.map((x) => h('li', {}, x))) : null,
      )),
    ),
  );
}
