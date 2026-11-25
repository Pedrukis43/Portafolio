const settings = document.querySelector('#roof-settings');
const grid = document.querySelector('#roof-grid');
const result = document.querySelector('.result');
const feedback = document.querySelector('#feedback');
const clearShade = document.querySelector('#clear-shade');
const compare = document.querySelector('#scenarios');
const shade = new Set();
const scenarios = [];
const columns = 5;
const tileCount = 20;
const cells = Array.from({ length: tileCount }, (_, index) => {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.dataset.index = index;
  cell.textContent = index + 1;
  cell.style.setProperty('--i', index);
  grid.append(cell);
  return cell;
});

function currentSettings() {
  return {
    use: Number(settings.querySelector('#use').value),
    space: Number(settings.querySelector('#space').value),
    target: Number(settings.querySelector('#target').value),
    bearing: settings.querySelector('#bearing').value,
    watts: Number(settings.querySelector('#panel').value),
  };
}

function estimate() {
  const data = currentSettings();
  const capacity = Math.min(tileCount, Math.floor(data.space / 2.1));
  const spaces = cells.map((_, index) => index).slice(0, capacity).filter(index => !shade.has(index));
  const perPanel = data.watts / 1000 * (data.bearing === 'south' ? 110 : 91);
  const needed = Math.ceil(data.use * (data.target / 100) / perPanel);
  const count = Math.min(needed, spaces.length);
  if (data.bearing === 'eastWest') {
    spaces.sort((a, b) => (a % columns) - (b % columns) || a - b);
  }
  const installed = new Set(spaces.slice(0, count));
  const energy = Math.round(count * perPanel);
  const percentage = Math.round(count * perPanel / data.use * 100);
  return { ...data, capacity, installed, count, energy, percentage, needed, shadows: capacity - spaces.length };
}

const motion = matchMedia('(prefers-reduced-motion: no-preference)');

// Las cifras del resultado corren hasta su nuevo valor en lugar de cambiar de golpe.
function count(element, value, suffix = '') {
  const from = Number(element.dataset.value ?? value);
  element.dataset.value = value;
  cancelAnimationFrame(element.frame);
  if (!motion.matches || from === value) {
    element.textContent = value + suffix;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 550);
    const eased = 1 - (1 - t) ** 3;
    element.textContent = Math.round(from + (value - from) * eased) + suffix;
    if (t < 1) element.frame = requestAnimationFrame(step);
  };
  element.frame = requestAnimationFrame(step);
}

function render() {
  const data = estimate();
  document.querySelector('#use-value').value = `${data.use} kWh`;
  document.querySelector('#space-value').value = `${data.space} m²`;
  document.querySelector('#target-value').value = `${data.target} %`;
  for (const [index, cell] of cells.entries()) {
    const obstructed = shade.has(index);
    const state = index >= data.capacity ? 'outside' : obstructed ? 'shade' : data.installed.has(index) ? 'panel' : 'clear';
    const status = { outside: 'Fuera de la superficie', shade: 'En sombra', panel: 'Panel propuesto', clear: 'Libre' }[state];
    cell.dataset.state = state;
    cell.disabled = state === 'outside';
    cell.setAttribute('aria-label', `Casilla ${index + 1}. ${status}`);
    cell.setAttribute('aria-pressed', String(state === 'shade'));
  }
  clearShade.disabled = shade.size === 0;
  count(document.querySelector('#panel-count'), data.count);
  count(document.querySelector('#energy'), data.energy);
  count(document.querySelector('#coverage'), data.percentage, ' %');
  result.style.setProperty('--coverage', `${Math.min(data.percentage, 100)}%`);
  result.style.setProperty('--target', `${data.target}%`);
  const missing = data.needed - data.count;
  document.querySelector('#coverage-note').textContent = missing > 0
    ? `Con este techo faltan ${missing} ${missing === 1 ? 'panel' : 'paneles'} para alcanzar tu meta.`
    : `Esta distribución alcanza tu meta de ${data.target} % en la simulación.`;
}

settings.addEventListener('input', () => {
  feedback.textContent = '';
  render();
});
settings.addEventListener('submit', event => event.preventDefault());
grid.addEventListener('click', event => {
  const cell = event.target.closest('[data-index]');
  if (!cell || cell.disabled) return;
  const index = Number(cell.dataset.index);
  if (shade.has(index)) shade.delete(index);
  else shade.add(index);
  feedback.textContent = '';
  render();
});
grid.addEventListener('keydown', event => {
  const delta = { ArrowUp: -columns, ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (delta === undefined || !event.target.matches('[data-index]')) return;
  const next = cells[Number(event.target.dataset.index) + delta];
  if (next && !next.disabled) next.focus();
  event.preventDefault();
});
clearShade.addEventListener('click', () => {
  shade.clear();
  feedback.textContent = 'Sombras retiradas.';
  render();
  cells[0].focus();
});

function description(data) {
  const direction = data.bearing === 'south' ? 'Sur' : 'Este y oeste';
  return `${data.use} kWh de consumo · ${data.space} m² · ${direction} · ${data.watts} W por panel · Meta ${data.target} % · ${data.shadows} ${data.shadows === 1 ? 'sombra' : 'sombras'}`;
}

function summary(data) {
  return `${data.count} ${data.count === 1 ? 'panel' : 'paneles'} · ${data.energy} kWh al mes · ${data.percentage} % de cobertura`;
}

function showScenarios() {
  const cards = scenarios.map((data, index) => {
    const card = document.createElement('article');
    const name = document.createElement('h3');
    const details = document.createElement('p');
    const numbers = document.createElement('strong');
    const remove = document.createElement('button');
    card.className = 'scenario';
    name.textContent = `Escenario ${index === 0 ? 'A' : 'B'}`;
    details.textContent = description(data);
    numbers.textContent = summary(data);
    remove.type = 'button';
    remove.className = 'text-button';
    remove.textContent = 'Quitar escenario';
    remove.setAttribute('aria-label', `Quitar ${name.textContent.toLowerCase()}`);
    remove.addEventListener('click', () => {
      scenarios.splice(index, 1);
      showScenarios();
      (compare.querySelector('button') ?? document.querySelector('#save')).focus();
    });
    card.append(name, details, numbers, remove);
    return card;
  });
  if (!cards.length) {
    const message = document.createElement('p');
    message.textContent = 'Guarda una distribución desde el simulador para empezar.';
    cards.push(message);
  }
  compare.replaceChildren(...cards);
}

document.querySelector('#save').addEventListener('click', () => {
  if (scenarios.length >= 2) {
    feedback.textContent = 'Quita un escenario en la comparación para guardar otro.';
    return;
  }
  scenarios.push(estimate());
  showScenarios();
  feedback.textContent = `Escenario ${scenarios.length === 1 ? 'A' : 'B'} guardado para comparar.`;
});

document.querySelector('#download').addEventListener('click', () => {
  const data = estimate();
  const text = ['Sol de Patio · Simulación de ejemplo', '', description(data), summary(data), '', 'Distribución simplificada con producción hipotética por panel.'].join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const download = document.createElement('a');
  download.href = url;
  download.download = 'sol-de-patio-resumen.txt';
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback.textContent = 'Resumen de ejemplo listo para descargar.';
});

render();
showScenarios();
