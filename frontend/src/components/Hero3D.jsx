import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Hero3D
 * A rotating wireframe icosahedron (representing a scanned "identity mesh")
 * inside two contra-rotating rings, wrapped by a starfield of data particles,
 * with a horizontal laser scan plane sweeping vertically.
 * Colors: cyan primary + red threat highlight.
 * Uses only @react-three/fiber + three (no drei) for React 19 compatibility.
 */

function MeshCore() {
  const iso = useRef();
  const ring1 = useRef();
  const ring2 = useRef();

  useFrame((_, dt) => {
    if (iso.current) {
      iso.current.rotation.x += dt * 0.18;
      iso.current.rotation.y += dt * 0.24;
    }
    if (ring1.current) ring1.current.rotation.z += dt * 0.35;
    if (ring2.current) ring2.current.rotation.x -= dt * 0.42;
  });

  return (
    <group>
      <mesh ref={iso}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshBasicMaterial wireframe color="#00DDEB" transparent opacity={0.85} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.36, 1]} />
        <meshBasicMaterial wireframe color="#FF3B30" transparent opacity={0.18} />
      </mesh>
      <mesh ref={ring1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.1, 0.008, 8, 128]} />
        <meshBasicMaterial color="#00DDEB" transparent opacity={0.55} />
      </mesh>
      <mesh ref={ring2} rotation={[0, 0, Math.PI / 3]}>
        <torusGeometry args={[2.4, 0.006, 8, 128]} />
        <meshBasicMaterial color="#00DDEB" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Particles({ count = 900 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.03;
      ref.current.rotation.x += dt * 0.008;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#7EE7F5"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </points>
  );
}

function ScanPlane() {
  const ref = useRef();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts = new Float32Array([-2.6, 0, 0, 2.6, 0, 0]);
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() % 3;
    ref.current.position.y = -1.6 + (t / 3) * 3.2;
  });
  return (
    <group ref={ref}>
      <line geometry={geo}>
        <lineBasicMaterial color="#00DDEB" transparent opacity={0.9} />
      </line>
      <line geometry={geo} position={[0, 0, 0.5]}>
        <lineBasicMaterial color="#00DDEB" transparent opacity={0.35} />
      </line>
      <line geometry={geo} position={[0, 0, -0.5]}>
        <lineBasicMaterial color="#00DDEB" transparent opacity={0.35} />
      </line>
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="hero-3d">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 5.4], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 3]} intensity={1.2} color="#00DDEB" />
        <pointLight position={[-4, -3, -2]} intensity={0.6} color="#FF3B30" />
        <MeshCore />
        <ScanPlane />
        <Particles />
        <gridHelper args={[24, 40, "#003a44", "#001e24"]} position={[0, -2, 0]} />
        <fog attach="fog" args={["#050505", 6, 12]} />
      </Canvas>
    </div>
  );
}
