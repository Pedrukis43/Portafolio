const goal = 10;
const examples = 6;
const storageKey = 'portfolio:grano-club:v1';
const byId = (id) => document.getElementById(id);
const add = byId('add-stamp');
const redeem = byId('redeem');
const resetDialog = byId('reset-dialog');
let card = { stamps: examples, redeemed: 0 };

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Number.isInteger(saved.stamps) && saved.stamps >= 0 && saved.stamps <= goal
    && Number.isInteger(saved.redeemed) && saved.redeemed >= 0) {
    card = saved;
  }
} catch {
  // The current card is still usable without local storage.
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(card));
  } catch {
    // Keep the current card in memory for this visit.
  }
}

function report(message) {
  byId('feedback').textContent = message;
}

function render(animateStamp = false) {
  const remaining = goal - card.stamps;
  const count = byId('stamp-count');
  const goalLabel = document.createElement('span');
  goalLabel.textContent = '/ ' + goal;
  count.replaceChildren(card.stamps + ' ', goalLabel);
  byId('progress').value = card.stamps;
  byId('progress-caption').textContent = remaining === 0
    ? 'Tarjeta completa.'
    : remaining === 1 ? 'Te falta 1 sello.' : 'Te faltan ' + remaining + ' sellos.';
  byId('reward-copy').textContent = remaining === 0
    ? 'Tu café de la casa está listo para canjear. Después, puedes empezar otra tarjeta.'
    : 'Con 10 sellos puedes canjear un café de la casa y empezar una nueva tarjeta.';
  byId('redemption-count').textContent = card.redeemed === 1
    ? '1 café canjeado'
    : card.redeemed + ' cafés canjeados';
  redeem.disabled = remaining !== 0;
  add.disabled = remaining === 0;

  const stamps = Array.from({ length: goal }, (_, index) => {
    const cell = document.createElement('span');
    cell.className = 'stamp';
    if (index < card.stamps) {
      const bean = document.createElement('span');
      bean.className = 'bean';
      cell.append(bean);
      cell.classList.add('active');
      if (animateStamp && index === card.stamps - 1) cell.classList.add('just-added');
    } else {
      cell.textContent = index + 1;
    }
    return cell;
  });
  byId('stamps').replaceChildren(...stamps);
  document.querySelector('.reward').classList.toggle('lista', remaining === 0);
}

const motion = matchMedia('(prefers-reduced-motion: no-preference)');

// Confeti de granos y papelitos desde la tarjeta al juntar los 10 sellos.
function confetti() {
  if (!motion.matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confeti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ratio = Math.min(devicePixelRatio, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const origin = byId('stamps').getBoundingClientRect();
  const colors = ['#4e2c9e', '#8a76ad', '#d6c8ee', '#f0a35e', '#6b3f22', '#fffcf5'];
  const pieces = Array.from({ length: 140 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const speed = 380 + Math.random() * 520;
    return {
      x: origin.left + origin.width * Math.random(),
      y: origin.top + origin.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 12,
      turn: Math.random() * Math.PI,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 8,
      bean: Math.random() < 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });
  const start = performance.now();
  let last = start;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = Math.max(0, Math.min(1, 2.6 - t));
    for (const p of pieces) {
      p.vy += 980 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.turn += p.spin * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.turn);
      ctx.fillStyle = p.bean ? '#6b3f22' : p.color;
      if (p.bean) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.turn * 2)));
      }
      ctx.restore();
    }
    if (t < 2.6) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

add.addEventListener('click', () => {
  if (card.stamps >= goal) return;
  card.stamps += 1;
  persist();
  render(true);
  const cardBox = document.querySelector('.card');
  cardBox.classList.remove('golpe');
  void cardBox.offsetWidth;
  cardBox.classList.add('golpe');
  if (card.stamps === goal) {
    confetti();
    report('Juntaste los 10 sellos. Ya puedes canjear un café.');
    redeem.focus();
  } else {
    report('Sumaste un sello. Llevas ' + card.stamps + ' de ' + goal + '.');
  }
});

redeem.addEventListener('click', () => {
  if (card.stamps !== goal) return;
  card.stamps = 0;
  card.redeemed += 1;
  persist();
  render();
  report('Canjeaste tu café de muestra. Ya tienes una tarjeta nueva.');
  add.focus();
});

byId('reset').addEventListener('click', () => {
  resetDialog.returnValue = 'cancel';
  resetDialog.showModal();
});
resetDialog.addEventListener('close', () => {
  if (resetDialog.returnValue !== 'reset') return;
  card = { stamps: examples, redeemed: 0 };
  persist();
  render();
  report('Restauraste la tarjeta de ejemplo.');
});

render();
