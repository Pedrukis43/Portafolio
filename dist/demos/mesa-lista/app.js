const dishes = [
  { id: 'hamburguesa', name: 'Hamburguesa a la brasa', category: 'Fuertes', price: 175, description: 'Carne a la parrilla, cebolla dulce y encurtidos de la casa.' },
  { id: 'papas', name: 'Papas con romero', category: 'Para compartir', price: 85, description: 'Papas crujientes con ajo rostizado y sal de mar.' },
  { id: 'tacos', name: 'Tacos de portobello', category: 'Fuertes', price: 145, description: 'Tres tacos con portobello al carbón, aguacate y salsa verde.' },
  { id: 'limonada', name: 'Limonada de jamaica', category: 'Bebidas', price: 65, description: 'Jamaica fría, limón recién exprimido y agua mineral.' },
  { id: 'ensalada', name: 'Ensalada de temporada', category: 'Para compartir', price: 125, description: 'Hojas frescas, manzana, nuez y vinagreta de mostaza.' },
  { id: 'flan', name: 'Flan de la casa', category: 'Postres', price: 95, description: 'Vainilla, caramelo oscuro y una pizca de sal.' }
];
const orderStages = ['Recibido', 'En preparación', 'Listo', 'Entregado'];
const orderActions = ['Iniciar preparación', 'Marcar listo', 'Marcar entregado'];
const requestKinds = [
  { id: 'mesero', name: 'Solicitud de mesero' },
  { id: 'cuenta', name: 'Solicitud de cuenta' }
];
const requestStages = ['Pendiente', 'Recibida', 'Atendida'];
const requestActions = ['Aceptar aviso', 'Cerrar aviso'];
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const maxQuantity = 12;

const params = new URLSearchParams(location.search);
const table = /^(?:[1-9]|1[0-2])$/.test(params.get('mesa')) ? Number(params.get('mesa')) : 4;
const storageKey = `mesa-lista-v1-table-${table}`;
let state = { cart: {}, orders: [], requests: {}, lastOrder: 0 };

if (location.origin === 'https://pedrukis43.github.io' && location.pathname.startsWith('/Portafolio/')) {
  document.querySelector('#table-qr').hidden = false;
  document.querySelector('#qr-description').textContent = 'Escanea el código para abrir la mesa 4 del portafolio.';
}

const menu = document.querySelector('#menu');
const cart = document.querySelector('#cart');
const total = document.querySelector('#cart-total');
const send = document.querySelector('#send-order');
const cartJump = document.querySelector('#cart-jump');
const announcement = document.querySelector('#announcement');
const guestOrders = document.querySelector('#guest-orders');
const guestRequests = document.querySelector('#guest-requests');
const staffOrders = document.querySelector('#staff-orders');
const staffRequests = document.querySelector('#staff-requests');
const viewButtons = document.querySelectorAll('[data-view]');
const requestButtons = document.querySelectorAll('[data-request]');

for (const label of document.querySelectorAll('[data-table]')) label.textContent = `Mesa ${table}`;

function readState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored?.cart && Array.isArray(stored.orders) && stored.requests && Number.isSafeInteger(stored.lastOrder)) {
      return stored;
    }
  } catch {
    // The two views can share the in-memory state if storage is unavailable.
  }
  return state;
}

function mutate(change) {
  function update() {
    state = readState();
    const message = change(state);
    if (!message) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Keep the active demo usable in the current tab.
    }
    render();
    announcement.textContent = message;
  }

  if (navigator.locks) return navigator.locks.request(storageKey, update);
  update();
  return Promise.resolve();
}

function quantities(items) {
  return dishes.flatMap(dish => {
    const count = items[dish.id];
    return Number.isInteger(count) && count > 0 && count <= maxQuantity ? [{ ...dish, count }] : [];
  });
}

function lines(items) {
  return `<ul class="lines">${items.map(item =>
    `<li><span>${item.count} × ${item.name}</span><span>${money.format(item.count * item.price)}</span></li>`
  ).join('')}</ul>`;
}

function renderOrder(order, staff) {
  const id = Number(order.number);
  const status = orderStages[order.stage];
  if (!Number.isSafeInteger(id) || !status || !order.items) return '';
  const action = orderActions[order.stage];
  const button = staff && action
    ? `<button class="secondary" type="button" data-advance="${id}">${action}</button>`
    : '';
  return `<article data-order="${id}" tabindex="-1">
    <div class="queue-header"><h3>Pedido #${id}</h3><span class="status" data-final="${!action}">${status}</span></div>
    ${lines(quantities(order.items))}${button}
  </article>`;
}

function renderRequests() {
  const active = requestKinds.filter(({ id }) => requestStages[state.requests[id]]);
  guestRequests.innerHTML = active.map(({ id, name }) =>
    `<p class="request-summary">${name} <span class="status" data-final="${state.requests[id] === 2}">${requestStages[state.requests[id]]}</span></p>`
  ).join('');
  staffRequests.innerHTML = active.length ? active.map(({ id, name }) => {
    const stage = state.requests[id];
    const action = requestActions[stage];
    return `<article data-notice="${id}" tabindex="-1">
      <div class="queue-header"><h3>${name}</h3><span class="status" data-final="${stage === 2}">${requestStages[stage]}</span></div>
      ${action ? `<button class="secondary" type="button" data-progress="${id}" aria-label="${action}: ${name.toLowerCase()}">${action}</button>` : ''}
    </article>`;
  }).join('') : '<p class="empty">Aún no hay avisos de esta mesa.</p>';

  for (const button of requestButtons) {
    const stage = state.requests[button.dataset.request];
    button.disabled = stage === 0 || stage === 1;
  }
}

function render() {
  const items = quantities(state.cart);
  for (const dish of dishes) {
    const quantity = menu.querySelector(`[data-dish="${dish.id}"] .quantity`);
    const count = items.find(item => item.id === dish.id)?.count ?? 0;
    quantity.querySelector('output').value = count;
    quantity.querySelector('[data-delta="-1"]').disabled = !count;
    quantity.querySelector('[data-delta="1"]').disabled = count >= maxQuantity;
  }
  cart.innerHTML = items.length ? lines(items) : '<p class="empty">Agrega un platillo de la carta.</p>';
  const amount = items.reduce((sum, item) => sum + item.count * item.price, 0);
  total.textContent = `${money.format(amount)} MXN`;
  document.querySelector('#cart-jump-total').textContent = total.textContent;
  cartJump.hidden = !items.length;
  send.disabled = !items.length;

  guestOrders.innerHTML = state.orders.map(order => renderOrder(order, false)).join('');
  document.querySelector('#guest-orders-section').hidden = !state.orders.length;
  staffOrders.innerHTML = state.orders.length ? state.orders.map(order => renderOrder(order, true)).join('')
    : '<p class="empty">Los pedidos de esta mesa aparecerán aquí.</p>';
  renderRequests();
}

function selectView(view) {
  const isKitchen = view === 'cocina';
  for (const button of viewButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
  }
  document.documentElement.dataset.view = view;
  document.querySelector('#dining').hidden = isKitchen;
  document.querySelector('#kitchen').hidden = !isKitchen;
  document.querySelector('#title').innerHTML = isKitchen ? 'Pedidos en marcha.' : 'Pide desde<br>tu mesa.';
  document.querySelector('.intro-copy p:last-child').textContent = isKitchen
    ? 'Gestiona los pedidos y avisos de esta mesa.'
    : 'Arma tu pedido y sigue su preparación desde aquí.';
}

menu.innerHTML = dishes.map(dish => `<article class="dish" data-dish="${dish.id}">
  <span class="kind">${dish.category}</span>
  <h3>${dish.name}</h3><p>${dish.description}</p>
  <div class="dish-bottom">
    <strong>${money.format(dish.price)}</strong>
    <div class="quantity" role="group" aria-label="Cantidad de ${dish.name.toLowerCase()}">
      <button type="button" data-delta="-1" aria-label="Quitar ${dish.name.toLowerCase()}">−</button>
      <output aria-label="Cantidad">0</output>
      <button type="button" data-delta="1" aria-label="Agregar ${dish.name.toLowerCase()}">+</button>
    </div>
  </div>
</article>`).join('');

menu.addEventListener('click', event => {
  const button = event.target.closest('[data-delta]');
  if (!button) return;
  const id = button.closest('[data-dish]').dataset.dish;
  const dish = dishes.find(entry => entry.id === id);
  void mutate(current => {
    const count = Math.min(maxQuantity, Math.max(0, (current.cart[id] ?? 0) + Number(button.dataset.delta)));
    if (count) current.cart[id] = count;
    else delete current.cart[id];
    return `${dish.name}: ${count} en tu pedido.`;
  });
});

send.addEventListener('click', async () => {
  let number;
  await mutate(current => {
    const items = quantities(current.cart);
    if (!items.length) return '';
    number = ++current.lastOrder;
    current.orders.unshift({ number, stage: 0, items: Object.fromEntries(items.map(({ id, count }) => [id, count])) });
    current.cart = {};
    return `Pedido ${number} enviado a cocina.`;
  });
  if (number) guestOrders.querySelector(`[data-order="${number}"]`)?.focus();
});

for (const button of requestButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.request;
    const kind = requestKinds.find(entry => entry.id === id);
    void mutate(current => {
      if (current.requests[id] === 0 || current.requests[id] === 1) return '';
      current.requests[id] = 0;
      return `${kind.name} enviada.`;
    });
  });
}

staffOrders.addEventListener('click', async event => {
  const button = event.target.closest('[data-advance]');
  if (!button) return;
  const number = Number(button.dataset.advance);
  const stage = state.orders.find(entry => entry.number === number)?.stage;
  await mutate(current => {
    const order = current.orders.find(entry => entry.number === number);
    if (order?.stage !== stage || !orderActions[stage]) return '';
    order.stage += 1;
    return `Pedido ${number}: ${orderStages[order.stage]}.`;
  });
  const card = staffOrders.querySelector(`[data-order="${number}"]`);
  (card?.querySelector('[data-advance]') ?? card)?.focus();
});

staffRequests.addEventListener('click', async event => {
  const button = event.target.closest('[data-progress]');
  if (!button) return;
  const id = button.dataset.progress;
  const stage = state.requests[id];
  const kind = requestKinds.find(entry => entry.id === id);
  await mutate(current => {
    if (current.requests[id] !== stage || !requestActions[stage]) return '';
    current.requests[id] += 1;
    return `${kind.name}: ${requestStages[stage + 1]}.`;
  });
  const card = staffRequests.querySelector(`[data-notice="${id}"]`);
  (card?.querySelector('[data-progress]') ?? card)?.focus();
});

for (const button of viewButtons) {
  button.addEventListener('click', () => selectView(button.dataset.view));
}
window.addEventListener('storage', event => {
  if (event.key !== storageKey) return;
  state = readState();
  render();
});
state = readState();
render();
selectView('mesa');
document.querySelector('#fallback').hidden = true;
