// Movimiento común de las demos: entrada de la portada, aparición al bajar, contenido nuevo y mensajes.
// Se carga en <head> sin defer para marcar <html> antes del primer pintado. Con movimiento reducido no hace nada.
(() => {
  if (!matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  document.documentElement.classList.add('mv');

  const reiniciar = (el, clase) => {
    el.classList.remove(clase);
    void el.offsetWidth; // fuerza el reinicio de la animación
    el.classList.add(clase);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    if (!main) return;

    // —— Portada: el título y lo que lo acompaña entran escalonados; la foto se acerca ——
    const h1 = main.querySelector('h1');
    const portada = h1?.closest('section') ?? h1?.parentElement;
    if (h1) {
      [...h1.parentElement.children].slice(0, 6).forEach((el, i) => {
        el.dataset.mvEntrada = '';
        el.style.setProperty('--mv-i', i);
      });
      const foto = portada.querySelector('.hero-picture, .hero-art, .hero-image, .hero-photo, .hero-media, img');
      if (foto && !foto.closest('[data-mv-entrada]')) foto.dataset.mvFoto = '';
      portada.dataset.mvPortada = ''; // el acercamiento de la foto no debe desbordar a lo ancho en el celular
    }

    // —— Secciones: aparecen al entrar en pantalla, con sus listas escalonadas ——
    const secciones = [...main.querySelectorAll('section')].filter((s) => !s.parentElement.closest('main section') && s !== portada && !s.contains(h1));
    const observador = new IntersectionObserver((entradas) => {
      for (const { target, isIntersecting } of entradas) {
        if (!isIntersecting) continue;
        target.classList.add('mv-in');
        observador.unobserve(target);
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    for (const seccion of secciones) {
      seccion.dataset.mv = '';
      for (const lista of seccion.querySelectorAll('ul, ol')) {
        const items = [...lista.children];
        if (items.length > 24) continue;
        items.forEach((li, i) => {
          li.style.setProperty('--mv-i', i);
          li.dataset.mvI = '';
        });
      }
      observador.observe(seccion);
    }

    // —— Contenido que llega después (filtros, carritos, listas que cambian). data-mv-sin lo desactiva ——
    const esMensaje = (el) => el.closest('[role="status"], [aria-live], output');
    setTimeout(() => {
      new MutationObserver((cambios) => {
        for (const cambio of cambios) {
          const nuevos = [...cambio.addedNodes].filter((n) => n.nodeType === 1 && !n.matches('tr, option, script, template') && !(n instanceof SVGElement) && !esMensaje(n));
          if (!nuevos.length || cambio.target.children.length < 2 || cambio.target.closest('[data-mv-sin]')) continue;
          nuevos.slice(0, 16).forEach((n, i) => {
            n.style.setProperty('--mv-i', i);
            reiniciar(n, 'mv-pop');
            n.addEventListener('animationend', () => n.classList.remove('mv-pop'), { once: true });
          });
        }
      }).observe(main, { childList: true, subtree: true });
    }, 600);

    // —— Mensajes y totales: un destello cuando cambian ——
    const avisos = document.querySelectorAll('[role="status"], [aria-live], output');
    const alCambiar = new MutationObserver((cambios) => {
      for (const el of new Set(cambios.map((c) => (c.target.nodeType === 1 ? c.target : c.target.parentElement).closest('[role="status"], [aria-live], output')))) {
        // Un contador cambia el texto en cada cuadro: el destello se lanza una vez por ráfaga.
        if (!el || !el.textContent.trim() || performance.now() - (el.mvDesde ?? -1e4) < 600) continue;
        el.mvDesde = performance.now();
        reiniciar(el, 'mv-destello');
      }
    });
    avisos.forEach((el) => alCambiar.observe(el, { childList: true, characterData: true, subtree: true }));
  });
})();
