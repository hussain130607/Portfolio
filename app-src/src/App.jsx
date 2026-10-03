import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useTransform, MotionConfig } from 'motion/react'
import Lenis from 'lenis'
import { Reveal, Tilt, Magnetic, Cursor, Backdrop, SplitText, Counter } from './fx.jsx'
import SKILLS from './skills.json'

const EMAIL = 'hussainmuhammadabdullah130607@gmail.com'
const GITHUB = 'https://github.com/hussain130607'
const LINKEDIN = 'https://www.linkedin.com/in/hussain130607/'

const DEMOS = {
  giftr: { title: 'Gift R', sub: 'Storefront with sample data', src: 'demos/gift-r/index.html', kind: 'web' },
  craftybay: { title: 'Crafty Bay', sub: 'Flutter web build', src: 'demos/crafty-bay/index.html', kind: 'phone' },
  ledger: { title: 'Pocket Ledger', sub: 'Saved in your browser', src: 'demos/pocket-ledger/index.html', kind: 'phone' },
  board: { title: 'Sprint Board', sub: 'Drag cards between columns', src: 'demos/taskboard/index.html', kind: 'web' },
  quiz: { title: 'Dart and Flutter Quiz', sub: 'Seven questions', src: 'demos/dart-quiz/index.html', kind: 'web' },
}

const NAV = [['work', 'Work'], ['apps', 'Apps'], ['about', 'About'], ['skills', 'Skills'], ['certificates', 'Certificates'], ['contact', 'Contact']]
const ROLES = ['Android apps in Flutter', 'web stores on Supabase', 'apps backed by Firebase', 'a voice assistant in Python']

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

function Btn({ children, solid, href, onClick, ...rest }) {
  const cls = `group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-colors ${
    solid ? 'bg-white text-ink hover:bg-emerald-300' : 'glass text-white hover:bg-white/15'}`
  const El = href ? 'a' : 'button'
  return (
    <Magnetic>
      <El className={cls} href={href} onClick={onClick} {...rest}>{children}</El>
    </Magnetic>
  )
}

function Nav({ lenis }) {
  const [active, setActive] = useState('')
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' })
    NAV.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el) })
    const on = () => setScrolled(scrollY > 40)
    on(); addEventListener('scroll', on, { passive: true })
    return () => { io.disconnect(); removeEventListener('scroll', on) }
  }, [])
  const go = (e, id) => { e.preventDefault(); const el = document.getElementById(id); lenis.current ? lenis.current.scrollTo(el, { offset: -90 }) : el.scrollIntoView() }
  return (
    <motion.header initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      className="fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <nav aria-label="Sections" className={`navbar flex max-w-full items-center gap-1 rounded-full p-1.5 transition-shadow ${scrolled ? 'shadow-2xl' : ''}`}>
        <a href="#top" onClick={(e) => go(e, 'top')} className="rounded-full px-2.5 py-2 font-display text-sm font-bold tracking-tight sm:px-3">HMA</a>
        <div className="flex items-center overflow-x-auto [scrollbar-width:none]">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(e) => go(e, id)}
              className={`relative whitespace-nowrap rounded-full px-2.5 py-2 text-sm transition-colors sm:px-3 ${active === id ? 'text-white' : 'text-white/60 hover:text-white'} ${['apps', 'certificates'].includes(id) ? 'max-sm:hidden' : ''} ${id === 'skills' ? 'max-[359px]:hidden' : ''}`}>
              {active === id && <motion.span layoutId="navpill" className="absolute inset-0 -z-10 rounded-full bg-white/12 ring-1 ring-white/15" transition={{ type: 'spring', stiffness: 300, damping: 28 }} />}
              {label}
            </a>
          ))}
        </div>
      </nav>
    </motion.header>
  )
}

function Progress() {
  const { scrollYProgress } = useScroll()
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-rose-500 via-amber-200 to-emerald-400" style={{ scaleX: x }} />
}

function RoleCycler() {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((v) => (v + 1) % ROLES.length), 2600); return () => clearInterval(t) }, [])
  return (
    <span className="relative inline-grid h-[1.625em] overflow-hidden whitespace-nowrap align-top">
      <AnimatePresence mode="popLayout">
        <motion.span key={i} className="text-gradient font-semibold"
          initial={{ y: '100%', rotateX: -80, opacity: 0 }} animate={{ y: 0, rotateX: 0, opacity: 1 }} exit={{ y: '-100%', rotateX: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}>{ROLES[i]}</motion.span>
      </AnimatePresence>
    </span>
  )
}

function Hero({ go }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 160])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  return (
    <section id="top" ref={ref} className="relative mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-5 pb-14 pt-24 md:grid-cols-[1.25fr_1fr] md:gap-12 md:px-8 md:pb-16 md:pt-28">
      <motion.div style={{ y, opacity: fade }}>
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: 0.05 }}
          className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-white/80">
          <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" /></span>
          Open to internships and junior roles · remote or onsite
        </motion.div>
        <h1 className="font-display text-[clamp(2.6rem,7.2vw,5.6rem)] font-bold leading-[0.98] tracking-tight">
          <SplitText text="Hussain Muhammad" delay={0.1} /><br />
          <SplitText text="Abdullah" delay={0.42} gradient />
        </h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 md:text-xl">
          Flutter developer in Dhaka.<br />I build <RoleCycler />
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72 }} className="mt-8 flex flex-wrap gap-3">
          <Btn solid href="#work" onClick={(e) => go(e, 'work')}>View my work <Arrow /></Btn>
          <Btn href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub</Btn>
          <Btn href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn</Btn>
        </motion.div>
        <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-10 grid max-w-lg grid-cols-3 gap-2.5 sm:gap-3 md:mt-12">
          {[[<Counter to={100} suffix="%" />, 'Ostad assignments'], [<Counter to={92.4} decimals={1} suffix="%" />, 'Ostad quiz'], [<Counter to={100} suffix="%" />, 'Ostad live test']].map(([v, l], k) => (
            <div key={k} className="glass rounded-2xl px-3 py-3 sm:px-4">
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-2xl font-bold md:text-3xl">{v}</dd>
              <dd className="text-xs text-white/60 md:text-sm">{l}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      <motion.div initial={{ opacity: 0, rotate: 8, scale: 0.85, x: 40 }} animate={{ opacity: 1, rotate: 0, scale: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 18, delay: 0.2 }} className="relative mx-auto w-full max-w-[340px] md:max-w-[400px]">
        <Tilt className="glass relative rounded-[32px] p-3" max={12}>
          <img src="assets/photo.jpg" alt="Hussain Muhammad Abdullah" width="460" height="543"
            className="aspect-[4/5] w-full rounded-[24px] object-cover object-[50%_22%]" />
          <div className="flex items-center justify-between px-2 pb-1 pt-3 text-sm text-white/70">
            <span>Dhaka, Bangladesh</span><span className="font-display font-semibold text-white">Flutter · Firebase</span>
          </div>
        {[['Flutter', -1, '-left-3 top-10 md:-left-6'], ['Firebase', 1, '-right-3 top-1/3 md:-right-5'], ['Dart', -1, '-left-2 bottom-20 md:-left-4']].map(([n, dir, pos], k) => {
          const s = SKILLS.find((x) => x.name === n)
          return (
            <motion.div key={n} data-chip className={`glass absolute z-20 ${pos} grid size-12 place-items-center rounded-2xl !bg-[#121416]/90 shadow-xl md:size-14`}
              initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, y: [0, -12 * dir, 0] }}
              transition={{ opacity: { delay: 0.6 + k * 0.1 }, scale: { type: 'spring', delay: 0.6 + k * 0.1 }, y: { duration: 4 + k, repeat: Infinity, ease: 'easeInOut' } }}>
              <svg viewBox="0 0 24 24" className="size-7" aria-label={n}><path fill={s.color} d={s.d} /></svg>
            </motion.div>
          )
        })}
        </Tilt>
      </motion.div>

      <motion.a href="#work" onClick={(e) => go(e, 'work')} aria-label="Scroll to work" style={{ opacity: fade }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block">
        <span className="flex h-11 w-7 justify-center rounded-full border border-white/30 pt-2">
          <motion.span className="h-2.5 w-1 rounded-full bg-white/80" animate={{ y: [0, 14, 0], opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
        </span>
      </motion.a>
    </section>
  )
}

function SectionHead({ id, title, sub }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3 md:mb-12 md:gap-4">
      <Reveal from="left" as="h2" id={id} className="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-bold tracking-tight">{title}</Reveal>
      {sub && <Reveal from="right" as="p" delay={0.1} className="max-w-md text-white/60">{sub}</Reveal>}
    </div>
  )
}

function Project({ i, title, kind, body, stack, links, children }) {
  const from = i % 2 ? 'right' : 'left'
  return (
    <Reveal from={from} amount={0.12} className="mb-6 md:mb-10">
      <Tilt className="glass rounded-[24px] p-4 sm:p-5 md:rounded-[28px] md:p-8" max={3} lift={10}>
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] md:gap-10">
          <div>
            <span className="font-display text-sm text-white/40">0{i + 1}</span>
            <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl md:text-4xl">{title}</h3>
            <p className="mt-2 text-sm text-white/50">{kind}</p>
          </div>
          <div className="space-y-4 text-white/70">
            <p className="leading-relaxed">{body}</p>
            <p className="flex flex-wrap gap-2">{stack.map((s) => <span key={s} className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10">{s}</span>)}</p>
            {links && <div className="flex flex-wrap items-center gap-3 pt-1">{links}</div>}
          </div>
        </div>
        <div className="mt-6 md:mt-8">{children}</div>
      </Tilt>
    </Reveal>
  )
}

function Phones({ shots, onOpen }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
      {shots.map(([src, alt], k) => (
        <Reveal key={src} from={k % 2 ? 'spin' : 'bottom'} delay={k * 0.08} amount={0.1}>
          <motion.button type="button" onClick={() => onOpen(src, alt)} className="block w-full" whileHover={{ y: -14, rotate: k % 2 ? 2 : -2 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} aria-label={`${alt}, view full size`}>
            <img src={src} alt={alt} width="780" height="1688" loading="lazy" className="phone aspect-[390/844] w-full object-cover" />
          </motion.button>
        </Reveal>
      ))}
    </div>
  )
}

function LinkBtn({ children, onClick, href }) {
  const El = href ? 'a' : 'button'
  return (
    <El onClick={onClick} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined}
      className="inline-flex items-center gap-1.5 font-semibold text-emerald-300 hover:text-emerald-200">{children}</El>
  )
}

function Work({ openDemo, openImg }) {
  return (
    <section id="work" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 md:px-8 md:py-24">
      <SectionHead title="Selected work" sub="Gift R and Crafty Bay run in your browser. Click a screenshot to try them." />

      <Project i={0} title="Gift R" kind="Online store and admin dashboard · 2026"
        body="An online store for a gift shop in Cumilla. Customers browse by occasion, apply promo codes and check out. The owner manages products, orders, promotions and store settings from an admin dashboard. Order totals are calculated in the database, so prices can't be changed from the browser."
        stack={['HTML', 'CSS', 'JavaScript', 'Supabase', 'PostgreSQL', 'Row Level Security']}
        links={<><LinkBtn onClick={() => openDemo('giftr')}>Try the live demo <Arrow /></LinkBtn><span className="text-sm text-white/45">Sample data. Promo code GIFTR10.</span></>}>
        <motion.button type="button" onClick={() => openDemo('giftr')} whileHover={{ scale: 1.015, y: -6 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="block w-full overflow-hidden rounded-2xl ring-1 ring-white/15" aria-label="Open Gift R demo">
          <img src="assets/shots/gift-r.webp" alt="Gift R home page" width="2048" height="1280" loading="lazy" className="w-full" />
        </motion.button>
      </Project>

      <Project i={1} title="Crafty Bay" kind="Flutter e-commerce app · 2026"
        body="A shopping app built during the Ostad course. Users sign up, search products, browse categories, keep a cart and wishlist, and place orders. Firebase Auth and Firestore are the whole backend. The app is available in Bangla, English and German."
        stack={['Flutter', 'Dart', 'Provider', 'Firebase Auth', 'Cloud Firestore']}
        links={<><LinkBtn onClick={() => openDemo('craftybay')}>Try the live demo <Arrow /></LinkBtn><LinkBtn href="https://github.com/hussain130607/Craft-Bay">Source code</LinkBtn><span className="text-sm text-white/45">Create an account with any email.</span></>}>
        <Phones onOpen={openImg} shots={[['assets/shots/crafty-home.webp', 'Crafty Bay home screen'], ['assets/shots/crafty-details.webp', 'Product details'], ['assets/shots/crafty-cart.webp', 'Cart'], ['assets/shots/crafty-wishlist.webp', 'Wishlist']]} />
        <p className="mt-4 text-sm text-white/45">Screens from the app running with sample products. Click one to see it full size.</p>
      </Project>

      <Project i={2} title="GHOST" kind="Voice assistant for Windows · Python"
        body="A voice assistant that controls my PC. It listens and replies in real time through the Gemini Live API and carries out tasks with about 80 tools. It runs on the desktop, so there's no browser demo."
        stack={['Python', 'Gemini Live API', 'WebSocket', 'pywin32', 'UI Automation', 'Playwright']}>
        <motion.button type="button" onClick={() => openImg('assets/shots/ghost.webp', 'GHOST desktop window while listening')} whileHover={{ scale: 1.015, y: -6 }}
          className="block w-full overflow-hidden rounded-2xl ring-1 ring-white/15" aria-label="View GHOST screenshot full size">
          <img src="assets/shots/ghost.webp" alt="GHOST desktop window while listening, with system stats and a command box" width="1280" height="800" loading="lazy" className="w-full" />
        </motion.button>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[['Apps and files', 'Opens programs, finds, moves and edits files'], ['Code', 'Writes scripts and runs them'], ['Screen', 'Reads what is on screen and clicks through UI'], ['Web', 'Searches and works in the browser with Playwright'], ['Memory', 'Remembers context between conversations'], ['Voice', 'One live audio session for listening and speaking']].map(([t, d], k) => (
            <Reveal key={t} from={['left', 'bottom', 'right'][k % 3]} delay={k * 0.05} amount={0.3}>
              <motion.div whileHover={{ y: -6 }} className="h-full rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                <b className="font-display">{t}</b><p className="mt-1 text-sm text-white/60">{d}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Project>

      <Project i={3} title="Attendance Tracker" kind="Flutter app · in development"
        body="Attendance for university classes. The teacher's phone acts as a Bluetooth beacon and each student's phone checks in every 30 seconds, so the app records how long a student was actually in class. GPS is used as a second check. It has admin, teacher and student roles, with CSV class rosters."
        stack={['Flutter', 'Riverpod', 'Bluetooth LE', 'Firebase', 'Cloud Functions']}>
        <Phones onOpen={openImg} shots={[['assets/shots/attendance-1.webp', 'Attendance Tracker sign-in'], ['assets/shots/attendance-2.webp', 'Teacher home'], ['assets/shots/attendance-3.webp', 'Live class with the room radar'], ['assets/shots/attendance-4.webp', 'Course roster with join code']]} />
        <p className="mt-4 text-sm text-white/45">Running on its demo backend. Click a screen to see it full size. <a className="underline hover:text-white" href={`${GITHUB}/Attendy`} target="_blank" rel="noopener noreferrer">Source code</a></p>
      </Project>

      <Project i={4} title="Dart & Flutter: Zero to Senior" kind="Two books · Bangla and English · 2026"
        body="A two-volume learning set for Dart and Flutter that I planned and produced. The Companion Guide explains every topic with an everyday analogy, a diagram and code explained line by line. The Practice Workbook has drills, real-world challenges, refactoring tasks and debugging exercises for the same chapter. The books are private; five pages of each are open as a preview."
        stack={['Companion Guide', 'Practice Workbook', '75 chapters each', '140+ diagrams', 'Bangla and English']}
        links={<LinkBtn href="book/">See the preview <Arrow /></LinkBtn>}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
          {[['book/pages/guide-1.webp', 'Companion Guide, title page'], ['book/pages/guide-3.webp', 'Companion Guide, JIT and AOT'], ['book/pages/workbook-1.webp', 'Practice Workbook, title page'], ['book/pages/workbook-3.webp', 'Practice Workbook, Chapter 1 drills']].map(([src, alt], k) => (
            <Reveal key={src} from={k % 2 ? 'spin' : 'bottom'} delay={k * 0.08} amount={0.1}>
              <motion.button type="button" onClick={() => openImg(src, alt)} className="block w-full" whileHover={{ y: -14, rotate: k % 2 ? 2 : -2 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} aria-label={`${alt}, view full size`}>
                <img src={src} alt={alt} width="1200" height="1697" loading="lazy" className="aspect-[1200/1697] w-full rounded-xl bg-white object-cover ring-1 ring-white/15" />
              </motion.button>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/45">Preview pages. Click one to see it full size.</p>
      </Project>
    </section>
  )
}

function Apps({ openDemo }) {
  const apps = [
    ['ledger', 'Pocket Ledger', 'Income and expense tracker in taka, with spending by category. A web version of the companion app from my Dart and Flutter book.', 'assets/shots/pocket-ledger.webp'],
    ['board', 'Sprint Board', 'Kanban board with drag and drop between columns, task priorities and saved state.', 'assets/shots/sprint-board.webp'],
    ['quiz', 'Dart and Flutter Quiz', 'Seven questions on null safety, the event loop, widgets, Riverpod and Firestore, each with an explanation.', 'assets/shots/dart-quiz.webp'],
  ]
  const more = [
    ['Live Score App', 'Football scores that update in real time, with email sign-in. Flutter and Firebase.', `${GITHUB}/Live-Score-App`],
    ['Location Tracker', 'Shows your position on Google Maps and draws the route as you move.', `${GITHUB}/Real-Time-Location-Tracker`],
    ['Student Info', 'Add, list and delete student records in Cloud Firestore.', `${GITHUB}/Student-Info`],
  ]
  return (
    <section id="apps" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 md:px-8 md:py-24">
      <SectionHead title="Small web apps" sub="Quick builds you can open and use right here." />
      <div className="grid gap-6 md:grid-cols-3">
        {apps.map(([id, t, d, img], k) => (
          <Reveal key={id} from={['left', 'spin', 'right'][k]} delay={k * 0.1}>
            <Tilt className="glass flex h-full flex-col rounded-[24px] p-3" max={12}>
              <button type="button" onClick={() => openDemo(id)} className="block overflow-hidden rounded-[18px] ring-1 ring-white/10" aria-label={`Open ${t}`} style={{ transform: 'translateZ(30px)' }}>
                <img src={img} alt={t} loading="lazy" className="aspect-[4/3] w-full object-cover object-top transition-transform duration-500 hover:scale-105" />
              </button>
              <div className="flex flex-1 flex-col p-3" style={{ transform: 'translateZ(20px)' }}>
                <h3 className="font-display text-xl font-bold">{t}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/60">{d}</p>
                <div className="mt-4"><LinkBtn onClick={() => openDemo(id)}>Open app <Arrow /></LinkBtn></div>
              </div>
            </Tilt>
          </Reveal>
        ))}
      </div>
      <div className="mt-10 space-y-3">
        {more.map(([t, d, href], k) => (
          <Reveal key={t} from={k % 2 ? 'right' : 'left'} delay={k * 0.05} amount={0.4}>
            <motion.div whileHover={{ x: 8 }} className="glass grid items-center gap-2 rounded-2xl px-5 py-4 md:grid-cols-[220px_1fr_auto] md:gap-6">
              <b className="font-display">{t}</b><span className="text-sm text-white/60">{d}</span>
              {href ? <LinkBtn href={href}>{href.startsWith('http') ? 'GitHub ↗' : 'Preview ↗'}</LinkBtn> : <span />}
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function About() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] })
  const text = "I'm a Flutter developer from Dhaka. I took Ostad's App Development with Flutter course (Batch 15) and completed it with 100% in assignments, 92.4% in quizzes and 100% in the live test. Most of what I build uses Flutter and Firebase: a shopping app, a live score app, and an attendance system that checks presence over Bluetooth. I've also built a web store on Supabase for a local gift shop, and a voice assistant in Python that controls my Windows PC. I'm finishing my HSC (Science) in 2026 and looking for an internship or junior Flutter role."
  const words = text.split(' ')
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 md:px-8 md:py-24">
      <SectionHead title="About" />
      <Reveal from="bottom">
        <div ref={ref} className="glass rounded-[28px] p-6 md:p-12">
          <p className="font-display text-[clamp(1.25rem,2.6vw,2rem)] font-medium leading-snug">
            {words.map((w, k) => <Word key={k} p={scrollYProgress} range={[k / words.length, (k + 1) / words.length]}>{w}</Word>)}
          </p>
        </div>
      </Reveal>
    </section>
  )
}
function Word({ p, range, children }) {
  const o = useTransform(p, range, [0.18, 1])
  return <motion.span style={{ opacity: o }}>{children} </motion.span>
}

function Skills() {
  const half = Math.ceil(SKILLS.length / 2)
  const rows = [SKILLS.slice(0, half), SKILLS.slice(half)]
  return (
    <section id="skills" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8"><SectionHead title="Skills" sub="Tools I use to design, build and ship apps." /></div>
      <div className="space-y-5">
        {rows.map((row, r) => (
          <Reveal key={r} from={r ? 'right' : 'left'}>
            <div className="marquee overflow-hidden">
              <div className="marquee-track flex w-max gap-3 py-3 md:gap-4" style={{ animationDirection: r ? 'reverse' : 'normal', '--dur': `${36 + r * 8}s` }}>
                {[...row, ...row].map((s, k) => (
                  <motion.div key={k} whileHover={{ y: -10, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="chip flex items-center gap-3 rounded-2xl px-4 py-3 md:px-5 md:py-4" aria-hidden={k >= row.length}>
                    <svg viewBox="0 0 24 24" className="size-7" aria-hidden><path fill={s.color === 'currentColor' ? '#f3f4f5' : s.color} d={s.d} /></svg>
                    <span className="whitespace-nowrap font-medium">{s.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Certificates({ openImg }) {
  return (
    <section id="certificates" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 md:px-8 md:py-24">
      <SectionHead title="Certificates" />
      <div className="grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <Reveal from="left">
          <Tilt className="glass rounded-[28px] p-4" max={14}>
            <button type="button" onClick={() => openImg('assets/ostad-certificate-hd.jpg', 'Ostad certificate, full size')} className="block w-full" aria-label="View Ostad certificate full size" style={{ transform: 'translateZ(40px)' }}>
              <img src="assets/ostad-certificate.jpg" alt="Ostad Certificate of Assessment, App Development with Flutter" loading="lazy" className="w-full rounded-xl" />
            </button>
          </Tilt>
        </Reveal>
        <Reveal from="right" delay={0.1}>
          <h3 className="font-display text-3xl font-bold md:text-4xl">App Development with Flutter</h3>
          <p className="mt-2 text-white/55">Ostad · Certificate of Assessment · Batch 15</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[[100, 0, 'Assignments'], [92.4, 1, 'Quiz'], [100, 0, 'Live test']].map(([v, d, l]) => (
              <Tilt key={l} className="glass rounded-2xl px-2 py-4 text-center sm:p-4" max={18}>
                <div className="font-display text-2xl font-bold text-gradient sm:text-3xl md:text-4xl"><Counter to={v} decimals={d} suffix="%" /></div>
                <div className="mt-1 text-xs text-white/60 md:text-sm">{l}</div>
              </Tilt>
            ))}
          </div>
          <p className="mt-6 text-white/60">Certificate of Assessment, Batch 15. Credential ID A48287.</p>
        </Reveal>
      </div>
    </section>
  )
}

function Contact() {
  const [label, setLabel] = useState('Copy email')
  const copy = () => {
    navigator.clipboard?.writeText(EMAIL).then(() => setLabel('Copied'), () => setLabel('Select it above'))
    setTimeout(() => setLabel('Copy email'), 2200)
  }
  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 md:px-8 md:py-24">
      <Reveal from="zoom">
        <Tilt className="glass overflow-hidden rounded-[26px] p-6 text-center sm:p-8 md:rounded-[32px] md:p-16" max={4} lift={12}>
          <h2 className="font-display text-[clamp(2rem,5.5vw,4.2rem)] font-bold leading-tight tracking-tight">Looking for a <span className="text-gradient">Flutter developer?</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-white/65">I'm open to internships and junior roles, remote or onsite. Email is the best way to reach me.</p>
          <p className="mt-8 select-all whitespace-nowrap font-display text-[clamp(11px,3.4vw,1.125rem)] md:text-2xl">{EMAIL}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Btn solid onClick={copy}>{label}</Btn>
            <Btn href={`mailto:${EMAIL}`}>Send email</Btn>
            <Btn href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub</Btn>
            <Btn href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn</Btn>
          </div>
        </Tilt>
      </Reveal>
      <footer className="mt-16 flex flex-wrap justify-between gap-3 text-sm text-white/45">
        <span>© 2026 Hussain Muhammad Abdullah</span><span>Built with React, Tailwind CSS and Motion</span>
      </footer>
    </section>
  )
}

function DemoModal({ id, onClose }) {
  const d = id && DEMOS[id]
  const [state, setState] = useState('loading')
  useEffect(() => {
    if (!d) return
    setState('loading')
    fetch(d.src, { cache: 'no-store' }).then((r) => setState(r.ok ? 'ok' : 'missing'), () => setState('missing'))
  }, [d])
  useEffect(() => {
    if (!d) return
    const k = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [d, onClose])
  return (
    <AnimatePresence>
      {d && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-3 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={`${d.title} demo`}>
          <motion.div onClick={(e) => e.stopPropagation()} className="glass flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] bg-[#0d0e10]/80"
            initial={{ scale: 0.6, rotateX: 30, y: 80, opacity: 0 }} animate={{ scale: 1, rotateX: 0, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }} style={{ transformPerspective: 1200 }}>
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
              <strong className="font-display">{d.title}</strong><span className="text-sm text-white/50">{d.sub}</span>
              <a href={d.src} target="_blank" rel="noopener" className="ml-auto text-sm font-semibold text-emerald-300">Open in new tab</a>
              <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20">×</button>
            </div>
            <div className={`grid flex-1 place-items-center overflow-auto ${d.kind === 'phone' ? 'p-4' : ''}`}>
              {state === 'loading' && <p className="p-10 text-white/60">Loading…</p>}
              {state === 'missing' && <p className="p-10 text-white/60">This demo is available on the live site.</p>}
              {state === 'ok' && (d.kind === 'phone'
                ? <iframe title={`${d.title} demo`} src={d.src} className="h-[min(76vh,780px)] w-[min(390px,84vw)] rounded-[28px] border-8 border-[#0b0c0e] bg-white" />
                : <iframe title={`${d.title} demo`} src={d.src} className="h-[80vh] w-full bg-white" />)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Lightbox({ img, onClose }) {
  useEffect(() => {
    if (!img) return
    const k = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [img, onClose])
  return (
    <AnimatePresence>
      {img && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={img.alt}>
          <motion.img src={img.src} alt={img.alt} className="max-h-[90vh] max-w-[94vw] rounded-2xl shadow-2xl"
            initial={{ scale: 0.5, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 16 }} />
          <button onClick={onClose} aria-label="Close" className="glass fixed right-4 top-4 grid size-11 place-items-center rounded-full text-2xl">×</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const lenis = useRef(null)
  const [demo, setDemo] = useState(null)
  const [img, setImg] = useState(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return
    const l = new Lenis({ lerp: 0.14, smoothWheel: true })
    lenis.current = l
    let raf
    const loop = (t) => { l.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); l.destroy(); lenis.current = null }
  }, [])

  useEffect(() => { const l = lenis.current; if (!l) return; (demo || img) ? l.stop() : l.start() }, [demo, img])

  const go = (e, id) => { e.preventDefault(); const el = document.getElementById(id); lenis.current ? lenis.current.scrollTo(el, { offset: -90 }) : el.scrollIntoView({ behavior: 'smooth' }) }
  const openImg = (src, alt) => setImg({ src, alt })

  return (
    <MotionConfig reducedMotion="user">
      <Backdrop />
      <Cursor />
      <Progress />
      <Nav lenis={lenis} />
      <main className="relative z-[1]">
        <Hero go={go} />
        <Work openDemo={setDemo} openImg={openImg} />
        <Apps openDemo={setDemo} />
        <About />
        <Skills />
        <Certificates openImg={openImg} />
        <Contact />
      </main>
      <DemoModal id={demo} onClose={() => setDemo(null)} />
      <Lightbox img={img} onClose={() => setImg(null)} />
    </MotionConfig>
  )
}
