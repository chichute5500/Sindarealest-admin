/* Progressive mobile checkout gesture layer.
   The existing checkout close button remains the sole source of navigation/history behavior. */
(() => {
  'use strict';
  function init() {
    const sheet = document.getElementById('checkoutDrawer');
    const header = sheet?.querySelector('.checkout-header');
    const close = document.getElementById('checkoutClose');
    if (!sheet || !header || !close || !window.PointerEvent) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let drag = null;

    const reset = () => {
      drag = null;
      sheet.style.removeProperty('--sd-checkout-pull');
      sheet.style.removeProperty('transition-duration');
    };
    header.addEventListener('pointerdown', event => {
      if (!mobile.matches || reduced.matches || event.pointerType !== 'touch' ||
          !event.isPrimary || !sheet.classList.contains('open') ||
          event.target.closest('button, a, input, select, textarea')) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dy: 0 };
      try { header.setPointerCapture(event.pointerId) } catch (_) { drag = null }
    });
    header.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const deltaX = Math.abs(event.clientX - drag.x);
      const deltaY = event.clientY - drag.y;
      if (deltaX > 64 || deltaY < 0) {
        sheet.style.removeProperty('--sd-checkout-pull');
        return;
      }
      drag.dy = deltaY;
      sheet.style.setProperty('transition-duration', '0ms');
      sheet.style.setProperty('--sd-checkout-pull', Math.min(170, deltaY) + 'px');
    });
    header.addEventListener('pointerup', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const closeSheet = drag.dy >= 88 &&
        Math.abs(event.clientX - drag.x) < 75 &&
        sheet.classList.contains('open');
      drag = null;
      sheet.style.removeProperty('transition-duration');
      if (closeSheet) {
        /* Delegate to the original handler: it owns modal history, focus and inert. */
        close.click();
      }
      requestAnimationFrame(() => sheet.style.removeProperty('--sd-checkout-pull'));
    });
    header.addEventListener('pointercancel', reset);
    sheet.addEventListener('transitionend', () => {
      if (!sheet.classList.contains('open') && drag) reset();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
