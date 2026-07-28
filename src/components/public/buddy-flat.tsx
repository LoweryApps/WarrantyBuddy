// Flat Buddy mark for the public recall pages — teal shield, navy features,
// no gradient (the "flat Buddy" brand variant, matching the template sketch and
// the app icon). Self-contained SVG so it needs no external asset.
export function BuddyFlat({
  width = 24,
  height = 28,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 118"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M50 4 C63 11 79 15 93 15 C93 48 89 80 50 114 C11 80 7 48 7 15 C21 15 37 11 50 4 Z"
        fill="#00C2A8"
      />
      <circle cx="36" cy="47" r="6.5" fill="#0F1F3D" />
      <circle cx="38.2" cy="44.8" r="2" fill="#fff" />
      <circle cx="64" cy="47" r="6.5" fill="#0F1F3D" />
      <circle cx="66.2" cy="44.8" r="2" fill="#fff" />
      <path d="M36 63 Q50 74 64 63" fill="none" stroke="#0F1F3D" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M40 88 L48 96 L63 78"
        fill="none"
        stroke="#0F1F3D"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
