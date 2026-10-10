// Selected Work in 3D (three.js): one set of 27 blocks that rebuilds itself for each project.
//   RevalERP    -> a solid 3x3x3 cube: many modules locked into one platform
//   SHRMPro     -> a month of attendance: a calendar wall, weekends pale, leave days red
//   AR Sessions -> a headset with the blocks orbiting it as objects in space
// script.js publishes the rail's scroll position as window.railEased (0..1); this file follows it.
// Drag the model to turn it.

(function () {
  var host = document.querySelector('.blocks3d');
  if (!host) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COUNT = 27;
  var INK = 0x111110, PAPER = 0xf4f3ef, RED = 0xd12424, STONE = 0xbdbab4;

  /* ---------- the three formations ---------- */
  // Each entry: position, scale, colour. Built once; the orbit in the third is animated on top.
  function cube() {
    var out = [];
    for (var i = 0; i < COUNT; i++) {
      var x = i % 3 - 1, y = Math.floor(i / 3) % 3 - 1, z = Math.floor(i / 9) - 1;
      var colour = INK;
      if ((x + y + z + 3) % 4 === 0) colour = PAPER;
      if (i === 2 || i === 16 || i === 24) colour = RED;
      out.push({ p: [x * 1.06, y * 1.06, z * 1.06], s: [1, 1, 1], c: colour });
    }
    return out;
  }
  function calendar() {
    var out = [];
    for (var i = 0; i < COUNT; i++) {
      var col = i % 7, row = Math.floor(i / 7);
      var colour = col >= 5 ? STONE : INK;
      if (i === 9 || i === 18) colour = RED;          // days on leave
      if (i >= 24) colour = PAPER;                    // days still to come
      out.push({ p: [(col - 3) * 1.02, (1.5 - row) * 1.02, 0], s: [0.88, 0.88, 0.22], c: colour });
    }
    return out;
  }
  function headset() {
    var out = [];
    for (var i = 0; i < COUNT; i++) {
      if (i === 24) out.push({ p: [0, -0.15, 0], s: [1.5, 1.9, 1.5], c: PAPER });          // head
      else if (i === 25) out.push({ p: [0, 0.25, 0.62], s: [1.9, 0.72, 0.5], c: INK });    // visor
      else if (i === 26) out.push({ p: [0, 0.25, 0.9], s: [1.35, 0.16, 0.08], c: RED });   // its light
      else out.push({ p: [0, 0, 0], s: [0.36, 0.36, 0.36], c: i % 5 === 0 ? RED : (i % 3 === 0 ? PAPER : INK), orbit: i });
    }
    return out;
  }
  var FORMS = [cube(), calendar(), headset()];
  // How the whole model sits for each project
  var POSES = [[0.52, 0.72, 0], [-0.12, 0.42, 0], [0.18, -0.35, 0]];

  function start() {
    var THREE = window.THREE;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'blocks3d__canvas';
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 14);
    scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    var sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(4, 7, 9);
    scene.add(sun);

    var group = new THREE.Group();
    scene.add(group);
    var geo = new THREE.BoxGeometry(1, 1, 1);
    var edges = new THREE.EdgesGeometry(geo);
    var blocks = [];
    for (var i = 0; i < COUNT; i++) {
      var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: INK, roughness: 0.62, metalness: 0.05 }));
      // a pale outline keeps neighbouring blocks readable as separate pieces
      mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xefeeeb, transparent: true, opacity: 0.55 })));
      group.add(mesh);
      blocks.push({ mesh: mesh, seed: (i * 0.618034) % 1, spin: new THREE.Vector3(Math.sin(i * 1.7), Math.cos(i * 2.3), Math.sin(i * 0.9)).normalize() });
    }

    /* ---------- drag to turn ---------- */
    var canvas = renderer.domElement;
    var drag = null, yaw = 0, pitch = 0, yawVel = 0, pitchVel = 0, hoverX = 0, hoverY = 0;
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      host.classList.add('is-grabbing', 'is-touched');
    });
    canvas.addEventListener('pointermove', function (e) {
      var b = canvas.getBoundingClientRect();
      hoverX = (e.clientX - b.left) / b.width - 0.5;
      hoverY = (e.clientY - b.top) / b.height - 0.5;
      if (!drag) return;
      yawVel = (e.clientX - drag.x) * 0.008;
      pitchVel = (e.clientY - drag.y) * 0.006;
      drag.x = e.clientX; drag.y = e.clientY;
    });
    function drop() { drag = null; host.classList.remove('is-grabbing'); }
    canvas.addEventListener('pointerup', drop);
    canvas.addEventListener('pointercancel', drop);
    canvas.addEventListener('pointerleave', function () { hoverX = 0; hoverY = 0; });

    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = camera.aspect < 1 ? 14 / Math.max(0.55, camera.aspect) : 14;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(host);
    }

    var a = new THREE.Color(), b = new THREE.Color(), q = new THREE.Quaternion();
    var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    var mix = function (x, y, t) { return x + (y - x) * t; };
    var shown = 0, clock = 0, last = performance.now();

    // Where block i sits in formation f at this moment
    function place(f, i, out) {
      var e = FORMS[f][i];
      if (e.orbit === undefined) { out.x = e.p[0]; out.y = e.p[1]; out.z = e.p[2]; return e; }
      // two tilted rings of small objects circling the headset
      var ring = e.orbit % 2, n = Math.floor(e.orbit / 2);
      var ang = (n / 12) * Math.PI * 2 + clock * (ring ? -0.32 : 0.42);
      var r = ring ? 3.5 : 2.6;
      out.x = Math.cos(ang) * r;
      out.y = Math.sin(ang) * r * (ring ? 0.34 : -0.42);
      out.z = Math.sin(ang) * r * 0.8;
      return e;
    }
    var pa = { x: 0, y: 0, z: 0 }, pb = { x: 0, y: 0, z: 0 };

    (function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += reduced ? 0 : dt;

      // follow the scroll, but glide so a fast scroll does not snap the blocks
      var target = Math.max(0, Math.min(1, window.railEased || 0)) * (FORMS.length - 1);
      shown += (target - shown) * (reduced ? 1 : 0.09);
      var f0 = Math.min(FORMS.length - 2, Math.floor(shown)), f1 = f0 + 1, t = shown - f0;

      for (var i = 0; i < COUNT; i++) {
        var blk = blocks[i];
        // blocks leave one after another, not all at once
        var ti = ease(t * 1.7 - blk.seed * 0.7);
        var ea = place(f0, i, pa), eb = place(f1, i, pb);
        // a little outward arc while travelling
        var lift = Math.sin(ti * Math.PI) * 1.4;
        blk.mesh.position.set(mix(pa.x, pb.x, ti) + blk.spin.x * lift, mix(pa.y, pb.y, ti) + blk.spin.y * lift, mix(pa.z, pb.z, ti) + blk.spin.z * lift);
        blk.mesh.scale.set(mix(ea.s[0], eb.s[0], ti), mix(ea.s[1], eb.s[1], ti), mix(ea.s[2], eb.s[2], ti));
        // tumble in flight; orbiting pieces keep turning
        var turn = Math.sin(ti * Math.PI) * 3.2;
        var orbiting = (ea.orbit !== undefined ? 1 - ti : 0) + (eb.orbit !== undefined ? ti : 0);
        q.setFromAxisAngle(blk.spin, turn + orbiting * clock * 1.4);
        blk.mesh.quaternion.copy(q);
        blk.mesh.material.color.copy(a.setHex(ea.c)).lerp(b.setHex(eb.c), ti);
      }

      // the whole model: each project's pose, a slow drift, the pointer, and whatever the visitor dragged
      if (!drag) { yawVel *= 0.94; pitchVel *= 0.9; }
      yaw += yawVel; pitch = Math.max(-1.1, Math.min(1.1, pitch + pitchVel));
      if (!drag) pitch *= 0.97;
      var pt = ease(t);
      group.rotation.x = mix(POSES[f0][0], POSES[f1][0], pt) + pitch + hoverY * 0.25;
      group.rotation.y = mix(POSES[f0][1], POSES[f1][1], pt) + yaw + hoverX * 0.35 + Math.sin(clock * 0.4) * 0.12;
      group.position.y = Math.sin(clock * 0.8) * 0.08;

      renderer.render(scene, camera);
    })(last);

    host.classList.add('is-live');
  }

  // three.js is shared with the ID badge and fetched once, only when a 3D piece is near the screen
  function loadThree() {
    if (!window.__three) {
      window.__three = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return window.__three;
  }
  var go = function () { loadThree().then(start, function () {}); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { obs.disconnect(); go(); }
    }, { rootMargin: '800px 0px' }).observe(host);
  } else {
    go();
  }
})();
