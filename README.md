# Portafolio web de Pedro Narváez

Quince piezas para explorar. Precionauta y Atelier tienen fichas con capturas de sus interfaces. Las otras trece son demos interactivas de negocios ficticios. El filtro «Recientes» muestra el configurador 3D Veta, la boletería Foro Vivo, el hotel Casa Marea, el estudio Tinta Norte y el simulador Sol de Patio.

## Abrir el portafolio

Abre `dist/index.html` en el navegador. También puedes servir `dist/` por HTTP desde la raíz del repositorio:

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Visita `http://127.0.0.1:4173/`. El sitio usa HTML, CSS y JavaScript y se sirve sin un paso de compilación.

Cada demo está en `dist/demos/` y aparece como una tarjeta en `dist/index.html`. Las operaciones son simuladas. Las demos que conservan estado lo guardan en el navegador, por lo que dos dispositivos no comparten pedidos ni reservas. En una vista previa local, el botón «Abrir mesa 4» simula el acceso por QR. El código para escanear aparece en la versión de GitHub Pages.

## Publicación

El flujo de GitHub Actions publica `dist/` en GitHub Pages cuando recibe cambios en `main`. En **Settings → Pages**, la fuente de publicación es **GitHub Actions**.
