// A 3D staff badge on a lanyard for the About section (three.js).
// It hangs with real rope physics: drag it and let go to swing it, click to flip it over.
// three.js is only downloaded when the section is about to scroll into view.

(function () {
  var host = document.querySelector('.badge3d');
  if (!host) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  var INK = '#0a0a0a', PAPER = '#f7f6f3', RED = '#d12424', MUTED = '#6b6862';
  var CARD_W = 2.1, CARD_H = 3.2;            // world units
  var TEX_W = 840, TEX_H = 1280;             // texture pixels, same proportions

  /* ---------- the two faces of the card, drawn on 2D canvases ---------- */

  function face(draw) {
    var c = document.createElement('canvas');
    c.width = TEX_W; c.height = TEX_H;
    draw(c.getContext('2d'));
    return c;
  }
  function wrap(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' '), line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, y); line = words[i]; y += lineHeight; }
      else line = test;
    }
    ctx.fillText(line, x, y);
    return y + lineHeight;
  }

  function drawFront(photo) {
    return face(function (ctx) {
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, TEX_W, TEX_H);
      // header band with the slot the clip passes through
      ctx.fillStyle = INK; ctx.fillRect(0, 0, TEX_W, 170);
      ctx.fillStyle = PAPER; ctx.fillRect(TEX_W / 2 - 70, 44, 140, 30);
      ctx.font = '600 44px "Funnel Display", Arial, sans-serif'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('AA', 56, 138);
      ctx.fillStyle = RED; ctx.fillRect(126, 108, 26, 26);
      ctx.fillStyle = PAPER; ctx.font = '500 26px "Archivo", Arial, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('ID · AA-001', TEX_W - 56, 136); ctx.textAlign = 'left';

      // photo, black and white, cropped to the face
      var px = 56, py = 226, pw = TEX_W - 112, ph = 520;
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      ctx.fillStyle = '#d9d7d2'; ctx.fillRect(px, py, pw, ph);
      if (photo) {
        ctx.filter = 'grayscale(1) contrast(1.15)';
        var scale = pw / (photo.naturalWidth * 0.62);
        ctx.drawImage(photo, px - photo.naturalWidth * 0.20 * scale, py - photo.naturalHeight * 0.06 * scale,
          photo.naturalWidth * scale, photo.naturalHeight * scale);
        ctx.filter = 'none';
      }
      ctx.restore();
      ctx.fillStyle = RED; ctx.fillRect(px + pw - 150, py + ph - 54, 150, 54);
      ctx.fillStyle = '#fff'; ctx.font = '600 24px "Archivo", Arial, sans-serif';
      ctx.fillText('TEAM LEAD', px + pw - 136, py + ph - 20);

      ctx.fillStyle = INK; ctx.font = '500 118px "Funnel Display", Arial, sans-serif';
      ctx.fillText('Arasada', 50, 880);
      ctx.fillText('Akhil', 50, 986);
      ctx.fillStyle = RED; ctx.fillRect(338, 958, 26, 26);

      ctx.fillStyle = MUTED; ctx.font = '500 28px "Archivo", Arial, sans-serif';
      ctx.fillText('LEAD .NET DEVELOPER · REVALSYS', 56, 1052);
      ctx.fillText('HYDERABAD, INDIA', 56, 1094);

      // barcode
      ctx.fillStyle = INK;
      var x = 56, seed = 7;
      while (x < TEX_W - 250) {
        seed = (seed * 31 + 11) % 97;
        var w = 3 + (seed % 4) * 3;
        ctx.fillRect(x, 1150, w, 76);
        x += w + 4 + (seed % 3) * 3;
      }
      ctx.font = '500 24px "Archivo", Arial, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('OPEN TO', TEX_W - 56, 1186);
      ctx.fillStyle = RED; ctx.fillText('FREELANCE', TEX_W - 56, 1220);
      ctx.textAlign = 'left';
    });
  }

  function drawBack() {
    return face(function (ctx) {
      ctx.fillStyle = INK; ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.fillStyle = PAPER; ctx.fillRect(TEX_W / 2 - 70, 44, 140, 30);
      ctx.fillStyle = '#ccc9c4'; ctx.font = '500 26px "Archivo", Arial, sans-serif';
      ctx.fillText("(HI, I'M AKHIL)", 56, 190);
      ctx.fillStyle = PAPER; ctx.font = '500 46px "Funnel Display", Arial, sans-serif';
      var y = wrap(ctx, 'I lead the build of RevalERP and our E-commerce platform at Revalsys. After hours I build websites, CMS platforms and HRMS tools for clients.', 56, 270, TEX_W - 112, 58);

      var stats = [['25+', 'ERP MODULES LED'], ['40+', 'FREELANCE BUILDS'], ['5', 'CERTIFICATIONS'], ['3', 'COMPANIES SINCE 2023']];
      var top = Math.max(y + 30, 720), cw = (TEX_W - 112) / 2, ch = 230;
      stats.forEach(function (s, i) {
        var x = 56 + (i % 2) * cw, sy = top + Math.floor(i / 2) * ch;
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2; ctx.strokeRect(x, sy, cw, ch);
        ctx.fillStyle = PAPER; ctx.font = '500 120px "Funnel Display", Arial, sans-serif';
        ctx.fillText(s[0].replace('+', ''), x + 24, sy + 132);
        if (s[0].indexOf('+') > -1) {
          var nw = ctx.measureText(s[0].replace('+', '')).width;
          ctx.fillStyle = RED; ctx.font = '500 64px "Funnel Display", Arial, sans-serif';
          ctx.fillText('+', x + 30 + nw, sy + 84);
        }
        ctx.fillStyle = '#ccc9c4'; ctx.font = '500 22px "Archivo", Arial, sans-serif';
        ctx.fillText(s[1], x + 24, sy + 190);
      });
      ctx.fillStyle = RED; ctx.fillRect(56, TEX_H - 70, 26, 26);
      ctx.fillStyle = '#ccc9c4'; ctx.font = '500 24px "Archivo", Arial, sans-serif';
      ctx.fillText('arasadaakhil.website', 96, TEX_H - 48);
    });
  }

  /* ---------- the scene ---------- */

  function start(photo) {
    var THREE = window.THREE;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'badge3d__canvas';
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    // Rounded card faces; the texture is mapped across the whole shape
    var r = 0.14, w = CARD_W / 2, h = CARD_H / 2;
    var shape = new THREE.Shape();
    shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
    function faceMesh(canvas, flip) {
      var geo = new THREE.ShapeGeometry(shape, 8);
      var pos = geo.attributes.position, uv = geo.attributes.uv;
      for (var i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / CARD_W + 0.5, pos.getY(i) / CARD_H + 0.5);
      var tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
      mesh.position.z = flip ? -0.022 : 0.022;
      if (flip) mesh.rotation.y = Math.PI;
      return mesh;
    }
    var card = new THREE.Group();
    var front = faceMesh(drawFront(photo), false), back = faceMesh(drawBack(), true);
    card.add(front); card.add(back);
    // a dark rim so the card has an edge when seen side-on
    var rim = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide }));
    rim.scale.set(1.012, 1.008, 1);
    card.add(rim);
    // the clip that joins card and strap
    var clip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.07), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
    clip.position.y = h + 0.05;
    card.add(clip);
    scene.add(card);

    // The lanyard: a chain of points, with the card's lower end as a heavier last point
    var SEG = 6, LEN = 0.21, HANG = CARD_H + 0.12, GRAVITY = -26;
    var anchor = new THREE.Vector3(0, 2.78, 0);
    var pts = [], prev = [], rest = [], invMass = [];
    for (var i = 0; i <= SEG + 1; i++) {
      var y = i <= SEG ? anchor.y - i * LEN : anchor.y - SEG * LEN - HANG;
      // start a little off to one side so it swings in when first seen
      pts.push(new THREE.Vector3(i * 0.16, y, 0));
      prev.push(pts[i].clone());
      if (i > 0) rest.push(i <= SEG ? LEN : HANG);
      invMass.push(i === 0 ? 0 : (i === SEG + 1 ? 0.22 : 1));
    }
    var TOP = SEG, BOTTOM = SEG + 1, REACH = SEG * LEN + HANG;

    var strapGeo = new THREE.BufferGeometry();
    var strapPos = new Float32Array((SEG + 1) * 2 * 3);
    strapGeo.setAttribute('position', new THREE.BufferAttribute(strapPos, 3));
    var index = [];
    for (i = 0; i < SEG; i++) { var a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    strapGeo.setIndex(index);
    var strap = new THREE.Mesh(strapGeo, new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide }));
    strap.frustumCulled = false;
    scene.add(strap);

    /* ---------- pointer ---------- */
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), grab = new THREE.Vector3();
    var dragging = false, moved = 0, downAt = null, flip = 0, flipTarget = 0, hover = { x: 0, y: 0 };
    function toWorld(e, out) {
      var b = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var t = -ray.ray.origin.z / ray.ray.direction.z;
      return out.copy(ray.ray.origin).addScaledVector(ray.ray.direction, t);
    }
    var canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', function (e) {
      toWorld(e, grab);
      if (!ray.intersectObjects([front, back]).length) return;
      dragging = true; moved = 0; downAt = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      host.classList.add('is-grabbing');
    });
    canvas.addEventListener('pointermove', function (e) {
      toWorld(e, grab);
      var b = canvas.getBoundingClientRect();
      hover.x = (e.clientX - b.left) / b.width - 0.5;
      hover.y = (e.clientY - b.top) / b.height - 0.5;
      if (dragging && downAt) moved = Math.max(moved, Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y));
      host.classList.toggle('is-over', ray.intersectObjects([front, back]).length > 0);
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      host.classList.remove('is-grabbing');
      if (moved < 7) flipTarget += Math.PI;      // a click, not a drag: turn the card over
      host.classList.add('is-touched');
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', function () { dragging = false; host.classList.remove('is-grabbing'); });
    canvas.addEventListener('pointerleave', function () { hover.x = 0; hover.y = 0; host.classList.remove('is-over'); });

    function resize() {
      var wpx = host.clientWidth, hpx = host.clientHeight;
      renderer.setSize(wpx, hpx, false);
      camera.aspect = wpx / hpx;
      // keep the whole badge in frame in a narrow column
      camera.position.z = camera.aspect < 0.62 ? 8.2 * (0.62 / camera.aspect) : 8.2;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(host);
    }

    /* ---------- simulation ---------- */
    var d = new THREE.Vector3(), tmp = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
    var q = new THREE.Quaternion(), spin = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0);
    var side = new THREE.Vector3(), clock = 0, twist = 0;

    function step(dt) {
      clock += dt;
      for (var i = 1; i <= BOTTOM; i++) {
        var p = pts[i], pv = prev[i];
        var vx = (p.x - pv.x) * 0.992, vy = (p.y - pv.y) * 0.992, vz = (p.z - pv.z) * 0.985;
        pv.copy(p);
        // gravity, plus a breath of air so it is never perfectly still
        p.x += vx + (reduced ? 0 : Math.sin(clock * 0.9 + i) * 0.06 * dt * dt);
        p.y += vy + GRAVITY * dt * dt;
        p.z += vz + (reduced ? 0 : Math.cos(clock * 0.7) * 0.5 * dt * dt);
      }
      if (dragging) {
        // hold the card by its middle; the strap cannot stretch past its length
        tmp.copy(grab).sub(anchor);
        if (tmp.length() > REACH * 0.94) tmp.setLength(REACH * 0.94);
        pts[BOTTOM].copy(anchor).add(tmp).y -= CARD_H * 0.35;
        pts[BOTTOM].z = 0;
      }
      for (var k = 0; k < 16; k++) {
        pts[0].copy(anchor);
        for (i = 0; i < BOTTOM; i++) {
          var a = pts[i], b = pts[i + 1];
          d.copy(b).sub(a);
          var len = d.length() || 1e-6, diff = (len - rest[i]) / len;
          var wa = invMass[i], wb = (dragging && i + 1 === BOTTOM) ? 0 : invMass[i + 1], sum = wa + wb;
          if (!sum) continue;
          a.addScaledVector(d, diff * wa / sum);
          b.addScaledVector(d, -diff * wb / sum);
        }
      }
    }

    function draw() {
      // card: hangs along the line from its top point to its bottom point
      d.copy(pts[BOTTOM]).sub(pts[TOP]).normalize();
      q.setFromUnitVectors(down, d);
      flip += (flipTarget - flip) * 0.12;
      // swinging sideways turns the card a little, like a real badge on a strap
      twist += ((pts[BOTTOM].x - prev[BOTTOM].x) * 9 - twist) * 0.08;
      spin.setFromAxisAngle(yAxis, flip + twist + (dragging ? 0 : hover.x * 0.5));
      card.quaternion.copy(q).multiply(spin);
      card.position.copy(pts[TOP]).addScaledVector(d, CARD_H / 2 + 0.1);

      // strap: a flat ribbon through the chain points
      for (var i = 0; i <= SEG; i++) {
        var p = pts[i], n = pts[Math.min(SEG, i + 1)], m = pts[Math.max(0, i - 1)];
        side.set(-(n.y - m.y), n.x - m.x, 0).normalize().multiplyScalar(0.075);
        strapPos.set([p.x - side.x, p.y - side.y, p.z, p.x + side.x, p.y + side.y, p.z], i * 6);
      }
      strapGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }

    var last = performance.now(), acc = 0;
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      acc += Math.min(0.05, (now - last) / 1000);
      last = now;
      while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
      draw();
    })(last);

    host.classList.add('is-live');
  }

  /* ---------- load three.js and the photo only when needed ---------- */
  var loading = false;
  function load() {
    if (loading) return;
    loading = true;
    var script = document.createElement('script');
    script.src = THREE_URL;
    script.onload = function () {
      var photo = new Image(), begun = false;
      var go = function (img) {
        if (begun) return;
        begun = true;
        var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        ready.then(function () { start(img); });
      };
      photo.onload = function () { go(photo); };
      photo.onerror = function () { go(null); };
      photo.src = 'assets/akhil.webp';
      // Never wait on a slow photo: the badge appears without it after a few seconds
      setTimeout(function () { go(photo.complete && photo.naturalWidth ? photo : null); }, 4000);
    };
    document.head.appendChild(script);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { obs.disconnect(); load(); }
    }, { rootMargin: '700px 0px' }).observe(host);
  } else {
    load();
  }
})();
