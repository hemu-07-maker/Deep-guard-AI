/**
 * HudFrame - decorative corner brackets that wrap children with a
 * threat-console style HUD frame (top-left, top-right, bottom-left, bottom-right).
 * Purely visual; children are rendered inline.
 */
export default function HudFrame({ children, className = "", accent = "#00DDEB" }) {
  const corner = "absolute w-4 h-4 border-cyan-400";
  return (
    <div className={`relative ${className}`}>
      <span className={`${corner} top-0 left-0 border-t border-l`} style={{ borderColor: accent }} />
      <span className={`${corner} top-0 right-0 border-t border-r`} style={{ borderColor: accent }} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} style={{ borderColor: accent }} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} style={{ borderColor: accent }} />
      {children}
    </div>
  );
}
