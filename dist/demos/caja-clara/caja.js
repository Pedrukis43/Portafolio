const storageKey = 'portfolio:caja-clara:v1';
const opening = 150000;
const example = [
  { concept: 'Venta de panadería', type: 'income', cents: 185000, time: '13:20' },
  { concept: 'Compra de insumos', type: 'expense', cents: 65000, time: '12:40' },
  { concept: 'Venta de mostrador', type: 'income', cents: 125000, time: '11:15' },
  { concept: 'Entrega a domicilio', type: 'expense', cents: 24000, time: '10:50' },
  { concept: 'Venta de bebidas', type: 'income', cents: 118000, time: '10:10' }
];
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const timeFormat = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const byId = (id) => document.getElementById(id);
const entryForm = byId('entry-form');
const closeForm = byId('close-form');
const shiftAction = byId('shift-action');
const closeDialog = byId('close-dialog');
const resetDialog = byId('reset-dialog');
let shift = { entries: [...example], counted: null };

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Array.isArray(saved.entries)) shift = saved;
} catch {
  // The controls continue to work when local storage is unavailable.
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(shift));
  } catch {
    // The current turn remains available until the page is reloaded.
  }
}

function format(cents) {
  return money.format(cents / 100);
}

function totals() {
  const income = shift.entries.reduce((sum, entry) => sum + (entry.type === 'income' ? entry.cents : 0), 0);
  const expenses = shift.entries.reduce((sum, entry) => sum + (entry.type === 'expense' ? entry.cents : 0), 0);
  return { income, expenses, balance: opening + income - expenses };
}

function report(text) {
  byId('feedback').textContent = text;
}

const motion = matchMedia('(prefers-reduced-motion: no-preference)');

// Los importes corren desde su valor anterior (desde cero al abrir la página) hasta el nuevo.
function countMoney(id, cents) {
  const element = byId(id);
  const from = Number(element.dataset.cents ?? 0);
  element.dataset.cents = cents;
  cancelAnimationFrame(element.frame);
  if (!motion.matches || from === cents) {
    element.textContent = format(cents);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 900);
    element.textContent = format(Math.round(from + (cents - from) * (1 - (1 - t) ** 4)));
    if (t < 1) element.frame = requestAnimationFrame(step);
  };
  element.frame = requestAnimationFrame(step);
}

function render() {
  const { income, expenses, balance } = totals();
  const closed = shift.counted !== null;
  const count = shift.entries.length;
  const incomeShare = income + expenses === 0 ? 0 : Math.round(income * 100 / (income + expenses));
  const expenseShare = expenses === 0 ? 0 : 100 - incomeShare;

  countMoney('balance', balance);
  countMoney('opening', opening);
  countMoney('income', income);
  countMoney('expenses', expenses);
  byId('transaction-count').textContent = count === 1 ? '1 movimiento' : count + ' movimientos';
  byId('income-percent').textContent = incomeShare + ' %';
  byId('expense-percent').textContent = expenseShare + ' %';
  byId('income-bar').style.width = incomeShare + '%';
  byId('expense-bar').style.width = expenseShare + '%';
  byId('shift-status').textContent = closed ? 'Caja cerrada' : 'Caja abierta';
  byId('shift-status').classList.toggle('closed', closed);
  shiftAction.textContent = closed ? 'Reabrir caja' : 'Preparar corte';
  byId('entry-fields').disabled = closed;
  byId('closed-message').hidden = !closed;
  if (closed) {
    const difference = shift.counted - balance;
    byId('closed-message').textContent = 'Contado ' + format(shift.counted) + '. Diferencia ' + format(difference) + '. Reabre la caja para registrar otro movimiento.';
  }

  byId('entries').replaceChildren(...shift.entries.map((entry) => {
    const row = document.createElement('tr');
    const concept = row.insertCell();
    const time = row.insertCell();
    const amount = row.insertCell();
    const marker = document.createElement('span');
    const sign = entry.type === 'income' ? '+' : '−';
    marker.className = 'entry-type ' + entry.type;
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = sign;
    concept.append(marker, entry.concept);
    time.textContent = entry.time;
    amount.textContent = sign + format(entry.cents);
    amount.className = entry.type;
    return row;
  }));
}

entryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (shift.counted !== null) return;
  const form = new FormData(entryForm);
  const concept = form.get('concept').trim();
  const cents = Math.round(byId('amount').valueAsNumber * 100);
  if (!concept) {
    byId('concept').setCustomValidity('Escribe un concepto para el movimiento.');
    byId('concept').reportValidity();
    return;
  }
  shift.entries.unshift({ concept, type: form.get('type'), cents, time: timeFormat.format(new Date()) });
  persist();
  entryForm.reset();
  render();
  report('Movimiento registrado por ' + format(cents) + '.');
  byId('concept').focus();
});

byId('concept').addEventListener('input', (event) => event.target.setCustomValidity(''));

function showDifference() {
  const counted = Math.round(byId('counted').valueAsNumber * 100);
  const difference = counted - totals().balance;
  byId('difference').textContent = Number.isFinite(difference)
    ? 'Diferencia ' + format(difference)
    : 'Escribe el monto contado para calcular la diferencia.';
}

shiftAction.addEventListener('click', () => {
  if (shift.counted !== null) {
    shift.counted = null;
    persist();
    render();
    report('Caja reabierta.');
    return;
  }
  const { balance } = totals();
  byId('closing-balance').textContent = format(balance) + '.';
  byId('counted').value = Math.max(0, balance / 100).toFixed(2);
  showDifference();
  closeDialog.showModal();
});

byId('counted').addEventListener('input', showDifference);
byId('cancel-close').addEventListener('click', () => closeDialog.close());
closeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  shift.counted = Math.round(byId('counted').valueAsNumber * 100);
  persist();
  closeDialog.close();
  render();
  report('Corte guardado en la demo.');
});

byId('reset').addEventListener('click', () => resetDialog.showModal());
byId('cancel-reset').addEventListener('click', () => resetDialog.close());
byId('reset-form').addEventListener('submit', (event) => {
  event.preventDefault();
  shift = { entries: [...example], counted: null };
  entryForm.reset();
  byId('concept').setCustomValidity('');
  persist();
  resetDialog.close();
  render();
  report('Restauraste el turno de ejemplo.');
});

render();
