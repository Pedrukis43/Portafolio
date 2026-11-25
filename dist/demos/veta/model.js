(() => {
  'use strict';

  const oak = [0.78, 0.60, 0.39];
  const finishes = { roble: oak, nogal: [0.51, 0.32, 0.22], carbon: [0.29, 0.28, 0.25] };
  const metal = [0.17, 0.17, 0.155];
  const brass = [0.74, 0.55, 0.29];
  const cavity = [0.125, 0.11, 0.08];
  const rubber = [0.095, 0.09, 0.08];
  const light = [-0.46, 0.79, 0.4];
  const views = {
    orbit: { yaw: 0.63, pitch: 0.40 },
    front: { yaw: 0, pitch: 0.10 },
    top: { yaw: 0, pitch: 1.35 },
  };

  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute float aMaterial;
    uniform vec3 uRight;
    uniform vec3 uUp;
    uniform vec3 uCamera;
    uniform vec2 uHalf;
    uniform vec2 uCenter;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying float vMaterial;

    void main() {
      float depth = dot(aPosition, uCamera);
      float perspective = 1.0 - depth * 0.18;
      vec2 screen = vec2(dot(aPosition, uRight), dot(aPosition, uUp));
      gl_Position = vec4((screen - uCenter * perspective) / uHalf, -depth * 0.30, perspective);
      vPosition = aPosition;
      vNormal = aNormal;
      vMaterial = aMaterial;
    }
  `;

  const fragmentSource = `
    precision highp float;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying float vMaterial;
    uniform vec3 uWood;
    uniform vec3 uCamera;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 cell = floor(p);
      vec2 fraction = fract(p);
      vec2 blend = fraction * fraction * (3.0 - 2.0 * fraction);
      return mix(
        mix(hash(cell), hash(cell + vec2(1.0, 0.0)), blend.x),
        mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), blend.x),
        blend.y
      );
    }

    void main() {
      vec3 n = normalize(vNormal);
      vec3 light = normalize(vec3(-0.46, 0.79, 0.40));
      float diffuse = max(0.0, dot(n, light));
      float bounce = max(0.0, dot(n, normalize(vec3(0.8, 0.25, 0.4))));
      float spec = pow(max(0.0, dot(n, normalize(light + uCamera))), 24.0);
      float grit = hash(gl_FragCoord.xy);
      vec3 base;
      float shine = 0.0;

      if (vMaterial < 0.5) {
        float along = vPosition.x;
        float across = vPosition.z + vPosition.y * 0.72;
        float bend = noise(vec2(along * 2.8, across * 8.3)) * 0.022 + sin(along * 5.0 + across * 9.0) * 0.007;
        float flow = across + bend;
        float bands = noise(vec2(along * 0.9, flow * 73.0));
        float fibers = noise(vec2(along * 5.7, flow * 189.0));
        float pores = pow(noise(vec2(along * 13.0, flow * 211.0)), 6.0);
        float grain = 0.88 + bands * 0.125 + fibers * 0.065 - pores * 0.045 + grit * 0.008;
        base = uWood * grain;
        shine = spec * 0.032;
      } else if (vMaterial < 1.5) {
        base = vec3(0.17, 0.17, 0.155) * (0.96 + grit * 0.06);
        shine = spec * 0.043;
      } else if (vMaterial < 2.5) {
        base = vec3(0.74, 0.55, 0.29);
        shine = spec * 0.15;
      } else if (vMaterial < 3.5) {
        base = vec3(0.125, 0.11, 0.08);
      } else {
        base = vec3(0.095, 0.09, 0.08);
      }

      vec3 color = base * (0.65 + 0.435 * diffuse + 0.075 * bounce) + vec3(1.0, 0.96, 0.89) * shine;
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const minus = (a, b) => a.map((component, index) => component - b[index]);

  function normal(a, b) {
    const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const length = Math.hypot(...cross);
    return cross.map((value) => value / length);
  }

  function corners(x, z, width, depth, radius, y, inset) {
    const halfWidth = width / 2 - inset;
    const halfDepth = depth / 2 - inset;
    const rounded = Math.min(radius - inset, halfWidth - 0.0001, halfDepth - 0.0001);
    const signs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    return signs.flatMap(([sx, sz], corner) => {
      const cx = x + sx * (halfWidth - rounded);
      const cz = z + sz * (halfDepth - rounded);
      return Array.from({ length: 5 }, (_, step) => {
        const angle = corner * Math.PI / 2 + step * Math.PI / 8;
        return [cx + Math.cos(angle) * rounded, y, cz + Math.sin(angle) * rounded];
      });
    });
  }

  function roundedBlock(faces, { x = 0, z = 0, y, width, depth, height, radius, material, tiltX = 0, tiltZ = 0 }) {
    const edge = Math.min(height * 0.25, radius * 0.45, 0.004);
    const bands = [[0, edge], [edge, 0], [height - edge, 0], [height, edge]];
    const rings = bands.map(([level, inset]) => {
      const taper = 1 - level / height;
      return corners(x + tiltX * taper, z + tiltZ * taper, width, depth, radius, y + level, inset);
    });

    faces.push({ material, n: [0, -1, 0], vertices: rings[0] });
    faces.push({ material, n: [0, 1, 0], vertices: rings[3] });
    for (let level = 0; level < rings.length - 1; level++) {
      const bottom = rings[level];
      const top = rings[level + 1];
      for (let i = 0; i < bottom.length; i++) {
        const next = (i + 1) % bottom.length;
        const n = normal(minus(top[i], bottom[i]), minus(bottom[next], bottom[i]));
        faces.push({ material, n, vertices: [bottom[i], bottom[next], top[next], top[i]] });
      }
    }
  }

  function cylinder(faces, x, y, z, radius, height, material) {
    const ring = (h) => Array.from({ length: 32 }, (_, segment) => {
      const angle = segment * Math.PI / 16;
      return [x + Math.cos(angle) * radius, h, z + Math.sin(angle) * radius];
    });
    const bottom = ring(y);
    const top = ring(y + height);
    faces.push({ material, n: [0, 1, 0], vertices: top });
    for (let i = 0; i < top.length; i++) {
      const next = (i + 1) % top.length;
      faces.push({ material, n: normal(minus(top[i], bottom[i]), minus(bottom[next], bottom[i])), vertices: [bottom[i], bottom[next], top[next], top[i]] });
    }
  }

  function buildDesk(config) {
    const width = config.width * 0.01;
    const depth = config.depth * 0.01;
    const faces = [];
    const feet = [];
    const block = (properties) => roundedBlock(faces, properties);
    const edgeX = width / 2 - 0.115;
    const edgeZ = depth / 2 - 0.096;

    block({ y: 0.703, width, depth, height: 0.037, radius: 0.03, material: 0 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * edgeX;
        const z = sz * edgeZ;
        const tiltX = sx * 0.045;
        const tiltZ = sz * 0.036;
        block({ x, z, y: 0.016, width: 0.037, depth: 0.039, height: 0.687, radius: 0.006, material: 1, tiltX, tiltZ });
        block({ x: x + tiltX, z: z + tiltZ, y: 0.007, width: 0.038, depth: 0.040, height: 0.012, radius: 0.006, material: 4 });
        feet.push([x + tiltX, 0.006, z + tiltZ]);
      }
      block({ x: sx * edgeX, y: 0.655, width: 0.026, depth: depth - 0.145, height: 0.039, radius: 0.005, material: 1 });
    }
    for (const sz of [-1, 1]) {
      block({ z: sz * edgeZ, y: 0.659, width: width - 0.195, depth: 0.023, height: 0.033, radius: 0.004, material: 1 });
    }

    if (config.accessory.includes('drawer')) {
      const x = width / 2 - 0.315;
      block({ x, z: depth / 2 - 0.198, y: 0.583, width: 0.326, depth: 0.326, height: 0.079, radius: 0.012, material: 1 });
      block({ x, z: depth / 2 - 0.037, y: 0.584, width: 0.347, depth: 0.025, height: 0.076, radius: 0.008, material: 0 });
      block({ x, z: depth / 2 - 0.02, y: 0.611, width: 0.116, depth: 0.020, height: 0.012, radius: 0.004, material: 1 });
    }
    if (config.accessory.includes('cable')) {
      const x = width / 2 - 0.115;
      const z = -depth / 2 + 0.091;
      cylinder(faces, x, 0.74, z, 0.034, 0.003, 2);
      cylinder(faces, x, 0.743, z, 0.024, 0.0005, 3);
    }
    if (config.accessory.includes('riser')) {
      const z = -depth / 2 + 0.16;
      for (const x of [-0.251, 0.251]) {
        block({ x, z, y: 0.741, width: 0.03, depth: 0.18, height: 0.105, radius: 0.006, material: 1 });
      }
      block({ z, y: 0.846, width: 0.61, depth: 0.232, height: 0.027, radius: 0.02, material: 0 });
    }
    return { faces, feet, depth, width, wood: finishes[config.finish] ?? oak };
  }

  function basis(yaw, pitch) {
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const sinP = Math.sin(pitch);
    const cosP = Math.cos(pitch);
    return {
      right: [cosY, 0, -sinY],
      up: [-sinY * sinP, cosP, -cosY * sinP],
      eye: [sinY * cosP, sinP, cosY * cosP],
    };
  }

  function projection(axes, width, height) {
    function plane(point) {
      const distance = 1 - dot(point, axes.eye) * 0.18;
      return [dot(point, axes.right) / distance, dot(point, axes.up) / distance];
    }

    // A fixed envelope across configurations keeps width changes visible in the model.
    const bounds = [-0.82, 0.82].flatMap((x) => [0, 0.88].flatMap((y) => [-0.42, 0.42].map((z) => plane([x, y, z]))));
    const xx = bounds.map((point) => point[0]);
    const yy = bounds.map((point) => point[1]);
    const xMin = Math.min(...xx);
    const yMin = Math.min(...yy);
    const xMax = Math.max(...xx);
    const yMax = Math.max(...yy);
    const center = [(xMin + xMax) / 2, (yMin + yMax) / 2];
    const scale = Math.min(width * 0.90 / (xMax - xMin), height * 0.95 / (yMax - yMin));

    return {
      center,
      half: [width / (2 * scale), height / (2 * scale)],
      point(point) {
        const [x, y] = plane(point);
        return [width / 2 + (x - center[0]) * scale, height / 2 - (y - center[1]) * scale];
      },
    };
  }

  function makeShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('El visor no pudo compilar el material.');
    return shader;
  }

  function makeWebGl(gl) {
    const program = gl.createProgram();
    gl.attachShader(program, makeShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, makeShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('El visor no pudo activar el material.');
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [name, components, offset] of [['aPosition', 3, 0], ['aNormal', 3, 12], ['aMaterial', 1, 24]]) {
      const index = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index, components, gl.FLOAT, false, 28, offset);
    }
    const [right, up, eye, half, center, wood] = ['uRight', 'uUp', 'uCamera', 'uHalf', 'uCenter', 'uWood'].map((name) => gl.getUniformLocation(program, name));
    let count = 0;
    return {
      model(desk) {
        const data = [];
        for (const face of desk.faces) {
          for (let index = 1; index < face.vertices.length - 1; index++) {
            for (const point of [face.vertices[0], face.vertices[index], face.vertices[index + 1]]) {
              data.push(...point, ...face.n, face.material);
            }
          }
        }
        count = data.length / 7;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.uniform3fv(wood, desk.wood);
      },
      draw(axes, camera) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform3fv(right, axes.right);
        gl.uniform3fv(up, axes.up);
        gl.uniform3fv(eye, axes.eye);
        gl.uniform2fv(half, camera.half);
        gl.uniform2fv(center, camera.center);
        gl.drawArrays(gl.TRIANGLES, 0, count);
      },
    };
  }

  function outline(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
  }

  function makeCanvas(ctx) {
    let desk;
    return {
      model(nextDesk) { desk = nextDesk; },
      draw(axes, camera, width, height, resolution) {
        ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const colors = [desk.wood, metal, brass, cavity, rubber];
        const visible = desk.faces.filter(({ n }) => dot(n, axes.eye) > -0.08).map((face) => ({
          ...face,
          distance: face.vertices.reduce((sum, point) => sum + dot(point, axes.eye), 0) / face.vertices.length,
        })).sort((a, b) => a.distance - b.distance);
        for (const face of visible) {
          const shade = 0.65 + Math.max(0, dot(face.n, light)) * 0.43;
          const rgb = colors[face.material].map((color) => Math.round(color * shade * 255));
          ctx.fillStyle = `rgb(${rgb.join(',')})`;
          outline(ctx, face.vertices.map(camera.point));
          ctx.fill();
        }
      },
    };
  }

  function drawShadow(ctx, desk, camera, width, height, resolution) {
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const points = corners(0.11, -0.10, desk.width + 0.05, desk.depth + 0.014, 0.075, 0.001, 0).map(camera.point);
    ctx.fillStyle = 'rgba(65,49,32,0.20)';
    ctx.filter = `blur(${Math.round(width * resolution * 0.023)}px)`;
    outline(ctx, points);
    ctx.fill();
    ctx.filter = 'none';
    for (const foot of desk.feet) {
      const [x, y] = camera.point(foot);
      const diameter = Math.max(5, width * 0.022);
      const gradient = ctx.createRadialGradient(x, y, 1, x, y, diameter);
      gradient.addColorStop(0, 'rgba(51,40,30,.36)');
      gradient.addColorStop(1, 'rgba(51,40,30,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - diameter, y - diameter, diameter * 2, diameter * 2);
    }
  }

  function createDeskStage(container, setActiveAngle) {
    let canvas = container.querySelector('#render-surface');
    const shadow = container.querySelector('#shadow');
    const shadowContext = shadow.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let desk;
    let frame = 0;
    let transition = 0;
    let pointer;
    let yaw = views.orbit.yaw;
    let pitch = views.orbit.pitch;
    let renderer;

    function fallback() {
      const replacement = canvas.cloneNode();
      canvas.replaceWith(replacement);
      canvas = replacement;
      renderer = makeCanvas(canvas.getContext('2d'));
      container.dataset.renderer = 'canvas';
      if (desk) { renderer.model(desk); scheduleDraw(); }
    }

    try {
      const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
      if (gl) {
        renderer = makeWebGl(gl);
        container.dataset.renderer = 'webgl';
        canvas.addEventListener('webglcontextlost', fallback, { once: true });
      } else {
        fallback();
      }
    } catch {
      fallback();
    }

    function scheduleDraw() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!desk) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        const resolution = Math.min(window.devicePixelRatio || 1, 2);
        for (const surface of [canvas, shadow]) {
          const physicalWidth = Math.round(width * resolution);
          const physicalHeight = Math.round(height * resolution);
          if (physicalWidth !== surface.width) surface.width = physicalWidth;
          if (physicalHeight !== surface.height) surface.height = physicalHeight;
        }
        const axes = basis(yaw, pitch);
        const camera = projection(axes, width, height);
        drawShadow(shadowContext, desk, camera, width, height, resolution);
        renderer.draw(axes, camera, width, height, resolution);
      });
    }

    function rotate(x, y) {
      cancelAnimationFrame(transition);
      yaw += x;
      pitch = Math.max(-0.13, Math.min(1.38, pitch + y));
      setActiveAngle('');
      scheduleDraw();
    }

    function preset(name) {
      cancelAnimationFrame(transition);
      const target = views[name];
      const tau = Math.PI * 2;
      setActiveAngle(name);
      if (reduced.matches) {
        yaw = target.yaw;
        pitch = target.pitch;
        scheduleDraw();
        return;
      }
      const started = performance.now();
      const fromYaw = yaw;
      const fromPitch = pitch;
      const deltaYaw = ((target.yaw - fromYaw + Math.PI) % tau + tau) % tau - Math.PI;
      const step = (time) => {
        const progress = Math.min(1, (time - started) / 260);
        const eased = 1 - (1 - progress) ** 3;
        yaw = fromYaw + deltaYaw * eased;
        pitch = fromPitch + (target.pitch - fromPitch) * eased;
        scheduleDraw();
        if (progress < 1) transition = requestAnimationFrame(step);
      };
      transition = requestAnimationFrame(step);
    }

    container.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      container.setPointerCapture(event.pointerId);
    });
    container.addEventListener('pointermove', (event) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      container.dataset.dragging = '';
      rotate(dx * 0.008, dy * 0.0065);
    });
    container.addEventListener('lostpointercapture', () => {
      pointer = undefined;
      delete container.dataset.dragging;
    });
    container.addEventListener('keydown', (event) => {
      const keys = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.10], ArrowDown: [0, -0.10] };
      if (!keys[event.key] && event.key !== 'Home') return;
      event.preventDefault();
      if (event.key === 'Home') preset('orbit');
      else rotate(...keys[event.key]);
    });
    const observer = new ResizeObserver(scheduleDraw);
    observer.observe(container);

    return {
      model(config) {
        desk = buildDesk(config);
        renderer.model(desk);
        scheduleDraw();
      },
      preset,
    };
  }

  window.createDeskStage = createDeskStage;
})();
