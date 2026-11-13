'use strict';
  // The lesson DOM is the only content source. No separate slide manuscript.
  (() => {
    const start = document.querySelector('[data-present-start]');
    if (!start) return;
    const dialog = document.getElementById('lesson-presentation');
    const stage = dialog.querySelector('.slide-card');
    const body = dialog.querySelector('.slide-body');
    const title = dialog.querySelector('.slide-title');
    const phase = dialog.querySelector('.slide-phase');
    const counter = dialog.querySelector('.slide-counter');
    const chooser = dialog.querySelector('.slide-chooser');
    const notes = dialog.querySelector('.slide-notes');
    const notesButton = dialog.querySelector('[data-slide-notes]');
    const frames = [];
    const clean = node => {
      const copy = node.cloneNode(true);
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
      const disclosures=[...(copy.matches('details')?[copy]:[]),...copy.querySelectorAll('details')];
      disclosures.forEach(detail=>{
        detail.open=false;
        const answer=detail.querySelector(':scope > template[data-slide-answer]');
        if(answer)detail.replaceChildren(detail.querySelector('summary'),...answer.content.cloneNode(true).children);
      });
      copy.querySelectorAll('template').forEach(x=>x.remove());
      return copy;
    };
    function chunks(node) {
      if (node.matches('.table-scroll')) {
        const rows = [...node.querySelectorAll('tbody > tr')];
        const output = [];
        for (let i = 0; i < rows.length; i += 6) {
        const part = clean(node); const tb = part.querySelector('tbody'); tb.replaceChildren(...rows.slice(i,i+6).map(clean));
        if (rows.length > 6) part.querySelector('caption').append(` · rows ${i + 1}–${Math.min(i + 6, rows.length)}`);
        output.push(part);
      }
      return output.length ? output : [clean(node)];
    }
    if (node.matches('pre')) {
      const lines = node.textContent.trimEnd().split('\n'); const result=[];
      for(let i=0;i<lines.length;i+=10) {const p=document.createElement('pre');const code=document.createElement('code');code.textContent=lines.slice(i,i+10).join('\n');p.append(code);result.push(p);}
      return result;
    }
    return [clean(node)];
  }
  const linkOnly=node=>node.matches('p')&&node.children.length===1&&node.firstElementChild.matches('a');
  function prose(container){
    return [...container.children].flatMap(node=>{
      if(node.matches('p:not(.calculation):not(.lecture-phase)')&&!linkOnly(node))return [node.outerHTML];
      if(node.matches('.memo'))return [prose(node)];
      return [];
    }).join('');
  }
  function answerNotes(detail){
    const copy=detail.cloneNode(true);copy.querySelectorAll('template,summary').forEach(node=>node.remove());
    return copy.querySelector('p')?copy.innerHTML:'';
  }
  function addBlocks(nodes,heading,source,explanation='') {
    for(let i=0;i<nodes.length;i++){
      const node=nodes[i];
      if(node.matches('h2,h3,template,.memo,.downloads,.text-link,nav,p:not(.calculation)')||linkOnly(node))continue;
      if(node.matches('.teaching-block')){addBlocks([...node.querySelector('.teaching-visual').children],node.dataset.presentationTitle,source,node.querySelector('.teaching-explanation')?.innerHTML || explanation);continue;}
      if(node.matches('.check')){addContainer(node,node.querySelector('h3')?.textContent||heading,source);continue;}
      if(node.matches('ul,ol')&&nodes[i+1]?.matches('details')){
        const detail=nodes[++i];frames.push({title:heading,source,nodes:[clean(node),clean(detail)],notes:explanation+answerNotes(detail)});continue;
      }
      for(const part of chunks(node)){
        frames.push({title:heading,source,nodes:[part],notes:explanation+(node.matches('details')?answerNotes(node):'')});
      }
    }
  }
  function addContainer(container,heading,source){
    const template=container.querySelector(':scope > template[data-slide-outline]');
    const explanation=prose(container);
    const detail=container.matches('.check')?container.querySelector(':scope > details'):null;
    if(template){
      const nodes=[...template.content.children].map(clean);
      if(detail)nodes.push(clean(detail));
      frames.push({title:heading,source,nodes,notes:explanation+(detail?answerNotes(detail):'')});
    }
    addBlocks([...container.children].filter(node=>node!==detail),heading,source,explanation);
  }
  const hero=document.querySelector('main .hero');
  const h1=hero.querySelector('h1');
  const intro=hero.querySelector(':scope > template[data-slide-outline]');
  function titleFrames(container,build){
    const first=frames.length;
    build();
    const titles=JSON.parse(container.dataset.slideTitles);
    if(titles.length!==frames.length-first)throw new Error('Slide title count differs from content: '+container.id);
    titles.forEach((text,i)=>{frames[first+i].title=text;frames[first+i].phase=container.dataset.teachingPhase||'Technical continuation';});
  }
  titleFrames(hero,()=>frames.push({title:h1.textContent,source:'main',nodes:[...intro.content.children].map(clean),notes:prose(hero)}));
  const brief=document.querySelector('.brief');
  if(brief)titleFrames(brief,()=>addContainer(brief,'The decision brief','decision-brief'));
  document.querySelectorAll('[data-present-source]').forEach(section=>titleFrames(section,()=>addContainer(section,section.querySelector('h2').textContent,section.id)));
  frames.forEach((frame,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${i + 1}. ${frame.title}`;chooser.append(option);});
  let index=0;let showNotes=false;let closing=false;let ownsFullscreen=false;
  function fit(){
    body.style.fontSize='';
    body.classList.remove('compact-table');
    body.querySelectorAll('figure').forEach(figure=>{
      const svg=figure.querySelector('svg');
      if(svg){
        const other=figure.getBoundingClientRect().height-svg.getBoundingClientRect().height;
        const style=getComputedStyle(body);
        svg.style.maxHeight=`${Math.max(100,body.clientHeight-other-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-4)}px`;
      }
    });
    if(window.innerWidth<700)return;
    const base=parseFloat(getComputedStyle(body).fontSize);
    for(let size=base;size>=22;size-=1){body.style.fontSize=`${size}px`;if(body.scrollHeight<=body.clientHeight+2 && body.scrollWidth<=body.clientWidth+2)break;}
    if(body.scrollHeight>body.clientHeight+2 && body.querySelector('table'))body.classList.add('compact-table');
    dialog.querySelector('.slide-scroll-hint').hidden=body.scrollHeight<=body.clientHeight+2 && body.scrollWidth<=body.clientWidth+2;
  }
  function address(){const u=new URL(location.href);u.searchParams.set('present','1');u.searchParams.set('slide',String(index+1));history.replaceState(null,'',u);}
  function render(next){
    index=Math.max(0,Math.min(frames.length-1,next));const frame=frames[index];title.textContent=frame.title;phase.textContent=frame.phase;body.replaceChildren(...frame.nodes.map(clean));
    body.scrollTop=0;notes.innerHTML='<h3>Teaching notes</h3>'+frame.notes;notes.scrollTop=0;
    notes.hidden=!showNotes;notesButton.setAttribute('aria-pressed',String(showNotes));chooser.value=String(index);
    counter.textContent=`${index + 1} / ${frames.length}`;stage.dataset.slide=String(index+1);stage.dataset.source=frame.source;
    dialog.querySelector('[data-slide-prev]').disabled=index===0;dialog.querySelector('[data-slide-next]').disabled=index===frames.length-1;
    address();fit();
  }
  function open(){if(!dialog.open)dialog.showModal();document.documentElement.classList.add('presenting');render(index);stage.focus();}
  function close(){
    if(closing)return;closing=true;
    if(ownsFullscreen && document.fullscreenElement===document.documentElement)document.exitFullscreen().catch(()=>{});
    dialog.close();document.documentElement.classList.remove('presenting');
    const u=new URL(location.href);u.searchParams.delete('present');u.searchParams.delete('slide');u.hash=frames[index].source;history.replaceState(null,'',u);
    const source=document.getElementById(frames[index].source);source?.scrollIntoView({block:'start'});start.focus({preventScroll:true});closing=false;
  }
  start.hidden=false;start.addEventListener('click',open);
  dialog.querySelector('[data-slide-next]').addEventListener('click',()=>render(index+1));
  dialog.querySelector('[data-slide-prev]').addEventListener('click',()=>render(index-1));
  chooser.addEventListener('change',()=>render(Number(chooser.value)));
  dialog.querySelector('[data-slide-close]').addEventListener('click',close);
  dialog.querySelector('[data-slide-read]').addEventListener('click',close);
  notesButton.addEventListener('click',()=>{showNotes=!showNotes;notes.hidden=!showNotes;notesButton.setAttribute('aria-pressed',String(showNotes));fit();});
  dialog.querySelector('[data-slide-fullscreen]').addEventListener('click',async()=>{
    try{
      if(ownsFullscreen && document.fullscreenElement===document.documentElement)await document.exitFullscreen();
      else{await document.documentElement.requestFullscreen();ownsFullscreen=true;}
      dialog.querySelector('.slide-status').textContent='';
    }
    catch{dialog.querySelector('.slide-status').textContent='Full screen is unavailable here; presentation mode remains active.';}
  });
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)ownsFullscreen=false;requestAnimationFrame(fit);});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  document.addEventListener('keydown',event=>{
    if(!dialog.open || event.ctrlKey || event.altKey || event.metaKey || event.target.matches('select,input,textarea'))return;
    if(['ArrowRight','PageDown'].includes(event.key)||(event.key===' '&&!event.target.closest('button,summary,a'))){event.preventDefault();render(index+1);}
    if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();render(index-1);}
    if(event.key==='Home'){event.preventDefault();render(0);}if(event.key==='End'){event.preventDefault();render(frames.length-1);}
  });
  window.addEventListener('resize',()=>{if(dialog.open)requestAnimationFrame(fit);});
  dialog.querySelector('[data-slide-print]').addEventListener('click',()=>{
    document.getElementById('printed-slides')?.remove();const deck=document.createElement('div');deck.id='printed-slides';
    frames.forEach((frame,i)=>{
      const page=document.createElement('section');const label=document.createElement('p');label.className='print-slide-label';label.textContent=`${h1.textContent} · ${i + 1}/${frames.length}`;
      const heading=document.createElement('h2');heading.textContent=frame.title;page.append(label,heading,...frame.nodes.map(clean));deck.append(page);
    });
    document.body.append(deck);document.body.classList.add('printing-slides');window.print();
  });
  window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-slides');document.getElementById('printed-slides')?.remove();});
  const params=new URLSearchParams(location.search);
  if(params.get('present')==='1'){index=Math.max(0,Math.min(frames.length-1,(parseInt(params.get('slide'),10)||1)-1));open();}
})();
