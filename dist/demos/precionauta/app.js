// Demo estática de Precionauta: catálogo, filtros e historial con datos ficticios generados en el navegador.
// No hay backend ni credenciales: todo sale de la lista de abajo.

const DAYS = 90;
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const pct = (n) => `${Math.round(n * 100)} %`;

// base: precio habitual · price: precio de hoy · listed: «precio antes» que anuncia la tienda
// dip: [día de inicio, duración, factor] de una rebaja anterior; sale: días que lleva el precio de hoy
const PRODUCTS = [
  { id: 1, name: 'Audífonos inalámbricos Ondas Pro', store: 'Ciber Plaza', category: 'Tecnología', base: 1899, price: 1299, listed: 2799, sale: 4 },
  { id: 2, name: 'Monitor Lumen 27″ QHD', store: 'MercaTodo', category: 'Tecnología', base: 5499, price: 4699, listed: 6999, sale: 9, dip: [30, 6, 0.82] },
  { id: 3, name: 'Teclado mecánico Tecla 75 %', store: 'Ciber Plaza', category: 'Tecnología', base: 1499, price: 1349, listed: 2199, sale: 3 },
  { id: 4, name: 'Bocina portátil Eco Mini', store: 'Bodega Azul', category: 'Tecnología', base: 899, price: 589, listed: 1299, sale: 6 },
  { id: 5, name: 'Freidora de aire Crujiente 5 L', store: 'Hogar Ya', category: 'Cocina', base: 1799, price: 1199, listed: 2499, sale: 5 },
  { id: 6, name: 'Cafetera de goteo Aroma 12 tazas', store: 'MercaTodo', category: 'Cocina', base: 749, price: 699, listed: 1199, sale: 12, dip: [50, 8, 0.7] },
  { id: 7, name: 'Batería de cocina Brasa 7 piezas', store: 'Hogar Ya', category: 'Cocina', base: 2399, price: 1699, listed: 3299, sale: 7 },
  { id: 8, name: 'Licuadora Torbellino 1.5 L', store: 'Bodega Azul', category: 'Cocina', base: 1099, price: 999, listed: 1599, sale: 2 },
  { id: 9, name: 'Lámpara de escritorio Haz LED', store: 'Hogar Ya', category: 'Hogar', base: 549, price: 379, listed: 799, sale: 8 },
  { id: 10, name: 'Aspiradora vertical Brisa', store: 'MercaTodo', category: 'Hogar', base: 3299, price: 2599, listed: 4599, sale: 6, dip: [20, 5, 0.72] },
  { id: 11, name: 'Juego de sábanas Nube matrimonial', store: 'Bodega Azul', category: 'Hogar', base: 899, price: 849, listed: 1499, sale: 15 },
  { id: 12, name: 'Control inalámbrico Pulso', store: 'Ciber Plaza', category: 'Videojuegos', base: 1299, price: 949, listed: 1599, sale: 4 },
  { id: 13, name: 'Tarjeta de regalo Arcade $500', store: 'MercaTodo', category: 'Videojuegos', base: 500, price: 450, listed: 500, sale: 10 },
  { id: 14, name: 'Juego Galaxia Rota — Edición estándar', store: 'Bodega Azul', category: 'Videojuegos', base: 1199, price: 699, listed: 1399, sale: 3 },
  { id: 15, name: 'Tenis para correr Zancada', store: 'MercaTodo', category: 'Deportes', base: 1999, price: 1499, listed: 2899, sale: 5, dip: [40, 7, 0.68] },
  { id: 16, name: 'Mancuernas ajustables Hierro 20 kg', store: 'Hogar Ya', category: 'Deportes', base: 2799, price: 2299, listed: 3599, sale: 6 },
  { id: 17, name: 'Botella térmica Cumbre 1 L', store: 'Bodega Azul', category: 'Deportes', base: 449, price: 289, listed: 599, sale: 9 },
];

const ICONS = {
  Tecnología: 'M48 64h160a8 8 0 0 1 8 8v104a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V72a8 8 0 0 1 8-8zM96 216h64M128 184v32',
  Cocina: 'M40 112h176v48a56 56 0 0 1-56 56H96a56 56 0 0 1-56-56zM88 40v40M128 40v40M168 40v40',
  Hogar: 'M40 216V112l88-72 88 72v104zM104 216v-64h48v64',
  Videojuegos: 'M80 80h96a48 48 0 0 1 0 96H80a48 48 0 0 1 0-96zM72 128h32M88 112v32M160 120h.01M184 136h.01',
  Deportes: 'M128 32a96 96 0 1 0 0 192 96 96 0 1 0 0-192zM32 128h192M128 32c32 32 32 160 0 192M128 32c-32 32-32 160 0 192',
};

// Generador con semilla: el mismo producto siempre dibuja el mismo historial.
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ending9 = (n) => Math.max(9, Math.round(n / 10) * 10 - 1);

function buildHistory(product) {
  const rand = random(product.id * 7919);
  const points = [];
  for (let day = 0; day < DAYS; day++) {
    let value = product.base * (1 + (rand() - 0.5) * 0.08);
    if (product.dip && day >= product.dip[0] && day < product.dip[0] + product.dip[1]) value = product.base * product.dip[2];
    if (day >= DAYS - product.sale) value = product.price;
    points.push(day >= DAYS - product.sale ? product.price : ending9(value));
  }
  return points;
}

const products = PRODUCTS.map((product) => {
  const history = buildHistory(product);
  const average = history.reduce((sum, v) => sum + v, 0) / DAYS;
  return {
    ...product,
    history,
    average,
    realSaving: Math.max(0, 1 - product.price / average),
    advertised: Math.max(0, 1 - product.price / product.listed),
    lowest: product.price <= Math.min(...history),
  };
});

// —— Catálogo y filtros ——
const state = { query: '', category: '', store: '', saving: 0, sort: 'saving', lowest: false };
const grid = document.getElementById('grid');
const count = document.getElementById('count');
const empty = document.getElementById('empty');
const searchInput = document.getElementById('search');
const storeSelect = document.getElementById('store');
const savingSelect = document.getElementById('saving');
const sortSelect = document.getElementById('sort');
const lowestCheck = document.getElementById('lowest');
const categoryBox = document.getElementById('categories');

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

for (const category of ['', ...new Set(products.map((p) => p.category))]) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.dataset.category = category;
  chip.textContent = category || 'Todas';
  chip.setAttribute('aria-pressed', String(category === ''));
  categoryBox.append(chip);
}
for (const store of [...new Set(products.map((p) => p.store))].sort()) storeSelect.add(new Option(store, store));

function visibleProducts() {
  const words = normalize(state.query).split(/\s+/).filter(Boolean);
  const list = products.filter((p) => {
    const haystack = normalize(`${p.name} ${p.store} ${p.category}`);
    return words.every((w) => haystack.includes(w))
      && (!state.category || p.category === state.category)
      && (!state.store || p.store === state.store)
      && p.realSaving * 100 >= state.saving
      && (!state.lowest || p.lowest);
  });
  const order = { saving: (a, b) => b.realSaving - a.realSaving, 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price };
  return list.sort(order[state.sort]);
}

function card(p) {
  const item = document.createElement('li');
  item.className = 'product-card';
  item.innerHTML = `
    <div class="product-card__media" data-category="${p.category}">
      <svg viewBox="0 0 256 256" aria-hidden="true"><path d="${ICONS[p.category]}"/></svg>
      ${p.advertised >= 0.05 ? `<span class="badge badge--deal">−${pct(p.advertised)}</span>` : ''}
    </div>
    <div class="product-card__body">
      <p class="product-card__meta">${p.store} · ${p.category}</p>
      <h3></h3>
      <p class="product-card__price"><strong>${money.format(p.price)}</strong> <s>${money.format(p.listed)}</s></p>
      <p class="product-card__real">Ahorro real: <strong>${pct(p.realSaving)}</strong> contra su promedio de 90 días</p>
      ${p.lowest ? '<p class="badge badge--low">Mínimo de 90 días</p>' : ''}
      <button type="button" class="btn btn--primary" data-history="${p.id}">Ver historial</button>
    </div>`;
  item.querySelector('h3').textContent = p.name;
  return item;
}

function render() {
  const list = visibleProducts();
  grid.replaceChildren(...list.map(card));
  count.textContent = list.length === 1 ? '1 oferta' : `${list.length} ofertas`;
  empty.hidden = list.length > 0;
  for (const chip of categoryBox.children) chip.setAttribute('aria-pressed', String(chip.dataset.category === state.category));
}

searchInput.addEventListener('input', () => { state.query = searchInput.value; render(); });
document.getElementById('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.query = searchInput.value;
  render();
  document.getElementById('catalogo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
categoryBox.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  state.category = chip.dataset.category;
  render();
});
storeSelect.addEventListener('change', () => { state.store = storeSelect.value; render(); });
savingSelect.addEventListener('change', () => { state.saving = Number(savingSelect.value); render(); });
sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });
lowestCheck.addEventListener('change', () => { state.lowest = lowestCheck.checked; render(); });
document.getElementById('reset').addEventListener('click', () => {
  Object.assign(state, { query: '', category: '', store: '', saving: 0, sort: 'saving', lowest: false });
  searchInput.value = '';
  storeSelect.value = '';
  savingSelect.value = '0';
  sortSelect.value = 'saving';
  lowestCheck.checked = false;
  render();
});

// —— Historial de precios ——
const dialog = document.getElementById('history');
const chart = document.getElementById('chart');
const rangeButtons = [...dialog.querySelectorAll('[data-days]')];
let current = null;
let days = 90;

function drawHistory() {
  const points = current.history.slice(-days);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const average = points.reduce((s, v) => s + v, 0) / points.length;
  const pad = { l: 92, r: 16, t: 30, b: 40 };
  const w = 640 - pad.l - pad.r;
  const h = 260 - pad.t - pad.b;
  const low = min * 0.95;
  const high = max * 1.03;
  const x = (i) => pad.l + (i / (points.length - 1)) * w;
  const y = (v) => pad.t + (1 - (v - low) / (high - low)) * h;
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const ticks = [low, (low + high) / 2, high].map((v) => `<text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${money.format(v)}</text><line class="grid-line" x1="${pad.l}" x2="${640 - pad.r}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
  chart.innerHTML = `
    ${ticks}
    <line class="avg" x1="${pad.l}" x2="${640 - pad.r}" y1="${y(average)}" y2="${y(average)}"/>
    <text class="avg-label" x="${640 - pad.r}" y="${y(average) - 6}" text-anchor="end">Promedio ${money.format(average)}</text>
    <path class="area" d="${line}L${x(points.length - 1)},${pad.t + h}L${pad.l},${pad.t + h}Z"/>
    <path class="line" d="${line}"/>
    <circle class="today" cx="${x(points.length - 1)}" cy="${y(points.at(-1))}" r="6"/>
    <text x="${pad.l}" y="${260 - 8}">Hace ${days} días</text>
    <text x="${640 - pad.r}" y="${260 - 8}" text-anchor="end">Hoy</text>`;
  document.getElementById('chart-caption').textContent =
    `Precio de los últimos ${days} días: mínimo ${money.format(min)}, máximo ${money.format(max)}, hoy ${money.format(current.price)}.`;

  const stats = [['Hoy', current.price], ['Mínimo', min], ['Promedio', average], ['Máximo', max]];
  document.getElementById('history-stats').innerHTML = stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${money.format(value)}</dd></div>`).join('');

  const verdict = document.getElementById('history-verdict');
  const nearLow = current.price <= min * 1.03;
  verdict.className = `verdict ${nearLow ? 'verdict--good' : 'verdict--wait'}`;
  verdict.textContent = nearLow
    ? `Buen momento: está en su precio más bajo de ${days} días.`
    : `Puedes esperar: hace poco estuvo en ${money.format(min)}.`;

  const weeks = [];
  for (let i = points.length - 1; i >= 0; i -= 7) weeks.push(points[i]);
  document.getElementById('history-table').innerHTML = weeks
    .map((v, i) => `<tr><td>${i === 0 ? 'Esta semana' : `Hace ${i} ${i === 1 ? 'semana' : 'semanas'}`}</td><td>${money.format(v)}</td></tr>`)
    .join('');
  rangeButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.days) === days)));
}

grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-history]');
  if (!button) return;
  current = products.find((p) => p.id === Number(button.dataset.history));
  days = 90;
  document.getElementById('history-title').textContent = current.name;
  document.getElementById('history-store').textContent = `${current.store} · ${current.category}`;
  drawHistory();
  dialog.showModal();
});
for (const button of rangeButtons) button.addEventListener('click', () => { days = Number(button.dataset.days); drawHistory(); });
document.getElementById('history-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

render();
