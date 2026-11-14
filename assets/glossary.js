(() => {
  'use strict';
  const finder = document.getElementById('glossary-finder');
  const root = document.getElementById('quarto-document-content');
  if (!finder || !root) return;
  const input = finder.querySelector('#glossary-search');
  const results = finder.querySelector('#glossary-results');
  const status = finder.querySelector('#glossary-status');
  const browse = finder.querySelector('#glossary-all');
  const count = finder.querySelector('#glossary-count');
  const normalize = value => value.normalize('NFKD').toLocaleLowerCase().trim();
  const used = new Set([...document.querySelectorAll('[id]')].map(node => node.id));
  const isTerm = p => p.tagName === 'P' && p.children.length === 1 &&
    p.firstElementChild.tagName === 'STRONG' && p.textContent.trim() === p.firstElementChild.textContent.trim();
  const terms = [...root.querySelectorAll('section.level2 > p')].filter(isTerm).map(p => {
    const label = p.textContent.trim();
    let id = p.querySelector('[id]')?.id;
    if (!id) {
      const base = `term-${label.normalize('NFKD').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry'}`;
      id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      p.id = id;
      used.add(id);
    }
    p.classList.add('glossary-term');
    const section = p.closest('section.level2');
    const category = section.querySelector(':scope > h2')?.textContent.trim() || '';
    const context = [];
    for (let next = p.nextElementSibling; next && context.length < 2 && next.tagName === 'P' && !isTerm(next); next = next.nextElementSibling) context.push(next.textContent);
    return {id, label, category, search: normalize(`${label} ${category} ${context.join(' ')}`)};
  }).sort((a, b) => a.label.localeCompare(b.label, 'en', {sensitivity: 'base'}));
  const link = term => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${term.id}`;
    a.textContent = term.label;
    const small = document.createElement('small');
    small.textContent = term.category;
    li.append(a, small);
    return li;
  };
  const groups = new Map();
  for (const term of terms) {
    const letter = term.label[0]?.toLocaleUpperCase().match(/[A-Z]/) ? term.label[0].toLocaleUpperCase() : '#';
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(term);
  }
  for (const [letter, items] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const group = document.createElement('section');
    group.className = 'glossary-letter';
    const heading = document.createElement('h3');
    heading.textContent = letter;
    const list = document.createElement('ul');
    list.className = 'glossary-links';
    list.append(...items.map(link));
    group.append(heading, list);
    browse.append(group);
  }
  count.textContent = `(${terms.length})`;
  const search = () => {
    const query = normalize(input.value);
    results.replaceChildren();
    results.hidden = !query;
    if (!query) { status.textContent = `${terms.length} terms. Type to search or browse all A–Z.`; return; }
    const rank = term => {
      const name = normalize(term.label);
      return name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : 3;
    };
    const matches = terms.filter(term => term.search.includes(query)).sort((a, b) => rank(a) - rank(b));
    results.append(...matches.slice(0, 30).map(link));
    status.textContent = matches.length ? `${matches.length} matching term${matches.length === 1 ? '' : 's'}${matches.length > 30 ? '; showing the first 30' : ''}.` : 'No matching terms. Try another word or browse A–Z.';
  };
  input.addEventListener('input', search);
  search();
  if (location.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
})();
