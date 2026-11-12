import * as THREE from 'three';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth <= 760;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ------------------------------------------------------------------
   Data (placeholders until the client sends real products)
------------------------------------------------------------------ */
const USD_RATE = 84;
const PRODUCTS = [
  { id: 'raja-rani-vase', name: 'Raja-Rani Vase', origin: 'Blue pottery, Jaipur', price: 4850, img: 'assets/img/blue-vase.webp', tag: 'Bestseller' },
  { id: 'terracotta-musicians', name: 'Terracotta Musicians', origin: 'Hand-modelled, Bengal', price: 2650, img: 'assets/img/figurines.webp', tag: 'Kiln fired' },
  { id: 'pilgrim-flask', name: 'Elephant Pilgrim Flask', origin: 'Blue pottery, Jaipur', price: 3900, img: 'assets/img/blue-flask.webp', tag: 'One of a kind' },
  { id: 'fruit-set', name: 'Lacquered Fruit Set', origin: 'Channapatna, Karnataka', price: 1450, img: 'assets/img/toy-fruits.webp', tag: 'Natural dyes' },
  { id: 'clay-diyas', name: 'Clay Diyas, set of 12', origin: 'Wheel-thrown, Bengal', price: 480, img: 'assets/img/diyas.webp', tag: 'Festive' },
  { id: 'toy-flute', name: 'Lacquered Toy Flute', origin: 'Channapatna, Karnataka', price: 650, img: 'assets/img/flute.webp', tag: 'Kids safe' },
];
const COUNTRIES = ['United States','United Kingdom','Germany','France','Netherlands','Belgium','Italy','Spain','Sweden','Denmark','Norway','Switzerland','Austria','Ireland','Poland','United Arab Emirates','Saudi Arabia','Qatar','Kuwait','Oman','Bahrain','Israel','Turkey','Canada','Mexico','Brazil','Chile','Argentina','Australia','New Zealand','Japan','South Korea','Singapore','Malaysia','Hong Kong','Taiwan','Thailand','Indonesia','Philippines','Vietnam','South Africa','Kenya','Nigeria','Egypt','Mauritius','Sri Lanka','Nepal','Bangladesh','India','Other'];

let currency = 'INR';
const fmt = (inr) => currency === 'INR'
  ? '₹' + inr.toLocaleString('en-IN')
  : '$' + (inr / USD_RATE).toFixed(2);

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ------------------------------------------------------------------
   Smooth scroll: slow and calm, like a turning wheel
------------------------------------------------------------------ */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new window.Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 3.2), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const el = id === '#top' ? document.body : $(id);
  if (!el) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(el, { offset: id === '#top' ? 0 : -60, duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' });
}));

/* ------------------------------------------------------------------
   Nav
------------------------------------------------------------------ */
const nav = $('.nav');
const syncNav = () => nav.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.85);
window.addEventListener('scroll', syncNav, { passive: true }); syncNav();

/* ------------------------------------------------------------------
   Loader -> hero intro (the clay is centred, then the pot rises)
------------------------------------------------------------------ */
function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.loader', { opacity: 0, duration: .8, onComplete: () => $('.loader')?.remove() })
    .from('.hero__video', { scale: 1.25, duration: 2.6, ease: 'power2.out' }, 0)
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.5, stagger: .14 }, .25)
    .from(['.hero__eyebrow', '.hero__sub', '.hero__cta', '.hero__scroll'], { y: 24, opacity: 0, duration: 1.2, stagger: .1 }, .7)
    .from('.nav', { y: -20, opacity: 0, duration: 1 }, .9);
}
let introDone = false;
const startIntro = () => { if (!introDone) { introDone = true; intro(); } };
const t0 = performance.now();
window.addEventListener('load', () => setTimeout(startIntro, Math.max(0, 900 - (performance.now() - t0))));
setTimeout(startIntro, 3500);

// hero drifts as you leave it
gsap.to('.hero__video', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
gsap.to('.hero__inner', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

/* ------------------------------------------------------------------
   THE MAKING: one pot, shaped by your scroll
------------------------------------------------------------------ */
function initPot() {
  const canvas = $('.making__canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // light: warm courtyard sun + fill + kiln glow
  scene.add(new THREE.HemisphereLight(0xfff1e0, 0x8a5a3c, 1.1));
  const sun = new THREE.DirectionalLight(0xffe2c0, 2.4); sun.position.set(-4, 6, 5); scene.add(sun);
  const rimL = new THREE.DirectionalLight(0xffc49a, 1.2); rimL.position.set(5, 3, -4); scene.add(rimL);
  const fire = new THREE.PointLight(0xff6a1a, 0, 9, 1.6); fire.position.set(0, 0.2, 1.8); scene.add(fire);

  const rig = new THREE.Group(); scene.add(rig);

  // --- the wheel (chaak)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x6d5546, roughness: .95 });
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.22, 64), wheelMat);
  wheel.position.y = -0.11; rig.add(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.012, 64), new THREE.MeshStandardMaterial({ color: 0x7c6352, roughness: 1 }));
  hub.position.y = 0.006; rig.add(hub);
  // marks on the wheel so you can see it turn
  const marks = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.32), new THREE.MeshStandardMaterial({ color: 0x4e3b30, roughness: 1 }));
    const a = (i / 12) * Math.PI * 2; m.position.set(Math.sin(a) * 1.5, 0.008, Math.cos(a) * 1.5); m.rotation.y = a; marks.add(m);
  }
  rig.add(marks);

  // soft ground shadow
  const sh = document.createElement('canvas'); sh.width = sh.height = 256;
  const sg = sh.getContext('2d'); const grd = sg.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(70,40,20,.45)'); grd.addColorStop(1, 'rgba(70,40,20,0)'); sg.fillStyle = grd; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.23; rig.add(shadow);

  // --- the pot profile: lump -> cylinder -> vessel
  const N = 64, THICK = 0.07, FLOOR = 0.12;
  const shapes = {
    lump: { H: 1.0, o: 0, r: (h) => 1.08 * Math.sqrt(Math.max(0, 1 - h * h)) * (1 + 0.05 * (1 - h)) },
    cyl: { H: 1.75, o: 1, r: (h) => 0.64 + 0.07 * (1 - h) },
    pot: { H: 2.2, o: 1, r: (h) => h < 0.82 ? 0.3 + 0.64 * Math.pow(Math.sin(Math.PI * h / 0.82), 1.15) : 0.3 + 0.2 * Math.pow((h - 0.82) / 0.18, 1.6) },
  };
  function profile(s) {
    const pts = [new THREE.Vector2(0.001, 0)];
    for (let i = 0; i <= N; i++) { const h = i / N; pts.push(new THREE.Vector2(Math.max(0.001, s.r(h)), h * s.H)); }
    for (let j = 0; j <= N; j++) {
      const k = j / N; const y = s.H - k * (s.H - FLOOR) * s.o;
      const r = s.o * Math.max(0.001, s.r(y / s.H) - THICK);
      pts.push(new THREE.Vector2(j === N ? 0.001 : Math.max(0.001, r), j === N && s.o > 0 ? FLOOR : y));
    }
    return pts;
  }
  const P = { lump: profile(shapes.lump), cyl: profile(shapes.cyl), pot: profile(shapes.pot) };
  const SEG = 96;
  const geo = new THREE.LatheGeometry(P.lump, SEG);
  const pos = geo.attributes.position;
  const cur = P.lump.map((v) => v.clone());
  function applyProfile() {
    let idx = 0;
    for (let i = 0; i <= SEG; i++) {
      const phi = (i / SEG) * Math.PI * 2; const sn = Math.sin(phi), cs = Math.cos(phi);
      for (let j = 0; j < cur.length; j++) { pos.setXYZ(idx++, cur[j].x * sn, cur[j].y, cur[j].x * cs); }
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  }

  // --- surface: wet clay -> fired terracotta -> hand painted
  const tex = document.createElement('canvas'); tex.width = 1024; tex.height = 512;
  const tc = tex.getContext('2d');
  const grain = document.createElement('canvas'); grain.width = 1024; grain.height = 512;
  const gc = grain.getContext('2d');
  for (let i = 0; i < 9000; i++) { gc.fillStyle = `rgba(${Math.random() < .5 ? '255,240,220' : '40,20,10'},${Math.random() * .08})`; gc.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2); }
  for (let y = 0; y < 512; y += 3) { gc.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; gc.fillRect(0, y, 1024, 1); } // throwing lines
  const map = new THREE.CanvasTexture(tex); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(grain);
  const potMat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.12, roughness: .82, metalness: 0, emissive: new THREE.Color(0xff5a10), emissiveIntensity: 0, side: THREE.DoubleSide });
  const pot = new THREE.Mesh(geo, potMat); rig.add(pot);

  const WET = new THREE.Color('#8f7d70'), FIRED = new THREE.Color('#b65a33');
  const vOf = (h) => (1 + h * N) / (2 * N + 3); // outer-wall v for height fraction
  const yOf = (v) => 512 * (1 - v);
  let lastKey = '';
  function paintSurface(fireT, paintT) {
    const key = fireT.toFixed(3) + '|' + paintT.toFixed(3);
    if (key === lastKey) return; lastKey = key;
    const c = WET.clone().lerp(FIRED, fireT);
    tc.fillStyle = '#' + c.getHexString(); tc.fillRect(0, 0, 1024, 512);
    tc.drawImage(grain, 0, 0);
    if (paintT > 0) {
      const w = 1024 * paintT;
      tc.save(); tc.beginPath(); tc.rect(0, 0, w, 512); tc.clip();
      const band = (h1, h2, color) => { const a = yOf(vOf(h2)), b = yOf(vOf(h1)); tc.fillStyle = color; tc.fillRect(0, a, 1024, b - a); };
      // cream slip band with indigo motifs around the belly
      band(0.30, 0.62, '#efe2cc');
      band(0.30, 0.325, '#2b3a67'); band(0.595, 0.62, '#2b3a67');
      band(0.80, 0.83, '#2b3a67'); band(0.93, 1.0, '#2b3a67'); band(0.05, 0.09, '#2b3a67');
      const yMid = (yOf(vOf(0.46))), hgt = yOf(vOf(0.33)) - yOf(vOf(0.59));
      for (let x = 0; x < 1024; x += 64) {
        tc.save(); tc.translate(x + 32, yMid); tc.scale(1, hgt / 100);
        tc.fillStyle = '#2b3a67';
        tc.beginPath(); tc.ellipse(0, 0, 12, 34, 0, 0, Math.PI * 2); tc.fill();           // leaf
        tc.fillStyle = '#efe2cc'; tc.beginPath(); tc.ellipse(0, 0, 4, 22, 0, 0, Math.PI * 2); tc.fill();
        tc.fillStyle = '#b65a33'; tc.beginPath(); tc.arc(32, -30, 5, 0, Math.PI * 2); tc.arc(32, 30, 5, 0, Math.PI * 2); tc.fill(); // dots
        tc.restore();
      }
      tc.restore();
      // the brush tip, a fresh line of paint
      if (paintT < 1) { tc.fillStyle = 'rgba(43,58,103,.9)'; tc.fillRect(w - 3, yOf(vOf(0.62)), 3, yOf(vOf(0.30)) - yOf(vOf(0.62))); }
    }
    map.needsUpdate = true;
  }

  // --- kiln embers
  const EMB = 140; const eg = new THREE.BufferGeometry(); const ep = new Float32Array(EMB * 3); const es = [];
  for (let i = 0; i < EMB; i++) { es.push({ a: Math.random() * 6.28, r: 0.6 + Math.random() * 1.2, y: Math.random() * 3, v: 0.3 + Math.random() * 0.8 }); }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const emberMat = new THREE.PointsMaterial({ color: 0xff8a3a, size: 0.05, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const embers = new THREE.Points(eg, emberMat); rig.add(embers);

  // --- layout
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (isMobile()) { rig.position.set(0, 0.55, 0); camera.position.set(0, 3.1, 10.5); camera.lookAt(0, 1.6, 0); }
    else { rig.position.set(1.7, 0, 0); camera.position.set(0, 2.6, 8.6); camera.lookAt(0.4, 1.0, 0); }
  }
  window.addEventListener('resize', resize); resize();

  // --- scroll story
  const steps = $$('.step'); const fill = $('.meter__fill'); const label = $('.meter__label');
  let progress = 0, smooth = 0, activeStep = -1;
  ScrollTrigger.create({ trigger: '.making', start: 'top top', end: 'bottom bottom', onUpdate: (s) => { progress = s.progress; } });

  const ease = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  function setStep(i) {
    if (i === activeStep) return; activeStep = i;
    steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-past', k < i); });
    label.textContent = `0${i + 1} / 04`;
  }

  let visible = false, last = performance.now(), spin = 0, time = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible) return;
    time += dt;
    smooth += (progress - smooth) * Math.min(1, dt * 6);
    const p = smooth;
    setStep(Math.min(3, Math.floor(p * 4 + 0.0001)));
    fill.style.strokeDashoffset = 276.5 * (1 - p);

    // stage timings (each step is a quarter of the scroll)
    const knead = clamp01(p / 0.25);
    const shapeT = ease(clamp01((p - 0.22) / 0.28));   // 02 the wheel raises it
    const fireT = ease(clamp01((p - 0.52) / 0.2));     // 03 the kiln colours it
    const glow = Math.sin(clamp01((p - 0.5) / 0.25) * Math.PI); // fire peaks mid-step
    const paintT = clamp01((p - 0.76) / 0.16);         // 04 painted while it turns

    // morph lump -> cylinder -> pot
    const a = shapeT < .5 ? P.lump : P.cyl, b = shapeT < .5 ? P.cyl : P.pot, t = shapeT < .5 ? ease(shapeT * 2) : ease(shapeT * 2 - 1);
    for (let i = 0; i < cur.length; i++) { cur[i].x = a[i].x + (b[i].x - a[i].x) * t; cur[i].y = a[i].y + (b[i].y - a[i].y) * t; }
    applyProfile();

    // kneading: the lump breathes under the hands, then settles once centred
    const k = (1 - shapeT) * (knead < 1 ? 1 : 0.4);
    const sq = Math.sin(time * 2.4) * 0.045 * k;
    pot.scale.set(1 + sq, 1 - sq * 1.4, 1 + sq);

    // wheel speed: slow at rest, fast while shaping, slower in the kiln, steady for painting
    const speed = reduceMotion ? 0.2 : 0.6 + 3.2 * Math.sin(shapeT * Math.PI) + (paintT > 0 ? 0.6 : 0) - glow * 0.4;
    spin += dt * speed;
    pot.rotation.y = spin; wheel.rotation.y = spin; marks.rotation.y = spin; hub.rotation.y = spin;

    paintSurface(fireT, paintT);
    potMat.emissiveIntensity = glow * 0.22;
    potMat.roughness = 0.82 - paintT * 0.25;
    fire.intensity = glow * 12;
    emberMat.opacity = glow * 0.9;
    if (glow > 0.01) {
      for (let i = 0; i < EMB; i++) {
        const e = es[i]; e.y += dt * e.v; if (e.y > 3.2) e.y = 0; e.a += dt * 0.3;
        ep[i * 3] = Math.sin(e.a) * e.r; ep[i * 3 + 1] = e.y; ep[i * 3 + 2] = Math.cos(e.a) * e.r;
      }
      eg.attributes.position.needsUpdate = true;
    }

    // a gentle camera breath, so the scene is never frozen
    rig.rotation.x = Math.sin(time * 0.3) * 0.015;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
try { initPot(); } catch (err) { console.warn('3D disabled', err); $('.making__canvas').style.display = 'none'; }

/* ------------------------------------------------------------------
   Rim of the wheel: turns with time, spins faster when you scroll
------------------------------------------------------------------ */
(() => {
  const track = $('.rim__track'); let x = 0; let half = track.scrollWidth / 2;
  window.addEventListener('resize', () => { half = track.scrollWidth / 2; });
  gsap.ticker.add(() => {
    if (reduceMotion) return;
    const v = lenis ? Math.abs(lenis.velocity) : 0;
    x -= 0.45 + Math.min(v, 60) * 0.18;
    if (-x >= half) x += half;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
})();

/* ------------------------------------------------------------------
   Rise reveals: images grow upward, like clay pulled up the wheel
------------------------------------------------------------------ */
$$('.rise').forEach((el, i) => {
  const media = el.querySelector('img,video');
  const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  tl.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'power3.out', delay: (i % 3) * 0.08 });
  if (media) tl.to(media, { scale: 1, duration: 2.2, ease: 'power3.out' }, 0);
});
gsap.utils.toArray('.section-head .display, .export__pitch .display').forEach((h) => {
  gsap.from(h, { y: 40, opacity: 0, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
});

// lazy videos only play when you can see them (saves data for buyers abroad)
const vio = new IntersectionObserver((ents) => ents.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
}), { rootMargin: '200px' });
$$('.lazy-video').forEach((v) => vio.observe(v));

/* ------------------------------------------------------------------
   Journey: the route draws itself, each stop lights up in turn
------------------------------------------------------------------ */
(() => {
  const line = $('.route__line'); const len = line.getTotalLength();
  line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
  const stops = $$('.route__stops li');
  ScrollTrigger.create({
    trigger: '.journey', start: 'top 70%', end: 'bottom 70%', scrub: true,
    onUpdate: (s) => {
      const p = s.progress; line.style.strokeDashoffset = len * (1 - p);
      stops.forEach((li, i) => li.classList.toggle('is-on', p >= i / stops.length + 0.02 || (i === 0 && p > 0)));
    },
  });
})();

/* ------------------------------------------------------------------
   Shop + cart
------------------------------------------------------------------ */
const grid = $('[data-products]');
grid.innerHTML = PRODUCTS.map((p) => `
  <article class="product">
    <div class="product__media rise">
      <img src="${p.img}" alt="${p.name}, ${p.origin}" loading="lazy">
      <span class="product__tag">${p.tag}</span>
      <button class="product__add" type="button" data-add="${p.id}"><span>Add to cart</span></button>
    </div>
    <div class="product__info">
      <div><h3>${p.name}</h3><p>${p.origin}</p></div>
      <span class="product__price" data-price="${p.price}">${fmt(p.price)}</span>
    </div>
  </article>`).join('');
$$('.product .rise').forEach((el, i) => {
  gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
    .to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'power3.out', delay: (i % 3) * 0.1 })
    .fromTo(el.querySelector('img'), { scale: 1.15 }, { scale: 1, duration: 2, ease: 'power3.out' }, 0);
});

let cart = store.get('haath_cart', {});
const cartEl = $('.cart'); const countEl = $('.cart-count');
function renderCart() {
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);
  const items = $('[data-cart-items]');
  if (!ids.length) items.innerHTML = '<p class="cart__empty">Your cart is empty.<br>Every piece is still on the shelf.</p>';
  else items.innerHTML = ids.map((id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return `<div class="citem"><img src="${p.img}" alt=""><div><h4>${p.name}</h4><small>${p.origin}</small>
      <div class="qty"><button type="button" data-q="${id}" data-d="-1" aria-label="Less">&minus;</button><span>${cart[id]}</span><button type="button" data-q="${id}" data-d="1" aria-label="More">+</button></div></div>
      <strong>${fmt(p.price * cart[id])}</strong></div>`;
  }).join('');
  const total = ids.reduce((s, id) => s + PRODUCTS.find((x) => x.id === id).price * cart[id], 0);
  $('[data-cart-total]').textContent = fmt(total);
  const n = ids.reduce((s, id) => s + cart[id], 0);
  countEl.textContent = n; countEl.classList.toggle('has', n > 0);
  store.set('haath_cart', cart);
}
function openCart(open) {
  cartEl.classList.toggle('is-open', open); cartEl.setAttribute('aria-hidden', String(!open));
  if (lenis) open ? lenis.stop() : lenis.start();
}
document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) {
    const id = add.dataset.add; cart[id] = (cart[id] || 0) + 1; renderCart();
    add.classList.add('is-added'); add.querySelector('span').textContent = 'Added';
    gsap.fromTo(countEl, { scale: 1.6 }, { scale: 1, duration: .6, ease: 'back.out(3)' });
    setTimeout(() => { add.classList.remove('is-added'); add.querySelector('span').textContent = 'Add to cart'; }, 1600);
    toast(`${PRODUCTS.find((p) => p.id === id).name} added to your cart`);
    return;
  }
  const q = e.target.closest('[data-q]');
  if (q) { const id = q.dataset.q; cart[id] = Math.max(0, (cart[id] || 0) + Number(q.dataset.d)); renderCart(); return; }
  if (e.target.closest('.cart-btn')) openCart(true);
  if (e.target.closest('.cart__close') || e.target === cartEl) openCart(false);
  if (e.target.closest('[data-checkout]')) toast('Preview only: the live store opens secure checkout here (cards, UPI, PayPal).');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openCart(false); });

// currency switch for buyers abroad
$('.currency').addEventListener('click', () => {
  currency = currency === 'INR' ? 'USD' : 'INR';
  $$('.currency span').forEach((s) => s.classList.toggle('is-on', s.dataset.cur === currency));
  $$('[data-price]').forEach((el) => { el.textContent = fmt(Number(el.dataset.price)); });
  renderCart();
});
renderCart();

let toastTimer;
function toast(msg) {
  const t = $('.toast'); t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}

/* ------------------------------------------------------------------
   Export / bulk enquiry
------------------------------------------------------------------ */
const form = $('.enquiry');
const lines = $('[data-lines]');
const productOptions = '<option value="">Choose a product</option>' + PRODUCTS.map((p) => `<option>${p.name}</option>`).join('') + '<option>Custom design / other</option>';
function addLine() {
  const row = document.createElement('div'); row.className = 'line';
  row.innerHTML = `<select aria-label="Product" name="product">${productOptions}</select>
    <input type="number" name="qty" min="1" step="1" placeholder="Qty" aria-label="Quantity" inputmode="numeric">
    <button type="button" class="line__remove" aria-label="Remove product">&times;</button>`;
  lines.appendChild(row); syncRemove();
  if (lines.children.length > 1) gsap.from(row, { y: -10, opacity: 0, duration: .5, ease: 'power2.out' });
}
function syncRemove() { const rs = $$('.line__remove', lines); rs.forEach((b) => { b.disabled = rs.length === 1; }); }
lines.addEventListener('click', (e) => { const b = e.target.closest('.line__remove'); if (b && !b.disabled) { b.parentElement.remove(); syncRemove(); } });
$('.add-line').addEventListener('click', addLine);
addLine();
$('[data-countries]').insertAdjacentHTML('beforeend', COUNTRIES.map((c) => `<option>${c}</option>`).join(''));

form.addEventListener('input', (e) => e.target.classList.remove('is-invalid'));
form.addEventListener('change', (e) => e.target.classList.remove('is-invalid'));
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let bad = [];
  const rows = $$('.line', lines).map((r) => ({ r, p: r.querySelector('select'), q: r.querySelector('input') }));
  const filled = rows.filter(({ p, q }) => p.value || q.value);
  if (!filled.length) bad.push(rows[0].p, rows[0].q);
  filled.forEach(({ p, q }) => { if (!p.value) bad.push(p); if (!(Number(q.value) >= 1)) bad.push(q); });
  ['company', 'name', 'country'].forEach((n) => { if (!form[n].value.trim()) bad.push(form[n]); });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim())) bad.push(form.email);
  if (bad.length) {
    bad.forEach((el) => el.classList.add('is-invalid'));
    gsap.fromTo(form, { x: -6 }, { x: 0, duration: .5, ease: 'elastic.out(1,0.3)' });
    toast('Please fill the highlighted fields');
    return;
  }
  const btn = $('.submit'); btn.classList.add('is-busy'); $('.submit__text').textContent = 'Sending';
  const ref = 'EXP-' + Math.floor(1000 + Math.random() * 9000);
  const entry = { ref, at: new Date().toISOString(), company: form.company.value, name: form.name.value, email: form.email.value, country: form.country.value, items: filled.map(({ p, q }) => ({ product: p.value, qty: Number(q.value) })), message: form.message.value };
  const all = store.get('haath_enquiries', []); all.push(entry); store.set('haath_enquiries', all);
  setTimeout(() => {
    btn.classList.remove('is-busy'); $('.submit__text').textContent = 'Send enquiry';
    $('[data-done-text]').textContent = `Thank you, ${entry.name.split(' ')[0]}. Your enquiry ${ref} for ${entry.items.length} product${entry.items.length > 1 ? 's' : ''} to ${entry.country} is with our export desk. A copy is on its way to ${entry.email}.`;
    const body = $('.enquiry__body'), done = $('.enquiry__done');
    gsap.to(body, { opacity: 0, y: -10, duration: .4, onComplete: () => { body.hidden = true; done.hidden = false; gsap.from(done, { opacity: 0, y: 20, duration: .8, ease: 'power3.out' }); gsap.from('.enquiry__done svg', { scale: .6, rotate: -20, duration: 1.2, ease: 'back.out(2)' }); ScrollTrigger.refresh(); } });
  }, 1400);
});
$('[data-reset]').addEventListener('click', () => {
  form.reset(); lines.innerHTML = ''; addLine();
  $('.enquiry__done').hidden = true; const body = $('.enquiry__body'); body.hidden = false; gsap.set(body, { opacity: 1, y: 0 }); ScrollTrigger.refresh();
});

window.addEventListener('load', () => ScrollTrigger.refresh());
