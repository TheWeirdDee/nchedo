"use client";

/**
 * Uli is the Igbo line-drawing tradition — thin curvilinear figures, indigo on
 * skin or on a wall. This is a shell drawn in that register: concentric rings
 * around something kept, with the outermost ring broken open.
 *
 * The break is the point. Nchedo does not claim the shell is whole.
 */
export function Mark({ size = 26, alarm = false }: { size?: number; alarm?: boolean }) {
  const stroke = alarm ? "var(--color-oxide-hi)" : "var(--color-brass-hi)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* outer ring, broken at the top-right */}
      <path
        d="M16 2.5 A13.5 13.5 0 1 0 27.4 9"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="9" stroke={stroke} strokeWidth="1" opacity="0.62" />
      <circle cx="16" cy="16" r="4.8" stroke={stroke} strokeWidth="1" opacity="0.4" />
      <circle cx="16" cy="16" r="1.7" fill={stroke} />
      {/* the way in */}
      <path d="M27.4 9 L31 5.6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
