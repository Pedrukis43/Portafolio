const events = [
  {
    id: 'noche',
    name: 'Frecuencia Nocturna',
    genre: 'Electrónica',
    description: 'Luz Modular abre con sintetizadores analógicos y Sala Fantasma cierra con un set de electrónica en directo.',
    duration: 90,
    daysAfterOpening: 0,
    times: ['19:30', '22:00'],
    prices: { platea: 590, balcon: 390 },
  },
  {
    id: 'ritmo',
    name: 'Los Días Largos',
    genre: 'Indie rock',
    description: 'La banda presenta su nuevo disco en una sala íntima, con Trópico Eléctrico como invitado de apertura.',
    duration: 105,
    daysAfterOpening: 6,
    times: ['18:30', '21:00'],
    prices: { platea: 650, balcon: 470 },
  },
  {
    id: 'patio',
    name: 'Patio Sonoro',
    genre: 'Jazz experimental',
    description: 'Un encuentro de piano, contrabajo y percusión. El Ensamble Bruma improvisa sobre temas de su primer disco.',
    duration: 80,
    daysAfterOpening: 7,
    times: ['17:00', '20:00'],
    prices: { platea: 520, balcon: 350 },
  },
];

const zones = {
  platea: { title: 'Platea', rows: ['A', 'B', 'C', 'D'], seating: 'Frente al escenario' },
  balcon: { title: 'Balcón', rows: ['E', 'F', 'G'], seating: 'Vista elevada' },
};
const seatsPerRow = 8;
const maximumSeats = 6;
const serviceFee = 35;
const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const dateDisplay = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
const part = (type) => Number(todayParts.find((value) => value.type === type).value);
const today = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
const daysToSaturday = (6 - today.getUTCDay() + 7) % 7 || 7;

const get = (id) => document.getElementById(id);
const posterButtons = [...document.querySelectorAll('.poster')];
const eventSelect = get('event-select');
const performanceChoices = get('performances');
const seatGrid = get('seat-grid');
const reviewButton = get('review-order');
const dialog = get('order-dialog');
const dialogTitle = get('dialog-title');
const bookingAnnouncements = get('booking-announcement');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const drafts = new Map();
const purchased = new Map();
const lastFunction = new Map();
let activeEvent = 0;
let activeFunction = 0;
let activeZone = 'platea';
let receiptCount = 0;
let confirmed = false;

function eventDate(event) {
  const day = new Date(today);
  day.setUTCDate(day.getUTCDate() + daysToSaturday + event.daysAfterOpening);
  const text = dateDisplay.format(day);
  return text[0].toUpperCase() + text.slice(1);
}

function functionKey() {
  const event = events[activeEvent];
  return `${event.id}-${event.times[activeFunction]}`;
}

function functionLabel() {
  const event = events[activeEvent];
  return `${eventDate(event)} · ${event.times[activeFunction]} h`;
}

function selection() {
  const key = functionKey();
  if (!drafts.has(key)) drafts.set(key, new Map());
  return drafts.get(key);
}

function ticketName(seat) {
  return `${zones[seat.zone].title} ${seat.number}`;
}

function orderTotals(seats) {
  let subtotal = 0;
  for (const seat of seats.values()) subtotal += seat.price;
  const fee = seats.size * serviceFee;
  return { fee, total: subtotal + fee };
}

function renderProgram(announce) {
  const event = events[activeEvent];
  const previous = (activeEvent + events.length - 1) % events.length;

  for (const [index, poster] of posterButtons.entries()) {
    const active = index === activeEvent;
    poster.dataset.position = active ? 'active' : index === previous ? 'previous' : 'next';
    poster.setAttribute('aria-pressed', String(active));
  }
  get('event-count').textContent = `${activeEvent + 1} / ${events.length}`;
  get('show-date').textContent = eventDate(event);
  get('show-title').textContent = event.name;
  get('show-description').textContent = event.description;
  get('show-genre').textContent = event.genre;
  get('show-price').textContent = `${pesos.format(Math.min(...Object.values(event.prices)))} MXN`;
  get('show-duration').textContent = `${event.duration} min`;
  if (announce) get('show-announcement').textContent = `${event.name}, ${eventDate(event)}.`;
}

function renderFunctions() {
  const event = events[activeEvent];
  const options = event.times.map((time, index) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    const caption = document.createElement('span');
    input.type = 'radio';
    input.name = 'performance';
    input.value = index;
    input.checked = index === activeFunction;
    caption.textContent = `${time} h`;
    label.append(input, caption);
    return label;
  });
  performanceChoices.replaceChildren(...options);
}

function occupiedSeat(number, rowIndex, columnIndex) {
  const existing = purchased.get(functionKey());
  const position = (rowIndex * 13 + columnIndex * 7 + activeEvent * 5 + activeFunction * 3 + (activeZone === 'balcon' ? 2 : 0)) % 17;
  return Boolean(existing?.has(number) || position < 4);
}

function renderSeatPlan() {
  const zone = zones[activeZone];
  const rate = events[activeEvent].prices[activeZone];
  const selected = selection();
  const rows = [];
  let hasTabStop = false;
  get('zone-rate').textContent = `${zone.seating} · ${pesos.format(rate)} MXN por asiento`;

  for (const [rowIndex, rowName] of zone.rows.entries()) {
    const row = document.createElement('div');
    const rowLabel = document.createElement('span');
    const left = document.createElement('div');
    const right = document.createElement('div');
    row.className = 'seat-row';
    rowLabel.className = 'row-letter';
    rowLabel.textContent = rowName;
    rowLabel.setAttribute('aria-hidden', 'true');
    left.className = right.className = 'seat-group';

    for (let column = 0; column < seatsPerRow; column += 1) {
      const button = document.createElement('button');
      const seatNumber = `${rowName}${column + 1}`;
      const occupied = occupiedSeat(seatNumber, rowIndex, column);
      const isSelected = selected.has(seatNumber);
      button.type = 'button';
      button.className = 'seat';
      button.dataset.seat = seatNumber;
      button.dataset.row = rowIndex;
      button.dataset.column = column;
      button.disabled = occupied;
      button.tabIndex = !occupied && !hasTabStop ? 0 : -1;
      if (!occupied) {
        hasTabStop = true;
        button.setAttribute('aria-pressed', String(isSelected));
      }
      button.setAttribute('aria-label', occupied ? `${zone.title}, ${seatNumber}, ocupado` : `${zone.title}, ${seatNumber}, ${pesos.format(rate)} MXN`);
      button.textContent = occupied ? '×' : column + 1;
      (column < seatsPerRow / 2 ? left : right).append(button);
    }

    row.append(rowLabel, left, right);
    rows.push(row);
  }

  seatGrid.setAttribute('aria-label', `Asientos de ${zone.title}`);
  seatGrid.replaceChildren(...rows);
}

function makeTicketLine(seat, allowRemove) {
  const item = document.createElement('li');
  const label = document.createElement('strong');
  const amount = document.createElement('span');
  label.textContent = ticketName(seat);
  amount.textContent = pesos.format(seat.price);
  if (allowRemove) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-seat';
    remove.dataset.remove = seat.number;
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Quitar ${ticketName(seat)}`);
    amount.append(remove);
  }
  item.append(label, amount);
  return item;
}

function renderTicket() {
  const seats = selection();
  const { fee, total } = orderTotals(seats);
  get('selection-limit').hidden = true;
  get('summary-event').textContent = events[activeEvent].name;
  get('summary-performance').textContent = functionLabel();
  get('summary-empty').hidden = seats.size > 0;
  get('selected-seats').replaceChildren(...[...seats.values()].map((seat) => makeTicketLine(seat, true)));
  get('fee-row').hidden = seats.size === 0;
  get('summary-fee').textContent = pesos.format(fee);
  get('summary-total').value = `${pesos.format(total)} MXN`;
  reviewButton.disabled = seats.size === 0;
}

function switchEvent(index, announce = true) {
  activeEvent = index;
  const event = events[index];
  activeFunction = lastFunction.get(event.id) ?? 0;
  eventSelect.value = String(index);
  renderProgram(announce);
  renderFunctions();
  renderSeatPlan();
  renderTicket();
}

function stepEvent(amount, moveFocus = false) {
  switchEvent((activeEvent + amount + events.length) % events.length);
  if (moveFocus) posterButtons[activeEvent].focus();
}

function removeSeat(number) {
  const seats = selection();
  const removed = seats.get(number);
  if (!removed) return null;
  seats.delete(number);
  const button = seatGrid.querySelector(`[data-seat="${number}"]`);
  if (button) button.setAttribute('aria-pressed', 'false');
  renderTicket();
  bookingAnnouncements.textContent = `${ticketName(removed)} eliminado de tu selección.`;
  return button;
}

function selectSeat(button) {
  const number = button.dataset.seat;
  const seats = selection();
  if (seats.has(number)) {
    removeSeat(number);
    return;
  }
  if (seats.size >= maximumSeats) {
    bookingAnnouncements.textContent = `Puedes elegir hasta ${maximumSeats} asientos por compra.`;
    const notice = get('selection-limit');
    notice.hidden = false;
    return;
  }
  const seat = { number, zone: activeZone, price: events[activeEvent].prices[activeZone] };
  seats.set(number, seat);
  button.setAttribute('aria-pressed', 'true');
  renderTicket();
  bookingAnnouncements.textContent = `${ticketName(seat)} seleccionado. Total ${pesos.format(orderTotals(seats).total)} MXN.`;
}

function moveBetweenSeats(event, seat) {
  const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  const movement = moves[event.key];
  const row = Number(seat.dataset.row);
  const column = Number(seat.dataset.column);

  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    const rowSeats = seatGrid.querySelectorAll(`[data-row="${row}"]:enabled`);
    rowSeats[event.key === 'Home' ? 0 : rowSeats.length - 1]?.focus();
    return;
  }
  if (!movement) return;

  event.preventDefault();
  const [rowStep, columnStep] = movement;
  let targetRow = row + rowStep;
  let targetColumn = column + columnStep;
  while (targetRow >= 0 && targetRow < zones[activeZone].rows.length && targetColumn >= 0 && targetColumn < seatsPerRow) {
    const target = seatGrid.querySelector(`[data-row="${targetRow}"][data-column="${targetColumn}"]:enabled`);
    if (target) {
      target.focus();
      return;
    }
    targetRow += rowStep;
    targetColumn += columnStep;
  }
}

function reviewOrder() {
  const seats = selection();
  if (seats.size === 0) return;
  const { fee, total } = orderTotals(seats);
  confirmed = false;
  dialog.returnValue = '';
  dialogTitle.textContent = 'Revisa tus boletos';
  get('dialog-event').textContent = events[activeEvent].name;
  get('dialog-performance').textContent = functionLabel();
  get('dialog-seats').replaceChildren(...[...seats.values()].map((seat) => makeTicketLine(seat, false)));
  get('dialog-fee').textContent = pesos.format(fee);
  get('dialog-total').textContent = `${pesos.format(total)} MXN`;
  get('order-review').hidden = false;
  get('order-confirmation').hidden = true;
  dialog.showModal();
  dialogTitle.focus();
}

function confirmOrder() {
  const seats = selection();
  if (confirmed || seats.size === 0) return;
  const key = functionKey();
  const previous = purchased.get(key) ?? new Set();
  for (const number of seats.keys()) previous.add(number);
  purchased.set(key, previous);
  drafts.delete(key);
  confirmed = true;
  receiptCount += 1;
  dialogTitle.textContent = 'Compra simulada';
  get('order-reference').textContent = `Folio de muestra FV-${String(receiptCount).padStart(4, '0')}`;
  get('order-review').hidden = true;
  get('order-confirmation').hidden = false;
  renderSeatPlan();
  renderTicket();
  dialogTitle.focus();
}

for (const [index, event] of events.entries()) {
  eventSelect.add(new Option(event.name, String(index)));
  posterButtons[index].addEventListener('click', () => switchEvent(index));
}

get('previous-event').addEventListener('click', () => stepEvent(-1));
get('next-event').addEventListener('click', () => stepEvent(1));
get('posters').addEventListener('keydown', (event) => {
  const directions = { ArrowLeft: -1, ArrowRight: 1 };
  if (!directions[event.key]) return;
  event.preventDefault();
  stepEvent(directions[event.key], true);
});
eventSelect.addEventListener('change', () => switchEvent(Number(eventSelect.value), false));
performanceChoices.addEventListener('change', (event) => {
  activeFunction = Number(event.target.value);
  lastFunction.set(events[activeEvent].id, activeFunction);
  renderSeatPlan();
  renderTicket();
  bookingAnnouncements.textContent = `Función de las ${events[activeEvent].times[activeFunction]}. Plano actualizado.`;
});
get('zone-controls').addEventListener('change', (event) => {
  activeZone = event.target.value;
  renderSeatPlan();
  if (!reducedMotion.matches) seatGrid.animate([{ opacity: .6, scale: .91 }, { opacity: 1, scale: 1 }], { duration: 270, easing: 'ease-out' });
  bookingAnnouncements.textContent = `Mostrando ${zones[activeZone].title.toLowerCase()}.`;
});
seatGrid.addEventListener('focusin', (event) => {
  const seat = event.target.closest('[data-seat]');
  if (!seat) return;
  const previous = seatGrid.querySelector('[tabindex="0"]');
  if (previous) previous.tabIndex = -1;
  seat.tabIndex = 0;
});
seatGrid.addEventListener('keydown', (event) => {
  const seat = event.target.closest('[data-seat]');
  if (seat) moveBetweenSeats(event, seat);
});
seatGrid.addEventListener('click', (event) => {
  const seat = event.target.closest('[data-seat]');
  if (seat && !seat.disabled) selectSeat(seat);
});
get('selected-seats').addEventListener('click', (event) => {
  const remove = event.target.closest('[data-remove]');
  if (!remove) return;
  const seat = removeSeat(remove.dataset.remove);
  (get('selected-seats').querySelector('[data-remove]') ?? seat ?? seatGrid.querySelector('[tabindex="0"]'))?.focus();
});
reviewButton.addEventListener('click', reviewOrder);
get('confirm-order').addEventListener('click', confirmOrder);
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'cartelera') get('program-title').focus();
  else if (confirmed) seatGrid.querySelector('[tabindex="0"]')?.focus();
  else reviewButton.focus();
});

switchEvent(0, false);
get('booking-grid').hidden = false;
