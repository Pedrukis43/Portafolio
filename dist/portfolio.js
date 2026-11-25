const projects = [...document.querySelectorAll('.project')];
const filters = [...document.querySelectorAll('[data-filter]')];
const toolbar = document.querySelector('.work-toolbar');
const workCount = document.querySelector('.work-count');

function filterProjects(selected) {
  const kind = selected.dataset.filter;
  let count = 0;

  for (const project of projects) {
    const visible = kind === 'all' || project.dataset.kind === kind || project.dataset.collection === kind;
    project.hidden = !visible;
    if (visible) count++;
  }

  for (const filter of filters) {
    filter.setAttribute('aria-pressed', String(filter === selected));
  }

  workCount.textContent = count === 1 ? '1 sitio' : `${count} sitios`;
}

for (const filter of filters) {
  filter.addEventListener('click', () => filterProjects(filter));
}
filterProjects(filters[0]);
toolbar.hidden = false;

const dialog = document.querySelector('.case-dialog');
const caseDetails = document.querySelector('.case-details');

if (typeof dialog.showModal === 'function') {
  function openCase(id) {
    const original = document.getElementById(id);
    if (!original || !caseDetails.contains(original)) return;

    const detail = original.cloneNode(true);
    detail.removeAttribute('id');
    detail.setAttribute('aria-labelledby', 'active-case-title');
    detail.querySelector('h2').id = 'active-case-title';
    const closeButton = detail.querySelector('.close-case');
    closeButton.hidden = false;
    closeButton.addEventListener('click', () => dialog.close());

    dialog.setAttribute('aria-labelledby', 'active-case-title');
    dialog.replaceChildren(detail);
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
    dialog.scrollTop = 0;
  }

  for (const link of document.querySelectorAll('[data-case]')) {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openCase(link.dataset.case);
    });
  }

  function showLinkedCase() {
    openCase(window.location.hash.slice(1));
  }

  dialog.addEventListener('close', () => dialog.replaceChildren());
  caseDetails.hidden = true;
  window.addEventListener('hashchange', showLinkedCase);
  showLinkedCase();
}

const hero = document.querySelector('.hero');
const heroMotion = window.matchMedia('(min-width: 701px) and (prefers-reduced-motion: no-preference)');
let scrollFrame = null;

function updateHero() {
  scrollFrame = null;
  const distance = Math.max(0, -hero.getBoundingClientRect().top);
  hero.style.setProperty('--hero-offset', `${Math.min(distance * 0.095, 22)}px`);
}

function scheduleHero() {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateHero);
}

function syncHeroMotion() {
  window.removeEventListener('scroll', scheduleHero);
  if (heroMotion.matches) {
    window.addEventListener('scroll', scheduleHero, { passive: true });
    scheduleHero();
  } else {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    hero.style.removeProperty('--hero-offset');
  }
}

heroMotion.addEventListener('change', syncHeroMotion);
syncHeroMotion();
