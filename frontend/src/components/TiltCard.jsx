import { useRef } from "react";

/**
 * TiltCard - lightweight 3D perspective tilt on mouse hover.
 * Wraps children with a div that applies transform: rotateX / rotateY based
 * on cursor position within the card. Pure CSS transforms, no libraries.
 */
export default function TiltCard({ children, className = "", intensity = 8 }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0..1
    const y = (e.clientY - rect.top) / rect.height;   // 0..1
    const rx = (0.5 - y) * intensity;                 // rotateX
    const ry = (x - 0.5) * intensity;                 // rotateY
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    // Position accent glow
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative transition-transform duration-150 ease-out will-change-transform ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(0,221,235,0.10), transparent 60%)",
      }}
    >
      {children}
    </div>
  );
}
