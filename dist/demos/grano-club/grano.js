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
}

add.addEventListener('click', () => {
  if (card.stamps >= goal) return;
  card.stamps += 1;
  persist();
  render(true);
  if (card.stamps === goal) {
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
