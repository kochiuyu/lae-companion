/* The weekly HTML is the teaching source. This view uses its sections, visuals and prose. */
(() => {
  'use strict';
  if (!document.body.classList.contains('page-week') || typeof HTMLDialogElement === 'undefined' || !('showModal' in HTMLDialogElement.prototype)) return;
  const page = document.getElementById('quarto-document-content');
  if (!page) return;
  const excluded = new Set(['self-check', 'readings']);
  const direct = (element, selector) => [...element.children].filter(child => child.matches(selector));
  const sections = [...page.querySelectorAll('section.level2')].filter(section =>
    !section.closest('section.level3') && !excluded.has(section.id));
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
  const plainTitle = section => section.querySelector(':scope > h2, :scope > h3')?.textContent.trim() || 'Lesson';
  const contentChildren = section => direct(section, ':not(h2):not(h3):not(section):not(script):not(style)');
  const visual = node => node.matches('figure,table,.table-responsive,.cell,.quarto-figure,.callout,.wdiag,.wtable') ||
    (node.matches('p') && !!node.querySelector('.math.display'));
  const linkOnly = node => node.matches('p') && node.children.length === 1 && node.firstElementChild.matches('a');
  const addSection = section => {
    const title = plainTitle(section);
    const children = contentChildren(section);
    const prose = children.filter(node => node.matches('p,ul,ol,blockquote') && !linkOnly(node));
    const notes = children.filter(node => !node.matches('hr')).map(clean);
    const opening = [];
    const firstParagraph = prose.find(node => node.matches('p') && !node.querySelector('.math.display'));
    const firstList = prose.find(node => node.matches('ul,ol'));
    if (firstParagraph) opening.push(clean(firstParagraph));
    if (firstList) {
      const list = clean(firstList);
      [...list.children].slice(4).forEach(item => item.remove());
      opening.push(list);
    }
    if (!opening.length) {
      const topics = direct(section, 'section.level3').map(child => plainTitle(child));
      if (topics.length) {
        const list = document.createElement('ul');
        topics.forEach(text => { const li = document.createElement('li'); li.textContent = text; list.append(li); });
        opening.push(list);
      }
    }
    if (opening.length) frames.push({id: section.id, title, source: section, nodes: opening, notes});
    if (firstList && firstList.children.length > 4) {
      for (let start = 4; start < firstList.children.length; start += 4) {
        const list = clean(firstList);
        [...list.children].forEach((item, index) => { if (index < start || index >= start + 4) item.remove(); });
        if (list.tagName === 'OL') list.start = start + 1;
        frames.push({id: `${section.id}-points-${start + 1}`, title: `${title} · continued`,
          source: section, nodes: [list], notes});
      }
    }
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
      const label = node.querySelector('figcaption,caption')?.textContent.trim() ||
        (node.matches('.callout') ? node.querySelector('.callout-title')?.textContent.trim() : '') ||
        `${title} · visual ${number}`;
      frames.push({id: `${section.id}-visual-${number}`, title: label, source: section,
        nodes: [clean(node)], notes});
    }
    direct(section, 'section.level3').forEach(addSection);
  };
  sections.forEach(addSection);
  if (!frames.length) return;

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'lae-present-launch';
  launch.textContent = 'Present lesson';
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
    get('.lae-slide-title').textContent = frame.title;
    get('.lae-slide-body').replaceChildren(...frame.nodes.map(clean));
    get('.lae-notes-body').replaceChildren(...frame.notes.map(clean));
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
      const heading = document.createElement('h2');
      heading.textContent = frame.title;
      page.append(heading, ...frame.nodes.map(clean));
      return page;
    }));
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
    const index = frames.findIndex(frame => frame.id === params.get('slide'));
    open(index < 0 ? 0 : index);
  }
})();
