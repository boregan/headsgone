/* ─────────────────────────────────────────────────────
   HEADSGONE — Main JS
   Three.js WebGL orb + GSAP entrance + interactions
   ───────────────────────────────────────────────────── */

'use strict';

/* ═══════════════════════════════════
   1. GSAP SETUP
   ═══════════════════════════════════ */
gsap.registerPlugin(CustomEase);
CustomEase.create('silk',         '0.76, 0, 0.24, 1');
CustomEase.create('elastic-out',  '0.16, 1, 0.3, 1');

/* ═══════════════════════════════════
   2. PAGE ENTRY — Veil Lift
   ═══════════════════════════════════ */
window.addEventListener('load', () => {
  gsap.to('#page-veil', {
    scaleY: 0,
    duration: 1.0,
    ease: 'silk',
    transformOrigin: 'bottom',
    onComplete: runEntrance
  });
});

function runEntrance() {
  const tl = gsap.timeline({ defaults: { ease: 'silk' } });

  // Left side: identity
  tl.to('.identity-tag',  { opacity: 1, duration: 0.6 }, 0)
    .to('.title-word',    { y: 0, duration: 1.0, stagger: 0.07, ease: 'elastic-out' }, 0.1)
    .to('.identity-sub',  { opacity: 1, duration: 0.6 }, 0.55)

  // Right side: labels + rows staggered in
    .to('.links-label',   { opacity: 1, duration: 0.5, stagger: 0.15 }, 0.35)
    .to('.links-divider', { opacity: 1, duration: 0.4 }, 0.5)
    .to(['.link-row', '.release-feature'], {
      opacity: 1, x: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'elastic-out'
    }, 0.45)
    .to('.links-footer', { opacity: 1, duration: 0.5 }, 0.9);
}

/* ═══════════════════════════════════
   3. CUSTOM CURSOR
   ═══════════════════════════════════ */
const cursor = document.getElementById('cursor');
const trail  = document.getElementById('cursor-trail');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let trailX = mouseX;
let trailY = mouseY;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.05, ease: 'none' });
});

document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));

(function trailLoop() {
  trailX += (mouseX - trailX) * 0.1;
  trailY += (mouseY - trailY) * 0.1;
  trail.style.left = trailX + 'px';
  trail.style.top  = trailY + 'px';
  requestAnimationFrame(trailLoop);
})();

document.querySelectorAll('a').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
});

/* ═══════════════════════════════════
   4. FILM GRAIN NOISE — pre-baked tile
   ═══════════════════════════════════ */
(function initNoise() {
  // Render noise into a small offscreen tile, then CSS-animate it
  const SIZE   = 256;
  const FRAMES = 8; // cycle through N pre-baked frames
  const canvas = document.getElementById('noise-canvas');
  canvas.style.cssText += `width:100%;height:100%;object-fit:cover;`;

  const off = document.createElement('canvas');
  off.width  = SIZE;
  off.height = SIZE * FRAMES;
  const ctx  = off.getContext('2d');
  const img  = ctx.createImageData(SIZE, SIZE);

  // Bake all frames up front
  for (let f = 0; f < FRAMES; f++) {
    for (let i = 0; i < SIZE * SIZE * 4; i += 4) {
      const n = Math.random() * 255 | 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = n;
      img.data[i+3] = 255;
    }
    ctx.putImageData(img, 0, f * SIZE);
  }

  // Draw onto the visible canvas from the pre-baked strip
  const vc  = canvas;
  vc.width  = SIZE;
  vc.height = SIZE;
  const vctx = vc.getContext('2d');
  let   frame = 0;
  let   last  = 0;
  const FPS   = 12; // grain refresh rate — low enough to feel filmic

  function tick(now) {
    if (now - last > 1000 / FPS) {
      frame = (frame + 1) % FRAMES;
      vctx.drawImage(off, 0, frame * SIZE, SIZE, SIZE, 0, 0, SIZE, SIZE);
      last = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* ═══════════════════════════════════
   5. THREE.JS — WebGL Orb
   ═══════════════════════════════════ */
(function initWebGL() {
  const canvas   = document.getElementById('webgl-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  /* ── Main orb ── */
  const geometry = new THREE.IcosahedronGeometry(1.2, 5);
  const origPos  = geometry.attributes.position.array.slice();
  const count    = geometry.attributes.position.count;

  const material = new THREE.MeshPhongMaterial({
    color:     0xffffff,
    specular:  0xccff00,
    shininess: 140,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  /* ── Wireframe overlay ── */
  const wireMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.23, 2),
    new THREE.MeshBasicMaterial({ color: 0xccff00, wireframe: true, transparent: true, opacity: 0.05 })
  );
  scene.add(wireMesh);

  /* ── Floating shards ── */
  const shards     = [];
  const shardGroup = new THREE.Group();
  scene.add(shardGroup);

  for (let i = 0; i < 14; i++) {
    const geo  = new THREE.TetrahedronGeometry(Math.random() * 0.07 + 0.02, 0);
    const mat  = new THREE.MeshPhongMaterial({
      color:     i % 3 === 0 ? 0xccff00 : 0xffffff,
      specular:  0xffffff,
      shininess: 60,
      transparent: true,
      opacity: Math.random() * 0.45 + 0.15,
    });
    const shard = new THREE.Mesh(geo, mat);
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 1.7 + Math.random() * 0.9;
    shard.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    shard.userData = {
      theta, phi, r,
      sp: (Math.random() - 0.5) * 0.009,
      yp: (Math.random() - 0.5) * 0.006,
    };
    shardGroup.add(shard);
    shards.push(shard);
  }

  /* ── Lights ── */
  scene.add(new THREE.AmbientLight(0x111111, 1.2));

  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(5, 8, 5);
  scene.add(key);

  const fill = new THREE.PointLight(0xccff00, 5, 14);
  fill.position.set(-4, 0, 3);
  scene.add(fill);

  const rim = new THREE.PointLight(0x4488ff, 2.5, 10);
  rim.position.set(4, -3, 2);
  scene.add(rim);

  /* ── Mouse ── */
  let tX = 0, tY = 0, cX = 0, cY = 0, morphT = 0;

  document.addEventListener('mousemove', (e) => {
    tX = (e.clientX / window.innerWidth  - 0.5) * 1.6;
    tY = (e.clientY / window.innerHeight - 0.5) * -1.3;
    morphT = Math.hypot(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
  });

  /* ── Vertex morph ── */
  let morphPhase = 0;
  function displaceOrb(t) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const ox = origPos[i * 3], oy = origPos[i * 3 + 1], oz = origPos[i * 3 + 2];
      const len = Math.sqrt(ox*ox + oy*oy + oz*oz);
      const n   = Math.sin(ox * 3 + t) * Math.cos(oy * 3 + t * 0.7) * Math.sin(oz * 3 + t * 1.3);
      const d   = 1 + n * 0.06 + morphPhase * 0.07;
      pos.setXYZ(i, ox / len * d * 1.2, oy / len * d * 1.2, oz / len * d * 1.2);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();

  // Orb starts at the centre (behind both columns visually)
  mesh.position.set(-0.4, 0, 0);

  // Entrance: scale up
  mesh.scale.set(0, 0, 0);
  shardGroup.scale.set(0, 0, 0);
  gsap.to(mesh.scale,      { x: 1, y: 1, z: 1, duration: 1.8, ease: 'elastic-out', delay: 0.7 });
  gsap.to(shardGroup.scale,{ x: 1, y: 1, z: 1, duration: 2.2, ease: 'elastic-out', delay: 0.9 });

  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    cX += (tX - cX) * 0.04;
    cY += (tY - cY) * 0.04;
    morphPhase += (morphT - morphPhase) * 0.05;

    mesh.rotation.x = cY * 0.35 + t * 0.07;
    mesh.rotation.y = cX * 0.35 + t * 0.11;
    wireMesh.rotation.x = -t * 0.04;
    wireMesh.rotation.y =  t * 0.06;

    displaceOrb(t * 0.5);

    shards.forEach((s) => {
      s.userData.theta += s.userData.sp + cX * 0.002;
      s.userData.phi   += s.userData.yp;
      const { r, theta, phi } = s.userData;
      s.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      s.rotation.x += 0.01;
      s.rotation.y += 0.013;
    });

    shardGroup.rotation.y = t * 0.04 + cX * 0.3;
    shardGroup.rotation.x = t * 0.02 + cY * 0.2;

    fill.intensity = 4 + Math.sin(t * 1.8) * 1.5;

    renderer.render(scene, camera);
  })();
})();

/* ═══════════════════════════════════
   6. MAGNETIC LINK ROWS
   ═══════════════════════════════════ */
document.querySelectorAll('.link-row, .release-feature').forEach((row) => {
  row.addEventListener('mousemove', (e) => {
    const rect = row.getBoundingClientRect();
    const dy   = (e.clientY - rect.top - rect.height / 2) * 0.15;
    gsap.to(row, { y: dy, duration: 0.3, ease: 'silk' });
  });
  row.addEventListener('mouseleave', () => {
    gsap.to(row, { y: 0, duration: 0.6, ease: 'elastic-out' });
  });
});
