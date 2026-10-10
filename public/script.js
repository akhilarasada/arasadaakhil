(function () {
  var EMAIL = 'arasadaakhil.mail@gmail.com';      // inbox the contact form delivers to
  var PUBLIC_EMAIL = 'contact@arasadaakhil.website'; // address shown to visitors
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Visit tracking for /dashboard: no cookies, sent in the background after the
  // page is up. Skipped on local previews.
  var isLive = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.protocol !== 'file:';
  var consent = null, waiting = [];
  try { consent = localStorage.getItem('consent'); } catch (e) { /* private mode */ }
  function track(type, name, extra) {
    if (!isLive || consent === 'no') return;
    try {
      var payload = {
        type: type, name: name || null, path: location.pathname,
        ref: document.referrer, w: window.innerWidth, h: window.innerHeight,
        lang: navigator.language || ''
      };
      if (extra) for (var key in extra) payload[key] = extra[key];
      var data = JSON.stringify(payload);
      // Until the visitor answers the consent box, events wait here
      if (consent !== 'yes') { if (waiting.length < 30) waiting.push(data); return; }
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', data);
      else fetch('/api/track', { method: 'POST', body: data, keepalive: true });
    } catch (e) { /* tracking must never break the page */ }
  }
  window.portfolioTrack = track;   // used by os.js
  window.addEventListener('load', function () { track('pageview'); });

  // Time on page and how far down the visitor scrolled, sent when they leave or switch tab
  var startedAt = Date.now(), deepest = 0;
  window.addEventListener('scroll', function () {
    var full = document.documentElement.scrollHeight - window.innerHeight;
    if (full > 0) deepest = Math.max(deepest, Math.min(100, Math.round((window.scrollY / full) * 100)));
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      track('leave', null, { dur: Math.round((Date.now() - startedAt) / 1000), scroll: deepest });
    }
  });

  // Which sections the visitor actually reached, each reported once
  var SECTION_NAMES = {
    about: 'About', work: 'Work', freelance: 'Freelance', experience: 'Experience', skills: 'Skillset',
    resume: 'Resume', mcp: 'MCP', projects: 'Projects offer', contact: 'Contact'
  };
  if (isLive && 'IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        track('event', 'Section: ' + SECTION_NAMES[entry.target.id]);
        seen.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -40% 0px' });
    Object.keys(SECTION_NAMES).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) seen.observe(el);
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (/\.pdf$/i.test(href)) track('event', a.hasAttribute('download') ? 'Resume download' : 'Resume preview');
    else if (/^mailto:/i.test(href)) track('event', 'Email click');
    else if (/^tel:/i.test(href)) track('event', 'Phone click');
    else if (/^https?:/i.test(href) && a.hostname !== location.hostname) track('event', 'Visit: ' + a.hostname.replace(/^www\./, ''));
  });

  // Preloader, then hero entrance
  var loader = document.querySelector('.loader');
  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    loader.classList.add('done');
    document.body.classList.add('loaded');
    // Hero copy comes in with the name, not on scroll
    document.querySelectorAll('.hero .reveal').forEach(function (el) { el.classList.add('in'); });

    // One ripple crosses the whole hero from left to right. Each letter of the name appears as
    // the ripple reaches it, red while the ripple is on it and black once it has passed. The same
    // ripple carries straight on into the photo and uncovers it, so name and photo arrive together.
    var portrait = document.querySelector('.hero__portrait');
    var letters = Array.prototype.slice.call(document.querySelectorAll('.hero__title .hl'));
    portrait.classList.add('is-shown');
    if (reduced) {
      letters.forEach(function (el) { el.classList.add('is-hit', 'is-done'); });
      if (window.Liquid) window.Liquid.show();
      return;
    }
    var pr = portrait.getBoundingClientRect();
    // Letters that sit on the dark figure need true red: the title is drawn in "difference",
    // which turns the usual teal into red on the pale page but would leave it teal over the photo
    var figureLeft = pr.left + pr.width * 0.36, figureRight = pr.left + pr.width * 0.70;
    var spans = letters.map(function (el) {
      var r = el.getBoundingClientRect(), mid = (r.left + r.right) / 2;
      return { el: el, left: r.left, right: r.right, onFigure: mid > figureLeft && mid < figureRight };
    });
    var from = Math.min(pr.left, spans.length ? spans[0].left : 0) - 30;
    var to = Math.max(pr.right, spans.length ? spans[spans.length - 1].right : 0) + pr.width * 0.25;
    var tail = window.innerWidth * 0.07;          // how long a letter stays red behind the ripple
    var SWEEP_MS = 2900, FADE_MS = 700, began = performance.now();
    (function sweep(now) {
      var t = Math.min(1, (now - began) / SWEEP_MS);
      // steady across the name, easing off as it leaves the photo
      var x = from + (to - from) * (1 - Math.pow(1 - t, 1.6));
      for (var i = 0; i < spans.length; i++) {
        var s = spans[i];
        if (x >= s.left) s.el.classList.add('is-hit');
        if (s.onFigure && x >= s.right) s.el.classList.add('is-over');   // the photo is under it now
        if (x >= s.right + tail) s.el.classList.add('is-done');
      }
      var fade = Math.max(0, (now - began - SWEEP_MS) / FADE_MS);
      if (window.Liquid) window.Liquid.setFront(x, Math.max(0, 1 - fade));
      if (fade < 1) requestAnimationFrame(sweep);
      else letters.forEach(function (el) { el.classList.add('is-hit', 'is-done'); });
    })(began);
  }

  // The loader tells the story of the logo. The name is shown with its two initials in red and
  // tries on one typeface at a time. When the page is ready it settles into the site's own face,
  // the other letters tuck in behind their initial and vanish, and what is left ("AA" and the
  // block) turns black and travels to the top-left corner, where it becomes the site's logo.
  var FACES = [
    ['Abril Fatface', '"Abril Fatface", serif'], ['Bebas Neue', '"Bebas Neue", sans-serif'],
    ['Playfair Display', 'italic 700 1em "Playfair Display", serif'], ['Rubik Mono One', '"Rubik Mono One", sans-serif'],
    ['Monoton', '"Monoton", sans-serif'], ['Permanent Marker', '"Permanent Marker", cursive'],
    ['Unifraktur', '"UnifrakturMaguntia", serif'], ['Press Start 2P', '"Press Start 2P", monospace'],
    ['Anton', '"Anton", sans-serif'], ['Lobster', '"Lobster", cursive'],
    ['Bungee Shade', '"Bungee Shade", sans-serif'], ['Righteous', '"Righteous", sans-serif'],
    ['Rye', '"Rye", serif'], ['Special Elite', '"Special Elite", monospace'],
    ['Bangers', '"Bangers", cursive'], ['Pacifico', '"Pacifico", cursive'],
    ['Major Mono', '"Major Mono Display", monospace'], ['Fredericka', '"Fredericka the Great", serif'],
    ['Courier', '"Courier New", monospace'], ['Georgia', 'italic 700 1em Georgia, serif']
  ];
  var mark = loader.querySelector('.loader__mark');
  var fontLabel = document.getElementById('loader-font');
  var hasLetters = false;
  document.querySelectorAll('[data-shuffle]').forEach(function (word) {
    var text = word.textContent;
    word.textContent = '';
    text.split('').forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = i === 0 ? 'lt lt--cap' : 'lt lt--rest';
      span.textContent = ch;
      // the furthest letters leave first, so each word closes up toward its initial
      span.style.transitionDelay = ((text.length - 1 - i) * 0.045).toFixed(3) + 's';
      word.appendChild(span);
      hasLetters = true;
    });
  });

  var pageReady = false, shuffleStart = Date.now(), faceIndex = 0, shuffleTimer = null;
  function showFace(face) {
    // entries are either a family list or a full font shorthand
    if (face && /\d/.test(face[1].split('"')[0])) { mark.style.fontFamily = ''; mark.style.font = face[1]; }
    else { mark.style.font = ''; mark.style.fontFamily = face ? face[1] : ''; }
    if (fontLabel) fontLabel.textContent = face ? face[0] : 'Funnel Display';
  }
  function settle() {
    clearInterval(shuffleTimer);
    showFace(null);
    setTimeout(function () {
      loader.classList.add('is-collapsing');            // letters tuck in behind the two initials
    }, 260);
    setTimeout(function () {
      // fly the remaining mark onto the logo in the top-left corner
      var logo = document.querySelector('.nav__logo');
      var to = logo.getBoundingClientRect(), from = mark.getBoundingClientRect();
      var scale = parseFloat(getComputedStyle(logo).fontSize) / parseFloat(getComputedStyle(mark).fontSize);
      var dx = to.left - from.left;
      // the mark scales about its own left-centre, so line the two centres up
      var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      loader.classList.add('is-flying');
      mark.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + scale.toFixed(4) + ')';
    }, 260 + 820);
    setTimeout(finish, 260 + 820 + 900);
  }
  if (reduced || !hasLetters) {
    window.addEventListener('load', finish);
  } else {
    shuffleTimer = setInterval(function () {
      if (pageReady && Date.now() - shuffleStart > 1900) { settle(); return; }
      showFace(FACES[faceIndex++ % FACES.length]);
    }, 85);
    window.addEventListener('load', function () { pageReady = true; });
  }
  // Never leave the loader up if a resource hangs
  setTimeout(function () { pageReady = true; }, 3500);
  setTimeout(finish, 8000);

  // Stagger index for the animated project visuals
  ['.tiles span', '.hr__person', '.hr__days i'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) { el.style.setProperty('--i', i); });
  });

  // Intro: split the paragraph into words that light up with scroll
  var wordsEl = document.querySelector('[data-words]');
  if (wordsEl) {
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var span = document.createElement('span');
            span.className = 'w';
            span.textContent = part;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          split(child);
        }
      });
    })(wordsEl);
    var words = wordsEl.querySelectorAll('.w');
    var lightWords = function () {
      var r = wordsEl.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 when the paragraph top reaches 85% of the screen, 1 when its bottom reaches 45%
      var progress = (vh * 0.85 - r.top) / (r.height + vh * 0.4);
      var lit = reduced ? words.length : Math.round(Math.max(0, Math.min(1, progress)) * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < lit);
    };
    window.addEventListener('scroll', lightWords, { passive: true });
    window.addEventListener('resize', lightWords);
    lightWords();
  }

  // Stats: count up from zero when they come into view
  var counters = document.querySelectorAll('[data-count]');
  function countUp(el) {
    var end = +el.getAttribute('data-count'), start = null;
    if (reduced) { el.textContent = end; return; }
    requestAnimationFrame(function step(ts) {
      if (start === null) start = ts;
      var t = Math.max(0, Math.min((ts - start) / 1400, 1));
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    });
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { el.textContent = '0'; cio.observe(el); });
  }

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

    // Everything a visitor can press, grab or that reacts to hovering turns the dot into the amoeba
    var ACTIVE = 'a, button, .chip, summary, .pill, .skill, .about3__stats li, .exp__row, ' +
      '.hero__title .hl, .bigname .ch, .win__bar, .badge3d.is-over';
    var under = null;
    function readHover() {
      var t = under;
      if (!t || !t.closest) return;
      var labelled = t.closest('[data-cursor]');
      var field = t.closest('input[type="text"], input[type="email"], textarea');
      var link = t.closest(ACTIVE);
      if (labelled) label.textContent = labelled.getAttribute('data-cursor');
      cursor.classList.toggle('is-label', !!labelled);
      cursor.classList.toggle('is-text', !labelled && !!field);
      cursor.classList.toggle('is-link', !labelled && !field && !!link);
    }
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { cx = tx; cy = ty; started = true; }
      cursor.classList.add('is-on');
      // Checked on every move, not only on entering an element, because some targets
      // (the 3D badge inside its canvas) become active without the pointer leaving them
      under = e.target;
      readHover();
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

  /* ---------- page-wide motion ---------- */
  var docEl = document.documentElement;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var wide = function () { return window.innerWidth > 900; };

  // Local time in Hyderabad, in the hero
  var clockEl = document.getElementById('clock');
  if (clockEl) {
    var tick = function () {
      try {
        clockEl.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      } catch (e) { /* older browsers keep the dashes */ }
    };
    tick();
    setInterval(tick, 20000);
  }

  // The hero name is split into letters so each can run in from the left and react to the pointer
  document.querySelectorAll('.hero__title .line > span').forEach(function (line) {
    var text = line.textContent;
    line.textContent = '';
    line.setAttribute('aria-label', text);
    text.split('').forEach(function (ch) {
      var span = document.createElement('span');
      span.className = 'hl';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch;
      line.appendChild(span);
    });
  });

  // Nav links roll their text on hover
  document.querySelectorAll('.nav__links a').forEach(function (a) {
    var text = a.textContent;
    a.innerHTML = '<span class="roll"><span data-text="' + text + '">' + text + '</span></span>';
  });

  // The big name at the foot rises letter by letter
  document.querySelectorAll('[data-letters]').forEach(function (el) {
    var text = el.textContent;
    el.textContent = '';
    text.split('').forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch === ' ' ? '\u00a0' : ch;
      span.style.transitionDelay = (i * 0.035) + 's';
      el.appendChild(span);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { el.classList.add('in'); obs.disconnect(); }
      }, { threshold: 0.3 }).observe(el);
    } else {
      el.classList.add('in');
    }
  });

  // Buttons lean toward the pointer when it is close
  if (finePointer && !reduced) {
    document.querySelectorAll('.btn, .link-btn, .nav__invert, .nav__cta').forEach(function (el) {
      el.setAttribute('data-magnetic', '');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - (r.left + r.width / 2)) * 0.28).toFixed(1) + 'px');
        el.style.setProperty('--my', ((e.clientY - (r.top + r.height / 2)) * 0.36).toFixed(1) + 'px');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  // Hero depth: the portrait drifts against the pointer and swells as you scroll away
  var heroEl = document.querySelector('.hero');
  var depth = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer && !reduced) {
    heroEl.addEventListener('mousemove', function (e) {
      depth.tx = (e.clientX / window.innerWidth - 0.5) * -26;
      depth.ty = (e.clientY / window.innerHeight - 0.5) * -18;
    });
    heroEl.addEventListener('mouseleave', function () { depth.tx = 0; depth.ty = 0; });
  }

  // Work rail: vertical scroll is turned into sideways travel while the section is pinned
  var rail = document.querySelector('.rail');
  var railTrack = document.querySelector('.rail__track');
  var railNow = document.getElementById('rail-now');
  var railCount = railTrack ? railTrack.children.length : 0;
  var dockButtons = document.querySelectorAll('.desk__dock button');
  var blocksCaption = document.getElementById('blocks-caption');
  // What the 3D blocks are showing for each project
  var CAPTIONS = [
    ['25+ modules', 'locked into one platform'],
    ['A month of attendance', 'weekends pale, leave in red'],
    ['Objects in space', 'around the headset']
  ];
  var shownApp = -1;
  function showApp(i) {
    if (i === shownApp) return;
    shownApp = i;
    dockButtons.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
    if (blocksCaption && CAPTIONS[i]) {
      blocksCaption.firstElementChild.textContent = CAPTIONS[i][0];
      blocksCaption.lastElementChild.textContent = CAPTIONS[i][1];
    }
    if (!wide()) window.railEased = i / (railCount - 1);
    railNow.textContent = ('0' + (i + 1)).slice(-2);
  }
  // Clicking an app in the dock scrolls the page to that project's stop
  dockButtons.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      var r = rail.getBoundingClientRect();
      var travel = r.height - window.innerHeight;
      window.scrollTo({ top: r.top + window.scrollY + travel * (i / (railCount - 1)), behavior: reduced ? 'auto' : 'smooth' });
    });
  });
  // On small screens nothing is pinned, so the screen follows whichever project is in view
  if ('IntersectionObserver' in window && railTrack) {
    var appWatch = new IntersectionObserver(function (entries) {
      if (wide()) return;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) showApp(Array.prototype.indexOf.call(railTrack.children, entry.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    Array.prototype.forEach.call(railTrack.children, function (el) { appWatch.observe(el); });
  }

  // About statement
  var aboutEl = document.querySelector('.about2');

  // Stack: skills are physical pills that fall into a pile and can be picked up and thrown
  var pileEl = document.getElementById('pile');
  var pile = null;
  function buildPile() {
    var M = window.Matter;
    if (!M || !pileEl || reduced) return;
    var pills = Array.prototype.slice.call(pileEl.querySelectorAll('.pill'));
    // Measure while they are still laid out normally
    var sizes = pills.map(function (el) { return { w: el.offsetWidth, h: el.offsetHeight }; });
    var W = pileEl.clientWidth, H = pileEl.clientHeight;
    pileEl.classList.add('is-live');

    var engine = M.Engine.create();
    engine.gravity.y = 1.1;
    var wall = { isStatic: true, friction: 0.6 };
    M.Composite.add(engine.world, [
      M.Bodies.rectangle(W / 2, H + 50, W + 400, 100, wall),
      // a lid, so nothing can be thrown or jolted out of the top
      M.Bodies.rectangle(W / 2, -50, W + 400, 100, wall),
      M.Bodies.rectangle(-50, H / 2 - 600, 100, H + 2400, wall),
      M.Bodies.rectangle(W + 50, H / 2 - 600, 100, H + 2400, wall)
    ]);
    var bodies = pills.map(function (el, i) {
      var s = sizes[i];
      var body = M.Bodies.rectangle(
        // Spread across the box and already inside it, so the skills are on screen at once
        // and tumble into a heap, instead of arriving one by one from far above
        Math.max(s.w / 2 + 8, Math.min(W - s.w / 2 - 8, ((i % 6) + 0.5) * (W / 6) + (Math.random() - 0.5) * 60)),
        s.h / 2 + 10 + Math.floor(i / 6) * (H * 0.13) + Math.random() * 14,
        s.w, s.h,
        { chamfer: { radius: s.h / 2 - 1 }, restitution: 0.35, friction: 0.5, frictionAir: 0.012, angle: (Math.random() - 0.5) * 0.9 }
      );
      return body;
    });
    M.Composite.add(engine.world, bodies);

    // Dragging with a mouse; touch and the wheel are left alone so the page still scrolls
    var mouse = M.Mouse.create(pileEl);
    ['wheel', 'mousewheel', 'DOMMouseScroll'].forEach(function (type) { pileEl.removeEventListener(type, mouse.mousewheel); });
    ['touchstart', 'touchmove', 'touchend'].forEach(function (type) {
      pileEl.removeEventListener(type, mouse.mousedown);
      pileEl.removeEventListener(type, mouse.mousemove);
      pileEl.removeEventListener(type, mouse.mouseup);
    });
    M.Composite.add(engine.world, M.MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.18, damping: 0.1 } }));

    // Place them straight away so there is never a frame with every pill stacked in the corner
    bodies.forEach(function (body, i) {
      pills[i].style.transform = 'translate3d(' + (body.position.x - sizes[i].w / 2).toFixed(1) + 'px,' +
        (body.position.y - sizes[i].h / 2).toFixed(1) + 'px,0) rotate(' + body.angle.toFixed(3) + 'rad)';
    });

    pile = { M: M, engine: engine, bodies: bodies, pills: pills, sizes: sizes, visible: true };
  }
  if (pileEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var inView = entries[0].isIntersecting;
      if (inView && !pile) buildPile();
      if (pile) pile.visible = inView;
    }, { threshold: 0.05 }).observe(pileEl);
  }
  // A change of width would leave the walls in the wrong place, so start the pile again
  var pileResize;
  window.addEventListener('resize', function () {
    if (!pile) return;
    clearTimeout(pileResize);
    pileResize = setTimeout(function () {
      pile.pills.forEach(function (el) { el.style.transform = ''; });
      pileEl.classList.remove('is-live');
      pile = null;
      buildPile();
    }, 300);
  });
  var pileLastY = window.scrollY;

  (function motion() {
    var y = window.scrollY, vh = window.innerHeight;
    var full = docEl.scrollHeight - vh;
    docEl.style.setProperty('--progress', full > 0 ? Math.min(1, y / full).toFixed(4) : '0');

    if (!reduced) {
      // About: the statement's lines slide as it passes through the screen
      if (aboutEl) {
        var ab = aboutEl.querySelector('.about2__statement').getBoundingClientRect();
        if (ab.bottom > 0 && ab.top < vh) {
          aboutEl.style.setProperty('--t', (((vh - ab.top) / (vh + ab.height)) * 2 - 1).toFixed(4));
        }
      }

      // Pile: step the physics, and let a hard scroll jolt the pills
      if (pile && pile.visible) {
        var jolt = y - pileLastY;
        if (Math.abs(jolt) > 26) {
          pile.bodies.forEach(function (b) {
            pile.M.Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.02 * b.mass, y: -Math.min(0.022, Math.abs(jolt) * 0.0005) * b.mass });
          });
        }
        pile.M.Engine.update(pile.engine, 1000 / 60);
        for (var pi = 0; pi < pile.bodies.length; pi++) {
          var pb = pile.bodies[pi], ps = pile.sizes[pi];
          pile.pills[pi].style.transform = 'translate3d(' + (pb.position.x - ps.w / 2).toFixed(1) + 'px,' + (pb.position.y - ps.h / 2).toFixed(1) + 'px,0) rotate(' + pb.angle.toFixed(3) + 'rad)';
        }
      }
      pileLastY = y;

      // Hero
      depth.x += (depth.tx - depth.x) * 0.07;
      depth.y += (depth.ty - depth.y) * 0.07;
      var out = Math.min(1, y / vh);
      heroEl.style.setProperty('--px', depth.x.toFixed(2) + 'px');
      heroEl.style.setProperty('--py', (depth.y + out * 60).toFixed(2) + 'px');
      heroEl.style.setProperty('--ps', (1 + out * 0.14).toFixed(4));
      heroEl.style.setProperty('--bx', (depth.x * -0.6).toFixed(2) + 'px');
      heroEl.style.setProperty('--by', (depth.y * -0.6).toFixed(2) + 'px');

      // Rail
      if (rail && wide()) {
        var r = rail.getBoundingClientRect();
        var travel = r.height - vh;
        var t = travel > 0 ? Math.max(0, Math.min(1, -r.top / travel)) : 0;
        var distance = railTrack.scrollWidth - railTrack.parentNode.clientWidth;
        // Rest on each project, then glide to the next, instead of sliding the whole time
        var along = t * (railCount - 1), whole = Math.min(railCount - 2, Math.floor(along));
        var part = Math.max(0, Math.min(1, (along - whole - 0.3) / 0.4));
        var eased = (whole + part * part * (3 - 2 * part)) / (railCount - 1);
        window.railEased = eased;   // blocks.js follows this
        railTrack.style.transform = 'translate3d(' + (-eased * distance).toFixed(1) + 'px,0,0)';
        rail.style.setProperty('--rail', t.toFixed(4));
        showApp(Math.round(t * (railCount - 1)));
      } else if (railTrack) {
        railTrack.style.transform = '';
      }
    }
    requestAnimationFrame(motion);
  })();

  // Invert: flips the whole site to its negative, flooding out from where you clicked
  var invertBtn = document.getElementById('invert');
  var rootEl = document.documentElement;
  function setInvert(on) {
    rootEl.toggleAttribute('data-invert', on);
    invertBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    try { localStorage.setItem('invert', on ? '1' : '0'); } catch (e) { /* private mode */ }
  }
  invertBtn.setAttribute('aria-pressed', rootEl.hasAttribute('data-invert') ? 'true' : 'false');
  invertBtn.addEventListener('click', function (e) {
    var on = !rootEl.hasAttribute('data-invert');
    track('event', 'Invert ' + (on ? 'on' : 'off'));
    if (!document.startViewTransition || reduced) { setInvert(on); return; }
    var x = e.clientX || window.innerWidth - 40, y = e.clientY || 30;
    var reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.startViewTransition(function () { setInvert(on); }).ready.then(function () {
      rootEl.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + reach + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 1100, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  // Scroll speed: headings lean into the motion and the stack strip speeds up and reverses
  if (!reduced) {
    var strips = document.querySelectorAll('.marquee__inner');
    var lastY = window.scrollY, speed = 0, direction = 1;
    (function feel() {
      var y = window.scrollY, delta = y - lastY;
      lastY = y;
      speed += (delta - speed) * 0.12;
      if (Math.abs(delta) > 1) direction = delta > 0 ? 1 : -1;
      var lean = Math.max(-3.5, Math.min(3.5, speed * 0.06));
      rootEl.style.setProperty('--lean', lean.toFixed(3) + 'deg');
      var rate = direction * (1 + Math.min(7, Math.abs(speed) * 0.09));
      strips.forEach(function (strip) {
        var anims = strip.getAnimations ? strip.getAnimations() : [];
        if (anims[0]) anims[0].playbackRate = strip.parentNode.hasAttribute('data-reverse') ? -rate : rate;
      });
      requestAnimationFrame(feel);
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
        track('event', 'Contact form sent');
        setNote('Thanks, your message is sent. I will get back to you soon.', 'ok');
      })
      .catch(function () {
        // Fall back to the visitor's own mail app so the message is not lost
        var body = data.get('message') + '\n\n' + data.get('name') + '\n' + data.get('email');
        setNote('Could not send from here. Opening your email app instead.', 'error');
        window.location.href = 'mailto:' + PUBLIC_EMAIL +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      })
      .then(function () { sendBtn.disabled = false; });
  });

  // MCP section: copy buttons, and live usage numbers from the server
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = document.querySelector(btn.getAttribute('data-copy')).textContent.trim();
      var done = function () {
        var label = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = label; }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
      track('event', 'MCP address copied');
    });
  });
  var mcpStats = document.getElementById('mcp-stats');
  if (mcpStats && isLive) {
    fetch('/api/mcp-stats').then(function (res) { return res.json(); }).then(function (data) {
      if (!data || !data.calls) return;
      var apps = (data.clients || []).map(function (c) { return c.name; }).slice(0, 3).join(', ');
      mcpStats.textContent = data.calls + ' question' + (data.calls === 1 ? '' : 's') + ' answered so far' + (apps ? ' · asked from ' + apps : '');
    }).catch(function () {});
  }

  // Tracking consent: shown until answered, and again from the footer link
  var consentBox = document.getElementById('consent');
  function showConsent() {
    consentBox.hidden = false;
    requestAnimationFrame(function () { consentBox.classList.add('is-on'); });
  }
  consentBox.querySelectorAll('[data-consent]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      consent = btn.getAttribute('data-consent');
      try { localStorage.setItem('consent', consent); } catch (e) { /* private mode */ }
      if (consent === 'yes') {
        waiting.forEach(function (data) {
          if (navigator.sendBeacon) navigator.sendBeacon('/api/track', data);
          else fetch('/api/track', { method: 'POST', body: data, keepalive: true });
        });
      }
      waiting = [];
      consentBox.classList.remove('is-on');
      setTimeout(function () { consentBox.hidden = true; }, 800);
    });
  });
  document.getElementById('consent-open').addEventListener('click', showConsent);
  // Ask only once the opening sequence has played out, never over the loader
  if (consent !== 'yes' && consent !== 'no') {
    (function ask() {
      if (document.body.classList.contains('loaded')) setTimeout(showConsent, 3800);
      else setTimeout(ask, 300);
    })();
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
