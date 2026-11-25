const form = document.querySelector('#estimate-form');
const baseLabel = document.querySelector('#base-label');
const extraLines = document.querySelector('#extra-lines');
const totalField = document.querySelector('#estimate-total');
const estimateResult = document.querySelector('#estimate-result');
const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

function updateEstimate() {
  const vehicle = form.querySelector('[name="vehiculo"]:checked');
  const extras = [...form.querySelectorAll('[name="servicio"]:checked')];
  const total = extras.reduce((sum, extra) => sum + Number(extra.dataset.price), Number(vehicle.dataset.price));

  baseLabel.textContent = `Mantenimiento básico · ${vehicle.value}`;
  extraLines.replaceChildren(...extras.map((extra) => {
    const line = document.createElement('li');
    line.textContent = `${extra.value} · ${pesos.format(Number(extra.dataset.price))}`;
    return line;
  }));
  countTotal(total);
  return { vehicle: vehicle.value, total };
}

const motion = matchMedia('(prefers-reduced-motion: no-preference)');
let shown = null;
let frame = 0;

// El total sube o baja como un contador en lugar de cambiar de golpe.
function countTotal(total) {
  const from = shown ?? total;
  shown = total;
  cancelAnimationFrame(frame);
  if (!motion.matches || from === total) {
    totalField.value = `${pesos.format(total)} MXN`;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 600);
    totalField.value = `${pesos.format(Math.round(from + (total - from) * (1 - (1 - t) ** 3)))} MXN`;
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

form.addEventListener('change', () => {
  estimateResult.textContent = '';
  updateEstimate();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const { vehicle, total } = updateEstimate();
  // El auto cruza la tarjeta: listo para la ruta.
  const road = document.querySelector('.ruta');
  road.classList.remove('en-ruta');
  void road.offsetWidth;
  road.classList.add('en-ruta');
  estimateResult.textContent = `Solicitud simulada para ${vehicle.toLowerCase()} por ${pesos.format(total)} MXN.`;
});

updateEstimate();
