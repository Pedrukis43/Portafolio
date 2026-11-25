const artists = {
  alma: 'Alma Ríos',
  bruno: 'Bruno Nava',
  vera: 'Vera Solís',
};

const styles = { linea: 'Línea fina', blackwork: 'Blackwork', ornamental: 'Ornamental' };

const works = [
  { id: '01', title: 'Flor de campo', artist: 'alma', style: 'linea', alt: 'Rama de flores pequeñas tatuada en línea fina sobre el antebrazo', description: 'Un tallo ligero con flores abiertas y pequeños brotes. El diseño deja espacio entre cada detalle para acompañar la forma del antebrazo.' },
  { id: '02', title: 'Líneas de fuga', artist: 'alma', style: 'linea', alt: 'Tatuaje geométrico de líneas delgadas que recuerda un dibujo arquitectónico', description: 'Líneas de diferente longitud construyen un motivo arquitectónico a partir de un eje central, con trazos finos y espacio entre planos.' },
  { id: '03', title: 'Cuervo de sombra', artist: 'bruno', style: 'blackwork', alt: 'Cuervo tatuado con masas de tinta negra sobre el antebrazo', description: 'La silueta del cuervo se lee a distancia. Los cortes de piel entre las zonas oscuras devuelven textura y dirección a las plumas.' },
  { id: '04', title: 'Helecho nocturno', artist: 'bruno', style: 'blackwork', alt: 'Helecho negro con una estrella pequeña tatuados sobre el antebrazo', description: 'El helecho sigue la línea del brazo con hojas densas y un pequeño punto de luz al final de la composición.' },
  { id: '05', title: 'Joya del alba', artist: 'vera', style: 'ornamental', alt: 'Ornamento simétrico tatuado con líneas curvas inspiradas en joyería', description: 'Un motivo inspirado en joyería modernista, con curvas abiertas y detalles simétricos alrededor de un centro definido.' },
  { id: '06', title: 'Órbita abierta', artist: 'vera', style: 'ornamental', alt: 'Composición ornamental de arcos y círculos tatuada en el antebrazo', description: 'Arcos que se interrumpen, se cruzan y vuelven a unirse. Los espacios entre líneas mantienen legible el motivo circular.' },
];

const worksById = new Map(works.map((work) => [work.id, work]));
const storageKey = 'tinta-norte-favoritos-v1';
const $ = (selector) => document.querySelector(selector);
const asset = (work) => `../../assets/tinta-${work.id}.webp`;
const gallery = $('#gallery');
const template = $('#work-template');
const filters = [...document.querySelectorAll('[data-filter]')];
const showSaved = $('#show-saved');
const resultCount = $('#results');
const empty = $('#empty');
const dialog = $('#work-dialog');
const workPhoto = $('#work-photo');
const detailFavorite = $('#toggle-work-saved');
const previous = $('#prev');
const next = $('#next');
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const form = $('#brief-form');
const artistSelect = $('#artist');
const placement = $('#placement');
const size = $('#size');
const ink = $('#ink');
const reference = $('#reference');
const notes = $('#notes');
const summary = $('#summary');
const summaryTools = $('#summary-tools');
const requestMessage = $('#request-message');

let saved = readFavorites();
let activeFilter = 'todos';
let savedOnly = false;
let shown = [];
let detailWorks = [];
let detailIndex = 0;
let openingControl = null;
let nextFocus = null;
let photoAnimation;
let swipeStart;

function parseFavorites(value) {
  try {
    const ids = JSON.parse(value ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter((id) => worksById.has(id)) : []);
  } catch {
    return new Set();
  }
}

function readFavorites() {
  try {
    return parseFavorites(localStorage.getItem(storageKey));
  } catch {
    return new Set();
  }
}

function storeFavorites() {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...saved]));
  } catch {
    // The filter and references remain available in this tab.
  }
}

const cards = works.map((work) => {
  const card = template.content.firstElementChild.cloneNode(true);
  const detail = card.querySelector('.work-open');
  const favorite = card.querySelector('.favorite');
  const photo = detail.querySelector('img');

  card.querySelector('h3').textContent = work.title;
  card.querySelector('.byline').textContent = artists[work.artist];
  card.querySelector('.work-tag').textContent = styles[work.style];
  detail.setAttribute('aria-label', `Ver detalle de ${work.title}`);
  detail.setAttribute('aria-haspopup', 'dialog');
  favorite.setAttribute('aria-label', `Guardar ${work.title}`);
  photo.src = asset(work);
  photo.alt = work.alt;

  detail.addEventListener('click', () => openWork(work.id, detail));
  favorite.addEventListener('click', () => {
    toggleFavorite(work.id);
    if (card.hidden) showSaved.focus();
  });
  gallery.append(card);
  return { work, card, favorite };
});

function renderGallery() {
  shown = [];

  for (const { work, card, favorite } of cards) {
    const isSaved = saved.has(work.id);
    const isVisible = (activeFilter === 'todos' || activeFilter === work.style) && (!savedOnly || isSaved);
    card.hidden = !isVisible;
    favorite.setAttribute('aria-pressed', String(isSaved));
    favorite.firstElementChild.textContent = isSaved ? '♥' : '♡';
    if (isVisible) shown.push(work);
  }

  for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.filter === activeFilter));
  showSaved.setAttribute('aria-pressed', String(savedOnly));
  $('#saved-count').textContent = saved.size;
  resultCount.textContent = shown.length === 1 ? '1 pieza' : `${shown.length} piezas`;
  empty.hidden = shown.length > 0;
  if (!shown.length) {
    empty.textContent = saved.size ? 'Elige otro estilo o vuelve a ver todas las piezas.' : 'Guarda una pieza con el corazón. Podrás consultarla aquí y elegirla como referencia.';
  }
}

function refreshReferenceOptions() {
  const previousReference = reference.value;
  const options = [new Option(saved.size ? 'Sin referencia' : 'Sin referencia guardada', '')];
  for (const work of works) if (saved.has(work.id)) options.push(new Option(work.title, work.id));
  reference.replaceChildren(...options);
  reference.value = saved.has(previousReference) ? previousReference : '';
  renderProof();
  if (reference.value !== previousReference) resetSummary();
}

function updateFavorites() {
  renderGallery();
  refreshReferenceOptions();
  if (dialog.open) renderWorkFavorite();
}

function toggleFavorite(id) {
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);
  storeFavorites();
  updateFavorites();
}

function renderWorkFavorite() {
  const isSaved = saved.has(detailWorks[detailIndex].id);
  detailFavorite.setAttribute('aria-pressed', String(isSaved));
  detailFavorite.textContent = isSaved ? 'Pieza guardada' : 'Guardar pieza';
}

function renderDetail() {
  const work = detailWorks[detailIndex];
  workPhoto.src = asset(work);
  workPhoto.alt = work.alt;
  $('#work-title').textContent = work.title;
  $('#work-style').textContent = styles[work.style];
  $('#work-artist').textContent = `Por ${artists[work.artist]}`;
  $('#work-description').textContent = work.description;
  $('#work-position').textContent = `Pieza ${detailIndex + 1} de ${detailWorks.length}`;
  previous.disabled = detailWorks.length < 2;
  next.disabled = detailWorks.length < 2;
  renderWorkFavorite();

  photoAnimation?.cancel();
  if (motion.matches) {
    photoAnimation = workPhoto.animate([
      { opacity: .55, transform: 'scale(1.07)' },
      { opacity: 1, transform: 'scale(1)' },
    ], { duration: 300, easing: 'cubic-bezier(.16,.7,.31,1)' });
  }
}

function openWork(id, control) {
  detailWorks = shown.slice();
  detailIndex = detailWorks.findIndex((work) => work.id === id);
  if (detailIndex < 0) return;
  openingControl = control;
  renderDetail();
  dialog.showModal();
}

function stepDetail(offset) {
  if (detailWorks.length < 2) return;
  detailIndex = (detailIndex + offset + detailWorks.length) % detailWorks.length;
  renderDetail();
}

function renderProof() {
  $('#proof-artist').textContent = artists[artistSelect.value] || 'Por definir';
  $('#proof-place').textContent = placement.value || 'Por definir';
  $('#proof-size').textContent = size.value || 'Por definir';
  $('#proof-ink').textContent = ink.value;

  const work = worksById.get(reference.value);
  const preview = $('#proof-ref');
  preview.hidden = !work;
  if (work) {
    const image = $('#proof-image');
    if (image.getAttribute('src') !== asset(work)) image.src = asset(work);
    image.alt = work.alt;
    $('#proof-ref-title').textContent = work.title;
  }
}

function resetSummary() {
  $('#proof-status').textContent = 'Borrador';
  if (!summaryTools.hidden) requestMessage.textContent = 'Actualiza la ficha para incluir tus cambios.';
  summaryTools.hidden = true;
}

for (const filter of filters) filter.addEventListener('click', () => {
  activeFilter = filter.dataset.filter;
  renderGallery();
});

showSaved.addEventListener('click', () => {
  savedOnly = !savedOnly;
  if (savedOnly) activeFilter = 'todos';
  renderGallery();
});

window.addEventListener('storage', (event) => {
  if (event.key !== storageKey && event.key !== null) return;
  saved = parseFavorites(event.newValue);
  updateFavorites();
});

$('#close').addEventListener('click', () => dialog.close());
previous.addEventListener('click', () => stepDetail(-1));
next.addEventListener('click', () => stepDetail(1));

dialog.addEventListener('keydown', (event) => {
  if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || detailWorks.length < 2) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepDetail(event.key === 'ArrowLeft' ? -1 : 1);
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    detailIndex = event.key === 'Home' ? 0 : detailWorks.length - 1;
    renderDetail();
  }
});

const focusFrame = dialog.querySelector('.focus-frame');

focusFrame.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch' || !event.isPrimary) return;
  swipeStart = { x: event.clientX, y: event.clientY };
});

focusFrame.addEventListener('pointerup', (event) => {
  if (!swipeStart || event.pointerType !== 'touch' || !event.isPrimary) return;
  const x = event.clientX - swipeStart.x;
  const y = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.4) stepDetail(x < 0 ? 1 : -1);
});

focusFrame.addEventListener('pointercancel', () => { swipeStart = null; });
motion.addEventListener('change', () => { if (!motion.matches) photoAnimation?.cancel(); });

dialog.addEventListener('close', () => {
  const target = nextFocus || (openingControl?.closest('.work')?.hidden ? showSaved : openingControl);
  target?.focus();
  nextFocus = null;
  openingControl = null;
  swipeStart = null;
});

detailFavorite.addEventListener('click', () => toggleFavorite(detailWorks[detailIndex].id));

$('#use-reference').addEventListener('click', () => {
  const work = detailWorks[detailIndex];
  if (!saved.has(work.id)) toggleFavorite(work.id);
  reference.value = work.id;
  if (!artistSelect.value) artistSelect.value = work.artist;
  resetSummary();
  renderProof();
  nextFocus = reference;
  dialog.close();
});

for (const button of document.querySelectorAll('[data-artist]')) button.addEventListener('click', () => {
  artistSelect.value = button.dataset.artist;
  resetSummary();
  renderProof();
  artistSelect.focus();
});

form.addEventListener('input', () => {
  resetSummary();
  renderProof();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const work = worksById.get(reference.value);
  const lines = [
    'Tinta Norte · Solicitud de prueba',
    `Artista: ${artists[artistSelect.value]}`,
    `Zona: ${placement.value}`,
    `Tamaño: ${size.value}`,
    `Tinta: ${ink.value}`,
  ];
  if (work) lines.push(`Pieza de referencia: ${work.title}`);
  if (notes.value.trim()) lines.push(`Idea: ${notes.value.trim()}`);
  summary.value = lines.join('\n');
  summaryTools.hidden = false;
  $('#proof-status').textContent = 'Lista para copiar';
  requestMessage.textContent = 'Solicitud de prueba generada.';
  $('#copy').focus();
});

$('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(summary.value);
    requestMessage.textContent = 'Resumen copiado.';
  } catch {
    summary.focus();
    summary.select();
    requestMessage.textContent = 'Resumen seleccionado. Usa tu atajo habitual para copiarlo.';
  }
});

updateFavorites();
