const properties = [
  {
    id: 'casa-pedregal', operation: 'sale', type: 'Casa', name: 'Casa del patio', area: 'Jardines del Pedregal',
    price: 8950000, size: 238, bedrooms: 3, bathrooms: 3, image: 'habita-casa.webp', crop: '50% 52%',
    alt: 'Residencia contemporánea rodeada de vegetación',
    description: 'La sala y el comedor se abren hacia un patio central. En la planta alta, las tres recámaras se distribuyen alrededor de una sala familiar con luz natural.'
  },
  {
    id: 'depto-juarez', operation: 'sale', type: 'Departamento', name: 'Departamento Naranjo', area: 'Juárez',
    price: 4750000, size: 104, bedrooms: 2, bathrooms: 2, image: 'habita-depto.webp', crop: '50% 48%',
    alt: 'Departamento de estilo contemporáneo con tonos cálidos',
    description: 'Dos recámaras y un balcón que conecta con la estancia. La segunda recámara tiene espacio para adaptar un estudio de trabajo en casa.'
  },
  {
    id: 'loft-roma', operation: 'sale', type: 'Loft', name: 'Loft Lucero', area: 'Roma Norte',
    price: 3650000, size: 76, bedrooms: 1, bathrooms: 1, image: 'habita-loft.webp', crop: '50% 46%',
    alt: 'Interior abierto con acabados de madera y luz natural',
    description: 'Una planta abierta reúne la cocina y el área social. El dormitorio se eleva en un tapanco que deja libre la doble altura de la estancia.'
  },
  {
    id: 'depto-condesa', operation: 'rent', type: 'Departamento', name: 'Departamento Acanto', area: 'Hipódromo Condesa',
    price: 28000, size: 95, bedrooms: 2, bathrooms: 2, image: 'habita-urbano.webp', crop: '50% 38%',
    alt: 'Fachada de departamentos con balcones y bugambilias',
    description: 'Departamento amueblado con balcón y dos recámaras. La cocina abierta tiene una barra para desayunar y la estancia cuenta con espacio para un escritorio.'
  },
  {
    id: 'loft-escandon', operation: 'rent', type: 'Loft', name: 'Loft Jacaranda', area: 'Escandón',
    price: 19500, size: 63, bedrooms: 1, bathrooms: 1, image: 'habita-loft.webp', crop: '22% 62%',
    alt: 'Loft luminoso de distribución abierta',
    description: 'Loft amueblado con zona de descanso separada por una celosía. Una banca junto al ventanal funciona como rincón de lectura o espacio de trabajo.'
  },
  {
    id: 'casa-delvalle', operation: 'rent', type: 'Casa', name: 'Casa Origen', area: 'Del Valle Centro',
    price: 42000, size: 184, bedrooms: 3, bathrooms: 2, image: 'habita-casa.webp', crop: '81% 46%',
    alt: 'Casa contemporánea con jardín',
    description: 'Casa de dos niveles con jardín, cocina independiente y tres recámaras. Una de las habitaciones se puede usar como estudio o cuarto de visitas.'
  }
];

const budgetLimits = {
  sale: [3000000, 4000000, 5000000, 7000000, 9000000],
  rent: [15000, 20000, 25000, 30000, 40000, 50000]
};
const storageKey = 'habita:favorites:v1';
const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const propertyById = new Map(properties.map(property => [property.id, property]));
const searchForm = document.querySelector('#search-form');
const operationInputs = searchForm.elements.namedItem('operation');
const type = searchForm.elements.namedItem('type');
const budget = searchForm.elements.namedItem('budget');
const grid = document.querySelector('#property-grid');
const emptyState = document.querySelector('#empty-state');
const cardTemplate = document.querySelector('#property-card-template');
const propertyDialog = document.querySelector('#property-dialog');
const dialogFavorite = document.querySelector('#dialog-favorite');
const favoritesDialog = document.querySelector('#favorites-dialog');
const favoritesTrigger = document.querySelector('#open-favorites');
const favorites = loadFavorites();
let viewingFromFavorites = false;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return new Set(Array.isArray(saved) ? saved.filter(id => propertyById.has(id)) : []);
  } catch {
    return new Set();
  }
}

function updateFavoriteCount() {
  document.querySelector('#favorite-count').textContent = favorites.size;
  favoritesTrigger.setAttribute('aria-label', `Ver propiedades guardadas (${favorites.size})`);
}

function toggleFavorite(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify([...favorites]));
  } catch {
    // A session can still keep favorites when browser storage is unavailable.
  }
  const pressed = String(favorites.has(id));
  grid.querySelector(`[data-favorite-id="${id}"]`)?.setAttribute('aria-pressed', pressed);
  if (dialogFavorite.dataset.favoriteId === id) {
    dialogFavorite.setAttribute('aria-pressed', pressed);
  }
  updateFavoriteCount();
}

function priceLabel(property) {
  const price = `${pesos.format(property.price)} MXN`;
  return property.operation === 'rent' ? `${price} / mes` : price;
}

function applyImage(image, property) {
  image.src = `../../assets/${property.image}`;
  image.alt = property.alt;
  image.style.objectPosition = property.crop;
}

function fillFacts(list, property) {
  const facts = [
    `${property.size} m²`,
    `${property.bedrooms} ${property.bedrooms === 1 ? 'recámara' : 'recámaras'}`,
    `${property.bathrooms} ${property.bathrooms === 1 ? 'baño' : 'baños'}`
  ];
  list.replaceChildren(...facts.map(fact => {
    const item = document.createElement('li');
    item.textContent = fact;
    return item;
  }));
}

function fillBudgets() {
  const options = budgetLimits[operationInputs.value].map(limit => new Option(`Hasta ${pesos.format(limit)} MXN`, String(limit)));
  budget.replaceChildren(new Option('Sin límite', ''), ...options);
}

function createCard(property) {
  const card = cardTemplate.content.cloneNode(true);
  applyImage(card.querySelector('img'), property);
  card.querySelector('.property-type').textContent = property.type;
  card.querySelector('.property-location').textContent = property.area;
  card.querySelector('h3').textContent = property.name;
  card.querySelector('.property-price').textContent = priceLabel(property);
  fillFacts(card.querySelector('.property-facts'), property);

  const favorite = card.querySelector('.favorite-button');
  favorite.dataset.favoriteId = property.id;
  favorite.setAttribute('aria-label', `Guardar ${property.name}`);
  favorite.setAttribute('aria-pressed', String(favorites.has(property.id)));
  favorite.addEventListener('click', () => toggleFavorite(property.id));

  const details = card.querySelector('.card-link');
  details.setAttribute('aria-label', `Ver ficha de ${property.name}`);
  details.addEventListener('click', () => showProperty(property));
  return card;
}

function applyFilters() {
  const operation = operationInputs.value;
  const maximum = budget.value ? Number(budget.value) : Infinity;
  const matching = properties.filter(property =>
    property.operation === operation && (!type.value || property.type === type.value) && property.price <= maximum
  );
  document.querySelector('#listings-title').textContent = operation === 'rent' ? 'Propiedades en renta' : 'Propiedades en venta';
  document.querySelector('#result-count').textContent = `${matching.length} ${matching.length === 1 ? 'propiedad' : 'propiedades'}`;
  grid.replaceChildren(...matching.map(createCard));
  grid.hidden = matching.length === 0;
  emptyState.hidden = matching.length > 0;
}

function showProperty(property, fromFavorites = false) {
  viewingFromFavorites = fromFavorites;
  document.querySelector('#dialog-kicker').textContent = `${property.type} ${property.operation === 'sale' ? 'en venta' : 'en renta'}`;
  document.querySelector('#dialog-title').textContent = property.name;
  document.querySelector('#dialog-location').textContent = `${property.area}, Ciudad de México`;
  document.querySelector('#dialog-price').textContent = priceLabel(property);
  document.querySelector('#dialog-description').textContent = property.description;
  applyImage(document.querySelector('#dialog-image'), property);
  fillFacts(document.querySelector('#dialog-facts'), property);
  dialogFavorite.dataset.favoriteId = property.id;
  dialogFavorite.setAttribute('aria-pressed', String(favorites.has(property.id)));
  propertyDialog.showModal();
}

function createFavoriteEntry(property) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'favorite-entry';
  button.setAttribute('aria-haspopup', 'dialog');
  const photo = document.createElement('img');
  applyImage(photo, property);
  photo.alt = '';
  const summary = document.createElement('span');
  const title = document.createElement('span');
  title.className = 'favorite-name';
  title.textContent = property.name;
  const price = document.createElement('span');
  price.className = 'favorite-price';
  price.textContent = priceLabel(property);
  summary.append(title, price);
  button.append(photo, summary);
  item.append(button);
  button.addEventListener('click', () => {
    favoritesDialog.close();
    showProperty(property, true);
  });
  return item;
}

function showFavorites() {
  document.querySelector('#favorites-empty').hidden = favorites.size > 0;
  document.querySelector('#favorites-list').replaceChildren(...[...favorites].map(id => createFavoriteEntry(propertyById.get(id))));
  favoritesDialog.showModal();
}

searchForm.addEventListener('change', event => {
  if (event.target.name === 'operation') fillBudgets();
  applyFilters();
});

searchForm.addEventListener('submit', event => {
  event.preventDefault();
  const listings = document.querySelector('#propiedades');
  listings.focus({ preventScroll: true });
  listings.scrollIntoView({ block: 'start' });
});

document.querySelector('#clear-filters').addEventListener('click', () => {
  type.value = '';
  budget.value = '';
  applyFilters();
  document.querySelector('#propiedades').focus();
});

favoritesTrigger.addEventListener('click', showFavorites);
dialogFavorite.addEventListener('click', () => toggleFavorite(dialogFavorite.dataset.favoriteId));
propertyDialog.addEventListener('close', () => {
  if (viewingFromFavorites) showFavorites();
});

updateFavoriteCount();
fillBudgets();
applyFilters();
