/* ========================================================
   TEKIT - PRECISION 3D STUDIO HARDWARE (THREE.JS PBR)
   ======================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[Tekit-3D] Three.js no cargado; omitiendo escena 3D.');
    return;
  }

  const state = {
    mouseX: 0,
    mouseY: 0,
    targetRotX: 0,
    targetRotY: -0.35
  };

  window.addEventListener('mousemove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    state.targetRotY = -0.35 + state.mouseX * 0.42;
    state.targetRotX = state.mouseY * 0.22;
  }, { passive: true });

  // ======================================================
  // HELPER: TEKIT STUDIO HEADSET WITH BOOM MIC (3D PBR)
  // ======================================================
  function createTekitHeadset(scaleFactor = 1) {
    const root = new THREE.Group();
    root.scale.setScalar(scaleFactor);

    // Physical PBR Materials
    const matteBlack = new THREE.MeshStandardMaterial({
      color: 0x16171a,
      metalness: 0.38,
      roughness: 0.62
    });

    const softLeather = new THREE.MeshStandardMaterial({
      color: 0x1f2024,
      metalness: 0.12,
      roughness: 0.85
    });

    const brushedAluminum = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.9,
      roughness: 0.22
    });

    const darkAnodized = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.78,
      roughness: 0.32
    });

    const tekitOrange = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      metalness: 0.55,
      roughness: 0.3
    });

    const goldDriverMat = new THREE.MeshStandardMaterial({
      color: 0xf5b041,
      metalness: 0.94,
      roughness: 0.18
    });

    const copperCoilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.88,
      roughness: 0.26
    });

    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x143326,
      metalness: 0.25,
      roughness: 0.55
    });

    // 1. Headband Arc & Inner Cushion
    const headbandOuter = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.12, 20, 64, Math.PI),
      matteBlack
    );
    headbandOuter.position.y = 0.25;
    root.add(headbandOuter);

    const headbandCushion = new THREE.Mesh(
      new THREE.TorusGeometry(1.31, 0.085, 16, 48, Math.PI * 0.78),
      softLeather
    );
    headbandCushion.rotation.z = Math.PI * 0.11;
    headbandCushion.position.y = 0.25;
    root.add(headbandCushion);

    // Brushed Aluminum Adjustment Sliders & Yoke Forks
    [-1, 1].forEach((side) => {
      const slider = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.65, 0.22),
        brushedAluminum
      );
      slider.position.set(side * 1.42, -0.02, 0);
      slider.rotation.z = side * -0.06;
      root.add(slider);

      const yokeBar = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.045, 12, 32, Math.PI * 0.65),
        darkAnodized
      );
      yokeBar.position.set(side * 1.38, -0.78, 0);
      yokeBar.rotation.y = Math.PI / 2;
      yokeBar.rotation.z = side > 0 ? 0.55 : 0.55;
      root.add(yokeBar);
    });

    // 2. Left & Right Over-Ear Acoustic Cups (with Explodable Outer Plates)
    const outerPlates = [];

    [-1, 1].forEach((side) => {
      const cupGroup = new THREE.Group();
      cupGroup.position.set(side * 1.34, -0.82, 0);
      cupGroup.rotation.z = side * 0.08;
      root.add(cupGroup);

      // Plush Ear Cushion
      const cushion = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.2, 20, 48),
        softLeather
      );
      cushion.rotation.y = Math.PI / 2;
      cushion.position.x = -side * 0.14;
      cupGroup.add(cushion);

      // Inner Acoustic Baffle
      const innerBaffle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.58, 0.12, 40),
        matteBlack
      );
      innerBaffle.rotation.z = Math.PI / 2;
      cupGroup.add(innerBaffle);

      // Internal Neodymium Driver + Copper Voice Coil + DSP PCB (Visible in "Vista interna")
      const driverCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.18, 0.12, 36),
        goldDriverMat
      );
      driverCone.rotation.z = side * Math.PI / 2;
      driverCone.position.x = side * 0.08;
      cupGroup.add(driverCone);

      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.03, 12, 32),
        copperCoilMat
      );
      coil.rotation.y = Math.PI / 2;
      coil.position.x = side * 0.14;
      cupGroup.add(coil);

      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.42, 0.42),
        pcbMat
      );
      pcb.position.x = side * 0.22;
      cupGroup.add(pcb);

      // Outer Removable Aluminum/Matte Housing Plate + Tekit Branding
      const outerPlateGroup = new THREE.Group();
      outerPlateGroup.position.x = side * 0.24;
      cupGroup.add(outerPlateGroup);

      const outerShell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.64, 0.22, 44),
        matteBlack
      );
      outerShell.rotation.z = Math.PI / 2;
      outerPlateGroup.add(outerShell);

      const bevelRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.025, 14, 48),
        brushedAluminum
      );
      bevelRing.rotation.y = Math.PI / 2;
      bevelRing.position.x = side * 0.11;
      outerPlateGroup.add(bevelRing);

      // Tekit Orange Accent Ring
      const tekitRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.022, 12, 40),
        tekitOrange
      );
      tekitRing.rotation.y = Math.PI / 2;
      tekitRing.position.x = side * 0.115;
      outerPlateGroup.add(tekitRing);

      // Tekit "T" Emblem on Earcup
      const tTopBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.24), tekitOrange);
      tTopBar.position.set(side * 0.125, 0.09, 0);
      outerPlateGroup.add(tTopBar);

      const tStem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.065), tekitOrange);
      tStem.position.set(side * 0.125, -0.02, 0);
      outerPlateGroup.add(tStem);

      outerPlates.push({ group: outerPlateGroup, side });
    });

    // 3. Articulated Studio Boom Microphone (Left Earcup)
    const boomGroup = new THREE.Group();
    boomGroup.position.set(-1.55, -1.05, 0.18);
    root.add(boomGroup);

    const boomMount = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.14, 24),
      brushedAluminum
    );
    boomMount.rotation.z = Math.PI / 2;
    boomGroup.add(boomMount);

    const boomCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.15, -0.32, 0.85),
      new THREE.Vector3(0.95, -0.35, 1.38)
    );
    const boomArm = new THREE.Mesh(
      new THREE.TubeGeometry(boomCurve, 24, 0.032, 12, false),
      darkAnodized
    );
    boomGroup.add(boomArm);

    const micCapsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.16, 12, 20),
      matteBlack
    );
    micCapsule.position.set(0.95, -0.35, 1.38);
    micCapsule.rotation.z = Math.PI / 2.4;
    micCapsule.rotation.y = 0.4;
    boomGroup.add(micCapsule);

    const micRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.076, 0.014, 10, 24),
      tekitOrange
    );
    micRing.position.set(0.88, -0.35, 1.34);
    micRing.rotation.y = Math.PI / 3;
    boomGroup.add(micRing);

    let exploded = false;
    let explodeProgress = 0;

    function setExploded(val) {
      exploded = val;
    }

    function update(t, dt) {
      const targetExp = exploded ? 1 : 0;
      explodeProgress += (targetExp - explodeProgress) * Math.min(1, dt * 6.5);

      // Slide outer earcup shells outward to reveal acoustic drivers & DSP PCB
      outerPlates.forEach(({ group, side }) => {
        group.position.x = side * (0.24 + explodeProgress * 0.95);
      });
    }

    return { group: root, update, setExploded };
  }

  // ======================================================
  // 1. SPLASH SCREEN & HARDWARE 3D HERO
  // ======================================================
  function initSplashAndHero3D() {
    const splash = document.getElementById('splash-screen');
    const barFill = document.getElementById('splash-bar-fill');
    const pctText = document.getElementById('splash-pct');
    const heroSection = document.getElementById('teams-hero-intro');
    const appContainer = document.getElementById('teams-app-container');
    const heroCanvas = document.getElementById('hero-webgl-canvas');
    const enterBtn = document.getElementById('btn-enter-teams');
    const enterTopBtn = document.getElementById('btn-enter-teams-top');

    if (!heroSection || !appContainer || !heroCanvas) return;

    // Minimal splash progress (~0.9s)
    let progress = 0;
    const startTime = performance.now();
    function updateSplash() {
      const elapsed = performance.now() - startTime;
      const target = Math.min(100, (elapsed / 850) * 100);
      progress += (target - progress) * 0.25;
      if (target >= 100 && progress > 97) progress = 100;

      const rounded = Math.min(100, Math.round(progress));
      if (barFill) barFill.style.width = `${rounded}%`;
      if (pctText) pctText.textContent = `${String(rounded).padStart(2, '0')}%`;

      if (rounded >= 100) {
        if (splash) splash.classList.add('fade-out');
      } else {
        requestAnimationFrame(updateSplash);
      }
    }
    requestAnimationFrame(updateSplash);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: heroCanvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.6, 8.2);

    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, heroCanvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = false;
      controls.minDistance = 4.5;
      controls.maxDistance = 12;
      controls.target.set(window.innerWidth > 960 ? 1.5 : 0, 0.05, 0);
    }

    // Studio Softbox & Precision Rim Lighting
    scene.add(new THREE.HemisphereLight(0xf4f4f5, 0x18181b, 0.9));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe4e4e7, 0.85);
    fillLight.position.set(-5, 2, 4);
    scene.add(fillLight);

    const rimWarm = new THREE.PointLight(0xf97316, 1.8, 18);
    rimWarm.position.set(-3.2, 2.5, -3.0);
    scene.add(rimWarm);

    const rimCool = new THREE.PointLight(0xffffff, 1.5, 18);
    rimCool.position.set(4.5, 3.0, -3.0);
    scene.add(rimCool);

    const mic = createTekitHeadset(1.08);
    mic.group.position.set(window.innerWidth > 960 ? 1.75 : 0, 0.4, 0);
    scene.add(mic.group);

    let spinActive = false;
    let spinStartTime = 0;
    const SPIN_DURATION_MS = 1000;

    function triggerExplodeAndSpin() {
      if (!heroActive) return;
      mic.setExploded(true);
      spinActive = true;
      spinStartTime = performance.now();

      setTimeout(() => {
        mic.setExploded(false);
      }, SPIN_DURATION_MS);
    }

    // Al entrar a la página (tras el splash), desensamble + vuelta 360° de 1 segundo
    setTimeout(() => {
      triggerExplodeAndSpin();
      setInterval(triggerExplodeAndSpin, 5000);
    }, 1000);

    window.addEventListener('resize', () => {
      if (heroSection.classList.contains('exiting')) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      mic.group.position.x = window.innerWidth > 960 ? 1.75 : 0;
      if (controls) controls.target.x = window.innerWidth > 960 ? 1.5 : 0;
    });

    let heroActive = true;
    const clock = new THREE.Clock();

    let baseRotY = -0.35;
    let baseRotX = 0;
    let accumulatedSpin = 0;

    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    function animateHero() {
      if (!heroActive) return;
      requestAnimationFrame(animateHero);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      if (controls) controls.update();
      mic.update(t, dt);

      // Smooth rotational inertia following cursor
      baseRotY += (state.targetRotY - baseRotY) * 0.055;
      baseRotX += (state.targetRotX - baseRotX) * 0.055;

      // 180° spin during the 1-second disassembled window
      let currentSpin = 0;
      if (spinActive) {
        const p = (performance.now() - spinStartTime) / SPIN_DURATION_MS;
        if (p >= 1) {
          spinActive = false;
          accumulatedSpin += Math.PI;
        } else {
          currentSpin = Math.PI * easeInOutCubic(p);
        }
      }

      mic.group.rotation.y = baseRotY + accumulatedSpin + currentSpin;
      mic.group.rotation.x = baseRotX;

      renderer.render(scene, camera);
    }
    animateHero();

    function enterTekit() {
      heroSection.classList.add('exiting');
      appContainer.classList.remove('teams-app-hidden');
      setTimeout(() => {
        heroActive = false;
      }, 560);
    }

    if (enterBtn) enterBtn.addEventListener('click', enterTekit);
    if (enterTopBtn) enterTopBtn.addEventListener('click', enterTekit);
  }

  // ======================================================
  // 2. 3D NEURAL NETWORK BACKGROUND (CHAT AREA)
  // ======================================================
  function initBackground3D() {
    const canvas = document.getElementById('teams-3d-bg-canvas');
    if (!canvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 16);

    const NODE_COUNT = 86;
    const positions = new Float32Array(NODE_COUNT * 3);
    const velocities = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 4;
      velocities.push({
        x: (Math.random() - 0.5) * 0.011,
        y: (Math.random() - 0.5) * 0.011,
        z: (Math.random() - 0.5) * 0.008
      });
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pointsMat = new THREE.PointsMaterial({ color: 0xfacc15, size: 0.16, transparent: true, opacity: 0.88 });
    scene.add(new THREE.Points(pointsGeo, pointsMat));

    const linePositions = new Float32Array(NODE_COUNT * NODE_COUNT * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.34 });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
      requestAnimationFrame(animate);

      camera.position.x += (state.mouseX * 1.2 - camera.position.x) * 0.04;
      camera.position.y += (state.mouseY * 0.9 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -2);

      const posAttr = pointsGeo.attributes.position;
      for (let i = 0; i < NODE_COUNT; i++) {
        let x = posAttr.getX(i) + velocities[i].x;
        let y = posAttr.getY(i) + velocities[i].y;
        let z = posAttr.getZ(i) + velocities[i].z;

        if (x > 16 || x < -16) velocities[i].x *= -1;
        if (y > 10 || y < -10) velocities[i].y *= -1;
        if (z > 3 || z < -12) velocities[i].z *= -1;
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;

      let ptr = 0;
      const thresholdSq = 18.5;
      for (let i = 0; i < NODE_COUNT; i++) {
        const ax = posAttr.getX(i), ay = posAttr.getY(i), az = posAttr.getZ(i);
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const bx = posAttr.getX(j), by = posAttr.getY(j), bz = posAttr.getZ(j);
          const dx = ax - bx, dy = ay - by, dz = az - bz;
          if (dx * dx + dy * dy + dz * dz < thresholdSq) {
            linePositions[ptr++] = ax;
            linePositions[ptr++] = ay;
            linePositions[ptr++] = az;
            linePositions[ptr++] = bx;
            linePositions[ptr++] = by;
            linePositions[ptr++] = bz;
          }
        }
      }
      lineGeo.setDrawRange(0, ptr / 3);
      lineGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();
  }

  function boot() {
    initSplashAndHero3D();
    initBackground3D();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
