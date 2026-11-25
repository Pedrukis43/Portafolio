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
  totalField.value = `${pesos.format(total)} MXN`;
  return { vehicle: vehicle.value, total };
}

form.addEventListener('change', () => {
  estimateResult.textContent = '';
  updateEstimate();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const { vehicle, total } = updateEstimate();
  estimateResult.textContent = `Solicitud simulada para ${vehicle.toLowerCase()} por ${pesos.format(total)} MXN.`;
});

updateEstimate();
