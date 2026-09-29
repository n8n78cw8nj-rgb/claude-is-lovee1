import { ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import QRCode from 'qrcode';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Particles } from './Particles';

/** 0.01 рад за кадр при 60 fps — медленное постоянное вращение */
const ROTATION_PER_FRAME = 0.01;
const MODEL_URL = './models/monument.glb';

/* ------------------------ процедурные текстуры ------------------------ */

function graniteTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2b2e36';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random();
    ctx.fillStyle =
      v > 0.97 ? 'rgba(210,200,185,0.55)' : v > 0.85 ? 'rgba(90,92,100,0.5)' : v > 0.5 ? 'rgba(40,42,50,0.6)' : 'rgba(5,5,8,0.6)';
    const r = Math.random() * (v > 0.97 ? 1.6 : 2.6);
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.5, 1.5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function engravingTexture() {
  const W = 700;
  const H = 1000;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const gold = ctx.createLinearGradient(0, 0, 0, H);
  gold.addColorStop(0, '#F0D9A8');
  gold.addColorStop(0.5, '#D4B07A');
  gold.addColorStop(1, '#B8925A');
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;

  // медальон-портрет
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(W / 2, 250, 125, 160, 0, 0, Math.PI * 2);
  ctx.clip();
  const sep = ctx.createLinearGradient(0, 90, 0, 410);
  sep.addColorStop(0, '#c9ab83');
  sep.addColorStop(1, '#5a4430');
  ctx.fillStyle = sep;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(35,25,15,0.85)';
  ctx.beginPath();
  ctx.ellipse(W / 2, 225, 52, 66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(W / 2, 420, 125, 120, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 8;
  ctx.strokeStyle = gold;
  ctx.beginPath();
  ctx.ellipse(W / 2, 250, 131, 166, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = gold;
  ctx.textAlign = 'center';
  ctx.font = '700 58px "PT Serif", Georgia, serif';
  ctx.fillText('ИВАНОВ', W / 2, 510);
  ctx.font = '400 44px "PT Serif", Georgia, serif';
  ctx.fillText('ИВАН ИВАНОВИЧ', W / 2, 570);
  ctx.font = '400 40px "PT Serif", Georgia, serif';
  ctx.fillText('1923 — 1998', W / 2, 635);
  ctx.fillRect(W / 2 - 80, 665, 160, 3);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** QR рисуется синхронно по матрице модулей — без асинхронной загрузки текстуры */
function qrTexture(text: string) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const margin = 2;
  const n = modules.size + margin * 2;
  const px = Math.ceil(512 / n);
  const c = document.createElement('canvas');
  c.width = c.height = n * px;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#000';
  for (let y = 0; y < modules.size; y++)
    for (let x = 0; x < modules.size; x++)
      if (modules.get(x, y)) ctx.fillRect((x + margin) * px, (y + margin) * px, px, px);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

/* ------------------------ модель памятника ------------------------ */

function steleGeometry() {
  const w = 0.8;
  const shape = new THREE.Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, 2.0);
  shape.absarc(0, 2.0, w, 0, Math.PI, false);
  shape.lineTo(-w, 0);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 4,
    curveSegments: 48,
  });
  g.translate(0, 0, -0.13);
  return g;
}

function ProceduralMonument() {
  const granite = useMemo(graniteTexture, []);
  // гравировку перерисовываем, когда загрузится PT Serif
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true));
  }, []);
  const engraving = useMemo(engravingTexture, [fontsReady]);
  const stele = useMemo(steleGeometry, []);
  const qr = useMemo(() => qrTexture('https://наследие.рф'), []);
  const front = 0.13 + 0.03 + 0.004;

  const stone = (
    <meshStandardMaterial map={granite} color="#d4d6de" roughness={0.3} metalness={0.05} envMapIntensity={0.9} />
  );
  const gold = <meshStandardMaterial color="#C9A46A" metalness={0.9} roughness={0.28} />;

  return (
    <group position={[0, -1.35, 0]}>
      {/* постамент */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.32, 1.0]} />
        {stone}
      </mesh>
      <mesh position={[0, 0.41, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.18, 0.7]} />
        {stone}
      </mesh>
      {/* стела */}
      <mesh geometry={stele} position={[0, 0.5, 0]} castShadow receiveShadow>
        {stone}
      </mesh>
      {/* гравировка */}
      <mesh position={[0, 0.5 + 1.62, front]}>
        <planeGeometry args={[1.26, 1.8]} />
        <meshStandardMaterial
          map={engraving}
          emissiveMap={engraving}
          emissive="#ffffff"
          emissiveIntensity={0.35}
          transparent
          metalness={0.5}
          roughness={0.35}
        />
      </mesh>
      {/* крест над медальоном */}
      <group position={[0, 0.5 + 2.58, front]}>
        <mesh>
          <boxGeometry args={[0.035, 0.22, 0.01]} />
          {gold}
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.13, 0.035, 0.01]} />
          {gold}
        </mesh>
      </group>
      {/* QR-табличка: небольшая, в правом нижнем углу лицевой стороны.
          Масштаб: стела 1.6 ед. ≈ 60 см, т.е. 1 ед. ≈ 37,5 см → табличка 0.13 ед. ≈ 4,9 см */}
      <group position={[0.8 - 0.06 - 0.065, 0.5 + 0.06 + 0.065, front]}>
        <mesh position={[0, 0, -0.002]}>
          <boxGeometry args={[0.13, 0.13, 0.008]} />
          {gold}
        </mesh>
        <mesh position={[0, 0, 0.0025]}>
          <planeGeometry args={[0.115, 0.115]} />
          <meshStandardMaterial map={qr} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function GlbMonument() {
  const { scene } = useGLTF(MODEL_URL);
  const obj = useMemo(() => {
    const clone = scene.clone(true);
    // нормализуем размер под сцену: высота ≈ 3.3
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const s = 3.3 / (size.y || 1);
    clone.scale.setScalar(s);
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
    clone.position.set(-center.x, -box.min.y * s - 1.35, -center.z);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
    });
    return clone;
  }, [scene]);
  return <primitive object={obj} />;
}

/** Проверяем, положил ли пользователь свою модель в public/models/monument.glb */
function useHasGlb() {
  const [has, setHas] = useState(false);
  useEffect(() => {
    fetch(MODEL_URL, { method: 'HEAD' })
      .then((r) => {
        const type = r.headers.get('content-type') ?? '';
        setHas(r.ok && !type.includes('html'));
      })
      .catch(() => setHas(false));
  }, []);
  return has;
}

function Rig({ children }: { children: React.ReactNode }) {
  const spin = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (spin.current) spin.current.rotation.y += ROTATION_PER_FRAME * delta * 60;
    if (tilt.current) {
      const tx = hovered ? -state.pointer.y * 0.18 : 0;
      const tz = hovered ? -state.pointer.x * 0.08 : 0;
      tilt.current.rotation.x = THREE.MathUtils.lerp(tilt.current.rotation.x, tx, 0.06);
      tilt.current.rotation.z = THREE.MathUtils.lerp(tilt.current.rotation.z, tz, 0.06);
    }
  });

  return (
    <group ref={tilt} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <group ref={spin}>{children}</group>
    </group>
  );
}

export function Monument3D({ className = '' }: { className?: string }) {
  const hasGlb = useHasGlb();
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // не рендерим сцену, когда Hero прокручен за экран — экономим батарею и CPU
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className={className}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 6.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <ambientLight intensity={0.6} color="#b8c0d8" />
        {/* окружение из световых панелей — без загрузки HDR из сети, работает офлайн */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} color="#FFE2B0" position={[3, 3, 4]} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#E8A860" position={[-4, 1, 2]} scale={[3, 4, 1]} />
          <Lightformer form="ring" intensity={1.2} color="#8fa0d0" position={[0, 4, -4]} scale={3} />
          <Lightformer form="rect" intensity={0.6} color="#ffffff" position={[0, -3, 3]} rotation-x={Math.PI / 2} scale={[6, 2, 1]} />
        </Environment>
        {/* два тёплых источника */}
        <directionalLight
          position={[3.5, 5, 4]}
          intensity={3.2}
          color="#FFD9A0"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-3.5, 1.5, 2.5]} intensity={18} distance={14} color="#E8A860" />
        <pointLight position={[0, 3, -4]} intensity={10} distance={12} color="#6a7bb0" />

        <Rig>
          <Suspense fallback={<ProceduralMonument />}>{hasGlb ? <GlbMonument /> : <ProceduralMonument />}</Suspense>
        </Rig>
        <Particles />
        <ContactShadows position={[0, -1.36, 0]} opacity={0.65} scale={9} blur={2.6} far={3} color="#000" />
      </Canvas>
    </div>
  );
}
