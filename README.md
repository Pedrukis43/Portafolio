# Portafolio web de Pedro Narváez

Quince piezas para explorar. Precionauta y Atelier tienen fichas con capturas de sus interfaces. Las otras trece son demos interactivas de negocios ficticios. El filtro «Recientes» muestra el configurador 3D Veta, la boletería Foro Vivo, el hotel Casa Marea, el estudio Tinta Norte y el simulador Sol de Patio.

## Abrir el portafolio

Sirve `dist/` bajo `/Portafolio/`, la misma ruta que usa GitHub Pages:

```sh
node fuentes/servir.mjs
```

Visita `http://127.0.0.1:4173/Portafolio/`. La demo de Atelier está en `/Portafolio/demos/atelier/` y la de Precionauta en `/Portafolio/demos/precionauta/`.

La demo de Atelier se compiló con Astro para esa ruta y solo funciona servida bajo `/Portafolio/`. El resto del sitio usa rutas relativas: también se puede abrir `dist/index.html` en el navegador o servir `dist/` en la raíz.

Cada demo está en `dist/demos/` y aparece como una tarjeta en `dist/index.html`, salvo Atelier y Precionauta, que no tienen enlace en el sitio y solo se abren con su dirección. Las operaciones son simuladas. Las demos que conservan estado lo guardan en el navegador, por lo que dos dispositivos no comparten pedidos ni reservas. En una vista previa local, el botón «Abrir mesa 4» simula el acceso por QR. El código para escanear aparece en la versión de GitHub Pages.

## Demos de Atelier y Precionauta

- **Atelier** (`dist/demos/atelier/`): taller 3D con la impresora del sitio original (girar, acercar y recorrer las seis etapas del clip) y un cotizador con envío simulado. No sale ninguna solicitud de la página. Se genera desde `fuentes/atelier-demo/`, que reemplaza la página del proyecto Astro original en una copia temporal:

  ```sh
  node fuentes/atelier-demo/construir.mjs
  ```

  Requiere el proyecto en `../Atelier3D/page` respecto de la carpeta `GITHUB` (o la variable `ATELIER_ORIGEN`) con sus dependencias instaladas. El original no se modifica. La estimación de precios tiene su comprobación: `node --experimental-strip-types fuentes/atelier-demo/pruebas/estimacion.test.mjs`.
- **Precionauta** (`dist/demos/precionauta/`): HTML, CSS y JavaScript sin compilación. Productos, tiendas y precios ficticios generados en el navegador, con búsqueda, filtros e historial de 30 y 90 días. No usa el backend ni credenciales.

## Publicación

El flujo de GitHub Actions publica `dist/` en GitHub Pages cuando recibe cambios en `main`. En **Settings → Pages**, la fuente de publicación es **GitHub Actions**.
