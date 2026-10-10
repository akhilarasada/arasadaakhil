// Resume, project brief and contact backdrop.
//   Resume  -> the page tilts toward the pointer, its contents list lights up the matching part
//              of the page, and the PDF opens in a reader without leaving the site
//   Brief   -> pick what you need, for whom and when; the site writes the first message for you
//   Contact -> slow amoebas (the cursor's shape) live in the dark behind the form

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Put a ready-made message into the contact form and take the visitor there
  window.portfolioBrief = function (text) {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var box = form.querySelector('textarea[name="message"]');
    var reason = form.querySelector('input[name="reason"][value="Freelance project"]');
    if (reason) reason.checked = true;
    box.value = text;
    form.classList.add('is-filled');
    setTimeout(function () { form.classList.remove('is-filled'); }, 1800);
    document.getElementById('contact').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    setTimeout(function () { form.querySelector('input[name="name"]').focus({ preventScroll: true }); }, 900);
  };

  /* ---------- Resume ---------- */
  var paper = document.querySelector('.paper');
  var resume = document.querySelector('.resume__grid');
  if (paper && resume) {
    if (fine && !reduced) {
      resume.addEventListener('pointermove', function (e) {
        var r = paper.getBoundingClientRect();
        var nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.9)));
        var ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.9)));
        paper.style.setProperty('--ry', (nx * 13).toFixed(2) + 'deg');
        paper.style.setProperty('--rx', (-ny * 10).toFixed(2) + 'deg');
        paper.style.setProperty('--sx', (50 + nx * 60).toFixed(1) + '%');
        paper.classList.add('is-tilt');
      });
      resume.addEventListener('pointerleave', function () { paper.classList.remove('is-tilt'); });
    }
    document.querySelectorAll('.resume__toc [data-zone]').forEach(function (row) {
      var zone = row.getAttribute('data-zone').split(',');
      var on = function () {
        paper.style.setProperty('--zt', zone[0] + '%');
        paper.style.setProperty('--zh', (zone[1] - zone[0]) + '%');
        paper.classList.add('has-zone');
      };
      var off = function () { paper.classList.remove('has-zone'); };
      row.addEventListener('pointerenter', on); row.addEventListener('focus', on);
      row.addEventListener('pointerleave', off); row.addEventListener('blur', off);
    });

    // The reader: the PDF in a sheet over the page. Phones open the file itself instead,
    // because most of them will not draw a PDF inside a page.
    var reader = null;
    function openReader(page) {
      if (!reader) {
        reader = document.createElement('div');
        reader.className = 'reader';
        reader.setAttribute('role', 'dialog');
        reader.setAttribute('aria-modal', 'true');
        reader.setAttribute('aria-label', 'Resume');
        reader.innerHTML = '<div class="reader__bar"><span>Arasada Akhil · Resume</span>' +
          '<a href="assets/Arasada-Akhil-Resume.pdf" download="Arasada-Akhil-Resume.pdf">Download ↓</a>' +
          '<button type="button">Close ✕</button></div><iframe title="Resume"></iframe>';
        document.body.appendChild(reader);
        reader.querySelector('button').addEventListener('click', closeReader);
        reader.addEventListener('click', function (e) { if (e.target === reader) closeReader(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeReader(); });
      }
      reader.querySelector('iframe').src = 'assets/Arasada-Akhil-Resume.pdf#page=' + page + '&view=FitH';
      reader.hidden = false;
      document.documentElement.classList.add('is-arcade');
      requestAnimationFrame(function () { reader.classList.add('is-open'); });
      if (window.portfolioTrack) window.portfolioTrack('event', 'Resume read on site');
    }
    function closeReader() {
      if (!reader || reader.hidden) return;
      reader.classList.remove('is-open');
      document.documentElement.classList.remove('is-arcade');
      setTimeout(function () { reader.hidden = true; }, 300);
    }
    document.querySelectorAll('[data-read]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!fine) return;
        e.preventDefault();
        openReader(a.getAttribute('data-read') || '1');
      });
    });
  }

  /* ---------- Project brief ---------- */
  var brief = document.getElementById('brief');
  if (brief) {
    var line = document.getElementById('brief-line'), send = document.getElementById('brief-send');
    var needs = document.querySelectorAll('.offer__card input');
    var picked = function (name) { var i = brief.querySelector('input[name="' + name + '"]:checked'); return i ? i.value : ''; };
    var sentence = function () {
      var list = [].filter.call(needs, function (i) { return i.checked; }).map(function (i) { return i.value; });
      if (!list.length) return '';
      var what = list.length === 1 ? list[0] : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
      return 'I need ' + what + ' for ' + picked('who') + ', ' + picked('when') + '.';
    };
    var update = function () {
      var s = sentence();
      brief.classList.toggle('is-ready', !!s);
      line.textContent = s || 'Pick one or more of the three above and I will write the brief for you.';
      send.firstChild.textContent = s ? 'Send this brief ' : 'Discuss a project ';
    };
    [].forEach.call(needs, function (i) { i.addEventListener('change', update); });
    brief.addEventListener('change', update);
    send.addEventListener('click', function () {
      var s = sentence();
      if (s) window.portfolioBrief(s + '\n\nA little more about it: ');
      else document.getElementById('contact').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
    update();
  }

  /* ---------- Contact: amoebas ---------- */
  var contact = document.querySelector('.contact');
  if (contact) {
    var canvas = document.createElement('canvas');
    canvas.className = 'contact__amoebas';
    canvas.setAttribute('aria-hidden', 'true');
    contact.insertBefore(canvas, contact.firstChild);
    var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, seen = false, ptr = null;
    // x, y as a share of the section; r as a share of its shorter side
    var CELLS = [
      { x: 0.80, y: 0.20, r: 0.30, fill: 'rgba(209,36,36,0.13)', line: 'rgba(209,36,36,0.55)', seed: 1.3, follow: 0.035, core: true },
      { x: 0.14, y: 0.62, r: 0.22, fill: 'rgba(239,238,235,0.035)', line: 'rgba(239,238,235,0.22)', seed: 4.1, follow: 0.012, core: true },
      { x: 0.58, y: 0.82, r: 0.13, fill: 'rgba(239,238,235,0)', line: 'rgba(239,238,235,0.16)', seed: 7.7, follow: 0, core: false },
      { x: 0.40, y: 0.10, r: 0.07, fill: 'rgba(209,36,36,0)', line: 'rgba(209,36,36,0.4)', seed: 9.2, follow: 0, core: false }
    ];
    CELLS.forEach(function (c) { c.ox = 0; c.oy = 0; });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = contact.clientWidth; H = contact.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    function blob(cx, cy, r, seed, t) {
      var N = 14, pts = [];
      for (var i = 0; i < N; i++) {
        var a = (i / N) * Math.PI * 2;
        var k = 1 + 0.16 * Math.sin(a * 2 + t * 0.7 + seed) + 0.10 * Math.sin(a * 3 - t * 1.1 + seed * 2) + 0.06 * Math.sin(a * 5 + t * 1.6 + seed * 3);
        pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
      }
      ctx.beginPath();
      for (var j = 0; j < N; j++) {
        var p = pts[j], q = pts[(j + 1) % N], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        if (!j) { var z = pts[N - 1]; ctx.moveTo((z[0] + p[0]) / 2, (z[1] + p[1]) / 2); }
        ctx.quadraticCurveTo(p[0], p[1], mx, my);
      }
      ctx.closePath();
    }
    function draw(now) {
      var t = now / 1000, unit = Math.min(W, H);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      CELLS.forEach(function (c) {
        var hx = c.x * W + Math.sin(t * 0.21 + c.seed) * unit * 0.05, hy = c.y * H + Math.cos(t * 0.17 + c.seed) * unit * 0.05;
        // the nearer cells lean toward the pointer, the way the cursor's amoeba reaches for things
        var tx = ptr && c.follow ? (ptr.x - hx) * 0.22 : 0, ty = ptr && c.follow ? (ptr.y - hy) * 0.22 : 0;
        c.ox += (tx - c.ox) * (c.follow || 0.02); c.oy += (ty - c.oy) * (c.follow || 0.02);
        var cx = hx + c.ox, cy = hy + c.oy, r = c.r * unit;
        blob(cx, cy, r, c.seed, t);
        ctx.fillStyle = c.fill; ctx.fill();
        ctx.strokeStyle = c.line; ctx.lineWidth = 1.4; ctx.stroke();
        if (c.core) {
          // nucleus and a couple of vacuoles, drifting inside the cell
          blob(cx + Math.sin(t * 0.5 + c.seed) * r * 0.18, cy + Math.cos(t * 0.4 + c.seed) * r * 0.16, r * 0.2, c.seed + 2, t * 1.4);
          ctx.fillStyle = c.line; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
          for (var v = 0; v < 3; v++) {
            ctx.beginPath();
            ctx.arc(cx + Math.cos(t * 0.3 + v * 2.1 + c.seed) * r * 0.5, cy + Math.sin(t * 0.36 + v * 2.1 + c.seed) * r * 0.45, r * (0.035 + v * 0.012), 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
    }
    resize();
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(contact);
    contact.addEventListener('pointermove', function (e) {
      var r = contact.getBoundingClientRect();
      ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    contact.addEventListener('pointerleave', function () { ptr = null; });
    if (reduced) {
      draw(0);
    } else {
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { seen = en[0].isIntersecting; }).observe(contact); else seen = true;
      (function loop(now) { requestAnimationFrame(loop); if (seen && !document.hidden) draw(now); })(0);
    }
  }
})();
