import { useEffect, useRef, useState } from 'react'
import {
  motion, useMotionValue, useSpring, useTransform, useInView, animate, useReducedMotion,
} from 'motion/react'

export function useFinePointer() {
  const [fine, setFine] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const on = () => setFine(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return fine
}

/* Elements fly in from a side (or from below) while spinning, then settle in place. */
/* Phones get a short, flat version of each entrance: big 3D travel is what makes a small screen stutter. */
const SMALL = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
const FROM = SMALL ? {
  left:   { x: -36, y: 24 },
  right:  { x: 36,  y: 24 },
  bottom: { x: 0,   y: 44 },
  spin:   { x: 0,   y: 44, rotate: -10, scale: 0.9 },
  zoom:   { x: 0,   y: 20, scale: 0.92 },
} : {
  left:   { x: -140, y: 30,  rotate: -10, rotateY: 20 },
  right:  { x: 140,  y: 30,  rotate: 10,  rotateY: -20 },
  bottom: { x: 0,    y: 110, rotate: 0,   rotateX: 28 },
  spin:   { x: 0,    y: 80,  rotate: -160, scale: 0.5 },
  zoom:   { x: 0,    y: 30,  rotate: 0,   scale: 0.8 },
}

export function Reveal({ from = 'bottom', delay = 0, className = '', children, as = 'div', amount = 0.2, ...rest }) {
  const reduce = useReducedMotion()
  const M = motion[as]
  const start = FROM[from]
  return (
    <M
      className={className}
      style={SMALL ? undefined : { transformPerspective: 1200 }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, ...start }}
      whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0, scale: 1 }}
      viewport={{ once: true, amount: SMALL ? Math.min(amount, 0.08) : amount, margin: '0px 0px 12% 0px' }}
      transition={{ type: 'spring', stiffness: SMALL ? 170 : 120, damping: SMALL ? 26 : 20, mass: 0.9, delay: SMALL ? delay * 0.4 : delay }}
      {...rest}
    >
      {children}
    </M>
  )
}

/* Card that tilts toward the cursor, lifts under it, and shows a moving spotlight. */
export function Tilt({ children, className = '', max = 10, lift = 26, as = 'div', ...rest }) {
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const rx = useSpring(0, { stiffness: 180, damping: 18 })
  const ry = useSpring(0, { stiffness: 180, damping: 18 })
  const z = useSpring(0, { stiffness: 180, damping: 20 })
  const active = fine && !reduce
  const M = motion[as]

  function move(e) {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    if (!active) return
    ry.set((px - 0.5) * max * 2)
    rx.set(-(py - 0.5) * max * 2)
    z.set(lift)
  }
  function leave() { rx.set(0); ry.set(0); z.set(0) }

  return (
    <M
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`spot ${className}`}
      style={{ rotateX: rx, rotateY: ry, z, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      {...rest}
    >
      {children}
    </M>
  )
}

/* Pulls toward the cursor while hovered. */
export function Magnetic({ children, strength = 0.35, className = '' }) {
  const fine = useFinePointer()
  const x = useSpring(0, { stiffness: 220, damping: 14 })
  const y = useSpring(0, { stiffness: 220, damping: 14 })
  const ref = useRef(null)
  return (
    <motion.span
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (!fine) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onPointerLeave={() => { x.set(0); y.set(0) }}
    >
      {children}
    </motion.span>
  )
}

/* Dot + trailing ring cursor; the ring grows over anything clickable.
   Both follow springs (dot tight, ring loose) so motion stays fluid between pointer events,
   and React only re-renders when the hover/press state actually changes. */
export function Cursor() {
  const fine = useFinePointer()
  const mx = useMotionValue(-100), my = useMotionValue(-100)
  const dx = useSpring(mx, { stiffness: 1100, damping: 60, mass: 0.25 })
  const dy = useSpring(my, { stiffness: 1100, damping: 60, mass: 0.25 })
  const rx = useSpring(mx, { stiffness: 170, damping: 22, mass: 0.5 })
  const ry = useSpring(my, { stiffness: 170, damping: 22, mass: 0.5 })
  const [hover, setHover] = useState(false)
  const [down, setDown] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!fine) return
    document.documentElement.classList.add('has-cursor')
    let first = true, lastHover = false
    const mv = (e) => {
      if (first) { mx.jump(e.clientX); my.jump(e.clientY); dx.jump(e.clientX); dy.jump(e.clientY); rx.jump(e.clientX); ry.jump(e.clientY); first = false; setShown(true) }
      else { mx.set(e.clientX); my.set(e.clientY) }
      const h = !!e.target.closest?.('a,button,[role="button"],[data-cursor]')
      if (h !== lastHover) { lastHover = h; setHover(h) }
    }
    const d = () => setDown(true), u = () => setDown(false)
    const out = (e) => { if (!e.relatedTarget) setShown(false) }
    const over = () => setShown(true)
    window.addEventListener('pointermove', mv, { passive: true })
    window.addEventListener('pointerdown', d)
    window.addEventListener('pointerup', u)
    document.addEventListener('pointerout', out)
    document.addEventListener('pointerover', over)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerdown', d)
      window.removeEventListener('pointerup', u)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('pointerover', over)
    }
  }, [fine, mx, my, dx, dy, rx, ry])

  if (!fine) return null
  return (
    <>
      <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[100] size-2 rounded-full bg-white will-change-transform"
        style={{ x: dx, y: dy, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: shown ? 1 : 0, scale: hover ? 0.5 : 1 }} transition={{ duration: 0.2 }} />
      <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[99] size-[34px] rounded-full border border-white/60 will-change-transform"
        style={{ x: rx, y: ry, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: shown ? 1 : 0, scale: (hover ? 1.9 : 1) * (down ? 0.8 : 1), backgroundColor: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0)' }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }} />
    </>
  )
}

/* Red / green / black backdrop: drifting colour fields, a faint grid and a glow that follows the cursor. */
export function Backdrop() {
  const reduce = useReducedMotion()
  const gx = useMotionValue(50), gy = useMotionValue(30)
  const sx = useSpring(gx, { stiffness: 40, damping: 20 }), sy = useSpring(gy, { stiffness: 40, damping: 20 })
  const fine = useFinePointer()
  /* The glow is a fixed-size layer moved with a transform, so following the cursor never repaints the page. */
  const glowX = useTransform(sx, (v) => `calc(${v}vw - 600px)`), glowY = useTransform(sy, (v) => `calc(${v}vh - 600px)`)
  useEffect(() => {
    if (!fine) return
    const mv = (e) => { gx.set(e.clientX / innerWidth * 100); gy.set(e.clientY / innerHeight * 100) }
    window.addEventListener('pointermove', mv, { passive: true })
    return () => window.removeEventListener('pointermove', mv)
  }, [fine, gx, gy])
  const drift = (a) => (reduce || SMALL) ? {} : { animate: a, transition: { duration: 26, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[linear-gradient(160deg,#170408_0%,#08090a_45%,#02130b_100%)]">
      <motion.div className="absolute -left-[25%] -top-[30%] h-[100vh] w-[100vw] will-change-transform [background:radial-gradient(closest-side,rgba(179,18,46,.42),transparent)]"
        {...drift({ x: [0, 120, -40], y: [0, 80, 140] })} />
      <motion.div className="absolute -right-[25%] top-[8%] h-[105vh] w-[90vw] will-change-transform [background:radial-gradient(closest-side,rgba(14,138,82,.36),transparent)]"
        {...drift({ x: [0, -140, 30], y: [0, -60, 90] })} />
      <motion.div className="absolute -bottom-[40%] left-0 h-[90vh] w-[85vw] will-change-transform [background:radial-gradient(closest-side,rgba(127,13,34,.34),transparent)]"
        {...drift({ x: [0, 90, -60], y: [0, -90, 0] })} />
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
      {fine && <motion.div className="absolute left-0 top-0 size-[1200px] will-change-transform [background:radial-gradient(closest-side,rgba(52,211,153,.10),transparent)]" style={{ x: glowX, y: glowY }} />}
    </div>
  )
}

/* Letters rise and spin into place one after another. */
export function SplitText({ text, className = '', delay = 0, gradient = false }) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  const n = text.replace(/ /g, '').length
  let i = 0
  return (
    <span className={className} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {[...w].map((ch) => {
            const k = i++
            const d = delay + k * 0.022
            /* background-clip:text does not reach transformed children, so each letter carries its slice of the gradient */
            const g = gradient ? { backgroundSize: `${n * 100}% 100%`, backgroundPosition: `${n > 1 ? (k / (n - 1)) * 100 : 0}% 0` } : undefined
            return (
              <motion.span key={k} style={g} className={`inline-block ${gradient ? 'text-gradient' : ''}`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: '80%', rotate: 20 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 16, delay: d }}>
                {ch}
              </motion.span>
            )
          })}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  )
}

/* Counts up when scrolled into view. */
export function Counter({ to, decimals = 0, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  // Starts at the real value so the number is right before (or without) the count-up.
  const [v, setV] = useState(to)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: setV })
    return () => c.stop()
  }, [inView, to])
  return <span ref={ref}>{prefix}{v.toFixed(decimals)}{suffix}</span>
}
