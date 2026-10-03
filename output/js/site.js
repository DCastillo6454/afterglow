// AFTERGLOW concept site: navigation, reveal, lightbox and the two simulated flows.
// Nothing here sends network requests or stores form data.
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header + mobile navigation ---------- */
  const header = $('.site-header');
  const nav = $('#site-nav');
  const toggle = $('.nav-toggle');
  const mobile = matchMedia('(max-width: 1023px)');

  function setNavOpen(open, { focusToggle = false } = {}) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.hidden = mobile.matches && !open;
    if (!open && focusToggle) toggle.focus();
  }
  function syncNavToViewport() { setNavOpen(false); }
  syncNavToViewport();
  mobile.addEventListener('change', syncNavToViewport);

  toggle.addEventListener('click', () => setNavOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (mobile.matches && e.target.closest('a')) setNavOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobile.matches && toggle.getAttribute('aria-expanded') === 'true') setNavOpen(false, { focusToggle: true });
  });
  document.addEventListener('click', (e) => {
    if (mobile.matches && toggle.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) setNavOpen(false);
  });

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Current section in nav + reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const navLinks = new Map($$('.site-nav a[href^="#"]').map((a) => [a.hash.slice(1), a]));
    const sectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((a) => a.removeAttribute('aria-current'));
        navLinks.get(entry.target.id)?.setAttribute('aria-current', 'true');
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => sectionObserver.observe(s));

    const revealObserver = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        // Also reveal anything already above the viewport (e.g. after a jump link).
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Dialog helpers ---------- */
  let lastOpener = null;
  function openDialog(dialog, opener) {
    lastOpener = opener || document.activeElement;
    document.documentElement.classList.add('is-locked');
    dialog.showModal();
  }
  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      // Click on the backdrop (outside the dialog's box) or any [data-close] control.
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('is-locked');
      dialog.dispatchEvent(new CustomEvent('dialog:closed'));
      if (lastOpener && document.contains(lastOpener)) lastOpener.focus();
      lastOpener = null;
    });
  });

  /* ---------- Zoomable image viewer ----------
     Full-screen dialog with pan (drag / arrow keys) and zoom (pinch, wheel, +/−, double-tap, buttons).
     data-zoom="fill" opens wide images at full stage height so small labels are legible on phones. */
  const viewer = $('#lightbox');
  const stage = $('#viewer-stage');
  const vImg = $('#lightbox-img');
  const zoomLabel = $('#viewer-zoom');
  const zoomInBtn = $('[data-zoom-in]', viewer);
  const zoomOutBtn = $('[data-zoom-out]', viewer);
  const view = { s: 1, x: 0, y: 0, fit: 1, max: 4, start: 'fit' };
  const EPS = 1e-4;

  const stageSize = () => ({ w: stage.clientWidth, h: stage.clientHeight });
  const stagePoint = (clientX, clientY) => {
    const r = stage.getBoundingClientRect();
    return [clientX - r.left, clientY - r.top];
  };

  function render(animate = false) {
    const { w, h } = stageSize();
    const iw = vImg.naturalWidth * view.s;
    const ih = vImg.naturalHeight * view.s;
    // Centre an axis that fits; otherwise keep the image edges inside the stage.
    view.x = iw <= w ? (w - iw) / 2 : Math.min(0, Math.max(w - iw, view.x));
    view.y = ih <= h ? (h - ih) / 2 : Math.min(0, Math.max(h - ih, view.y));
    vImg.classList.toggle('is-animating', animate);
    vImg.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    zoomLabel.textContent = `${Math.round((view.s / view.fit) * 100)}%`;
    zoomOutBtn.disabled = view.s <= view.fit + EPS;
    zoomInBtn.disabled = view.s >= view.max - EPS;
  }

  function zoomTo(scale, cx, cy, animate = false) {
    const { w, h } = stageSize();
    cx ??= w / 2;
    cy ??= h / 2;
    const next = Math.min(view.max, Math.max(view.fit, scale));
    view.x = cx - (cx - view.x) * (next / view.s);
    view.y = cy - (cy - view.y) * (next / view.s);
    view.s = next;
    render(animate);
  }

  function resetView(mode = view.start, animate = false) {
    const { w, h } = stageSize();
    const nw = vImg.naturalWidth;
    const nh = vImg.naturalHeight;
    if (!nw || !w) return;
    view.fit = Math.min(w / nw, h / nh, 1);
    view.max = Math.max(view.fit * 5, 2);
    view.s = mode === 'fill' ? Math.min(view.max, Math.max(view.fit, h / nh, w / nw)) : view.fit;
    view.x = (w - nw * view.s) / 2;
    view.y = (h - nh * view.s) / 2;
    render(animate);
  }

  function openViewer(btn) {
    const innerImg = $('img', btn);
    view.start = btn.dataset.zoom === 'fill' ? 'fill' : 'fit';
    vImg.alt = btn.dataset.alt || innerImg?.alt || '';
    $('#viewer-caption').textContent = btn.dataset.caption || '';
    stage.setAttribute('aria-label', btn.dataset.caption || 'Image');
    $('#viewer-full').href = btn.dataset.lightbox;
    vImg.style.visibility = 'hidden';
    vImg.onload = () => { resetView(); vImg.style.visibility = ''; };
    vImg.src = btn.dataset.lightbox;
    openDialog(viewer, btn);
    stage.focus();
  }
  $$('[data-lightbox]').forEach((btn) => btn.addEventListener('click', () => openViewer(btn)));

  zoomInBtn.addEventListener('click', () => zoomTo(view.s * 1.5, undefined, undefined, true));
  zoomOutBtn.addEventListener('click', () => zoomTo(view.s / 1.5, undefined, undefined, true));
  $('[data-zoom-reset]', viewer).addEventListener('click', () => resetView('fit', true));

  viewer.addEventListener('keydown', (e) => {
    if (e.target.closest('a, button') && !['+', '=', '-', '_'].includes(e.key)) return;
    const step = 80;
    const pans = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key === '+' || e.key === '=') zoomTo(view.s * 1.4, undefined, undefined, true);
    else if (e.key === '-' || e.key === '_') zoomTo(view.s / 1.4, undefined, undefined, true);
    else if (e.key === '0') resetView('fit', true);
    else if (pans[e.key] && e.target === stage) { view.x += pans[e.key][0]; view.y += pans[e.key][1]; render(true); }
    else return;
    e.preventDefault();
  });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomTo(view.s * Math.exp(-e.deltaY * 0.0015), ...stagePoint(e.clientX, e.clientY));
  }, { passive: false });

  stage.addEventListener('dblclick', (e) => {
    if (view.s > view.fit * 1.05) resetView('fit', true);
    else zoomTo(view.fit * 2.5, ...stagePoint(e.clientX, e.clientY), true);
  });

  const pointers = new Map();
  let pinch = null;
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.classList.add('is-dragging');
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.s };
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      zoomTo(pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), ...stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2));
    } else if (pointers.size === 1) {
      view.x += cur.x - prev.x;
      view.y += cur.y - prev.y;
      render();
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) stage.classList.remove('is-dragging');
  };
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  window.addEventListener('resize', () => { if (viewer.open) resetView(); });
  viewer.addEventListener('dialog:closed', () => { vImg.onload = null; vImg.src = 'data:,'; pointers.clear(); pinch = null; });

  /* ---------- Form validation ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function setError(input, errorEl, message) {
    errorEl.textContent = message;
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    return !message;
  }
  function emailMessage(value) {
    if (!value.trim()) return 'Enter your email address.';
    if (!EMAIL_RE.test(value.trim())) return 'Enter an email address in the format name@example.com.';
    return '';
  }

  /* ---------- Demo checkout ---------- */
  const TIERS = {
    ga: 'GA (General Admission)',
    gaplus: 'GA+ (General Admission Plus)',
    vip: 'VIP (VIP Access)',
    '3day': '3-Day (Weekend Pass)',
  };
  const checkout = $('#checkout');
  const checkoutForm = $('#checkout-form');
  const steps = $$('[data-step]', checkout);
  const live = $('#checkout-live');
  const fields = {
    name: $('#checkout-name'),
    email: $('#checkout-email'),
    ack: $('#checkout-ack'),
  };
  let processingTimer = 0;

  function showStep(name) { steps.forEach((s) => { s.hidden = s.dataset.step !== name; }); }

  function resetCheckout(tier) {
    clearTimeout(processingTimer);
    checkoutForm.reset();
    $$('.field__error', checkoutForm).forEach((el) => { el.textContent = ''; });
    $$('[aria-invalid]', checkoutForm).forEach((el) => el.removeAttribute('aria-invalid'));
    const radio = $(`input[name="tier"][value="${tier}"]`, checkoutForm);
    if (radio) radio.checked = true;
    live.textContent = '';
    showStep('form');
  }

  $$('[data-checkout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      resetCheckout(btn.dataset.checkout);
      openDialog(checkout, btn);
      fields.name.focus();
    });
  });

  function validateCheckout() {
    const tier = $('input[name="tier"]:checked', checkoutForm);
    const results = [
      [$('input[name="tier"]', checkoutForm), setError(null, $('#tier-error'), tier ? '' : 'Choose a pass.')],
      [fields.name, setError(fields.name, $('#checkout-name-error'), fields.name.value.trim() ? '' : 'Enter your name.')],
      [fields.email, setError(fields.email, $('#checkout-email-error'), emailMessage(fields.email.value))],
      [fields.ack, setError(fields.ack, $('#checkout-ack-error'), fields.ack.checked ? '' : 'Confirm you understand this is a demo.')],
    ];
    const firstInvalid = results.find(([, ok]) => !ok);
    if (firstInvalid) firstInvalid[0].focus();
    return !firstInvalid;
  }

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateCheckout()) {
      live.textContent = 'Please fix the highlighted fields.';
      return;
    }
    const tier = $('input[name="tier"]:checked', checkoutForm).value;
    showStep('processing');
    live.textContent = 'Processing demo checkout.';
    processingTimer = setTimeout(() => {
      $('#checkout-success-text').textContent =
        `This simulated checkout for the ${TIERS[tier]} pass is complete. Nothing was charged, no data left your browser and no ticket was issued.`;
      showStep('success');
      live.textContent = 'Demo checkout complete.';
      $('#checkout-success-title').focus();
    }, reducedMotion.matches ? 500 : 1400);
  });

  // Clear live feedback as the user corrects fields.
  checkoutForm.addEventListener('input', (e) => {
    const el = e.target;
    if (el.getAttribute('aria-invalid') !== 'true' && el.name !== 'tier') return;
    if (el === fields.name && el.value.trim()) setError(el, $('#checkout-name-error'), '');
    if (el === fields.email && !emailMessage(el.value)) setError(el, $('#checkout-email-error'), '');
    if (el === fields.ack && el.checked) setError(el, $('#checkout-ack-error'), '');
    if (el.name === 'tier') setError(null, $('#tier-error'), '');
  });

  checkout.addEventListener('dialog:closed', () => clearTimeout(processingTimer));

  /* ---------- Demo mailing-list signup ---------- */
  const signupForm = $('#signup-form');
  const signupEmail = $('#signup-email');
  const signupError = $('#signup-email-error');
  const signupResult = $('#signup-result');
  const signupStatus = $('#signup-status');

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!setError(signupEmail, signupError, emailMessage(signupEmail.value))) {
      signupEmail.focus();
      return;
    }
    signupStatus.textContent = `Demo signup complete for ${signupEmail.value.trim()}. This is a simulation: nothing was sent or stored.`;
    signupForm.hidden = true;
    signupResult.hidden = false;
    signupStatus.focus();
  });
  signupEmail.addEventListener('input', () => {
    if (signupEmail.getAttribute('aria-invalid') === 'true' && !emailMessage(signupEmail.value)) setError(signupEmail, signupError, '');
  });
  $('#signup-reset').addEventListener('click', () => {
    signupForm.reset();
    signupStatus.textContent = '';
    signupResult.hidden = true;
    signupForm.hidden = false;
    signupEmail.focus();
  });
})();
