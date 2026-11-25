const products = new Map(Array.from(document.querySelectorAll('.product'), (element) => [element.dataset.id, {
  name: element.querySelector('h3').textContent,
  price: Number(element.dataset.price),
  element,
}]));
const filters = [...document.querySelectorAll('[data-filter]')];
const cart = new Map();
const cartDialog = document.querySelector('#cart');
const cartLines = document.querySelector('#cart-lines');
const count = document.querySelector('#cart-count');
const delivery = document.querySelector('#delivery');
const checkout = document.querySelector('#checkout');
const cartAnnouncement = document.querySelector('#cart-announcement');
const shopStatus = document.querySelector('#shop-status');
const closeButton = document.querySelector('#close-cart');
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const format = (value) => `${money.format(value)} MXN`;

function subtotal() {
  let value = 0;
  for (const [id, quantity] of cart) value += products.get(id).price * quantity;
  return value;
}

function updateTotal() {
  document.querySelector('#order-total').value = format(subtotal() + Number(delivery.value));
}

function quantityButton(id, delta, name, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'quantity-button';
  button.textContent = delta > 0 ? '+' : '−';
  button.dataset.id = id;
  button.dataset.delta = delta;
  button.disabled = disabled;
  button.setAttribute('aria-label', `${delta > 0 ? 'Sumar' : 'Quitar'} una unidad de ${name}`);
  return button;
}

function renderCart() {
  let totalItems = 0;
  const lines = [];

  for (const [id, quantity] of cart) {
    totalItems += quantity;
    const product = products.get(id);
    const line = document.createElement('li');
    const title = document.createElement('strong');
    const price = document.createElement('span');
    const amount = document.createElement('span');
    const controls = document.createElement('div');
    controls.className = 'quantity';
    title.textContent = product.name;
    price.textContent = format(product.price * quantity);
    amount.textContent = quantity;
    controls.append(quantityButton(id, -1, product.name, false), amount, quantityButton(id, 1, product.name, quantity >= 9));
    line.append(title, price, controls);
    lines.push(line);
  }

  count.textContent = totalItems;
  cartLines.replaceChildren(...lines);
  checkout.hidden = cart.size === 0;
  document.querySelector('#empty-cart').hidden = cart.size > 0;
  updateTotal();
}

function changeQuantity(id, delta) {
  const quantity = Math.min(9, (cart.get(id) ?? 0) + delta);
  if (quantity > 0) cart.set(id, quantity);
  else cart.delete(id);
  renderCart();
  return quantity;
}

const motion = matchMedia('(prefers-reduced-motion: no-preference)');

for (const filter of filters) {
  filter.addEventListener('click', () => {
    const apply = () => {
      for (const control of filters) control.setAttribute('aria-pressed', String(control === filter));
      for (const { element } of products.values()) {
        element.hidden = filter.dataset.filter !== 'all' && filter.dataset.filter !== element.dataset.category;
      }
    };
    // Los productos se reacomodan animados donde el navegador lo permite.
    if (motion.matches && document.startViewTransition) document.startViewTransition(apply);
    else apply();
  });
}
for (const { element } of products.values()) element.style.viewTransitionName = `product-${element.dataset.id}`;

// La foto del producto vuela hasta el carrito y el contador da un salto.
function flyToCart(product) {
  if (!motion.matches) return;
  const image = product.querySelector('img');
  const from = image.getBoundingClientRect();
  const to = document.querySelector('#open-cart').getBoundingClientRect();
  const ghost = image.cloneNode();
  ghost.alt = '';
  ghost.className = 'fly';
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '16px' },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 80}px) scale(.45)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: 0.3, borderRadius: '50%' },
  ], { duration: 750, easing: 'cubic-bezier(.5, 0, .3, 1)' }).finished.then(() => {
    ghost.remove();
    count.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
  });
}

for (const button of document.querySelectorAll('[data-add]')) {
  button.addEventListener('click', () => {
    const id = button.dataset.add;
    const quantity = changeQuantity(id, 1);
    flyToCart(button.closest('.product'));
    shopStatus.textContent = '';
    cartAnnouncement.textContent = `${products.get(id).name}: ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} en el carrito.`;
  });
}

cartLines.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delta]');
  if (!button) return;
  const { id, delta } = button.dataset;
  changeQuantity(id, Number(delta));
  const replacement = cartLines.querySelector(`[data-id="${id}"][data-delta="${delta}"]:enabled`);
  (replacement ?? cartLines.querySelector(`[data-id="${id}"]:enabled`) ?? closeButton).focus();
});

document.querySelector('#open-cart').addEventListener('click', () => cartDialog.showModal());
closeButton.addEventListener('click', () => cartDialog.close());
delivery.addEventListener('change', updateTotal);
checkout.addEventListener('submit', (event) => {
  event.preventDefault();
  const total = subtotal() + Number(delivery.value);
  const method = delivery.value === '0' ? 'recoger en tienda' : 'envío local';
  cart.clear();
  delivery.selectedIndex = 0;
  renderCart();
  cartDialog.close();
  shopStatus.textContent = `Compra simulada por ${format(total)} con opción de ${method}.`;
  shopStatus.scrollIntoView({ block: 'nearest' });
});
