// Liquid portrait: the hero photo is drawn in WebGL so it behaves like the surface of water.
// It arrives as a wave: script.js runs one ripple across the whole hero, through the title and
// on into the photo. Liquid.setFront(x, strength) tells this file where that ripple is on the
// screen; the photo is uncovered behind it, with the same red edge the pointer makes.
// Afterwards, moving the pointer across the hero sends rings through it with that red edge.
// If WebGL is missing the plain <img> simply stays.

(function () {
  var holder = document.querySelector('.hero__portrait');
  var img = holder && holder.querySelector('img');
  var hero = document.querySelector('.hero');
  if (!img || !hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var POINTS = 10;
    var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl) return;

  var VERT = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D uTex; uniform float uAspect; uniform float uTime;',
    'uniform float uReveal; uniform float uFront;',
    'uniform vec3 uP[' + POINTS + '];',
    'varying vec2 vUv;',
    // Same look the photo had in CSS: black and white, a touch more contrast and brightness
    'float tone(vec3 c){ float g = dot(c, vec3(0.299, 0.587, 0.114)); return clamp(((g - 0.5) * 1.12 + 0.5) * 1.1, 0.0, 1.0); }',
    'void main(){',
    '  vec2 disp = vec2(0.0);',
    // Each recent pointer position is the centre of an expanding ring
    '  for (int i = 0; i < ' + POINTS + '; i++){',
    '    vec3 pt = uP[i]; if (pt.z < 0.002) continue;',
    '    vec2 d = vUv - pt.xy; d.x *= uAspect;',
    '    float r = length(d);',
    '    disp += normalize(d + 1e-5) * sin(r * 44.0 - uTime * 9.0) * exp(-r * 6.5) * pt.z;',
    '  }',
    '  disp *= 0.038;',
    // The arrival: a wavy front sweeping left to right, dragging the image sideways as it passes.
    // That drag is what tears the red edge off, exactly as a pointer ripple does.
    '  float front = uReveal + 0.035 * sin(vUv.y * 13.0 + uTime * 5.0) + 0.018 * sin(vUv.y * 31.0 - uTime * 7.0);',
    '  float edge = vUv.x - front;',
    '  disp += vec2(1.0, 0.25 * sin(vUv.y * 20.0 + uTime * 6.0)) * sin(edge * 46.0 - uTime * 10.0) * exp(-abs(edge) * 8.0) * 0.05 * uFront;',
    // A slow swell so the surface is never perfectly still
    '  disp += 0.0022 * vec2(sin(vUv.y * 9.0 + uTime * 0.9), cos(vUv.x * 8.0 + uTime * 0.7));',
    '  float amount = length(disp);',
    '  float base = tone(texture2D(uTex, clamp(vUv - disp, 0.0, 1.0)).rgb);',
    '  float ghost = tone(texture2D(uTex, clamp(vUv - disp * 2.4, 0.0, 1.0)).rgb);',
    '  vec3 col = vec3(base);',
    // Where a ripple drags a darker copy of the image out of place, that edge prints in red
    '  float fringe = clamp((base - ghost) * 3.0, 0.0, 1.0) * smoothstep(0.003, 0.012, amount);',
    '  col = mix(col, vec3(0.82, 0.14, 0.14), fringe);',
    // Nothing is drawn ahead of the front
    '  gl_FragColor = vec4(col, smoothstep(0.02, -0.10, edge));',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  // Compiling shaders and uploading the photo are the heavy parts. They are done one per
  // turn of the event loop, so the page stays responsive while the opening plays.
  var prog, U = {};
  var STEPS = [
    function () { prog = gl.createProgram(); gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT)); },
    function () { gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG)); },
    function () {
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      gl.clearColor(0, 0, 0, 0);
      var quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    },
    function (bitmap) {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // a bitmap decoded off the main thread is already the right way up
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !bitmap);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap || img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      ['uTex', 'uAspect', 'uTime', 'uReveal', 'uFront', 'uP'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(U.uTex, 0);
    }
  ];
  function setup(done) {
    var bitmap = null, i = 0;
    var next = function () {
      try { STEPS[i](bitmap); } catch (err) { console.error('Liquid portrait disabled', err); return; }
      if (++i < STEPS.length) setTimeout(next, 0); else done();
    };
    var begin = function () { setTimeout(next, 0); };
    // decode the photo away from the main thread where the browser can
    if (window.createImageBitmap) {
      createImageBitmap(img, { imageOrientation: 'flipY' }).then(function (bm) { bitmap = bm; }, function () {}).then(begin);
    } else {
      begin();
    }
  }

  var points = new Float32Array(POINTS * 3), next = 0;
  var last = null, visible = true, started = performance.now(), tick = 0;
  // Where the arriving ripple is, across the photo: below 0 nothing shows, above 1 all of it
  var frontAt = -1, frontStrength = 0, arrived = false;

  function resize() {
    var r = holder.getBoundingClientRect();
    var scale = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 900 ? 1 : 1.5);
    canvas.width = Math.max(2, Math.round(r.width * scale));
    canvas.height = Math.max(2, Math.round(r.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function toUv(clientX, clientY) {
    var r = holder.getBoundingClientRect();
    return [(clientX - r.left) / r.width, 1 - (clientY - r.top) / r.height];
  }

  function drop(clientX, clientY) {
    if (!arrived) return;              // the pointer does nothing until the photo has arrived
    var uv = toUv(clientX, clientY);
    if (last) {
      var dx = clientX - last.x, dy = clientY - last.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 14) return;                       // one ring per stretch of movement, not per pixel
      points[next * 3] = uv[0]; points[next * 3 + 1] = uv[1];
      points[next * 3 + 2] = Math.min(1, 0.35 + dist / 90);
      next = (next + 1) % POINTS;
    }
    last = { x: clientX, y: clientY };
  }
  hero.addEventListener('mousemove', function (e) { drop(e.clientX, e.clientY); });
  hero.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) drop(t.clientX, t.clientY); }, { passive: true });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    var busy = !arrived || frontStrength > 0.001;
    for (var i = 0; i < POINTS; i++) { points[i * 3 + 2] *= 0.968; if (points[i * 3 + 2] > 0.002) busy = true; }
    // with no ripple running only the slow swell is left, which does not need every frame
    if (!busy && (tick++ % 3)) return;

    gl.uniform1f(U.uAspect, canvas.width / canvas.height);
    gl.uniform1f(U.uTime, (now - started) / 1000);
    gl.uniform1f(U.uReveal, frontAt);
    gl.uniform1f(U.uFront, frontStrength);
    gl.uniform3fv(U.uP, points);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  window.Liquid = {
    // clientX: the ripple's position on screen. strength: 1 while it travels, fading to 0 after.
    setFront: function (clientX, strength) {
      var r = holder.getBoundingClientRect();
      frontAt = (clientX - r.left) / r.width;
      frontStrength = strength;
      if (frontAt > 1.2) arrived = true;
    },
    // Show the whole photo at once (used when the sweep is skipped)
    show: function () { frontAt = 2; frontStrength = 0; arrived = true; }
  };

  // script.js may ask for the ripple before the shader is ready; remember the request
  var live = false;
  function start() {
    setup(function () {
      canvas.className = 'hero__liquid';
      canvas.setAttribute('aria-hidden', 'true');
      holder.appendChild(canvas);
      holder.classList.add('is-liquid');
      resize();
      window.addEventListener('resize', resize);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(hero);
      }
      live = true;
      requestAnimationFrame(frame);
    });
  }
  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start);
})();
