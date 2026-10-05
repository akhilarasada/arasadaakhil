(function () {
  var EMAIL = 'arasadaakhil.mail@gmail.com';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Preloader, then hero entrance
  var loader = document.querySelector('.loader');
  function finish() {
    loader.classList.add('done');
    document.body.classList.add('loaded');
    // Hero copy comes in with the name, not on scroll
    document.querySelectorAll('.hero .reveal').forEach(function (el) { el.classList.add('in'); });
  }
  window.addEventListener('load', function () {
    setTimeout(finish, reduced ? 0 : 1100);
  });
  // Never leave the loader up if a resource hangs
  setTimeout(finish, 3500);

  // Stagger index for the animated project visuals
  ['.tiles span', '.hr__person', '.hr__days i'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) { el.style.setProperty('--i', i); });
  });

  // Scroll reveal
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Custom cursor: red block that follows the pointer and reacts to what it is over
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    var cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="cursor__shape"><span class="cursor__label"></span></div>' +
      '<svg class="cursor__blob" viewBox="-42 -42 84 84"><path class="cell"/><path class="membrane"/>' +
      '<circle class="speck" r="1.6"/><circle class="speck" r="1.2"/><circle class="nucleus" r="4.5"/></svg>';
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-cursor');

    var label = cursor.querySelector('.cursor__label');
    var cell = cursor.querySelector('.cell');
    var membrane = cursor.querySelector('.membrane');
    var nucleus = cursor.querySelector('.nucleus');
    var specks = cursor.querySelectorAll('.speck');
    var clock = 0, energy = 0;

    // Amoeba outline: points on a circle whose radius keeps wobbling, some pushed out as
    // pseudopods, joined into one smooth closed curve
    function blobPath(radius, t, wobble) {
      var n = 18, pts = [], i, d = '';
      for (i = 0; i < n; i++) {
        var ang = (i / n) * Math.PI * 2;
        // Rounded lobes (3 and 5 around the body) that swell, shrink and drift
        var r = radius * (1 +
          wobble * 0.24 * (0.65 + 0.35 * Math.sin(t * 2.6)) * Math.sin(3 * ang + t * 1.5) +
          wobble * 0.15 * Math.sin(5 * ang - t * 2.4) +
          wobble * 0.08 * Math.sin(2 * ang + t * 3.3));
        pts.push([Math.cos(ang) * r, Math.sin(ang) * r]);
      }
      for (i = 0; i < n; i++) {
        var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        if (i === 0) d = 'M' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
        d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) + ' ' +
          (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) + ' ' +
          p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
      }
      return d + 'Z';
    }
    var tx = 0, ty = 0, cx = 0, cy = 0, started = false;

    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { cx = tx; cy = ty; started = true; }
      cursor.classList.add('is-on');
    });
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var labelled = t.closest('[data-cursor]');
      var field = t.closest('input[type="text"], input[type="email"], textarea');
      var link = t.closest('a, button, .chip');
      if (labelled) label.textContent = labelled.getAttribute('data-cursor');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.classList.toggle('is-text', !labelled && !!field);
      cursor.classList.toggle('is-link', !labelled && !field && !!link);
    });
    document.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });

    (function tick() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';

      if (cursor.classList.contains('is-link') || cursor.classList.contains('is-label')) {
        // Moving the pointer shakes it harder; it never fully settles
        var speed = Math.min(Math.sqrt((tx - cx) * (tx - cx) + (ty - cy) * (ty - cy)) / 40, 1);
        energy += (speed - energy) * 0.1;
        clock += 0.045 + energy * 0.06;
        var wobble = 1 + energy * 0.9;
        cell.setAttribute('d', blobPath(21, clock, wobble));
        membrane.setAttribute('d', blobPath(17, clock, wobble * 0.9));
        nucleus.setAttribute('cx', (Math.sin(clock * 1.9) * 3.5).toFixed(2));
        nucleus.setAttribute('cy', (Math.cos(clock * 1.4) * 3).toFixed(2));
        specks[0].setAttribute('cx', (9 + Math.sin(clock * 2.6) * 3).toFixed(2));
        specks[0].setAttribute('cy', (-8 + Math.cos(clock * 2.2) * 3).toFixed(2));
        specks[1].setAttribute('cx', (-10 + Math.cos(clock * 2.9) * 2.5).toFixed(2));
        specks[1].setAttribute('cy', (7 + Math.sin(clock * 2.4) * 2.5).toFixed(2));
      }
      requestAnimationFrame(tick);
    })();
  }

  // Certificates: preview follows the pointer on hover, click opens it full size
  var peek = document.querySelector('.cert-peek');
  var peekImg = peek.querySelector('img');
  var box = document.querySelector('.lightbox');
  var boxImg = box.querySelector('img');
  var boxCap = box.querySelector('figcaption');
  var lastCert = null;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function placePeek(e) {
    var w = peek.offsetWidth, h = peek.offsetHeight, gap = 28;
    var x = e.clientX + gap, y = e.clientY - h / 2;
    if (x + w > window.innerWidth - 12) x = e.clientX - gap - w;
    y = Math.max(12, Math.min(y, window.innerHeight - h - 12));
    peek.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }
  function closeBox() {
    box.hidden = true;
    document.body.style.overflow = '';
    if (lastCert) lastCert.focus();
  }

  document.querySelectorAll('.cert').forEach(function (btn) {
    var src = btn.getAttribute('data-cert');
    var name = btn.querySelector('span').textContent;
    if (canHover) {
      btn.addEventListener('mouseenter', function (e) {
        peekImg.src = src;
        peek.classList.add('is-on');
        placePeek(e);
      });
      btn.addEventListener('mousemove', placePeek);
      btn.addEventListener('mouseleave', function () { peek.classList.remove('is-on'); });
    }
    btn.addEventListener('click', function () {
      lastCert = btn;
      peek.classList.remove('is-on');
      boxImg.src = src;
      boxImg.alt = name + ' certificate';
      boxCap.textContent = name;
      box.hidden = false;
      document.body.style.overflow = 'hidden';
      box.querySelector('.lightbox__close').focus();
    });
  });
  box.addEventListener('click', function (e) {
    if (e.target !== boxImg) closeBox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !box.hidden) closeBox();
  });

  // Contact form -> opens the visitor's mail client with a prefilled message
  var form = document.getElementById('contact-form');
  var note = form.querySelector('.form__note');
  var sendBtn = form.querySelector('.btn');
  function setNote(text, state) {
    note.textContent = text;
    note.className = 'form__note' + (state ? ' is-' + state : '');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    if (data.get('_honey')) return; // bots fill the hidden field
    var subject = data.get('reason') + ' — ' + data.get('name');

    sendBtn.disabled = true;
    setNote('Sending…');

    // FormSubmit relays the form to the inbox as an email
    fetch('https://formsubmit.co/ajax/' + EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        email: data.get('email'),
        reason: data.get('reason'),
        message: data.get('message'),
        _subject: 'Portfolio: ' + subject,
        _template: 'table'
      })
    })
      .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
      .then(function (r) {
        if (!r.ok || String(r.json.success) !== 'true') throw new Error(r.json.message || 'Send failed');
        form.reset();
        setNote('Thanks, your message is sent. I will get back to you soon.', 'ok');
      })
      .catch(function () {
        // Fall back to the visitor's own mail app so the message is not lost
        var body = data.get('message') + '\n\n' + data.get('name') + '\n' + data.get('email');
        setNote('Could not send from here. Opening your email app instead.', 'error');
        window.location.href = 'mailto:' + EMAIL +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      })
      .then(function () { sendBtn.disabled = false; });
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
