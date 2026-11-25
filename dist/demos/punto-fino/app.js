const storageKey = 'punto-fino:bookings:v1';
const slotStarts = [600, 645, 690, 735, 810, 855, 900, 960, 1005, 1050, 1095];
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const dayParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayLabel = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const dayOption = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const form = document.querySelector('#booking-form');
const barberField = form.elements.namedItem('barber');
const dateField = form.elements.namedItem('date');
const services = new Map([...form.querySelectorAll('[name="service"]')].map(input => [input.value, {
  name: input.closest('label').querySelector('.service-name').textContent,
  duration: Number(input.dataset.duration),
  price: Number(input.dataset.price)
}]));
const barbers = new Map([...barberField.options].map(option => [option.value, option.textContent]));
const slots = document.querySelector('#slots');
const confirmButton = form.querySelector('[type="submit"]');
const reservationMessage = document.querySelector('#reservation-message');
let reservations = loadReservations() ?? [];
let selectedTime = null;
let sessionOnly = false;

function todayInMexico() {
  const parts = dayParts.formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

function makeDay(key) {
  return new Date(`${key}T12:00:00Z`);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function validDate(key) {
  const date = makeDay(key);
  return !Number.isNaN(date.getTime()) && dateKey(date) === key;
}

function loadReservations() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    const today = todayInMexico();
    if (!Array.isArray(stored)) return [];
    return stored.filter(item => item && services.has(item.service) && barbers.has(item.barber) &&
      slotStarts.includes(item.start) && validDate(item.day) && item.day >= today);
  } catch {
    return null;
  }
}

function saveReservations() {
  if (sessionOnly) return false;
  try {
    localStorage.setItem(storageKey, JSON.stringify(reservations));
    return true;
  } catch {
    sessionOnly = true;
    return false;
  }
}

function withReservationLock(update) {
  const updateLatest = () => {
    if (!sessionOnly) reservations = loadReservations() ?? reservations;
    update();
  };
  if (navigator.locks) {
    return navigator.locks.request(storageKey, updateLatest);
  }
  updateLatest();
}

function fillDates() {
  const base = makeDay(todayInMexico());
  const nextDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(base);
    day.setUTCDate(base.getUTCDate() + index + 1);
    return new Option(dayOption.format(day), dateKey(day));
  });
  dateField.replaceChildren(...nextDays);
}

function timeLabel(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

function readFilters() {
  return { day: dateField.value, barber: barberField.value, service: form.elements.namedItem('service').value };
}

function isAvailable(appointment) {
  const { day, barber, service, start } = appointment;
  const barberIndex = [...barbers.keys()].indexOf(barber);
  const seed = makeDay(day).getUTCDate() + barberIndex;
  const taken = [slotStarts[1 + seed % 3], slotStarts[5 + seed % 3]].map(time => ({ start: time, end: time + 35 }));
  for (const booking of reservations) {
    if (booking.day === day && booking.barber === barber) {
      taken.push({ start: booking.start, end: booking.start + services.get(booking.service).duration });
    }
  }
  const end = start + services.get(service).duration;
  return !taken.some(interval => start < interval.end && interval.start < end);
}

function renderSelection() {
  const { service } = readFilters();
  const summary = document.querySelector('#selection-summary');
  confirmButton.disabled = selectedTime === null;
  const { name, duration, price } = services.get(service);
  if (selectedTime === null) {
    summary.textContent = 'Elige un horario disponible.';
  } else {
    summary.textContent = `${timeLabel(selectedTime)}–${timeLabel(selectedTime + duration)} · ${name} · ${currency.format(price)} MXN`;
  }
  for (const button of slots.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(Number(button.value) === selectedTime));
  }
}

function renderSchedule() {
  const filters = readFilters();
  if (selectedTime !== null && !isAvailable({ ...filters, start: selectedTime })) selectedTime = null;
  const intervalLabel = `${barbers.get(filters.barber)} · ${dayLabel.format(makeDay(filters.day))}`;
  document.querySelector('#schedule-caption').textContent = intervalLabel;
  slots.replaceChildren(...slotStarts.map(start => {
    const timeButton = document.createElement('button');
    timeButton.type = 'button';
    timeButton.className = 'slot';
    timeButton.value = String(start);
    timeButton.disabled = !isAvailable({ ...filters, start });
    const status = document.createElement('span');
    status.textContent = timeButton.disabled ? 'Ocupado' : 'Disponible';
    timeButton.append(timeLabel(start), status);
    timeButton.addEventListener('click', () => {
      selectedTime = start;
      renderSelection();
    });
    return timeButton;
  }));
  renderSelection();
}

function bookingKey(booking) {
  return `${booking.day}/${booking.barber}/${booking.start}`;
}

function notifyReservation(message) {
  reservationMessage.textContent = message;
  reservationMessage.focus();
}

function cancelReservation(booking) {
  withReservationLock(() => {
    reservations = reservations.filter(item => bookingKey(item) !== bookingKey(booking));
    const persisted = saveReservations();
    renderSchedule();
    renderReservations();
    notifyReservation(persisted ? 'Cita de prueba cancelada.' : 'Cita cancelada durante esta sesión.');
  });
}

function renderReservations() {
  document.querySelector('#no-reservations').hidden = reservations.length > 0;
  const sorted = [...reservations].sort((a, b) => a.day.localeCompare(b.day) || a.start - b.start);
  document.querySelector('#reservations-list').replaceChildren(...sorted.map(booking => {
    const item = document.createElement('li');
    item.className = 'reservation';
    item.dataset.key = bookingKey(booking);
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `${services.get(booking.service).name} con ${barbers.get(booking.barber)}`;
    const time = document.createElement('p');
    time.textContent = `${dayLabel.format(makeDay(booking.day))} · ${timeLabel(booking.start)}`;
    details.append(title, time);
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancelar cita';
    cancel.setAttribute('aria-label', `Cancelar cita del ${dayLabel.format(makeDay(booking.day))} a las ${timeLabel(booking.start)}`);
    cancel.addEventListener('click', () => cancelReservation(booking));
    item.append(details, cancel);
    return item;
  }));
}

form.addEventListener('change', () => {
  selectedTime = null;
  renderSchedule();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (selectedTime === null) return;
  const appointment = { ...readFilters(), start: selectedTime };
  withReservationLock(() => {
    selectedTime = null;
    if (!isAvailable(appointment)) {
      renderSchedule();
      renderReservations();
      notifyReservation('El horario ya está ocupado. Elige otro horario.');
      return;
    }
    reservations.push(appointment);
    const persisted = saveReservations();
    renderSchedule();
    renderReservations();
    // La cita nueva se «imprime» como un ticket.
    document.querySelector(`[data-key="${CSS.escape(bookingKey(appointment))}"]`)?.classList.add('ticket-nuevo');
    const when = `${dayLabel.format(makeDay(appointment.day))} a las ${timeLabel(appointment.start)}`;
    notifyReservation(persisted ? `Cita de prueba confirmada para el ${when}.` : `Cita de prueba guardada en esta sesión para el ${when}.`);
  });
});

window.addEventListener('storage', event => {
  if (sessionOnly || (event.key !== storageKey && event.key !== null)) return;
  reservations = loadReservations() ?? reservations;
  renderSchedule();
  renderReservations();
});

fillDates();
renderSchedule();
renderReservations();
