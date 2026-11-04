import { api, meta, ApiError } from '../api.js';
import { h, clear, field, toast } from '../ui.js';
import { t, tError } from '../i18n.js';

export async function newCaseView(root) {
  const m = await meta();
  const L = m.limits;
  const errors = {};
  const refs = {};
  const kept = { severity: '3', likelihood: '3' };

  const text = (name, attrs = {}) => (refs[name] = h('input', { id: `f-${name}`, type: 'text', ...attrs }));
  const area = (name, attrs = {}) => (refs[name] = h('textarea', { id: `f-${name}`, ...attrs }));
  const select = (name, options) => (refs[name] = h('select', { id: `f-${name}` }, ...options.map((o) => h('option', { value: o.key }, o.label))));
  const scale = (name, labels) => (refs[name] = h('select', { id: `f-${name}` }, ...labels.map((l, i) => h('option', { value: i + 1 }, `${i + 1} — ${l}`))));

  const errBox = h('p', { class: 'error' });
  const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, t('form.submit'));

  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    submit.disabled = true;
    errBox.textContent = '';
    for (const k of Object.keys(errors)) delete errors[k];
    const data = Object.fromEntries(Object.entries(refs).map(([k, el]) => [k, el.value]));
    try {
      const created = await api.createCase(data);
      toast(t('form.saved'));
      location.hash = `#/case/${created.id}`;
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        Object.assign(errors, err.errors);
        paint();
        errBox.textContent = t('errors.check_fields');
      } else errBox.textContent = err.message;
      submit.disabled = false;
    }
  } });

  const E = (name) => tError(errors[name]);

  function paint() {
    clear(form).append(
      h('div', { class: 'cols' },
        field({ label: t('form.title'), name: 'title', error: E('title'), control: text('title', { maxlength: L.title, placeholder: t('form.titlePh') }) }),
        field({ label: t('form.category'), name: 'category', error: E('category'), control: select('category', m.categories) }),
      ),
      field({ label: t('form.situation'), name: 'situation', error: E('situation'), hint: t('form.situationHint'), control: area('situation', { maxlength: L.situation }) }),
      field({ label: t('form.hazard'), name: 'hazard', error: E('hazard'), hint: t('form.hazardHint'), control: area('hazard', { maxlength: L.hazard }) }),
      field({ label: t('form.exposure'), name: 'exposure', error: E('exposure'), hint: t('form.exposureHint'), control: area('exposure', { maxlength: L.exposure }) }),
      field({ label: t('form.avoidance'), name: 'avoidance', error: E('avoidance'), hint: t('form.avoidanceHint'), control: area('avoidance', { maxlength: L.avoidance }) }),
      field({ label: t('form.habit'), name: 'risky_habit', error: E('risky_habit'), control: text('risky_habit', { maxlength: L.risky_habit, placeholder: t('form.habitPh') }) }),
      h('div', { class: 'cols' },
        field({ label: t('form.severity'), name: 'severity', error: E('severity'), hint: t('form.severityHint'), control: scale('severity', t('form.severityScale')) }),
        field({ label: t('form.likelihood'), name: 'likelihood', error: E('likelihood'), hint: t('form.likelihoodHint'), control: scale('likelihood', t('form.likelihoodScale')) }),
        field({ label: t('form.outcome'), name: 'outcome', error: E('outcome'), control: select('outcome', m.outcomes) }),
      ),
      h('div', { class: 'cols' },
        field({ label: t('form.location'), name: 'location_text', error: E('location_text'), control: text('location_text', { maxlength: L.location_text, placeholder: t('form.locationPh') }) }),
        field({ label: t('form.source'), name: 'source_url', error: E('source_url'), control: text('source_url', { maxlength: L.source_url, placeholder: 'https://' }) }),
      ),
      h('p', { class: 'hint' }, t('form.license', { content: m.content_license.name })),
      errBox,
      submit,
    );
    // keep what the user typed across re-paints
    for (const [k, v] of Object.entries(kept)) if (refs[k]) refs[k].value = v;
  }
  const remember = (e) => { if (e.target.id?.startsWith('f-')) kept[e.target.id.slice(2)] = e.target.value; };
  form.addEventListener('input', remember);
  form.addEventListener('change', remember);
  paint();

  form.classList.add('form');
  clear(root).append(h('h1', {}, t('form.h1')), h('p', { class: 'lead' }, t('form.lead')), form);
}
