(() => {
  'use strict';

  const form = document.querySelector('#configuration');
  const presets = [...document.querySelectorAll('[data-angle]')];
  const dialog = document.querySelector('#quote-dialog');
  const status = document.querySelector('#configuration-status');
  const format = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const storageKey = 'veta-escritorio-uno-v1';
  const basePrice = 8950;
  const widthPrices = { 120: -950, 140: 0, 160: 1450 };
  const depthPrices = { 60: -380, 70: 0, 80: 650 };
  const finishChoices = {
    roble: { label: 'Roble claro', price: 0 },
    nogal: { label: 'Nogal', price: 1490 },
    carbon: { label: 'Carbón', price: 890 },
  };
  const accessories = {
    drawer: { label: 'Cajón oculto', price: 930 },
    cable: { label: 'Pasacables de latón', price: 320 },
    riser: { label: 'Repisa para monitor', price: 1150 },
  };

  const viewer = window.createDeskStage(document.querySelector('#stage'), (active) => {
    for (const button of presets) button.setAttribute('aria-pressed', String(button.dataset.angle === active));
  });

  function read() {
    const values = new FormData(form);
    return { width: Number(values.get('width')), depth: Number(values.get('depth')), finish: values.get('finish'), accessory: values.getAll('accessory') };
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || !Object.hasOwn(widthPrices, saved.width) || !Object.hasOwn(depthPrices, saved.depth)
          || !Object.hasOwn(finishChoices, saved.finish) || !Array.isArray(saved.accessory)) return;
      form.elements.width.value = String(saved.width);
      form.elements.depth.value = String(saved.depth);
      form.elements.finish.value = saved.finish;
      for (const field of form.querySelectorAll('[name="accessory"]')) field.checked = saved.accessory.includes(field.value);
      status.textContent = 'Configuración guardada en este navegador.';
    } catch {
      // The form defaults remain usable if storage is restricted or corrupt.
    }
  }

  function save(config) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
      return true;
    } catch {
      return false;
    }
  }

  function priceFor(config) {
    const finish = finishChoices[config.finish];
    const lines = [['Escritorio Uno · 140 × 70 cm', basePrice]];
    if (widthPrices[config.width]) lines.push([`Ancho de ${config.width} cm`, widthPrices[config.width]]);
    if (depthPrices[config.depth]) lines.push([`Fondo de ${config.depth} cm`, depthPrices[config.depth]]);
    if (finish.price) lines.push([finish.label, finish.price]);
    for (const key of config.accessory) lines.push([accessories[key].label, accessories[key].price]);
    const total = lines.reduce((sum, [, price]) => sum + price, 0);
    return { total, lines };
  }

  function descriptionList(element, entries) {
    const fragment = document.createDocumentFragment();
    for (const [term, definition] of entries) {
      const pair = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = term;
      dd.textContent = definition;
      pair.append(dt, dd);
      fragment.append(pair);
    }
    element.replaceChildren(fragment);
  }

  function refresh(message) {
    const config = read();
    const dimensions = `${config.width} × ${config.depth} × 74 cm`;
    const { total, lines } = priceFor(config);
    const output = document.querySelector('#total');
    const currency = document.createElement('small');
    currency.textContent = 'MXN';
    output.replaceChildren(`${format.format(total)} `, currency);
    descriptionList(document.querySelector('#price-lines'), lines.map(([label, price]) => [label, format.format(price)]));
    document.querySelector('#model-size').textContent = dimensions;
    document.querySelector('#stage').setAttribute('aria-label', `Modelo 3D del Escritorio Uno, ${dimensions}, ${finishChoices[config.finish].label}`);
    viewer.model(config);

    if (message) {
      const saved = save(config);
      status.textContent = message === 'reset' ? 'Configuración inicial restaurada.'
        : saved ? 'Configuración guardada en este navegador.' : '';
    }
  }

  function quoteDetails(config) {
    const extras = config.accessory.map((key) => accessories[key].label).join(', ');
    return [
      ['Mueble', 'Escritorio Uno'],
      ['Ancho × fondo × altura', `${config.width} × ${config.depth} × 74 cm`],
      ['Acabado', finishChoices[config.finish].label],
      ['Accesorios', extras || 'Sin accesorios'],
    ];
  }

  for (const button of presets) button.addEventListener('click', () => viewer.preset(button.dataset.angle));
  form.addEventListener('change', () => refresh('save'));
  form.addEventListener('submit', (event) => event.preventDefault());
  document.querySelector('#reset-config').addEventListener('click', () => {
    form.reset();
    viewer.preset('orbit');
    refresh('reset');
  });
  document.querySelector('#prepare-quote').addEventListener('click', () => {
    const config = read();
    descriptionList(document.querySelector('#quote-details'), quoteDetails(config));
    document.querySelector('#quote-total').textContent = `${format.format(priceFor(config).total)} MXN`;
    document.querySelector('#download-status').textContent = '';
    dialog.showModal();
  });
  document.querySelector('#download-quote').addEventListener('click', () => {
    const config = read();
    const { total, lines } = priceFor(config);
    const details = quoteDetails(config).map(([label, value]) => `${label}: ${value}`);
    const prices = lines.map(([label, price]) => `${label}: ${format.format(price)} MXN`);
    const contents = ['Veta | Cotización de muestra', '', ...details, '', 'Desglose', ...prices, '', `Total estimado: ${format.format(total)} MXN`].join('\r\n');
    const address = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = address;
    link.download = 'veta-cotizacion.txt';
    dialog.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(address), 1000);
    document.querySelector('#download-status').textContent = 'Se preparó el archivo de la cotización.';
  });

  restore();
  refresh();
})();
