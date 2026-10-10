// AkhilOS: a small desktop "system" that opens full screen from the monitor in Selected Work.
// Every project is an app. Visitors open them as windows, drag them around and jump to the live sites.
// The project copy here mirrors worker/profile.js; change both together.

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var track = window.portfolioTrack || function () {};

  var APPS = [
    { id: 'revalerp', kind: 'work', name: 'RevalERP', tag: 'SaaS · ERP · POS', graphic: 0, url: 'https://revalsys.revalerp.com/',
      text: 'A comprehensive SaaS-based POS and ERP platform. I lead its development and delivery: 25+ business modules, sprint planning, reviews and production releases.',
      facts: [['Role', 'Lead .NET Developer'], ['Team', 'Revalsys Technologies'], ['Period', 'Mar 2026 — now']] },
    { id: 'shrmpro', kind: 'work', name: 'SHRMPro', tag: 'Enterprise HR · .NET', graphic: 1, url: 'https://www.shrmpro.com/',
      text: 'A .NET-based enterprise HR management solution. I worked on feature development, performance optimization and integrations.',
      facts: [['Role', '.NET Developer'], ['Team', 'Sphinx Worldbiz'], ['Period', '2024 — 2026']] },
    { id: 'ar', kind: 'work', name: 'AR Sessions', tag: 'Augmented reality · Unity', graphic: 2, url: null,
      text: 'An augmented reality online session app built in Unity with real-time session management. I led a team of three and improved delivery times by 30%.',
      facts: [['Role', 'Intern · team lead'], ['Team', 'Virtusa'], ['Period', '2023 — 2024']] },
    { id: 'alicms', kind: 'freelance', name: 'ALI CMS Studio', tag: 'CMS platform', img: 'assets/work/alicms.jpg', url: 'https://alicms.netlify.app/',
      text: 'Any site, Live Instantly. My own content management platform for client websites: the site is ready in five days and the owner manages everything from one dashboard.' },
    { id: 'skillon', kind: 'freelance', name: 'SkillOn', tag: 'Career platform', img: 'assets/work/skillon.jpg', url: 'https://skillon.netlify.app/',
      text: 'A learn, build, get hired platform: AI resume builder for ATS-friendly CVs, skill tests with certificates, mock interviews and job-ready courses.' },
    { id: 'signalhire', kind: 'freelance', name: 'SignalHire', tag: 'Hiring tool', img: 'assets/work/signalhire.jpg', url: 'https://signalhiretool.netlify.app/',
      text: 'A resume review tool for recruiters. Upload resumes singly or in bulk, add LinkedIn profiles, and screen every candidate against your job description.' },
    { id: 'hrmsphere', kind: 'freelance', name: 'HRMSphere', tag: 'HRMS', img: 'assets/work/hrmsphere.jpg', url: 'https://hrmssphere.netlify.app/',
      text: 'A hire-to-retire HR management system: employee profiles, leave, geofenced attendance, payroll and role-based access.' },
    { id: 'ca', kind: 'freelance', name: 'Likesh Krishna & Associates', short: 'LK & Associates', tag: 'Website + CMS', img: 'assets/work/ca.jpg', url: 'https://calikeshkrishna.com/',
      text: 'Website for a chartered accountancy firm in Hyderabad and Vijayawada, running on its own CMS so the firm updates content itself.' },
    { id: 'sravanthi', kind: 'freelance', name: 'Sravanthi Makeup Pro', short: 'Sravanthi Makeup', tag: 'Salon website', img: 'assets/work/sravanthi.jpg', url: 'https://sravanthimakeuppro.in/',
      text: 'Website for a bridal makeup artist and salon in Nellore, where clients browse services and book appointments online.' },
    { id: 'srphoto', kind: 'freelance', name: 'SR Photography', tag: 'Studio site · in progress', img: 'assets/work/srphoto.jpg', url: 'https://srphototest.netlify.app/',
      text: 'A wedding photography and films studio site, currently in development: galleries, featured stories, services and date booking.' },
    { id: 'resume', kind: 'system', name: 'Resume.pdf', tag: 'Document', img: 'assets/resume-preview.jpg', url: 'assets/Arasada-Akhil-Resume.pdf', cta: 'Open the PDF ↗',
      text: 'The whole story on two pages: skills, experience, projects and certifications.' },
    { id: 'contact', kind: 'system', name: 'Contact', tag: 'Get in touch', url: 'mailto:contact@arasadaakhil.website', cta: 'contact@arasadaakhil.website',
      text: 'Open to freelance projects: CMS websites, HRMS tools and customised tools for any business. Write to me, or leave the system and use the form at the foot of the page.' }
  ];

  var monitor = document.querySelector('.desk');
  var enterButtons = document.querySelectorAll('[data-os-enter]');
  if (!monitor || !enterButtons.length) return;

  var os, desktop, tasks, clock, zTop = 10, opened = {}, lastFocus = null, clockTimer = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function initials(name) {
    var words = name.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/);
    return (words[0][0] + (words[1] ? words[1][0] : words[0][1] || '')).toUpperCase();
  }

  function build() {
    os = el('div', 'os');
    os.setAttribute('role', 'dialog');
    os.setAttribute('aria-modal', 'true');
    os.setAttribute('aria-label', 'AkhilOS, a desktop of projects');

    var boot = el('div', 'os__boot');
    boot.innerHTML = '<b>AA<i></i></b><span>AkhilOS is starting</span><u><s></s></u>';
    os.appendChild(boot);

    desktop = el('div', 'os__desktop');
    desktop.appendChild(el('span', 'os__wall', 'AA'));

    var groups = [['Work', 'work'], ['Freelance', 'freelance'], ['System', 'system']];
    var icons = el('div', 'os__icons');
    groups.forEach(function (g) {
      var col = el('div', 'os__group');
      col.appendChild(el('span', 'os__group-name', g[0]));
      APPS.filter(function (a) { return a.kind === g[1]; }).forEach(function (app) {
        var b = el('button', 'os__icon os__icon--' + app.kind);
        b.type = 'button';
        b.appendChild(el('i', '', initials(app.name)));
        b.appendChild(el('span', '', app.short || app.name));
        b.addEventListener('click', function () { openApp(app); });
        col.appendChild(b);
      });
      icons.appendChild(col);
    });
    desktop.appendChild(icons);
    os.appendChild(desktop);

    var bar = el('div', 'os__bar');
    var brand = el('span', 'os__brand');
    brand.innerHTML = 'AA<i></i> AkhilOS';
    tasks = el('div', 'os__tasks');
    clock = el('span', 'os__clock');
    var exit = el('button', 'os__exit', 'Shut down ✕');
    exit.type = 'button';
    exit.addEventListener('click', close);
    bar.appendChild(brand); bar.appendChild(tasks); bar.appendChild(clock); bar.appendChild(exit);
    os.appendChild(bar);

    document.body.appendChild(os);
    os.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      // Esc closes the front window first, then the system itself
      var front = frontWindow();
      if (front) closeWindow(front.dataset.app);
      else close();
    });
  }

  function tick() {
    try {
      clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST';
    } catch (e) { clock.textContent = ''; }
  }

  function frontWindow() {
    var wins = Array.prototype.slice.call(desktop.querySelectorAll('.win'));
    wins.sort(function (a, b) { return (+b.style.zIndex || 0) - (+a.style.zIndex || 0); });
    return wins[0] || null;
  }
  function focusWindow(win) {
    win.style.zIndex = ++zTop;
    desktop.querySelectorAll('.win').forEach(function (w) { w.classList.toggle('is-front', w === win); });
    tasks.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.app === win.dataset.app); });
  }
  function closeWindow(id) {
    var entry = opened[id];
    if (!entry) return;
    entry.win.remove();
    entry.task.remove();
    delete opened[id];
    var front = frontWindow();
    if (front) focusWindow(front);
  }

  function openApp(app) {
    if (opened[app.id]) { focusWindow(opened[app.id].win); return; }
    track('event', 'OS: ' + app.name);

    var win = el('section', 'win');
    win.dataset.app = app.id;
    win.setAttribute('aria-label', app.name);
    var n = Object.keys(opened).length;
    var small = window.innerWidth <= 800;
    if (!small) {
      win.style.left = Math.min(desktop.clientWidth - 420, 372 + n * 34) + 'px';
      win.style.top = (26 + (n % 6) * 30) + 'px';
    }

    var head = el('header', 'win__bar');
    var shut = el('button', 'win__close');
    shut.type = 'button';
    shut.setAttribute('aria-label', 'Close ' + app.name);
    shut.addEventListener('click', function () { closeWindow(app.id); });
    head.appendChild(shut);
    head.appendChild(el('i')); head.appendChild(el('i'));
    head.appendChild(el('span', '', app.name));
    win.appendChild(head);

    var body = el('div', 'win__body');
    var media = el('div', 'win__media');
    if (app.graphic !== undefined) {
      // Work projects reuse the animated graphic from the monitor
      var source = document.querySelector('.desk__app[data-app="' + app.graphic + '"]');
      media.className = 'win__media desk win__graphic';
      if (source && source.firstElementChild) media.appendChild(source.firstElementChild.cloneNode(true));
    } else if (app.img) {
      var img = el('img');
      img.src = app.img;
      img.alt = app.name + ' screenshot';
      media.appendChild(img);
    } else {
      media.className = 'win__media win__media--type';
      media.appendChild(el('b', '', 'Say hello'));
    }
    body.appendChild(media);

    var info = el('div', 'win__info');
    info.appendChild(el('span', 'label', '(' + app.tag + ')'));
    info.appendChild(el('h3', '', app.name));
    info.appendChild(el('p', '', app.text));
    if (app.facts) {
      var dl = el('dl');
      app.facts.forEach(function (f) {
        var row = el('div');
        row.appendChild(el('dt', '', f[0]));
        row.appendChild(el('dd', '', f[1]));
        dl.appendChild(row);
      });
      info.appendChild(dl);
    }
    if (app.url) {
      var go = el('a', 'btn', app.cta || 'Open the live site ↗');
      go.href = app.url;
      if (!/^mailto:/.test(app.url)) { go.target = '_blank'; go.rel = 'noopener'; }
      info.appendChild(go);
    } else {
      info.appendChild(el('span', 'win__note', 'Internal project, no public link.'));
    }
    body.appendChild(info);
    win.appendChild(body);
    desktop.appendChild(win);

    var task = el('button', '', app.short || app.name);
    task.type = 'button';
    task.dataset.app = app.id;
    task.addEventListener('click', function () { focusWindow(win); });
    tasks.appendChild(task);

    opened[app.id] = { win: win, task: task };
    win.addEventListener('pointerdown', function () { focusWindow(win); });
    drag(win, head);
    focusWindow(win);
    requestAnimationFrame(function () { win.classList.add('is-open'); });
  }

  // Windows move by their title bar and stay inside the desktop
  function drag(win, handle) {
    handle.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || window.innerWidth <= 800) return;
      var startX = e.clientX, startY = e.clientY, left = win.offsetLeft, top = win.offsetTop;
      handle.setPointerCapture(e.pointerId);
      win.classList.add('is-dragging');
      function move(ev) {
        var x = Math.max(-win.offsetWidth + 120, Math.min(desktop.clientWidth - 120, left + ev.clientX - startX));
        var y = Math.max(0, Math.min(desktop.clientHeight - 44, top + ev.clientY - startY));
        win.style.left = x + 'px';
        win.style.top = y + 'px';
      }
      function up() {
        win.classList.remove('is-dragging');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function open(startApp) {
    if (!os) build();
    lastFocus = document.activeElement;
    track('event', 'OS: entered');

    // Grow out of the monitor's screen
    var from = monitor.querySelector('.desk__screen').getBoundingClientRect();
    var sx = from.width / window.innerWidth, sy = from.height / window.innerHeight;
    os.style.transformOrigin = '0 0';
    os.style.transition = 'none';
    os.style.transform = 'translate(' + from.left + 'px,' + from.top + 'px) scale(' + sx + ',' + sy + ')';
    os.classList.add('is-on');
    os.classList.remove('is-ready');
    document.documentElement.classList.add('os-open');
    void os.offsetWidth;
    os.style.transition = reduced ? 'none' : 'transform 0.75s cubic-bezier(0.7, 0, 0.2, 1)';
    os.style.transform = 'none';

    tick();
    clockTimer = setInterval(tick, 20000);
    setTimeout(function () {
      os.classList.add('is-ready');
      if (!Object.keys(opened).length) openApp(startApp || APPS[0]);
      var first = os.querySelector('.os__icon');
      if (first) first.focus();
    }, reduced ? 0 : 1500);
  }

  function close() {
    if (!os) return;
    var to = monitor.querySelector('.desk__screen').getBoundingClientRect();
    os.style.transition = reduced ? 'none' : 'transform 0.6s cubic-bezier(0.7, 0, 0.2, 1), opacity 0.3s 0.4s';
    os.style.transform = 'translate(' + to.left + 'px,' + to.top + 'px) scale(' + (to.width / window.innerWidth) + ',' + (to.height / window.innerHeight) + ')';
    os.style.opacity = '0';
    clearInterval(clockTimer);
    setTimeout(function () {
      os.classList.remove('is-on');
      os.style.opacity = '';
      document.documentElement.classList.remove('os-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, reduced ? 0 : 650);
  }

  enterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var active = document.querySelector('.desk__dock button.is-on');
      var index = active ? +active.getAttribute('data-go') : 0;
      open(APPS[index]);
    });
  });
})();
