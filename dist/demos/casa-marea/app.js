const day = 86_400_000;
const rooms = {
  jardin: { name: 'Habitación Jardín', capacity: 2, rate: 2400, reserved: [5, 17] },
  laguna: { name: 'Suite Laguna', capacity: 3, rate: 3300, reserved: [9, 25] },
  casita: { name: 'Casita Palma', capacity: 4, rate: 4400, reserved: [12, 13] },
};
const form = document.querySelector('#stay-form');
const arrival = document.querySelector('#arrival');
const departure = document.querySelector('#departure');
const guests = document.querySelector('#guests');
const breakfast = document.querySelector('#breakfast');
const transfer = document.querySelector('#transfer');
const roomOptions = [...form.querySelectorAll('[name="room"]')];
const availableText = document.querySelector('#availability');
const reserve = document.querySelector('#reserve');
const confirmation = document.querySelector('#confirmation');
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const dates = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' });
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Merida', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const todayValue = Date.parse(`${today}T00:00:00Z`);

function dateValue(value) { return new Date(value).toISOString().slice(0, 10); }
function money(value) { return `${currency.format(value)} MXN`; }

arrival.min = today;
arrival.max = dateValue(todayValue + 90 * day);
arrival.value = dateValue(todayValue + day);
departure.value = dateValue(todayValue + 3 * day);

function setDepartureLimits() {
  const start = arrival.valueAsNumber;
  if (!Number.isFinite(start) || !arrival.validity.valid) return;
  departure.min = dateValue(start + day);
  departure.max = dateValue(start + 14 * day);
  if (departure.valueAsNumber <= start) departure.value = departure.min;
}

function quote() {
  setDepartureLimits();
  const start = arrival.valueAsNumber;
  const end = departure.valueAsNumber;
  const validDates = arrival.validity.valid && departure.validity.valid && end > start;
  const count = Number(guests.value);
  const nights = (end - start) / day;
  let available = 0;

  for (const option of roomOptions) {
    const room = rooms[option.value];
    const status = form.querySelector(`[data-room-status="${option.value}"]`);
    const unavailable = validDates && room.reserved.some(offset => {
      const booked = todayValue + offset * day;
      return start <= booked && booked < end;
    });
    const reason = count > room.capacity ? 'Capacidad insuficiente' : unavailable ? 'Ocupada en estas fechas' : '';
    status.textContent = reason;
    option.disabled = !validDates || Boolean(reason);
    if (!option.disabled) available++;
    if (option.disabled) option.checked = false;
  }

  if (!validDates) availableText.textContent = 'Elige una estancia de 1 a 14 noches.';
  else if (!available) availableText.textContent = 'Prueba otras fechas o cambia el número de huéspedes.';
  else availableText.textContent = `${available} ${available === 1 ? 'opción disponible' : 'opciones disponibles'} · ${nights} ${nights === 1 ? 'noche' : 'noches'}`;

  const selected = roomOptions.find(option => option.checked);
  const room = selected ? rooms[selected.value] : null;
  const dateLabel = validDates ? `${dates.format(start)} – ${dates.format(end)}` : '';
  const lodging = room ? room.rate * nights : 0;
  const extraCost = validDates ? (breakfast.checked ? count * nights * 250 : 0) + (transfer.checked ? 850 : 0) : 0;
  const total = lodging + extraCost;

  document.querySelector('#summary-room').textContent = room?.name ?? 'Elige una habitación disponible.';
  document.querySelector('#summary-dates').textContent = dateLabel ? `${dateLabel} · ${count} ${count === 1 ? 'huésped' : 'huéspedes'}` : '';
  document.querySelector('#lodging').textContent = room ? money(lodging) : '—';
  document.querySelector('#extras').textContent = validDates ? money(extraCost) : '—';
  document.querySelector('#stay-total').value = room ? money(total) : '—';
  reserve.disabled = !room;
  return room ? { room, dateLabel, count, total } : null;
}

form.addEventListener('change', quote);
form.addEventListener('submit', event => {
  event.preventDefault();
  const result = quote();
  if (!result) return;
  const { room, dateLabel, count, total } = result;
  document.querySelector('#confirmation-details').textContent = `${room.name} · ${dateLabel} · ${count} ${count === 1 ? 'huésped' : 'huéspedes'}.`;
  document.querySelector('#confirmation-total').textContent = `Total de muestra ${money(total)}`;
  confirmation.showModal();
});
quote();

const hero = document.querySelector('.hero');
const tour = document.querySelector('.tour');
const stage = document.querySelector('.tour-stage');
const stops = [...document.querySelectorAll('[data-stop]')];
const scenes = [...stage.querySelectorAll('[data-scene]')];
const wideTour = matchMedia('(min-width: 840px)');
const allowMotion = matchMedia('(prefers-reduced-motion: no-preference)');
let frame = null;
let selectedStop;

function updateTour() {
  frame = null;
  const position = hero.getBoundingClientRect();
  const offset = Math.max(0, Math.min(position.height, -position.top));
  hero.style.setProperty('--image-shift', `${Math.min(wideTour.matches ? 38 : 18, offset * .075)}px`);
  hero.style.setProperty('--copy-shift', `${wideTour.matches ? Math.min(22, offset * .04) : 0}px`);

  if (!wideTour.matches) return;

  const viewportMidpoint = innerHeight * .55;
  const focused = stops.reduce((closest, stop) => {
    const bounds = stop.getBoundingClientRect();
    const distance = Math.abs(bounds.top + bounds.height / 2 - viewportMidpoint);
    return distance < closest.distance ? { stop, distance } : closest;
  }, { stop: stops[0], distance: Infinity }).stop;

  if (focused === selectedStop) return;
  selectedStop = focused;
  for (const scene of scenes) scene.classList.toggle('is-current', scene.dataset.scene === focused.dataset.stop);
  stage.querySelector('[data-tour-caption]').textContent = focused.querySelector('h3').textContent;
}

function scheduleTour() {
  if (frame === null) frame = requestAnimationFrame(updateTour);
}

function syncTour() {
  window.removeEventListener('scroll', scheduleTour);
  window.removeEventListener('resize', scheduleTour);
  const enhanced = allowMotion.matches && wideTour.matches;
  tour.classList.toggle('enhanced', enhanced);
  stage.hidden = !enhanced;
  if (allowMotion.matches) {
    window.addEventListener('scroll', scheduleTour, { passive: true });
    window.addEventListener('resize', scheduleTour);
    scheduleTour();
  } else {
    cancelAnimationFrame(frame);
    frame = null;
    hero.style.removeProperty('--image-shift');
    hero.style.removeProperty('--copy-shift');
  }
}

wideTour.addEventListener('change', syncTour);
allowMotion.addEventListener('change', syncTour);
syncTour();
