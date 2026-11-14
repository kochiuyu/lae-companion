/* The lesson HTML is the teaching source. This view uses its sections, visuals and prose. */
(() => {
  'use strict';
  const isOrient = document.body.classList.contains('page-orient');
  if ((!document.body.classList.contains('page-week') && !isOrient) || typeof HTMLDialogElement === 'undefined' || !('showModal' in HTMLDialogElement.prototype)) return;
  const page = document.getElementById('quarto-document-content');
  if (!page) return;
  const excluded = new Set(['self-check', 'readings']);
  const direct = (element, selector) => [...element.children].filter(child => child.matches(selector));
  const sections = [...page.querySelectorAll('section.level2')].filter(section =>
    !section.closest('section.level3') && (isOrient ? section.id === 'orient-briefing' : !excluded.has(section.id)));
  if (!sections.length) return;

  const frames = [];
  let copyNumber = 0;
  const clean = node => {
    const copy = node.cloneNode(true);
    const elements = [copy, ...copy.querySelectorAll('*')];
    const prefix = `lae-present-${++copyNumber}-`;
    const ids = new Map();
    for (const item of elements) if (item.id) ids.set(item.id, `${prefix}${item.id}`);
    for (const item of elements) {
      if (item.id) item.id = ids.get(item.id);
      for (const name of ['aria-labelledby', 'aria-describedby', 'for']) {
        const value = item.getAttribute(name);
        if (value) item.setAttribute(name, value.split(/\s+/).map(id => ids.get(id) || id).join(' '));
      }
      for (const name of ['href', 'xlink:href', 'clip-path', 'fill', 'stroke', 'filter', 'style']) {
        const value = item.getAttribute(name);
        if (value) item.setAttribute(name, value.replace(/url\(#([^)]*)\)|^#(.+)$/g, (match, urlId, hrefId) => {
          const id = urlId || hrefId;
          const mapped = ids.get(id);
          return mapped ? (urlId ? `url(#${mapped})` : `#${mapped}`) : match;
        }));
      }
      item.removeAttribute('data-anchor-id');
      if (item.getAttribute('role') === 'button') { item.removeAttribute('role'); item.removeAttribute('tabindex'); }
    }
    copy.querySelectorAll('script,button,input,textarea,select,.anchorjs-link,.quarto-figure-center > .lightbox').forEach(item => item.remove());
    return copy;
  };
  const plainTitle = section => {
    const title = section.querySelector(':scope > h2, :scope > h3')?.textContent.trim() || 'Lesson';
    return title.replace(/^\d+(?:\.\d+)*\.\s*/, '');
  };
  const contentChildren = section => direct(section, ':not(h2):not(h3):not(section):not(script):not(style)');
  const visual = node => node.matches('figure,table,.table-responsive,.cell,.quarto-figure,.wdiag,.wtable');
  const linkOnly = node => node.matches('p') && node.children.length === 1 && node.firstElementChild.matches('a');
  const readable = node => node?.matches('p') && !node.querySelector('.math.display') && !linkOnly(node) && node.textContent.trim().length > 12;
  const brief = (node, className) => {
    const copy = clean(node);
    copy.classList.add(className);
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (text.length > 320) {
      const sentence = text.match(/^.{60,280}?[.!?](?=\s|$)/)?.[0];
      copy.replaceChildren(document.createTextNode(sentence || `${text.slice(0, 250).replace(/\s+\S*$/, '')}…`));
    }
    return copy;
  };
  const nearby = (node, direction) => {
    let sibling = node[direction];
    for (let checked = 0; sibling && checked < 4; checked++, sibling = sibling[direction]) {
      if (readable(sibling)) return sibling;
    }
    return null;
  };
  const listChunks = list => {
    const total = list.children.length;
    const groups = Math.ceil(total / 7);
    const base = Math.floor(total / groups);
    const extra = total % groups;
    let start = 0;
    return Array.from({length: groups}, (_, group) => {
      const size = base + (group < extra ? 1 : 0);
      const copy = clean(list);
      [...copy.children].forEach((item, index) => {
        if (index < start || index >= start + size) item.remove();
      });
      if (copy.tagName === 'OL') copy.start = (list.start || 1) + start;
      const chunk = {node: copy, start: start + 1};
      start += size;
      return chunk;
    });
  };
  const firstItems = list => listChunks(list)[0].node;
  const addSection = section => {
    const title = plainTitle(section);
    const children = contentChildren(section);
    const prose = children.filter(node => node.matches('p,ul,ol,blockquote') && !linkOnly(node));
    const notes = children.filter(node => !node.matches('hr')).map(clean);
    const opening = [];
    const firstParagraph = prose.find(node => node.matches('p') && !node.querySelector('.math.display'));
    const firstList = prose.find(node => node.matches('ul,ol'));
    const formulas = children.filter(node => node.matches('p') && node.querySelector('.math.display'));
    const openingFormula = formulas[0] && children.indexOf(formulas[0]) <= 3 ? formulas[0] : null;
    [firstParagraph, firstList, openingFormula].filter(Boolean)
      .sort((a, b) => children.indexOf(a) - children.indexOf(b))
      .forEach(node => opening.push(node === firstList ? firstItems(node) : clean(node)));
    if (!opening.length) {
      const topics = direct(section, 'section.level3').map(child => plainTitle(child));
      if (topics.length > 1) {
        const list = document.createElement('ul');
        topics.forEach(text => { const li = document.createElement('li'); li.textContent = text; list.append(li); });
        opening.push(list);
      }
    }
    const mergeOpening = opening.length === 1 && opening[0].textContent.trim().length < 90 && children.some(visual);
    if (opening.length && !mergeOpening) frames.push({id: section.id, title, source: section, nodes: opening, notes});
    if (firstList) listChunks(firstList).slice(1).forEach(({node, start}) => {
      frames.push({id: `${section.id}-points-${start}`, title: `${title} · continued`,
        source: section, nodes: [node], notes});
    });
    formulas.filter(node => node !== openingFormula).forEach((node, index) => {
      const nodes = [];
      const lead = nearby(node, 'previousElementSibling');
      if (lead) nodes.push(brief(lead, 'lae-slide-context'));
      nodes.push(clean(node));
      const next = node.nextElementSibling;
      if (next?.matches('ul,ol') && next.children.length) nodes.push(firstItems(next));
      else if (readable(next) && next !== lead) nodes.push(brief(next, 'lae-slide-takeaway'));
      frames.push({id: `${section.id}-equation-${index + 1}`, title: `${title} · equation`,
        source: section, nodes, notes});
    });
    let activity = 0;
    for (const node of children.filter(child => child.matches('p') &&
      /^\s*(slide exercise|exercise ledger|class exercise)\s*[:—-]/i.test(child.textContent))) {
      if (node === firstParagraph) continue;
      activity++;
      frames.push({id: `${section.id}-activity-${activity}`, title: `${title} · activity`,
        source: section, nodes: [clean(node)], notes});
    }
    let number = 0;
    for (const node of children.filter(visual)) {
      number++;
      const caption = node.querySelector('figcaption,caption')?.textContent.trim();
      const kind = node.matches('table,.table-responsive,.wtable') ? 'table' : 'diagram';
      const shortTitle = title.replace(/^\d+(?:\.\d+)?\.\s*/, '')
        .replace(/^One-page tool map \((.+)\)$/, 'Tool map: $1');
      const label = caption?.length < 75 ? caption : `${shortTitle} · ${kind}`;
      const table = kind === 'table' ? (node.matches('table') ? node : node.querySelector('table')) : null;
      const rows = [...(table?.querySelectorAll('tbody > tr') || [])];
      const tallSvg = node.matches('.wdiag-svg') ? node.querySelector('svg[viewBox]') : null;
      const bounds = tallSvg?.viewBox.baseVal;
      const parts = rows.length > 6 ? Math.ceil(rows.length / 5) : 1;
      for (let part = 0; part < parts; part++) {
        let artwork = clean(node);
        if (artwork.matches('.wdiag-svg')) artwork.querySelector('.wdiag-cap')?.remove();
        if (node.id === 'w01-altitude-layers') {
          artwork = document.createElement('div');
          artwork.className = 'lae-slide-altitude';
          artwork.innerHTML = `<div class="lae-altitude-card lae-altitude-policy"><span class="lae-altitude-tag">Hong Kong policy</span><strong>~1,000 m</strong><p>Working description of the low-altitude economy.</p><b>Not an SUA flying ceiling</b></div><div class="lae-altitude-card lae-altitude-hk"><span class="lae-altitude-tag">Hong Kong · Cap. 448G</span><strong>100 / 300 ft</strong><p>Ordinary SUA bands: A1 at 100 ft AGL; A2 at 300 ft AGL.</p><b>Higher only with CAD permission</b></div><div class="lae-altitude-card lae-altitude-mainland"><span class="lae-altitude-tag">Mainland scheme</span><strong>120 / 300 m</strong><p>True-height labels under a different airspace scheme.</p><b>Not Hong Kong Cap. 448G</b></div>`;
        } else if (node.id === 'w11-corridor-screen-svg') {
          artwork = document.createElement('div');
          artwork.className = 'lae-slide-corridor';
          artwork.innerHTML = `<div class="lae-corridor-grid"><div><b>1 · Problem</b><span>Does airport door-to-door time beat the alternative?</span></div><div><b>2 · Demand</b><span>Choice at each fare, after generalized cost and capacity.</span></div><div><b>3 · Operations</b><span>Aircraft, seats, load factor, days → serviceable capacity.</span></div><div><b>4 · Economics</b><span>Contribution, fixed cost, break-even, NPV, downside.</span></div><div><b>5 · Regulation</b><span>Permissions and evidence; use Sandbox X or AC-013 only if relevant.</span></div><div><b>6 · Impact</b><span>Emissions, noise, privacy, access, public service.</span></div></div><p class="lae-corridor-decision"><strong>Recommendation:</strong> proceed, stage, redesign, relocate, or reject — state the conditions that would change the decision.</p>`;
        } else if (bounds?.height >= 450) artwork.classList.add('lae-slide-tall-diagram');
        if (parts > 1 && table) {
          const body = artwork.matches('table') ? artwork.querySelector('tbody') : artwork.querySelector('table tbody');
          const start = part * 5;
          [...body.children].forEach((row, index) => {
            if (index < start || index >= start + 5) row.remove();
          });
        }
        const nodes = [artwork];
        if (mergeOpening && number === 1 && part === 0) nodes.unshift(clean(opening[0]));
        const next = node.nextElementSibling;
        if (kind === 'table' && rows.length <= 3 && readable(next)) nodes.push(brief(next, 'lae-slide-takeaway'));
        else if (next?.matches('.callout-important')) nodes.push(brief(next, 'lae-slide-takeaway'));
        frames.push({id: `${section.id}-visual-${number}${part ? `-part-${part + 1}` : ''}`,
          title: parts > 1 ? `${shortTitle} · ${part + 1} of ${parts}` : label,
          source: section, nodes, notes});
      }
    }
    direct(section, 'section.level3').forEach(addSection);
  };
  sections.forEach(addSection);
  if (!frames.length) return;
  const courseTitle = document.querySelector('#title-block-header h1')?.textContent.trim() || 'LAE lesson';
  const subtitle = document.querySelector('#title-block-header .subtitle')?.textContent.trim() || '';
  const week = courseTitle.match(/^Week\s+(\d+)\s*:\s*(.+)$/i);
  const cover = document.createElement('div');
  cover.className = 'lae-cover';
  const label = document.createElement('p');
  label.className = 'lae-cover-label';
  label.textContent = isOrient ? 'LAE Course · Orient' : week ? `LAE Course · Week ${week[1]}` : 'LAE Course';
  const heading = document.createElement('h2');
  heading.className = 'lae-cover-heading';
  heading.textContent = isOrient ? 'Orient' : week ? week[2] : courseTitle;
  cover.append(label, heading);
  if (subtitle) {
    const subheading = document.createElement('p');
    subheading.className = 'lae-cover-subtitle';
    subheading.textContent = subtitle;
    cover.append(subheading);
  }
  frames.unshift({id: 'title', title: courseTitle, cover: true, source: sections[0],
    nodes: [cover], notes: contentChildren(sections[0]).map(clean)});

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'lae-present-launch';
  launch.textContent = isOrient ? 'Present Orient' : 'Present lesson';
  const pdf = [...page.querySelectorAll('a[href$=".pdf"]')].find(a => a.getAttribute('href').startsWith('slides/'));
  (pdf?.closest('p') || page.querySelector('h1') || page).insertAdjacentElement('afterend', launch);

  const dialog = document.createElement('dialog');
  dialog.className = 'lae-presentation';
  dialog.setAttribute('aria-label', 'Lesson presentation');
  dialog.innerHTML = `<div class="lae-present-toolbar"><label for="lae-slide-choice">Slide</label><select id="lae-slide-choice" aria-label="Choose slide"></select><span class="lae-slide-counter" aria-live="polite"></span><button type="button" data-close>Exit</button></div><div class="lae-present-layout"><section class="lae-slide" tabindex="-1"><h2 class="lae-slide-title"></h2><div class="lae-slide-body"></div><span class="lae-slide-hint" hidden>Scroll within this slide for more.</span></section><aside class="lae-present-notes" aria-label="Teaching notes" hidden><h3>Notes</h3><div class="lae-notes-body"></div></aside></div><div class="lae-present-controls"><div><button type="button" data-prev>← Previous</button><button type="button" data-next>Next →</button></div><div><button type="button" data-notes aria-pressed="false">Notes</button><button type="button" data-read>Read this section</button><button type="button" data-print>Print slides</button><button type="button" data-fullscreen>Full screen</button></div></div>`;
  document.body.append(dialog);
  const printDeck = document.createElement('div');
  printDeck.className = 'lae-print-deck';
  printDeck.setAttribute('aria-hidden', 'true');
  document.body.append(printDeck);
  const get = selector => dialog.querySelector(selector);
  const typesetMath = element => {
    if (!window.katex) return;
    for (const math of element.querySelectorAll('.math')) {
      if (math.querySelector('.katex')) continue;
      const tex = math.textContent.trim();
      if (tex) window.katex.render(tex, math, {
        displayMode: math.classList.contains('display'), throwOnError: false,
        macros: [], fleqn: false
      });
    }
  };
  const chooser = get('#lae-slide-choice');
  frames.forEach((frame, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${index + 1}. ${frame.title}`;
    chooser.append(option);
  });
  let current = 0;
  let notesOpen = false;
  let ownsFullscreen = false;
  const urlFor = index => {
    const url = new URL(location.href);
    if (index === null) { url.searchParams.delete('present'); url.searchParams.delete('slide'); }
    else { url.searchParams.set('present', '1'); url.searchParams.set('slide', frames[index].id); }
    return url;
  };
  const show = index => {
    current = Math.max(0, Math.min(frames.length - 1, index));
    const frame = frames[current];
    get('.lae-slide').classList.toggle('is-cover', !!frame.cover);
    get('.lae-slide-title').textContent = frame.cover ? '' : frame.title;
    get('.lae-slide-body').replaceChildren(...frame.nodes.map(clean));
    get('.lae-notes-body').replaceChildren(...frame.notes.map(clean));
    typesetMath(get('.lae-slide-body'));
    typesetMath(get('.lae-notes-body'));
    get('.lae-slide-counter').textContent = `${current + 1} / ${frames.length}`;
    chooser.value = String(current);
    get('[data-prev]').disabled = current === 0;
    get('[data-next]').disabled = current === frames.length - 1;
    get('.lae-slide').scrollTop = 0;
    get('.lae-present-notes').scrollTop = 0;
    history.replaceState(null, '', urlFor(current));
    get('.lae-slide').focus({preventScroll: true});
    requestAnimationFrame(() => { get('.lae-slide-hint').hidden = get('.lae-slide').scrollHeight <= get('.lae-slide').clientHeight + 5; });
  };
  window.addEventListener('resize', () => {
    if (dialog.open) get('.lae-slide-hint').hidden = get('.lae-slide').scrollHeight <= get('.lae-slide').clientHeight + 5;
  });
  const open = index => { if (!dialog.open) dialog.showModal(); show(index); };
  const close = (read = false) => {
    const source = frames[current].source;
    if (ownsFullscreen && document.fullscreenElement === dialog) document.exitFullscreen();
    ownsFullscreen = false;
    dialog.close();
    history.replaceState(null, '', urlFor(null));
    if (read) source.scrollIntoView({block: 'start'});
    else launch.focus({preventScroll: true});
  };
  launch.addEventListener('click', () => open(0));
  get('[data-close]').addEventListener('click', () => close());
  get('[data-read]').addEventListener('click', () => close(true));
  get('[data-prev]').addEventListener('click', () => show(current - 1));
  get('[data-next]').addEventListener('click', () => show(current + 1));
  chooser.addEventListener('change', () => show(Number(chooser.value)));
  get('[data-notes]').addEventListener('click', () => {
    notesOpen = !notesOpen;
    get('.lae-present-notes').hidden = !notesOpen;
    get('[data-notes]').setAttribute('aria-pressed', String(notesOpen));
    dialog.classList.toggle('show-notes', notesOpen);
  });
  get('[data-fullscreen]').addEventListener('click', async () => {
    if (document.fullscreenElement === dialog) { await document.exitFullscreen(); ownsFullscreen = false; }
    else if (dialog.requestFullscreen) { await dialog.requestFullscreen(); ownsFullscreen = true; }
  });
  get('[data-print]').addEventListener('click', () => {
    printDeck.replaceChildren(...frames.map(frame => {
      const page = document.createElement('section');
      page.className = 'lae-print-slide';
      if (frame.cover) { page.classList.add('lae-print-cover'); page.append(...frame.nodes.map(clean)); }
      else {
        const heading = document.createElement('h2');
        heading.textContent = frame.title;
        page.append(heading, ...frame.nodes.map(clean));
      }
      return page;
    }));
    typesetMath(printDeck);
    document.body.classList.add('lae-printing');
    window.print();
  });
  window.addEventListener('afterprint', () => { document.body.classList.remove('lae-printing'); printDeck.replaceChildren(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('keydown', event => {
    if (event.target.closest('select,input,textarea')) return;
    if (['ArrowRight', 'PageDown'].includes(event.key) || (event.key === ' ' && !event.target.closest('button,a'))) { event.preventDefault(); show(current + 1); }
    if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); show(current - 1); }
    if (event.key === 'Home') { event.preventDefault(); show(0); }
    if (event.key === 'End') { event.preventDefault(); show(frames.length - 1); }
  });
  const params = new URLSearchParams(location.search);
  if (params.get('present') === '1') {
    const requested = params.get('slide')?.replace(/-part-[2-9]\d*$/, '');
    const index = frames.findIndex(frame => frame.id === requested);
    const initial = index < 0 ? 0 : index;
    if (document.readyState === 'complete') open(initial);
    else document.addEventListener('DOMContentLoaded', () => open(initial), {once: true});
  }
})();
