import { config } from './config.js';
import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    console.log('Creating ParticleSystem instance...');
    this.scene = scene;
    this.particles = [];
    this.particleSystem = null;
    this.particleCount = config.PARTICLES.COUNT;
    this.mouthThreshold = config.PARTICLES.MOUTH_THRESHOLD;
    this.mouthDepth = config.PARTICLES.MOUTH_DEPTH;
    this.mouthOpeningFactor = config.PARTICLES.MOUTH_OPENING_FACTOR;
    this.lerpSpeed = config.PARTICLES.LERP_SPEED;
    this.rotationSpeed = config.PARTICLES.ANIMATION.ROTATION_SPEED;
    this.movementSpeed = config.PARTICLES.ANIMATION.MOVEMENT_SPEED;
    this.effects = config.PARTICLES.EFFECTS;
    this.geometryBuffer = null;
    this.pos = null;
    this.sizeArr = null;
    this.col = null;
    this.idle = null;
    this.clock = new THREE.Clock();
    this.speaking = false;
    this.analyser = null;
    this.dataArray = null;
    this.renderer = null;
    this.camera = null;
    this.isInitialized = false;
  }

  init() {
    console.log('Initializing particle system...');
    try {
      const { pos, sizeArr, col, idle } = this.initParticleBuffers();
      this.pos = pos;
      this.sizeArr = sizeArr;
      this.col = col;
      this.idle = idle;
      const { particles, geometryBuffer } = this.createParticles();
      this.particles = particles;
      this.geometryBuffer = geometryBuffer;
      this.isInitialized = true;
      console.log('Particle system initialized successfully');
      this.animate();
    } catch (error) {
      console.error('Error initializing particle system:', error);
      throw error;
    }
  }

  initParticleBuffers() {
    console.log('Creating particle buffers...');
    const pos = new Float32Array(config.PARTICLES.COUNT * 3);
    const sizeArr = new Float32Array(config.PARTICLES.COUNT);
    const col = new Float32Array(config.PARTICLES.COUNT * 3);
    const idle = new Float32Array(config.PARTICLES.COUNT * 3);

    for (let i = 0; i < config.PARTICLES.COUNT; i++) {
      const i3 = i * 3;
      const r = Math.cbrt(Math.random()) * 8;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      idle[i3] = pos[i3] = r * Math.sin(ph) * Math.cos(th);
      idle[i3 + 1] = pos[i3 + 1] = r * Math.sin(ph) * Math.sin(th);
      idle[i3 + 2] = pos[i3 + 2] = r * Math.cos(ph);
      sizeArr[i] = 6;
      col[i3] = 0.2 + 0.8 * Math.random();
      col[i3 + 1] = 0.6 + 0.4 * Math.random();
      col[i3 + 2] = 1;
    }
    console.log('Particle buffers created successfully');
    return { pos, sizeArr, col, idle };
  }

  createParticles() {
    console.log('Creating particles...');
    const geometryBuffer = new THREE.BufferGeometry();
    geometryBuffer.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geometryBuffer.setAttribute('size', new THREE.BufferAttribute(this.sizeArr, 1));
    geometryBuffer.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    
    const material = new THREE.ShaderMaterial({
      uniforms: { 
        tex: { value: new THREE.TextureLoader().load(config.ASSETS.PARTICLE_TEXTURE) } 
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D tex;
        varying vec3 vColor;
        void main() {
          vec4 c = vec4(vColor, 1.0) * texture2D(tex, gl_PointCoord);
          if (c.a < .1) discard;
          gl_FragColor = c;
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometryBuffer, material);
    this.scene.add(particles);
    console.log('Particles created and added to scene');
    return { particles, geometryBuffer };
  }

  setAnalyser(analyser) {
    console.log('Setting audio analyser...');
    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  setSpeaking(speaking) {
    this.speaking = speaking;
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  animate() {
    if (!this.isInitialized) {
      console.warn('Particle system not initialized, skipping animation');
      return;
    }

    requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Update particle positions
    for (let i = 0; i < config.PARTICLES.COUNT; i++) {
      const i3 = i * 3;
      this.pos[i3] += Math.sin(t * 0.07 + this.idle[i3]) * config.PARTICLES.ANIMATION.MOVEMENT_SPEED;
      this.pos[i3 + 1] += Math.cos(t * 0.09 + this.idle[i3 + 1]) * config.PARTICLES.ANIMATION.MOVEMENT_SPEED;
    }

    // Update based on audio
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray);
      const vol = this.dataArray.reduce((s, v) => s + v, 0) / this.dataArray.length / 255;
      
      // Update particle sizes
      for (let i = 0; i < config.PARTICLES.COUNT; i++) {
        this.sizeArr[i] = 6 + vol * 18;
      }
      this.geometryBuffer.attributes.size.needsUpdate = true;

      // Update particle positions based on audio
      if (this.speaking) {
        for (let i = 0; i < config.PARTICLES.COUNT; i++) {
          const i3 = i * 3;
          const r = Math.sqrt(this.pos[i3] * this.pos[i3] + this.pos[i3 + 1] * this.pos[i3 + 1]);
          const angle = Math.atan2(this.pos[i3 + 1], this.pos[i3]);
          const newR = r * (1 + vol * 0.2);
          this.pos[i3] = newR * Math.cos(angle);
          this.pos[i3 + 1] = newR * Math.sin(angle);
        }
      }
      this.geometryBuffer.attributes.position.needsUpdate = true;
    } else {
      this.geometryBuffer.attributes.position.needsUpdate = true;
    }

    this.particles.rotation.y += config.PARTICLES.ANIMATION.ROTATION_SPEED;

    // Render the scene
    if (this.renderer && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize(camera, renderer) {
    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    if (renderer) {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
} 