import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

/**
 * AmbientParticles - a low-density, slow-drifting particle field used as a
 * background layer inside the authenticated app shell. Non-interactive (pointer
 * events disabled at the parent) and cheap enough to run everywhere.
 */
function Field({ count = 320 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.015;
    ref.current.rotation.x += dt * 0.004;
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
      <pointsMaterial color="#00DDEB" size={0.018} sizeAttenuation transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

export default function AmbientParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-70" aria-hidden>
      <Canvas dpr={[1, 1.25]} camera={{ position: [0, 0, 8], fov: 55 }} gl={{ antialias: true, alpha: true }}>
        <Field />
        <fog attach="fog" args={["#050505", 6, 12]} />
      </Canvas>
    </div>
  );
}
