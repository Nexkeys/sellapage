// src/components/Reveal.jsx
// Scroll-reveal wrapper for public marketing pages only (Home, Pricing,
// Blog, Jobs, Success Stories, compare pages, etc.) — not the dashboard,
// admin, or vendor storefronts. Fades + slides an element in once, the
// first time it scrolls into view. Built on plain Tailwind transition/
// opacity/translate utilities (no animation library) so it works
// regardless of whether tailwindcss-animate is present.
import { useInView } from '../hooks/useInView'

const DIRECTIONS = {
  up: 'translate-y-6',
  down: '-translate-y-6',
  left: 'translate-x-6',
  right: '-translate-x-6',
  none: '',
}

export default function Reveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  as: Tag = 'div',
  ...rest
}) {
  const [ref, inView] = useInView()
  const offset = DIRECTIONS[direction] || DIRECTIONS.up

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${offset}`} ${className}`}
      style={inView && delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
