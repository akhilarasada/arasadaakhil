// The arcade: each selected project hides a small game. Win it and a coupon appears, which the
// visitor can send from the contact form (or by email) for 10% off their first project bill.
//   RevalERP    -> the cube: 27 modules, turn the layers until every side is one colour
//   SHRMPro     -> team leads: the "queens" puzzle, one lead per row, column and team
//   AR Sessions -> anchor lock: hold the reticle on drifting holograms to pin them down

(function () {
  var buttons = document.querySelectorAll('[data-game]');
  if (!buttons.length) return;

  var GAMES = {
    cube: {
      title: 'Lock the modules',
      tag: 'RevalERP',
      rules: 'RevalERP is 25+ modules that have to fit together. This cube has been knocked out of line. Drag a row to turn it, drag the empty space to look around, and make every side one colour again.',
      code: 'ERP10-CUBE',
      start: startCube
    },
    queens: {
      title: 'Seat the team leads',
      tag: 'SHRMPro',
      rules: 'Every coloured block is a team. Seat exactly one lead in each row, each column and each team, and never two leads next to each other, not even corner to corner. Click once to rule a seat out, twice to seat a lead.',
      code: 'HR10-LEADS',
      start: startQueens
    },
    anchor: {
      title: 'Anchor the session',
      tag: 'AR Sessions',
      rules: 'Holograms drift until someone anchors them. Keep your reticle on a hologram until its ring closes. Pin all eight before the session clock runs out.',
      code: 'AR10-ANCHOR',
      start: startAnchor
    }
  };

  var modal = document.createElement('div');
  modal.className = 'arcade';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.hidden = true;
  modal.innerHTML =
    '<div class="arcade__panel">' +
      '<header class="arcade__head">' +
        '<div><p class="label arcade__tag"></p><h3 class="arcade__title"></h3></div>' +
        '<button type="button" class="arcade__close" aria-label="Close the game">Close ✕</button>' +
      '</header>' +
      '<p class="arcade__rules"></p>' +
      '<div class="arcade__stage"></div>' +
      '<footer class="arcade__foot"><span class="arcade__status"></span><span class="arcade__tools"></span></footer>' +
      '<div class="arcade__win" hidden>' +
        '<p class="label">Solved. This one is yours</p>' +
        '<p class="arcade__code"></p>' +
        '<p class="arcade__deal">10% off your first project bill. Send me this code and it is applied.</p>' +
        '<div class="arcade__claim">' +
          '<button type="button" class="btn btn--red" data-claim="form">Claim it in the form <span aria-hidden="true">→</span></button>' +
          '<a class="link-btn" data-claim="mail" href="#">Or email it <span aria-hidden="true">↗</span></a>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  var el = {
    tag: modal.querySelector('.arcade__tag'), title: modal.querySelector('.arcade__title'),
    rules: modal.querySelector('.arcade__rules'), stage: modal.querySelector('.arcade__stage'),
    status: modal.querySelector('.arcade__status'), tools: modal.querySelector('.arcade__tools'),
    win: modal.querySelector('.arcade__win'), code: modal.querySelector('.arcade__code'),
    mail: modal.querySelector('[data-claim="mail"]')
  };
  var current = null, stop = null, opener = null;

  function tool(label, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'arcade__tool'; b.textContent = label;
    b.addEventListener('click', fn);
    el.tools.appendChild(b);
    return b;
  }
  var api = {
    stage: el.stage,
    status: function (text) { el.status.textContent = text; },
    tool: tool,
    win: function () {
      if (!current) return;
      el.code.textContent = current.code;
      el.mail.href = 'mailto:contact@arasadaakhil.website?subject=' + encodeURIComponent('Coupon ' + current.code) +
        '&body=' + encodeURIComponent('Hi Akhil,\n\nI solved "' + current.title + '" on your site. My coupon code is ' + current.code + '.\n\nMy project:\n');
      el.win.hidden = false;
      modal.classList.add('is-won');
      // on a short screen the coupon lands below the fold, so bring it up
      el.win.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (window.portfolioTrack) window.portfolioTrack('event', 'Game won: ' + current.tag);
    }
  };

  function open(name, from) {
    current = GAMES[name];
    if (!current) return;
    opener = from;
    el.tag.textContent = '(' + current.tag + ' · play for 10% off)';
    el.title.textContent = current.title;
    el.rules.textContent = current.rules;
    el.stage.innerHTML = ''; el.tools.innerHTML = ''; el.status.textContent = '';
    el.stage.className = 'arcade__stage arcade__stage--' + name;
    el.win.hidden = true;
    modal.classList.remove('is-won');
    modal.hidden = false;
    document.documentElement.classList.add('is-arcade');
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
    stop = current.start(api) || null;
    modal.querySelector('.arcade__close').focus();
    if (window.portfolioTrack) window.portfolioTrack('event', 'Game opened: ' + current.tag);
  }
  function close() {
    if (modal.hidden) return;
    if (stop) stop();
    stop = null; current = null;
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('is-arcade');
    setTimeout(function () { modal.hidden = true; el.stage.innerHTML = ''; }, 300);
    if (opener) opener.focus();
  }

  buttons.forEach(function (b) { b.addEventListener('click', function () { open(b.getAttribute('data-game'), b); }); });
  modal.querySelector('.arcade__close').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  modal.querySelector('[data-claim="form"]').addEventListener('click', function () {
    var code = el.code.textContent, title = current ? current.title : '';
    close();
    if (window.portfolioBrief) window.portfolioBrief('Coupon ' + code + ' (I solved "' + title + '").\n\nMy project: ');
  });

  /* ================= RevalERP: the cube ================= */
  function startCube(ui) {
    var alive = true, cleanup = function () {};
    ui.status('Loading the cube…');
    if (!window.__three) {
      window.__three = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    window.__three.then(function () { if (alive) cleanup = build(); }, function () { ui.status('The cube could not load. Check your connection and try again.'); });
    return function () { alive = false; cleanup(); };

    function build() {
      var THREE = window.THREE, host = ui.stage;
      var renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
      catch (err) { ui.status('This browser cannot draw the cube.'); return function () {}; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      host.appendChild(renderer.domElement);
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
      camera.position.set(0, 0, 9.5);
      scene.add(new THREE.AmbientLight(0xffffff, 0.78));
      var sun = new THREE.DirectionalLight(0xffffff, 0.5);
      sun.position.set(3, 5, 6); scene.add(sun);

      // +x, -x, +y, -y, +z, -z
      var COLOURS = [0xd12424, 0xef7d1a, 0xf4f3f0, 0xf2c230, 0x1f8f5f, 0x2a5bd7], BODY = 0x141412;
      var bodyMat = new THREE.MeshLambertMaterial({ color: BODY });
      var faceMats = COLOURS.map(function (c) { return new THREE.MeshLambertMaterial({ color: c }); });
      var NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      var root = new THREE.Group();
      root.rotation.set(0.5, -0.62, 0);
      scene.add(root);
      var geo = new THREE.BoxGeometry(0.93, 0.93, 0.93);
      var cubies = [];
      for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
        var at = [x, y, z], stickers = [];
        var mats = NORMALS.map(function (n, i) {
          var axis = i >> 1, outer = at[axis] === n[axis];
          if (outer) stickers.push(i);
          return outer ? faceMats[i] : bodyMat;
        });
        var m = new THREE.Mesh(geo, mats);
        m.position.set(x, y, z);
        m.userData.stickers = stickers;
        root.add(m); cubies.push(m);
      }

      var AX = ['x', 'y', 'z'], turning = false, history = [], moves = 0, won = false;
      function settle(c) {
        var h = Math.PI / 2;
        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
        c.rotation.set(Math.round(c.rotation.x / h) * h, Math.round(c.rotation.y / h) * h, Math.round(c.rotation.z / h) * h);
        c.updateMatrix();
      }
      function turn(axis, layer, dir, ms, done) {
        var pivot = new THREE.Group();
        root.add(pivot);
        var set = cubies.filter(function (c) { return Math.round(c.position[AX[axis]]) === layer; });
        set.forEach(function (c) { pivot.attach(c); });
        var finish = function () {
          pivot.rotation[AX[axis]] = dir * Math.PI / 2;
          pivot.updateMatrixWorld(true);
          set.forEach(function (c) { root.attach(c); settle(c); });
          root.remove(pivot);
          if (done) done();
        };
        if (!ms) { finish(); return; }
        turning = true;
        var began = performance.now();
        (function step(now) {
          if (!alive) return;
          var t = Math.min(1, (now - began) / ms), e = 1 - Math.pow(1 - t, 3);
          pivot.rotation[AX[axis]] = dir * e * Math.PI / 2;
          if (t < 1) { requestAnimationFrame(step); return; }
          finish(); turning = false;
        })(began);
      }
      function solved() {
        var seen = {}, v = new THREE.Vector3();
        for (var i = 0; i < cubies.length; i++) {
          var c = cubies[i];
          for (var k = 0; k < c.userData.stickers.length; k++) {
            var s = c.userData.stickers[k];
            v.set(NORMALS[s][0], NORMALS[s][1], NORMALS[s][2]).applyQuaternion(c.quaternion);
            var key = Math.round(v.x) + ',' + Math.round(v.y) + ',' + Math.round(v.z);
            if (seen[key] === undefined) seen[key] = s; else if (seen[key] !== s) return false;
          }
        }
        return true;
      }
      function report() { ui.status(won ? 'Solved in ' + moves + ' turns' : 'Turns: ' + moves + ' · ' + history.length + ' from solved'); }
      function scramble() {
        if (turning) return;
        while (history.length) { var u = history.pop(); turn(u[0], u[1], -u[2], 0); }
        var prev = -1;
        for (var i = 0; i < 4; i++) {
          var axis;
          do { axis = Math.floor(Math.random() * 3); } while (axis === prev);
          prev = axis;
          var mv = [axis, Math.random() < 0.5 ? -1 : 1, Math.random() < 0.5 ? -1 : 1];
          turn(mv[0], mv[1], mv[2], 0); history.push(mv);
        }
        moves = 0; won = false; report();
      }
      function play(axis, layer, dir) {
        if (turning || won) return;
        var last = history[history.length - 1];
        // turning a row straight back simply undoes it
        if (last && last[0] === axis && last[1] === layer && last[2] === -dir) history.pop(); else history.push([axis, layer, dir]);
        moves++;
        turn(axis, layer, dir, 260, function () {
          if (solved()) { won = true; history = []; report(); ui.win(); } else report();
        });
      }
      ui.tool('Undo a turn', function () {
        if (turning || won || !history.length) return;
        var u = history.pop(); moves++;
        turn(u[0], u[1], -u[2], 260, function () { if (solved()) { won = true; report(); ui.win(); } else report(); });
      });
      ui.tool('Shuffle again', scramble);
      scramble();

      // Pointer: a drag that starts on the cube turns a row, one that starts beside it looks around
      var ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), grab = null, canvas = renderer.domElement;
      function toNdc(e) {
        var r = canvas.getBoundingClientRect();
        ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      }
      function screenDir(point, dirLocal) {
        var a = point.clone().project(camera);
        var b = point.clone().add(dirLocal.clone().transformDirection(root.matrixWorld).multiplyScalar(0.5)).project(camera);
        return { x: b.x - a.x, y: -(b.y - a.y) };
      }
      function down(e) {
        toNdc(e);
        ray.setFromCamera(ptr, camera);
        var hit = ray.intersectObjects(cubies)[0];
        grab = { x: e.clientX, y: e.clientY, hit: null };
        if (hit && !turning && !won) {
          var n = hit.face.normal.clone().applyQuaternion(hit.object.quaternion);
          n.set(Math.round(n.x), Math.round(n.y), Math.round(n.z));
          grab.hit = { cubie: hit.object, normal: n, point: hit.point.clone() };
        }
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
      function move(e) {
        if (!grab) return;
        var dx = e.clientX - grab.x, dy = e.clientY - grab.y;
        if (!grab.hit) {
          root.rotation.y += dx * 0.008;
          root.rotation.x = Math.max(-1.2, Math.min(1.2, root.rotation.x + dy * 0.008));
          grab.x = e.clientX; grab.y = e.clientY;
          return;
        }
        if (dx * dx + dy * dy < 18 * 18) return;
        var h = grab.hit, best = null;
        for (var i = 0; i < 3; i++) {
          if (h.normal.getComponent(i) !== 0) continue;
          var t = new THREE.Vector3(); t.setComponent(i, 1);
          var s = screenDir(h.point, t), len = Math.sqrt(s.x * s.x + s.y * s.y) || 1;
          var along = (dx * s.x + dy * s.y) / len;
          if (!best || Math.abs(along) > Math.abs(best.along)) best = { t: t, along: along };
        }
        // moving a face along t means turning about (normal x t)
        var axisVec = new THREE.Vector3().crossVectors(h.normal, best.t).multiplyScalar(best.along > 0 ? 1 : -1);
        var axis = Math.abs(axisVec.x) > 0.5 ? 0 : Math.abs(axisVec.y) > 0.5 ? 1 : 2;
        play(axis, Math.round(h.cubie.position[AX[axis]]), axisVec.getComponent(axis) > 0 ? 1 : -1);
        grab = null;
      }
      function up() { grab = null; }
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);

      function resize() {
        var w = host.clientWidth, h = host.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.z = w / h < 0.9 ? 12 : 9.5;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);
      (function frame() {
        if (!alive) return;
        requestAnimationFrame(frame);
        renderer.render(scene, camera);
      })();

      return function () {
        window.removeEventListener('resize', resize);
        geo.dispose(); bodyMat.dispose(); faceMats.forEach(function (m) { m.dispose(); });
        renderer.dispose();
      };
    }
  }

  /* ================= SHRMPro: seat the team leads ================= */
  function startQueens(ui) {
    var N = 7, TEAMS = ['Engineering', 'Design', 'Finance', 'Sales', 'Support', 'People', 'Ops'];
    var grid = document.createElement('div');
    grid.className = 'queens';
    grid.style.setProperty('--n', N);
    ui.stage.appendChild(grid);
    var region, state, cells, won, began;

    function makeBoard() {
      // a hidden answer first: one seat per row and column, none touching
      var cols, ok = false;
      while (!ok) {
        cols = [];
        for (var i = 0; i < N; i++) cols.push(i);
        for (var k = N - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), t = cols[k]; cols[k] = cols[r]; cols[r] = t; }
        ok = true;
        for (var q = 1; q < N; q++) if (Math.abs(cols[q] - cols[q - 1]) < 2) { ok = false; break; }
      }
      // then grow one team outwards from each of those seats until the floor is full
      region = [];
      for (var a = 0; a < N * N; a++) region.push(-1);
      var edge = [];
      cols.forEach(function (c, row) { region[row * N + c] = row; edge.push(row * N + c); });
      var left = N * N - N;
      while (left > 0) {
        var pick = edge[Math.floor(Math.random() * edge.length)], pr = Math.floor(pick / N), pc = pick % N;
        var near = [[pr - 1, pc], [pr + 1, pc], [pr, pc - 1], [pr, pc + 1]].filter(function (p) {
          return p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N && region[p[0] * N + p[1]] === -1;
        });
        if (!near.length) { edge.splice(edge.indexOf(pick), 1); continue; }
        var nx = near[Math.floor(Math.random() * near.length)], ni = nx[0] * N + nx[1];
        region[ni] = region[pick]; edge.push(ni); left--;
      }
    }

    function draw() {
      grid.innerHTML = ''; cells = []; state = []; won = false; began = Date.now();
      for (var i = 0; i < N * N; i++) {
        (function (i) {
          var r = Math.floor(i / N), c = i % N, b = document.createElement('button');
          b.type = 'button';
          b.className = 'queens__cell queens__cell--t' + region[i];
          // heavier lines where one team meets another
          if (r === 0 || region[i - N] !== region[i]) b.classList.add('is-top');
          if (c === 0 || region[i - 1] !== region[i]) b.classList.add('is-left');
          if (r === N - 1) b.classList.add('is-bottom');
          if (c === N - 1) b.classList.add('is-right');
          b.setAttribute('aria-label', TEAMS[region[i]] + ', row ' + (r + 1) + ', column ' + (c + 1));
          b.addEventListener('click', function () {
            if (won) return;
            state[i] = (state[i] + 1) % 3;
            check();
          });
          state.push(0); cells.push(b); grid.appendChild(b);
        })(i);
      }
      check();
    }

    function check() {
      var leads = [], bad = {};
      for (var i = 0; i < N * N; i++) if (state[i] === 2) leads.push(i);
      for (var a = 0; a < leads.length; a++) for (var b = a + 1; b < leads.length; b++) {
        var i1 = leads[a], i2 = leads[b];
        var r1 = Math.floor(i1 / N), c1 = i1 % N, r2 = Math.floor(i2 / N), c2 = i2 % N;
        if (r1 === r2 || c1 === c2 || region[i1] === region[i2] || (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1)) { bad[i1] = bad[i2] = true; }
      }
      var clashes = Object.keys(bad).length;
      cells.forEach(function (b, i) {
        b.textContent = state[i] === 2 ? '♛' : state[i] === 1 ? '×' : '';
        b.classList.toggle('is-lead', state[i] === 2);
        b.classList.toggle('is-out', state[i] === 1);
        b.classList.toggle('is-bad', !!bad[i]);
      });
      if (leads.length === N && !clashes) {
        won = true;
        grid.classList.add('is-won');
        ui.status('All ' + N + ' teams have their lead · ' + Math.round((Date.now() - began) / 1000) + 's');
        ui.win();
      } else {
        ui.status(leads.length + ' of ' + N + ' leads seated' + (clashes ? ' · ' + clashes + ' in conflict' : ''));
      }
    }

    function fresh() { grid.classList.remove('is-won'); makeBoard(); draw(); }
    ui.tool('Clear the floor', function () { if (!won) { state = state.map(function () { return 0; }); check(); } });
    ui.tool('New floor plan', fresh);
    fresh();
    return function () {};
  }

  /* ================= AR Sessions: anchor lock ================= */
  function startAnchor(ui) {
    var canvas = document.createElement('canvas');
    canvas.className = 'anchor';
    ui.stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, alive = true;
    var TOTAL = 8, TIME = 30, HOLD = 0.75;
    var holos, pinned, timeLeft, state, ptr = { x: -999, y: -999, on: false }, last = 0, flash = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = ui.stage.clientWidth; H = ui.stage.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function reset() {
      holos = [];
      for (var i = 0; i < TOTAL; i++) {
        var ang = Math.random() * Math.PI * 2, speed = 55 + Math.random() * 60;
        holos.push({
          x: W * (0.15 + Math.random() * 0.7), y: H * (0.15 + Math.random() * 0.7),
          vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
          r: 20 + Math.random() * 12, spin: Math.random() * 6, lock: 0, pinned: false, sides: 3 + (i % 4), wob: Math.random() * 6
        });
      }
      pinned = 0; timeLeft = TIME; state = 'ready'; report();
    }
    function report() {
      if (state === 'ready') ui.status('Move onto the stage to start the session');
      else if (state === 'play') ui.status(pinned + ' of ' + TOTAL + ' anchored · ' + Math.ceil(timeLeft) + 's left');
      else if (state === 'lost') ui.status('Session timed out with ' + pinned + ' of ' + TOTAL + ' anchored. Try again.');
      else ui.status('Session anchored with ' + Math.ceil(timeLeft) + 's to spare');
    }
    function at(e) {
      var r = canvas.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true;
      if (state === 'ready') { state = 'play'; report(); }
    }
    canvas.addEventListener('pointermove', at);
    canvas.addEventListener('pointerdown', at);
    canvas.addEventListener('pointerleave', function () { ptr.on = false; });

    function shape(h, t) {
      ctx.beginPath();
      for (var k = 0; k <= h.sides; k++) {
        var a = h.spin + t * 0.9 + (k / h.sides) * Math.PI * 2;
        var px = h.x + Math.cos(a) * h.r, py = h.y + Math.sin(a) * h.r * (0.72 + 0.18 * Math.sin(t * 1.3 + h.wob));
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }
    function frame(now) {
      if (!alive) return;
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0), t = now / 1000;
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // the room as the headset sees it: a floor grid running away from you, and frame corners
      ctx.strokeStyle = 'rgba(239,238,235,0.09)'; ctx.lineWidth = 1;
      var hz = H * 0.42;
      for (var g = -8; g <= 8; g++) { ctx.beginPath(); ctx.moveTo(W / 2 + g * 26, hz); ctx.lineTo(W / 2 + g * 190, H); ctx.stroke(); }
      for (var d = 0; d < 7; d++) { var gy = hz + (H - hz) * Math.pow((d + ((t * 0.25) % 1)) / 7, 2); ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(239,238,235,0.5)'; ctx.lineWidth = 2;
      [[14, 14, 1, 1], [W - 14, 14, -1, 1], [14, H - 14, 1, -1], [W - 14, H - 14, -1, -1]].forEach(function (c) {
        ctx.beginPath(); ctx.moveTo(c[0] + 22 * c[2], c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + 22 * c[3]); ctx.stroke();
      });

      var playing = state === 'play';
      if (playing) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; state = 'lost'; }
      }
      holos.forEach(function (h) {
        if (!h.pinned && state !== 'lost') {
          h.x += h.vx * dt; h.y += h.vy * dt;
          if (h.x < h.r + 16 || h.x > W - h.r - 16) { h.vx *= -1; h.x = Math.max(h.r + 16, Math.min(W - h.r - 16, h.x)); }
          if (h.y < h.r + 16 || h.y > H - h.r - 16) { h.vy *= -1; h.y = Math.max(h.r + 16, Math.min(H - h.r - 16, h.y)); }
          var over = ptr.on && playing && Math.hypot(ptr.x - h.x, ptr.y - h.y) < h.r + 16;
          h.lock = Math.max(0, Math.min(1, h.lock + (over ? dt / HOLD : -dt * 1.6)));
          if (h.lock >= 1) { h.pinned = true; pinned++; flash = 1; if (pinned === TOTAL) { state = 'won'; report(); ui.win(); } }
        }
        ctx.lineWidth = 1.6;
        if (h.pinned) {
          ctx.strokeStyle = '#d12424'; ctx.fillStyle = 'rgba(209,36,36,0.22)';
          shape(h, 0); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(h.x, h.y + h.r * 0.8); ctx.lineTo(h.x, h.y + h.r * 0.8 + 16); ctx.stroke();
          ctx.fillStyle = '#d12424'; ctx.fillRect(h.x - 3, h.y + h.r * 0.8 + 14, 6, 6);
        } else {
          ctx.strokeStyle = 'rgba(239,238,235,0.85)'; ctx.fillStyle = 'rgba(239,238,235,0.06)';
          shape(h, t); ctx.fill(); ctx.stroke();
          if (h.lock > 0) {
            ctx.strokeStyle = '#d12424'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 10, -Math.PI / 2, -Math.PI / 2 + h.lock * Math.PI * 2); ctx.stroke();
          }
        }
      });
      if (playing) report();
      if (state === 'lost' && flash !== -1) { flash = -1; report(); }

      // reticle
      if (ptr.on) {
        ctx.strokeStyle = '#efeeeb'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ptr.x, ptr.y, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ptr.x - 24, ptr.y); ctx.lineTo(ptr.x - 10, ptr.y); ctx.moveTo(ptr.x + 10, ptr.y); ctx.lineTo(ptr.x + 24, ptr.y);
        ctx.moveTo(ptr.x, ptr.y - 24); ctx.lineTo(ptr.x, ptr.y - 10); ctx.moveTo(ptr.x, ptr.y + 10); ctx.lineTo(ptr.x, ptr.y + 24);
        ctx.stroke();
      }
      if (flash > 0) { ctx.fillStyle = 'rgba(209,36,36,' + (flash * 0.18).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 3); }
      // the session clock, as a bar along the top
      ctx.fillStyle = 'rgba(239,238,235,0.14)'; ctx.fillRect(14, 8, W - 28, 2);
      ctx.fillStyle = timeLeft < 8 ? '#d12424' : '#efeeeb'; ctx.fillRect(14, 8, (W - 28) * (timeLeft / TIME), 2);
    }

    ui.tool('Restart session', function () { flash = 0; reset(); });
    var onResize = function () { resize(); };
    window.addEventListener('resize', onResize);
    resize(); reset();
    requestAnimationFrame(frame);
    return function () { alive = false; window.removeEventListener('resize', onResize); };
  }
})();
