// Selected Work in 3D (three.js): one set of 27 blocks that rebuilds itself for each project.
//   RevalERP    -> a solid 3x3x3 cube: many modules locked into one platform
//   SHRMPro     -> a month of attendance: a calendar wall, weekends pale, leave days red
//   AR Sessions -> a headset with the blocks orbiting it as objects in space
// script.js publishes the rail's scroll position as window.railEased (0..1); this file follows it.
// Drag the model to turn it.
// Each formation is also a game, played with these same blocks (see "the games" below):
// win one and a coupon appears.

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

    var a = new THREE.Color(), clock = 0;

    /* ---------- drag to turn ---------- */
    var canvas = renderer.domElement;
    var drag = null, yaw = 0, pitch = 0, yawVel = 0, pitchVel = 0, hoverX = 0, hoverY = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (game && game.down && game.down(e)) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} return; }
      if (game && !game.orbit) return;
      drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      host.classList.add('is-grabbing', 'is-touched');
    });
    canvas.addEventListener('pointermove', function (e) {
      var b = canvas.getBoundingClientRect();
      hoverX = (e.clientX - b.left) / b.width - 0.5;
      hoverY = (e.clientY - b.top) / b.height - 0.5;
      if (game && game.move) game.move(e);
      if (!drag) return;
      yawVel = (e.clientX - drag.x) * 0.008;
      pitchVel = (e.clientY - drag.y) * 0.006;
      drag.x = e.clientX; drag.y = e.clientY;
    });
    function drop(e) { drag = null; host.classList.remove('is-grabbing'); if (game && game.up) game.up(e); }
    canvas.addEventListener('pointerup', drop);
    canvas.addEventListener('pointercancel', drop);
    canvas.addEventListener('pointerleave', function () { hoverX = 0; hoverY = 0; });

    /* ================= the games ================= */
    // A game takes over the 27 blocks while it runs. It says where each block should be
    // (apply), reacts to the pointer (down / move / up) and is blended in over the normal layout.
    var G = { pos: new THREE.Vector3(), scl: new THREE.Vector3(), quat: new THREE.Quaternion(), col: new THREE.Color() };
    var game = null, ghost = null, gmix = 0;
    var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tv = new THREE.Vector3(), tq = new THREE.Quaternion();
    var meshes = blocks.map(function (blk, i) { blk.mesh.userData.i = i; return blk.mesh; });
    function pick(e) {
      var r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(meshes, false)[0] || null;
    }

    // Where each block sits in the 3 x 3 x 3 cube
    var home = blocks.map(function (blk, i) { return [i % 3 - 1, Math.floor(i / 3) % 3 - 1, Math.floor(i / 9) - 1]; });

    /* ---------- the HUD ---------- */
    var hud = host.querySelector('.hud');
    var ui = hud && {
      title: hud.querySelector('.hud__title'), rules: hud.querySelector('.hud__rules'), status: hud.querySelector('.hud__status'),
      tools: hud.querySelector('.hud__tools'), win: hud.querySelector('.hud__win'), code: hud.querySelector('.hud__code'),
      mail: hud.querySelector('[data-hud="mail"]'), reticle: hud.querySelector('.hud__reticle')
    };
    var clockBar = null;
    if (hud) { clockBar = document.createElement('i'); clockBar.className = 'hud__clock'; hud.appendChild(clockBar); }
    // how much of the limit (time or turns) is left, 0..1
    function limit(left) {
      clockBar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, left)).toFixed(4) + ')';
      clockBar.classList.toggle('is-low', left < 0.3);
    }
    var said = '';
    function say(text) { if (text !== said) { said = text; ui.status.textContent = text; } }
    function tool(label, fn) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'hud__btn'; btn.textContent = label;
      btn.addEventListener('click', fn);
      ui.tools.appendChild(btn);
    }
    function winGame() {
      if (!game) return;
      ui.code.textContent = game.code;
      ui.mail.href = 'mailto:contact@arasadaakhil.website?subject=' + encodeURIComponent('Coupon ' + game.code) +
        '&body=' + encodeURIComponent('Hi Akhil,\n\nI won "' + game.title + '" on your site. My coupon code is ' + game.code + '.\n\nMy project:\n');
      ui.win.hidden = false;
      if (window.portfolioTrack) window.portfolioTrack('event', 'Game won: ' + game.title);
    }
    var MAKERS = { cube: cubeGame, queens: queensGame, anchor: anchorGame };
    function startGame(name) {
      if (!hud || !MAKERS[name]) return;
      if (game) endGame();
      if (ghost) { if (ghost.dispose) ghost.dispose(); ghost = null; }
      ui.tools.innerHTML = ''; ui.win.hidden = true; said = '';
      yaw = pitch = yawVel = pitchVel = 0;
      game = MAKERS[name]();
      ui.title.textContent = game.title;
      ui.rules.textContent = game.rules;
      hud.hidden = false;
      host.classList.add('is-playing', 'is-touched');
      host.setAttribute('data-playing', name);
      if (window.portfolioTrack) window.portfolioTrack('event', 'Game started: ' + game.title);
    }
    function endGame() {
      if (!game) return;
      ghost = game; game = null;            // keeps drawing while the blocks glide back
      hud.hidden = true;
      host.classList.remove('is-playing');
      host.removeAttribute('data-playing');
      yaw = pitch = yawVel = pitchVel = 0;
    }
    if (hud) {
      hud.querySelector('[data-hud="exit"]').addEventListener('click', endGame);
      hud.querySelector('[data-hud="form"]').addEventListener('click', function () {
        var text = 'Coupon ' + game.code + ' (I won "' + game.title + '").\n\nMy project: ';
        endGame();
        if (window.portfolioBrief) window.portfolioBrief(text);
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') endGame(); });
    }
    window.__playBlocks = startGame;
    if (window.__playQueued) { startGame(window.__playQueued); window.__playQueued = null; }

    /* ---------- RevalERP: ship the release ---------- */
    // The same cube, with one change: nine of its modules are red. They belong together on one
    // side (the release), but the platform has been twisted out of line. Drag a row to turn it.
    // Ten turns and sixty seconds to get all nine red modules back onto one face.
    function cubeGame() {
      var TURNS = 10, TIME = 60;
      var AXV = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
      var cub = home.map(function (at) {
        var red = at[2] === 1;
        return { pos: new THREE.Vector3(at[0], at[1], at[2]), q: new THREE.Quaternion(), turning: false,
          red: red, colour: red ? RED : ((at[0] + at[1] + at[2] + 3) % 4 === 0 ? PAPER : INK) };
      });
      var reds = cub.filter(function (c) { return c.red; });
      var anim = null, turnsLeft = TURNS, timeLeft = TIME, state = 'ready', grab = null;
      function commit(axis, layer, dir) {
        tq.setFromAxisAngle(AXV[axis], dir * Math.PI / 2);
        cub.forEach(function (c) {
          if (Math.round(c.pos.getComponent(axis)) !== layer) return;
          c.pos.applyQuaternion(tq).round();
          c.q.premultiply(tq).normalize();
        });
      }
      function turn(axis, layer, dir, done) {
        cub.forEach(function (c) { c.turning = Math.round(c.pos.getComponent(axis)) === layer; });
        anim = { axis: axis, layer: layer, dir: dir, t: 0, done: done };
      }
      // solved when all nine red modules share an outside face
      function solved() {
        for (var k = 0; k < 3; k++) {
          var v = Math.round(reds[0].pos.getComponent(k));
          if (v !== 0 && reds.every(function (c) { return Math.round(c.pos.getComponent(k)) === v; })) return true;
        }
        return false;
      }
      function strays() {
        // how many red modules are off the fullest face, as a hint of how far there is to go
        var best = 0;
        for (var k = 0; k < 3; k++) [-1, 1].forEach(function (v) {
          best = Math.max(best, reds.filter(function (c) { return Math.round(c.pos.getComponent(k)) === v; }).length);
        });
        return 9 - best;
      }
      function report() {
        if (state === 'won') say('Released with ' + turnsLeft + ' turns and ' + Math.ceil(timeLeft) + 's to spare');
        else if (state === 'lost') say((turnsLeft ? 'Out of time' : 'Out of turns') + ' · ' + strays() + ' red still stray. Shuffle and try again.');
        else say(turnsLeft + ' turns · ' + Math.ceil(timeLeft) + 's · ' + strays() + ' red stray');
      }
      function scramble() {
        if (anim) return;
        cub.forEach(function (c, i) { c.pos.set(home[i][0], home[i][1], home[i][2]); c.q.set(0, 0, 0, 1); });
        var prev = -1, n = 0;
        while (n < 4 || solved() || strays() < 3) {
          var axis;
          do { axis = Math.floor(Math.random() * 3); } while (axis === prev);
          prev = axis;
          commit(axis, Math.random() < 0.5 ? -1 : 1, Math.random() < 0.5 ? -1 : 1);
          if (++n > 40) break;
        }
        turnsLeft = TURNS; timeLeft = TIME; state = 'ready'; ui.win.hidden = true;
        limit(1); report();
      }
      function after() {
        if (solved()) { state = 'won'; report(); winGame(); }
        else if (turnsLeft <= 0) { state = 'lost'; report(); }
        else report();
      }
      tool('Shuffle again', scramble);
      scramble();

      function screenDir(point, dirLocal) {
        var p0 = point.clone().project(camera);
        var p1 = point.clone().add(dirLocal.clone().transformDirection(group.matrixWorld).multiplyScalar(0.5)).project(camera);
        return { x: p1.x - p0.x, y: -(p1.y - p0.y) };
      }
      return {
        title: 'Ship the release', code: 'ERP10-CUBE', form: 0, pose: POSES[0], orbit: true,
        rules: 'Nine red modules make up the release, and they belong on one side. Drag a row to turn it, drag beside the cube to look around. You have ' + TURNS + ' turns and ' + TIME + ' seconds to bring all nine onto one face.',
        update: function (dt) {
          if (state === 'play') {
            timeLeft -= dt;
            if (timeLeft <= 0) { timeLeft = 0; state = 'lost'; }
            // whichever runs out first is the one to watch
            limit(Math.min(timeLeft / TIME, turnsLeft / TURNS));
            report();
          }
          if (!anim) return;
          anim.t += dt / 0.26;
          if (anim.t >= 1) {
            var done = anim; anim = null;
            cub.forEach(function (c) { c.turning = false; });
            commit(done.axis, done.layer, done.dir);
            if (done.done) done.done();
          }
        },
        apply: function (i, out) {
          var c = cub[i];
          out.pos.copy(c.pos); out.quat.copy(c.q);
          if (anim && c.turning) {
            tq.setFromAxisAngle(AXV[anim.axis], anim.dir * (1 - Math.pow(1 - anim.t, 3)) * Math.PI / 2);
            out.pos.applyQuaternion(tq); out.quat.premultiply(tq);
          }
          out.pos.multiplyScalar(1.06); out.scl.set(1, 1, 1); out.col.setHex(c.colour);
        },
        down: function (e) {
          var open = state === 'ready' || state === 'play';
          var hit = gmix > 0.97 && !anim && open ? pick(e) : null;
          if (!hit) return false;                       // beside the cube: look around
          var n = hit.face.normal.clone().applyQuaternion(hit.object.quaternion);
          n.set(Math.round(n.x), Math.round(n.y), Math.round(n.z));
          grab = { x: e.clientX, y: e.clientY, c: cub[hit.object.userData.i], normal: n, point: hit.point.clone() };
          return true;
        },
        move: function (e) {
          if (!grab) return;
          var dx = e.clientX - grab.x, dy = e.clientY - grab.y;
          if (dx * dx + dy * dy < 18 * 18) return;
          var best = null;
          for (var k = 0; k < 3; k++) {
            if (grab.normal.getComponent(k) !== 0) continue;
            var t = new THREE.Vector3(); t.setComponent(k, 1);
            var s = screenDir(grab.point, t), len = Math.sqrt(s.x * s.x + s.y * s.y) || 1;
            var along = (dx * s.x + dy * s.y) / len;
            if (!best || Math.abs(along) > Math.abs(best.along)) best = { t: t, along: along };
          }
          // sliding a face along t means turning about (normal x t)
          var av = new THREE.Vector3().crossVectors(grab.normal, best.t).multiplyScalar(best.along > 0 ? 1 : -1);
          var axis = Math.abs(av.x) > 0.5 ? 0 : Math.abs(av.y) > 0.5 ? 1 : 2;
          var layer = Math.round(grab.c.pos.getComponent(axis)), dir = av.getComponent(axis) > 0 ? 1 : -1;
          grab = null;
          state = 'play';                               // the clock starts with the first turn
          turnsLeft--;
          turn(axis, layer, dir, after);
        },
        up: function () { grab = null; }
      };
    }

    /* ---------- SHRMPro: plan the on-call month ---------- */
    // The same calendar wall: four weeks of seven days, shaded into four teams. It is the
    // "queens" puzzle on a calendar: put one lead on call in every week and from every team,
    // never two on the same weekday, never on days that touch (not even corner to corner).
    // Click a day once to rule it out, twice to put a lead on call. Forty seconds.
    function glyph(ch, colour) {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d');
      x.font = '600 96px "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "DejaVu Sans", sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = colour;
      x.fillText(ch, 64, 70);
      return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false });
    }
    function queensGame() {
      var ROWS = 4, COLS = 7, TIME = 40;
      // the wall's own shades, one per team
      var TEAM = [INK, 0x5c5a55, STONE, PAPER];
      var mats = { lead: glyph('♛', '#ffffff'), out: glyph('×', '#d12424') };
      var marks = [], region, state, bad = {}, phase = 'ready', timeLeft = TIME, press = null;
      for (var m = 0; m < COUNT; m++) { var sp = new THREE.Sprite(mats.lead); sp.visible = false; sp.renderOrder = 5; group.add(sp); marks.push(sp); }

      function board() {
        // a hidden answer first: one day per week, all on different weekdays, none touching
        var cols, ok = false;
        while (!ok) {
          var all = [0, 1, 2, 3, 4, 5, 6];
          for (var k = all.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), t = all[k]; all[k] = all[r]; all[r] = t; }
          cols = all.slice(0, ROWS);
          ok = cols[ROWS - 1] !== COLS - 1;             // the wall has no 28th day
          for (var w = 1; w < ROWS && ok; w++) if (Math.abs(cols[w] - cols[w - 1]) < 2) ok = false;
        }
        // then grow one team outwards from each of those days until the month is full
        region = [];
        for (var d = 0; d < COUNT; d++) region.push(-1);
        var edge = [];
        cols.forEach(function (c, row) { region[row * COLS + c] = row; edge.push(row * COLS + c); });
        var left = COUNT - ROWS;
        while (left > 0) {
          var from = edge[Math.floor(Math.random() * edge.length)], pr = Math.floor(from / COLS), pc = from % COLS;
          var near = [[pr - 1, pc], [pr + 1, pc], [pr, pc - 1], [pr, pc + 1]].filter(function (q2) {
            return q2[0] >= 0 && q2[0] < ROWS && q2[1] >= 0 && q2[1] < COLS && q2[0] * COLS + q2[1] < COUNT && region[q2[0] * COLS + q2[1]] === -1;
          });
          if (!near.length) { edge.splice(edge.indexOf(from), 1); continue; }
          var nx = near[Math.floor(Math.random() * near.length)], ni = nx[0] * COLS + nx[1];
          region[ni] = region[from]; edge.push(ni); left--;
        }
        state = region.map(function () { return 0; });
        phase = 'ready'; timeLeft = TIME; ui.win.hidden = true;
        limit(1); check();
      }
      function check() {
        var leads = [];
        bad = {};
        state.forEach(function (s, i) { if (s === 2) leads.push(i); });
        for (var x = 0; x < leads.length; x++) for (var y = x + 1; y < leads.length; y++) {
          var i1 = leads[x], i2 = leads[y], r1 = Math.floor(i1 / COLS), c1 = i1 % COLS, r2 = Math.floor(i2 / COLS), c2 = i2 % COLS;
          if (r1 === r2 || c1 === c2 || region[i1] === region[i2] || (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1)) bad[i1] = bad[i2] = true;
        }
        var clashes = Object.keys(bad).length;
        if (leads.length === ROWS && !clashes && phase !== 'lost') { phase = 'won'; winGame(); }
        if (phase === 'won') say('Month covered with ' + Math.ceil(timeLeft) + 's to spare');
        else if (phase === 'lost') say('Out of time with ' + (leads.length - clashes) + ' of ' + ROWS + ' weeks covered. Try a new month.');
        else say(leads.length + ' of ' + ROWS + ' on call · ' + Math.ceil(timeLeft) + 's' + (clashes ? ' · ' + clashes + ' in conflict' : ''));
      }
      tool('Clear', function () { if (phase === 'ready' || phase === 'play') { state = state.map(function () { return 0; }); check(); } });
      tool('New month', board);
      board();

      var cal = FORMS[1];
      return {
        title: 'Plan the on-call month', code: 'HR10-LEADS', form: 1, pose: POSES[1], orbit: false,
        rules: 'Each shade is a team. Put one lead on call in every week and from every team, never two on the same weekday, never on days that touch, not even corner to corner. Click once to rule a day out, twice to put a lead on call. ' + TIME + ' seconds.',
        update: function (dt) {
          if (phase !== 'play') return;
          timeLeft -= dt;
          if (timeLeft <= 0) { timeLeft = 0; phase = 'lost'; }
          limit(timeLeft / TIME);
          check();
        },
        apply: function (i, out) {
          var e = cal[i], s = state[i];
          out.quat.set(0, 0, 0, 1);
          out.pos.set(e.p[0] + (bad[i] ? Math.sin(clock * 34 + i) * 0.04 : 0), e.p[1] - 0.55, s === 2 ? 0.5 : s === 1 ? -0.22 : 0);
          out.scl.set(e.s[0], e.s[1], e.s[2]);
          // a lead on call is a red day, the way leave days are red on the wall
          out.col.setHex(s === 2 ? RED : TEAM[region[i]]);
        },
        after: function (g) {
          marks.forEach(function (sp, i) {
            var s = state[i];
            sp.visible = s > 0 && g > 0.6 && !(s === 2 && bad[i] && Math.sin(clock * 16) > 0);
            if (!sp.visible) return;
            sp.material = s === 1 ? mats.out : mats.lead;
            sp.position.copy(blocks[i].mesh.position); sp.position.z += 0.2;
            var size = s === 1 ? 0.5 : 0.7;
            sp.scale.set(size, size, 1);
          });
        },
        down: function (e) { press = { x: e.clientX, y: e.clientY }; return true; },
        up: function (e) {
          var open = phase === 'ready' || phase === 'play';
          if (!press || !e || !open || gmix < 0.9) { press = null; return; }
          var still = Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) < 10;
          press = null;
          var hit = still ? pick(e) : null;
          if (!hit) return;
          var i = hit.object.userData.i;
          phase = 'play';                               // the clock starts with the first click
          state[i] = (state[i] + 1) % 3;
          check();
        },
        dispose: function () {
          marks.forEach(function (sp) { group.remove(sp); });
          Object.keys(mats).forEach(function (k) { mats[k].map.dispose(); mats[k].dispose(); });
        }
      };
    }

    /* ---------- AR Sessions: anchor the session ---------- */
    // The 24 small blocks circling the headset are holograms adrift. Hold the reticle on one
    // until its ring closes and it is anchored. It is meant to be hard:
    //   - the rings spin faster with every anchor, and reverse without warning
    //   - a ring that is not finished drains the moment you slip off
    //   - the red blocks are glitches: brush one and your latest anchor breaks loose
    function anchorGame() {
      var NEED = 14, TIME = 34, HOLD = 0.62, REACH = 30;
      var head = FORMS[2];
      var holo = [], order = [], ptr = null, state = 'ready', timeLeft = TIME, glitchT = 0, stun = 0;
      var dir = 1, dirNow = 1, flipIn = 4.5;
      for (var i = 0; i < 24; i++) {
        var ring = i % 2, n = Math.floor(i / 2);
        holo.push({ ang: (n / 12) * Math.PI * 2, ring: ring, glitch: i % 5 === 0, lock: 0, pinned: false, at: new THREE.Vector3(), tilt: Math.random() * 6 });
      }
      function reset() {
        holo.forEach(function (h) { h.lock = 0; h.pinned = false; });
        order = []; state = 'ready'; timeLeft = TIME; glitchT = 0; stun = 0; dir = dirNow = 1; flipIn = 4.5;
        ui.win.hidden = true;
        limit(1); report();
      }
      function report() {
        if (state === 'ready') say('Move onto the stage to start · anchor ' + NEED + ' in ' + TIME + 's');
        else if (state === 'play') say(order.length + ' of ' + NEED + ' anchored · ' + Math.ceil(timeLeft) + 's');
        else if (state === 'lost') say('Session lost with ' + order.length + ' of ' + NEED + '. Restart and try again.');
        else say('Session anchored with ' + Math.ceil(timeLeft) + 's to spare');
      }
      function where(h, out) {
        var r = (h.ring ? 3.5 : 2.6) * (1 + 0.1 * Math.sin(clock * 1.7 + h.tilt));
        out.set(Math.cos(h.ang) * r, Math.sin(h.ang) * r * (h.ring ? 0.34 : -0.42) + Math.sin(clock * 2.3 + h.tilt) * 0.22, Math.sin(h.ang) * r * 0.8);
      }
      tool('Restart session', reset);
      reset();

      return {
        title: 'Anchor the session', code: 'AR10-ANCHOR', form: 2, pose: [0.16, 0], orbit: false,
        rules: 'Hold your reticle on a drifting hologram until its ring closes. The rings speed up with every anchor and reverse without warning. Red blocks are glitches: touch one and your latest anchor breaks loose.',
        update: function (dt) {
          var playing = state === 'play';
          // faster with every anchor, and a reversal every few seconds
          var pace = playing ? Math.min(3.8, 1.9 + order.length * 0.16) : 1;
          if (playing) {
            timeLeft -= dt; flipIn -= dt; stun = Math.max(0, stun - dt);
            limit(timeLeft / TIME);
            if (flipIn <= 0) { dir = -dir; flipIn = 2.6 + Math.random() * 2.6; }
            if (timeLeft <= 0) { timeLeft = 0; state = 'lost'; }
          }
          dirNow += (dir - dirNow) * Math.min(1, dt * 5);
          var near = null, nearD = REACH;
          var rect = canvas.getBoundingClientRect();
          holo.forEach(function (h, i) {
            if (!h.pinned && state !== 'lost') { h.ang += dt * dirNow * pace * (h.ring ? -0.32 : 0.42); where(h, h.at); }
            if (!ptr || !playing) return;
            blocks[i].mesh.getWorldPosition(tv).project(camera);
            var d = Math.hypot((tv.x * 0.5 + 0.5) * rect.width - ptr.x, (-tv.y * 0.5 + 0.5) * rect.height - ptr.y);
            if (d < nearD && (!h.pinned || h.glitch)) { nearD = d; near = h; }
          });
          if (playing) {
            holo.forEach(function (h) {
              if (h.pinned || h.glitch) return;
              if (h === near && !stun) h.lock += dt / HOLD; else h.lock = Math.max(0, h.lock - dt * 4);
              if (h.lock >= 1) { h.lock = 1; h.pinned = true; order.push(h); }
            });
            if (near && near.glitch) {
              glitchT += dt;
              if (glitchT > 0.16) {
                glitchT = 0; stun = 0.7;
                var lost = order.pop();
                if (lost) { lost.pinned = false; lost.lock = 0; }
                host.classList.remove('is-glitch'); void host.offsetWidth; host.classList.add('is-glitch');
              }
            } else {
              glitchT = 0;
            }
            if (order.length >= NEED) { state = 'won'; winGame(); }
          }
          if (ui.reticle) {
            ui.reticle.style.opacity = ptr ? 1 : 0;
            if (ptr) ui.reticle.style.transform = 'translate(' + ptr.x.toFixed(1) + 'px,' + ptr.y.toFixed(1) + 'px)';
            ui.reticle.style.setProperty('--lock', near && !near.glitch ? near.lock.toFixed(3) : 0);
            ui.reticle.classList.toggle('is-stun', stun > 0);
          }
          report();
        },
        apply: function (i, out) {
          if (i >= 24) {
            var e = head[i];
            out.pos.set(e.p[0], e.p[1], e.p[2]); out.scl.set(e.s[0], e.s[1], e.s[2]); out.quat.set(0, 0, 0, 1); out.col.setHex(e.c);
            return;
          }
          var h = holo[i];
          out.pos.copy(h.at);
          if (h.pinned) {
            // anchored: it stops tumbling and sits flat, like a marker pinned in the room
            out.quat.set(0, 0, 0, 1); out.scl.set(0.62, 0.62, 0.12); out.col.setHex(PAPER);
          } else {
            out.quat.setFromAxisAngle(blocks[i].spin, clock * (h.glitch ? 5 : 1.6) + h.tilt);
            var sz = h.glitch ? 0.4 + 0.08 * Math.sin(clock * 19 + i) : 0.42 + h.lock * 0.22;
            out.scl.set(sz, sz, sz);
            out.col.setHex(h.glitch ? RED : INK);
            if (!h.glitch && h.lock > 0) out.col.lerp(a.setHex(PAPER), h.lock);
          }
        },
        down: function (e) { this.move(e); return true; },
        move: function (e) {
          var r = canvas.getBoundingClientRect();
          ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
          if (state === 'ready' && gmix > 0.9) state = 'play';
        },
        dispose: function () { host.classList.remove('is-glitch'); }
      };
    }

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

    var b = new THREE.Color(), q = new THREE.Quaternion();
    var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    var mix = function (x, y, t) { return x + (y - x) * t; };
    var shown = 0, last = performance.now();

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

      // a game ends by itself when the visitor scrolls on to another project
      if (game) {
        // (not before the page has finished travelling to the game's own project)
        var away = Math.abs(target - game.form);
        if (away < 0.2) game.arrived = true; else if (game.arrived && away > 0.5) endGame();
      }
      var live = game || ghost;
      gmix += ((game ? 1 : 0) - gmix) * (reduced ? 1 : 0.1);
      if (!game && ghost && gmix < 0.004) { gmix = 0; if (ghost.dispose) ghost.dispose(); ghost = null; live = null; }
      if (game) game.update(dt);

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
        if (live) {
          live.apply(i, G);
          blk.mesh.position.lerp(G.pos, gmix);
          blk.mesh.scale.lerp(G.scl, gmix);
          blk.mesh.quaternion.slerp(G.quat, gmix);
          blk.mesh.material.color.lerp(G.col, gmix);
        }
      }
      if (live && live.after) live.after(gmix);

      // the whole model: each project's pose, a slow drift, the pointer, and whatever the visitor dragged
      if (!drag) { yawVel *= 0.94; pitchVel *= 0.9; }
      yaw += yawVel; pitch = Math.max(-1.1, Math.min(1.1, pitch + pitchVel));
      if (!drag && !(game && game.orbit)) pitch *= 0.97;
      var pt = ease(t), calm = 1 - gmix;
      var poseX = mix(POSES[f0][0], POSES[f1][0], pt), poseY = mix(POSES[f0][1], POSES[f1][1], pt);
      if (live) { poseX = mix(poseX, live.pose[0], gmix); poseY = mix(poseY, live.pose[1], gmix); }
      // while a game is on, the model holds still: no pointer sway, no drift
      group.rotation.x = poseX + pitch + hoverY * 0.25 * calm;
      group.rotation.y = poseY + yaw + (hoverX * 0.35 + Math.sin(clock * 0.4) * 0.12) * calm;
      group.position.y = Math.sin(clock * 0.8) * 0.08 * calm;

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
  // The play buttons beside each project start that project's game in this stage
  document.querySelectorAll('[data-game]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-game');
      if (window.__playBlocks) window.__playBlocks(name); else { window.__playQueued = name; go(); }
      // settle the page on that project's stop, so the blocks are fully in its formation
      var stop = { cube: 0, queens: 1, anchor: 2 }[name];
      var tab = document.querySelector('.desk__dock button[data-go="' + stop + '"]');
      if (window.matchMedia('(min-width: 901px)').matches) { if (tab) tab.click(); } else { window.railEased = stop / 2; }
    });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { obs.disconnect(); go(); }
    }, { rootMargin: '800px 0px' }).observe(host);
  } else {
    go();
  }
})();
