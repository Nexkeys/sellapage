// src/components/SellaLogo.jsx
// Sella's own logo (public/sella/, made from the artwork in
// public/Sella-AI-Logo(1024x1024).png, trimmed of its empty margin so it reads
// at icon sizes). Used wherever Sella is represented, in place of the generic
// sparkle icon it used to borrow.
//
// Takes `size` and `className` like a lucide icon, so it drops into places
// that render an icon component from a list (`{ Icon: SellaLogo }`).

export default function SellaLogo({ size = 24, className = "", title = "" }) {
  const px = Number(size) || 24;
  return (
    <img
      src={px > 64 ? "/sella/sella-logo-256.webp" : "/sella/sella-logo-128.webp"}
      width={px}
      height={px}
      alt={title}
      aria-hidden={title ? undefined : "true"}
      draggable="false"
      className={`inline-block flex-shrink-0 object-contain select-none ${className}`}
      style={{ width: px, height: px }}
    />
  );
}
