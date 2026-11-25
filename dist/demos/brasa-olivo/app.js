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

// —— Brasas: chispas que suben sobre la foto de la portada. Solo con movimiento permitido. ——
(() => {
  if (!matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  const hero = document.querySelector('.hero');
  const canvas = document.createElement('canvas');
  canvas.className = 'embers';
  canvas.setAttribute('aria-hidden', 'true');
  hero.querySelector('.hero-picture').after(canvas);
  const ctx = canvas.getContext('2d');
  const sparks = [];
  let width = 0;
  let height = 0;
  let visible = true;
  let last = performance.now();

  const spawn = (anywhere) => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + 10,
    r: 1.4 + Math.random() * 2.4,
    vy: 18 + Math.random() * 42,
    sway: Math.random() * Math.PI * 2,
    life: 0.5 + Math.random() * 0.5,
  });
  function resize() {
    const ratio = Math.min(devicePixelRatio, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    sparks.length = 0;
    const count = Math.round(Math.min(70, width / 14));
    for (let i = 0; i < count; i++) sparks.push(spawn(true));
  }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (visible) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        s.y -= s.vy * dt;
        s.sway += dt * 1.6;
        s.x += Math.sin(s.sway) * 12 * dt;
        const fade = Math.min(1, 0.25 + Math.max(0, s.y / height)) * s.life;
        const flicker = 0.75 + Math.random() * 0.25;
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        glow.addColorStop(0, `rgba(255, 214, 150, ${fade * flicker})`);
        glow.addColorStop(0.15, `rgba(255, 170, 80, ${fade * flicker * 0.9})`);
        glow.addColorStop(0.35, `rgba(240, 112, 40, ${fade * 0.55})`);
        glow.addColorStop(1, 'rgba(200, 60, 20, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
        if (s.y < -10) Object.assign(s, spawn(false));
      }
    }
    requestAnimationFrame(frame);
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);
  requestAnimationFrame(frame);
})();
