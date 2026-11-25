const menuControls = document.querySelector('.menu-controls');
const menuButtons = [...menuControls.querySelectorAll('button')];
const menuCategories = document.querySelectorAll('[data-menu]');
const menuSummary = document.querySelector('#menu-summary');

function selectCategory(activeButton) {
  const { category } = activeButton.dataset;
  for (const button of menuButtons) {
    button.setAttribute('aria-pressed', String(button === activeButton));
  }
  for (const section of menuCategories) {
    section.hidden = section.dataset.menu !== category;
  }
}

selectCategory(menuButtons[0]);
menuControls.hidden = false;
for (const button of menuButtons) {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    selectCategory(button);
    menuControls.dataset.used = 'true';
    menuSummary.textContent = `Mostrando ${button.textContent.toLowerCase()}.`;
  });
}

const form = document.querySelector('#booking-form');
const dateField = document.querySelector('#date');
const timeField = document.querySelector('#time');
const partyField = document.querySelector('#party');
const availability = document.querySelector('#booking-availability');
const confirmButton = document.querySelector('#confirm-booking');
const result = document.querySelector('#booking-result');
const bookingDetails = document.querySelector('#booking-details');

const localClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Mexico_City',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const readableDate = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeZone: 'UTC' });
const daysAhead = 60;
const serviceByDay = [
  [14, 19], null, [18, 21], [18, 21], [18, 21], [18, 22], [18, 22]
];

function restaurantTime() {
  const parts = Object.fromEntries(localClock.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

function updateDateLimits(today) {
  const lastDay = new Date(`${today}T00:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() + daysAhead);
  dateField.min = today;
  dateField.max = lastDay.toISOString().slice(0, 10);
}

function timesFor(day, now) {
  const service = serviceByDay[new Date(`${day}T00:00:00Z`).getUTCDay()];
  if (!service) return { options: [], message: 'Cerramos los lunes. Elige otro día.' };

  const [firstHour, lastHour] = service;
  const options = [];
  for (let minute = firstHour * 60; minute <= lastHour * 60; minute += 30) {
    if (day === now.day && minute <= now.minutes) continue;
    const hour = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    options.push(`${hour}:${minutes}`);
  }
  return {
    options,
    message: options.length
      ? 'Elige uno de los horarios disponibles.'
      : 'Ya no quedan horarios para hoy. Elige otro día.'
  };
}

function refreshBookingTimes() {
  const now = restaurantTime();
  updateDateLimits(now.day);

  const chosenTime = timeField.value;
  let options = [];
  let message = 'Elige una fecha para ver los horarios.';
  if (dateField.value) {
    if (dateField.validity.valid) {
      ({ options, message } = timesFor(dateField.value, now));
    } else {
      message = `Elige una fecha dentro de los próximos ${daysAhead} días.`;
    }
  }

  const placeholder = new Option(options.length ? 'Elige un horario' : 'Sin horarios', '');
  placeholder.disabled = true;
  timeField.replaceChildren(placeholder, ...options.map(time => new Option(time, time)));
  timeField.value = options.includes(chosenTime) ? chosenTime : '';
  timeField.disabled = !options.length;
  confirmButton.disabled = timeField.disabled;
  availability.textContent = message;
}

refreshBookingTimes();
document.querySelector('#booking-fallback').hidden = true;
form.hidden = false;
dateField.addEventListener('focus', () => updateDateLimits(restaurantTime().day));
dateField.addEventListener('input', refreshBookingTimes);
form.addEventListener('input', () => { result.hidden = true; });
form.addEventListener('submit', event => {
  event.preventDefault();
  refreshBookingTimes();
  if (!timeField.value || !form.reportValidity()) return;

  const day = readableDate.format(new Date(`${dateField.value}T00:00:00Z`));
  const group = partyField.selectedOptions[0].textContent;
  bookingDetails.textContent = `${group}, ${day} a las ${timeField.value}.`;
  result.hidden = false;
  result.focus();
});
