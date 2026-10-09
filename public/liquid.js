// Liquid portrait: the hero photo is drawn in WebGL so it behaves like the surface of water.
// Moving the pointer across the hero sends rings through it, and the rings split off a red edge.
// If WebGL is missing the plain <img> simply stays.

(function () {
  var holder = document.querySelector('.hero__portrait');
  var img = holder && holder.querySelector('img');
  var hero = document.querySelector('.hero');
  if (!img || !hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var POINTS = 10;
  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) return;

  var VERT = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D uTex; uniform float uAspect; uniform float uTime; uniform float uReveal;',
    'uniform vec3 uP[' + POINTS + '];',
    'varying vec2 vUv;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
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
    // A slow swell so the surface is never perfectly still
    '  disp += 0.0022 * vec2(sin(vUv.y * 9.0 + uTime * 0.9), cos(vUv.x * 8.0 + uTime * 0.7));',
    '  float amount = length(disp);',
    '  float base = tone(texture2D(uTex, clamp(vUv - disp, 0.0, 1.0)).rgb);',
    '  float ghost = tone(texture2D(uTex, clamp(vUv - disp * 2.4, 0.0, 1.0)).rgb);',
    '  vec3 col = vec3(base);',
    // Where the ripple drags a darker copy of the image out of place, that edge prints in red
    '  float edge = clamp((base - ghost) * 3.0, 0.0, 1.0) * smoothstep(0.003, 0.012, amount);',
    '  col = mix(col, vec3(0.82, 0.14, 0.14), edge);',
    // The photo develops out of grain on load. White is invisible under the multiply blend.
    '  float n = noise(vUv * vec2(70.0, 58.0));',
    '  col = mix(vec3(1.0), col, smoothstep(n - 0.18, n + 0.18, uReveal * 1.36 - 0.18));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  var prog, U = {};
  function setup() {
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (err) {
      console.error('Liquid portrait disabled', err);
      return false;
    }
    gl.useProgram(prog);
    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    ['uTex', 'uAspect', 'uTime', 'uReveal', 'uP'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uTex, 0);
    return true;
  }

  var points = new Float32Array(POINTS * 3), next = 0;
  var last = null, visible = true, reveal = 0, revealAt = null, started = performance.now();

  function resize() {
    var r = holder.getBoundingClientRect();
    var scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(2, Math.round(r.width * scale));
    canvas.height = Math.max(2, Math.round(r.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function drop(clientX, clientY) {
    var r = holder.getBoundingClientRect();
    var x = (clientX - r.left) / r.width, y = 1 - (clientY - r.top) / r.height;
    if (last) {
      var dx = clientX - last.x, dy = clientY - last.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 14) return;                       // one ring per stretch of movement, not per pixel
      points[next * 3] = x; points[next * 3 + 1] = y;
      points[next * 3 + 2] = Math.min(1, 0.35 + dist / 90);
      next = (next + 1) % POINTS;
    }
    last = { x: clientX, y: clientY };
  }
  hero.addEventListener('mousemove', function (e) { drop(e.clientX, e.clientY); });
  hero.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) drop(t.clientX, t.clientY); }, { passive: true });

  function frame(now) {
    if (!visible || document.hidden) { requestAnimationFrame(frame); return; }
    for (var i = 0; i < POINTS; i++) points[i * 3 + 2] *= 0.968;
    if (revealAt === null && document.body.classList.contains('loaded')) revealAt = now + 250;
    if (revealAt !== null) reveal = Math.max(0, Math.min(1, (now - revealAt) / 1800));

    gl.uniform1f(U.uAspect, canvas.width / canvas.height);
    gl.uniform1f(U.uTime, (now - started) / 1000);
    gl.uniform1f(U.uReveal, reveal);
    gl.uniform3fv(U.uP, points);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }

  function start() {
    if (!setup()) return;
    canvas.className = 'hero__liquid';
    canvas.setAttribute('aria-hidden', 'true');
    holder.appendChild(canvas);
    holder.classList.add('is-liquid');
    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(hero);
    }
    requestAnimationFrame(frame);
  }
  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start);
})();
