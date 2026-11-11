import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { ASSET, EMAIL, PAGE_TITLE, ENABLE_PROJECT_MODAL, ENABLE_FORMSUBMIT, waLink, WA_GENERAL } from './config.js';
import { NAV_LINKS, JOURNEY, FRAMES, MARQUEE_WORDS, STATS, STORY_PARAGRAPHS, DIRECTORS, SERVICES, PROJECT_FILTERS, PROJECT_STAGES, PROJECTS, GALLERY_FILTERS, GALLERY_LABELS, GALLERY, TIMELINE, TRUST_CARDS, PROCESS_STEPS, QUOTES, CLIENTS, FAQS } from './data.jsx';
import { useGetGalleryQuery } from './services/galleryApi.js';


/* =====================================================================
   2. ENVIRONMENT HELPERS
   ===================================================================== */
const IS_CLIENT = typeof window !== 'undefined';
const mq = (q) => IS_CLIENT && window.matchMedia(q).matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Phone/tablet "lite" mode: native scrolling, no per-frame JS effects
const LITE = mq('(max-width:900px),(hover:none) and (pointer:coarse)');
if (IS_CLIENT && LITE) document.documentElement.classList.add('lite');
const FINE_POINTER = mq('(hover:hover) and (pointer:fine)');
const TOUCH_OR_SMALL = mq('(hover:none),(max-width:900px)');





/** Element screen par aaya? once=true => ek baar true hone ke baad true rehta hai. */
function useInView({ once = true, rootMargin = '0px 0px 10% 0px', threshold = 0.01 } = {}, extRef) {
  const ownRef = useRef(null);
  const ref = extRef || ownRef;
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setSeen(true);
          if (once) io.unobserve(el);
        } else if (!once) {
          setSeen(false);
        }
      });
    }, { rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin, threshold, ref]);
  return [ref, seen];
}

/** Boolean ref jo batata hai element viewport ke aas-paas hai (re-render nahi karta). */
function useVisibleRef(ref, rootMargin = '120px 0px') {
  const vis = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { vis.current = true; return undefined; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { vis.current = e.isIntersecting; }), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return vis;
}

/**
 * Ek shared, rAF-throttled scroll bus. Components subscribe karte hain aur
 * har frame par {y, ih, max} milta hai.
 */
const scrollBus = (() => {
  const subs = new Set();
  let started = false;
  let ticking = false;
  let ih = IS_CLIENT ? window.innerHeight : 0;
  let max = 1;
  function measure() {
    ih = window.innerHeight;
    max = Math.max(1, document.documentElement.scrollHeight - ih);
  }
  function run() {
    ticking = false;
    const y = window.scrollY;
    subs.forEach((fn) => fn({ y, ih, max }));
  }
  function queue() {
    if (!ticking) { ticking = true; requestAnimationFrame(run); }
  }
  function start() {
    started = true;
    measure();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', () => { measure(); queue(); }, { passive: true });
    window.addEventListener('load', () => { measure(); queue(); });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); queue(); }).observe(document.body);
  }
  return {
    subscribe(fn) {
      if (!started) start();
      subs.add(fn);
      queue();
      return () => subs.delete(fn);
    },
  };
})();

function useScrollSubscribe(handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => scrollBus.subscribe((s) => ref.current(s)), []);
}

/** Button ko mouse ke paas halka sa kheenchne wala (magnetic) effect. */
function useMagnet(ref) {
  useEffect(() => {
    const b = ref.current;
    if (!b) return undefined;
    const move = (e) => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`;
    };
    const leave = () => { b.style.translate = '0 0'; };
    b.addEventListener('pointermove', move);
    b.addEventListener('pointerleave', leave);
    return () => { b.removeEventListener('pointermove', move); b.removeEventListener('pointerleave', leave); };
  }, [ref]);
}

/* =====================================================================
   6. SHARED UI COMPONENTS
   ===================================================================== */

/** Scroll par fade-up reveal wala wrapper (.rv → .rv.in) */
function Reveal({ as: Tag = 'div', className = '', d, style, forceIn = false, children, ...rest }) {
  const [ref, seen] = useInView();
  const cls = `${className} rv${seen || forceIn ? ' in' : ''}`.trim();
  return (
    <Tag ref={ref} className={cls} style={d ? { '--d': d, ...style } : style} {...rest}>
      {children}
    </Tag>
  );
}

/** .btn — magnetic effect + optional reveal. as="a" ya as="button" */
function Btn({ as: Tag = 'a', className = '', d, reveal = true, style, children, ...rest }) {
  const ref = useRef(null);
  const [, seen] = useInView({}, ref);
  useMagnet(ref);
  const cls = `btn ${className}${reveal ? ` rv${seen ? ' in' : ''}` : ''}`.trim();
  return (
    <Tag ref={ref} className={cls} style={d ? { '--d': d, ...style } : style} {...rest}>
      {children}
    </Tag>
  );
}

/** Text ko shabd-shabd me todta hai (h1/h2.sp animation ke liye) */
function splitWords(node, ctr, zw) {
  return React.Children.map(node, (c) => {
    if (typeof c === 'string') {
      return c.split(/(\s+)/).filter(Boolean).map((t) => {
        if (/^\s+$/.test(t)) return ' ';
        const i = ctr.i++;
        return (
          <span className="w" key={i}>
            <span style={{ '--i': i }}>
              {zw ? <span className="zw" style={{ '--i': i }}>{t}</span> : t}
            </span>
          </span>
        );
      });
    }
    if (React.isValidElement(c) && c.type !== 'img' && c.type !== 'br') {
      return React.cloneElement(c, undefined, splitWords(c.props.children, ctr, zw));
    }
    return c;
  });
}

/** .sp heading: word reveal + (desktop) scroll par halka scale */
function SplitHeading({ as: Tag = 'h2', className = '', forceInAfter, elRef, children, ...rest }) {
  const ref = useRef(null);
  const setRef = (el) => { ref.current = el; if (elRef) elRef.current = el; };
  const [, seen] = useInView({}, ref);
  const vis = useVisibleRef(ref);
  const [timed, setTimed] = useState(false);
  const isH2 = Tag === 'h2';

  useEffect(() => {
    if (forceInAfter == null) return undefined;
    const t = setTimeout(() => setTimed(true), forceInAfter);
    return () => clearTimeout(t);
  }, [forceInAfter]);

  useScrollSubscribe(({ ih }) => {
    const el = ref.current;
    if (!isH2 || LITE || !el || !vis.current || window.innerWidth < 900) return;
    const r = el.getBoundingClientRect();
    el.style.scale = (1 + clamp((r.top / ih - 0.5) / 0.5, 0, 1) * 0.1 - clamp((0.25 - r.bottom / ih) / 0.25, 0, 1) * 0.2).toFixed(3);
  });

  const cls = `sp ${className}${seen || timed ? ' in' : ''}${isH2 && seen ? ' zr-in' : ''}`.trim();
  const style = isH2 ? { transformOrigin: 'left center' } : undefined;
  return (
    <Tag ref={setRef} className={cls} style={style} {...rest}>
      {splitWords(children, { i: 0 }, isH2)}
    </Tag>
  );
}

/**
 * Paragraph with reveal. Desktop par chhote paragraphs shabd-shabd
 * (.ww) aate hain. zr = section intro paragraph fade.
 */
function P({ rv = true, zr = false, words = true, d, className = '', style, children }) {
  const [ref, seen] = useInView();
  const text = typeof children === 'string' ? children : null;
  const count = text ? text.trim().split(/\s+/).length : 0;
  const split = words && !TOUCH_OR_SMALL && text && count >= 3 && count <= 60;
  const cls = [
    className, rv && 'rv', split && 'wp', zr && 'zr', rv && seen && 'in', zr && seen && 'zr-in',
  ].filter(Boolean).join(' ');
  const st = d ? { '--d': d, ...style } : style;
  if (!split) return <p ref={ref} className={cls} style={st}>{children}</p>;
  const ws = text.trim().split(/\s+/);
  return (
    <p ref={ref} className={cls} style={st}>
      {ws.map((w, i) => (
        <React.Fragment key={i}>
          <span className="ww" style={{ '--j': Math.min(i, 26) }}>{w}</span>
          {i < ws.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </p>
  );
}

/** Stats counter (0 → n) */
function Stat({ n, s, label, d }) {
  const [ref, seen] = useInView();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!seen) return undefined;
    let raf;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 1800);
      setVal(Math.round(n * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, n]);
  return (
    <div ref={ref} className={`glass rv${seen ? ' in' : ''}`} style={d ? { '--d': d } : undefined}>
      <b>{val}{s}</b>
      <span>{label}</span>
    </div>
  );
}

/** Chhote SVG icons */
function PinIcon({ size = 15 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Aise sab nodes ko list me se focus-trap ke liye */
function trapTab(e, root) {
  const f = [...root.querySelectorAll('button,a[href]')].filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const a = f[0];
  const z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
}

/* =====================================================================
   7. PAGE CHROME (preloader, progress bar, background, cursor, header)
   ===================================================================== */

function Preloader() {
  return (
    <div className="pre" aria-hidden="true">
      <i />
      <b>BUILD WITH TRUST</b>
    </div>
  );
}

/** Upar ka patla scroll-progress bar */
function ScrollBar() {
  const ref = useRef(null);
  useScrollSubscribe(({ y, max }) => {
    if (ref.current) ref.current.style.transform = `scaleX(${(y / max).toFixed(4)})`;
  });
  return <div className="bar" ref={ref} />;
}

/** Fixed background photos (journey ke 5 frames) + scrim */
const BackgroundFrames = memo(function BackgroundFrames({ frameRefs, scrimRef }) {
  return (
    <>
      <div id="zbg" aria-hidden="true">
        {FRAMES.map(([portrait, wide], i) => (
          <picture key={wide}>
            <source media="(max-width:700px) and (orientation:portrait)" srcSet={ASSET + portrait} />
            <img
              ref={(el) => { frameRefs.current[i] = el; }}
              className={i === 0 ? 'zb-frame f0 on hot' : 'zb-frame'}
              src={ASSET + wide}
              alt=""
              decoding="async"
              {...(i === 0 ? { fetchPriority: 'high' } : {})}
            />
          </picture>
        ))}
      </div>
      <div id="zscrim" ref={scrimRef} aria-hidden="true" />
    </>
  );
});

/** Peeche ka halka logo watermark (desktop par scroll ke saath move) */
function Watermark() {
  const ref = useRef(null);
  useScrollSubscribe(({ y, max }) => {
    const el = ref.current;
    if (!el || LITE) return;
    el.style.transform = `translate3d(0,${(-y * 0.12).toFixed(1)}px,0) rotate(${(y * 0.004).toFixed(2)}deg) scale(${(1 + (y / max) * 0.35).toFixed(3)})`;
  });
  return (
    <div className="wm" aria-hidden="true">
      <i ref={ref} />
    </div>
  );
}

/** Desktop par custom gol cursor */
function Cursor() {
  const ref = useRef(null);
  useEffect(() => {
    if (!FINE_POINTER) return undefined;
    const cu = ref.current;
    let cx = 0; let cy = 0; let tx = 0; let ty = 0; let on = false; let raf = 0;
    const loop = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cu.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
      if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) raf = requestAnimationFrame(loop);
      else on = false;
    };
    const move = (e) => {
      tx = e.clientX; ty = e.clientY;
      cu.classList.add('on');
      if (!on) { on = true; raf = requestAnimationFrame(loop); }
    };
    const over = (e) => {
      const t = e.target.closest && e.target.closest('a,button,.tab,.card');
      cu.classList.toggle('h', !!t);
      cu.textContent = t && t.classList.contains('card') ? 'View' : '';
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('mouseover', over);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('mouseover', over);
    };
  }, []);
  return <div className="cur" ref={ref} aria-hidden="true" />;
}

/** Top header: brand, nav links, CTA, hamburger */
function HeaderBar({ menuOpen, onToggleMenu }) {
  const [scrolled, setScrolled] = useState(false);
  useScrollSubscribe(({ y }) => setScrolled(y > 40));
  return (
    <header id="hd" className={scrolled ? 's' : undefined}>
      <div className="wrap">
        <nav aria-label="Main">
          <a className="brand" href="#top">ZU</a>
          <ul>
            {NAV_LINKS.map(([label, href]) => (
              <li key={href}><a href={href}>{label}</a></li>
            ))}
          </ul>
          <a className="btn" href="#contact" style={{ padding: '10px 24px' }}>Get in touch</a>
          <button
            className={`mb${menuOpen ? ' o' : ''}`}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
          >
            <span /><span />
          </button>
        </nav>
      </div>
    </header>
  );
}

/** Mobile full-screen menu */
function MobileMenu({ open, onClose }) {
  return (
    <div className={`mn${open ? ' o' : ''}`}>
      {NAV_LINKS.map(([label, href], i) => (
        <a key={href} href={href} style={{ '--i': i === NAV_LINKS.length - 1 ? 9 : i }} onClick={onClose}>
          {label}
        </a>
      ))}
    </div>
  );
}

/* =====================================================================
   8. JOURNEY (pinned scroll story with fading background photos)
   ===================================================================== */
function JourneySection({ frameRefs, scrimRef }) {
  const secRef = useRef(null);
  const stageRef = useRef(null);
  const barRef = useRef(null);
  const lightRef = useRef(null);
  const goToStage = useRef(() => {});
  const [stage, setStage] = useState(0); // jo text abhi dikh raha hai
  const [out, setOut] = useState(false); // text fade-out phase

  useEffect(() => {
    const sec = secRef.current;
    const stageEl = stageRef.current;
    const bar = barRef.current;
    const lt = lightRef.current;
    const sc = scrimRef.current;
    const fr = frameRefs.current.filter(Boolean);
    const n = fr.length;
    if (!sec || !stageEl || !n) return undefined;

    const LG = [0.5, 0.12, 0.1, 0.45, 0.4];
    const T = 0.36;
    const FADE = 520;
    const fine = FINE_POINTER;
    const ez = (x) => x * x * (3 - 2 * x);

    let needT = true;
    let W = window.innerWidth; let H = window.innerHeight; let lw = window.innerWidth;
    let secTop = 0; let secH = 1; let docH = 1;
    let cur = 0; let tgt = 0; let raf = 0; let idx = 0; let aIdx = 0;
    let px = 0; let py = 0; let tx0 = 0; let ty0 = 0;
    let last = 0; let t0 = 0; let tm = 0; let st = 0; let goTimer = 0;
    let inStory = true; let lastPh = null; let ready = false; let intro = 0;
    let vLo = 0; let vHi = 1; let sLt = ''; let sSc = ''; let sBr = '';
    let dead = false;

    // layout reads sirf yahin hote hain (kabhi-kabhi), scroll path me nahi
    function meas() {
      W = window.innerWidth;
      H = stageEl.clientHeight || window.innerHeight;
      secTop = sec.getBoundingClientRect().top + window.scrollY;
      secH = sec.offsetHeight;
      docH = document.documentElement.scrollHeight;
    }
    function read() {
      const y = window.scrollY;
      const tr = Math.max(1, secH - H);
      const end = secTop + secH - H;
      if (y < end) {
        inStory = true;
        tgt = clamp((y - secTop) / tr, 0, 1);
      } else {
        inStory = false;
        const rest = Math.max(1, docH - H - end);
        tgt = 1 / n + (1 - 1 / n) * clamp((y - end) / rest, 0, 1);
      }
      if (lastPh !== null && lastPh !== inStory) { cur = tgt; needT = true; }
      lastPh = inStory;
    }
    // photo cross-fade = CSS opacity transition (GPU compositor par)
    function setActive(a, instant) {
      const old = aIdx;
      aIdx = a;
      const lo = Math.max(0, Math.min(old, a) - 1);
      const hi = Math.min(n - 1, Math.max(old, a) + 1);
      for (let k = 0; k < n; k++) {
        const c = fr[k].classList;
        if (instant) c.add('nt');
        c.toggle('hot', k >= lo && k <= hi);
        c.toggle('on', k <= a);
        c.toggle('nx', k === a + 1);
      }
      vLo = lo; vHi = hi;
      if (instant) {
        requestAnimationFrame(() => requestAnimationFrame(() => fr.forEach((e) => e.classList.remove('nt'))));
      }
      clearTimeout(st);
      st = setTimeout(() => {
        const l = Math.max(0, aIdx - 1);
        const h = Math.min(n - 1, aIdx + 1);
        for (let k = 0; k < n; k++) fr[k].classList.toggle('hot', k >= l && k <= h);
        vLo = l; vHi = h;
      }, FADE + 80);
    }
    function render() {
      const pos = cur * n;
      const rr = pos + T / 2;
      let a = aIdx;
      if (rr >= a + 1) a = clamp(Math.floor(rr), 0, n - 1);
      else if (rr < a - 0.12) a = clamp(Math.floor(rr + 0.12), 0, n - 1);
      if (a !== aIdx) setActive(a, false);

      const so = (inStory ? (pos > n - 0.9 ? clamp((pos - (n - 0.9)) / 0.9, 0, 1) * 0.24 : 0) : 0.24).toFixed(3);
      if (so !== sSc) { sSc = so; sc.style.opacity = so; }

      if (inStory || fine || needT) {
        needT = false;
        for (let i = vLo; i <= vHi; i++) {
          const g = pos - i;
          const u = clamp((g + T) / (1 + T), 0, 1);
          const z = i === 0 ? 1 + 0.16 * intro + 0.95 * Math.pow(u, 1.15) : 1.06 + 0.12 * u;
          const dir = i % 2 ? 1 : -1;
          const mx = (z - 1) / 2 * W * 0.85;
          const my = (z - 1) / 2 * H * 0.85;
          const x = clamp(dir * (u - 0.5) * W * 0.03 + px * W * 0.008, -mx, mx);
          const y = clamp((0.5 - u) * H * 0.03 + py * H * 0.008, -my, my);
          fr[i].style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${z.toFixed(4)})`;
        }
      }
      const li = Math.min(n - 2, Math.floor(pos));
      const lf = clamp(pos - li, 0, 1);
      const lo = (LG[li] + (LG[Math.min(n - 1, li + 1)] - LG[li]) * ez(lf)).toFixed(3);
      if (lt && lo !== sLt) { sLt = lo; lt.style.opacity = lo; }
      if (inStory) {
        const bs = `scaleX(${cur.toFixed(4)})`;
        if (bs !== sBr) { sBr = bs; bar.style.transform = bs; }
      }
      // text change (React state ke through)
      const ni = inStory ? aIdx : idx;
      if (ni !== idx) {
        idx = ni;
        setOut(true);
        clearTimeout(tm);
        tm = setTimeout(() => { setStage(idx); setOut(false); }, 260);
      }
    }
    function tick(now) {
      raf = 0;
      if (!ready || dead) { last = 0; return; }
      if (!t0) t0 = now;
      const iv = clamp((now - t0 - 1100) / 3000, 0, 1);
      intro = 1 - Math.pow(1 - iv, 3);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      cur += (tgt - cur) * (1 - Math.exp(-dt * 12));
      px += (tx0 - px) * (1 - Math.exp(-dt * 5));
      py += (ty0 - py) * (1 - Math.exp(-dt * 5));
      render();
      if (iv < 1 || Math.abs(tgt - cur) > 0.0003 || Math.abs(tx0 - px) > 0.002 || Math.abs(ty0 - py) > 0.002) {
        raf = requestAnimationFrame(tick);
      } else last = 0;
    }
    function wake() { if (!raf) raf = requestAnimationFrame(tick); }

    const onScroll = () => { read(); wake(); };
    // phone URL-bar show/hide 'resize' fire karta hai: wahan height-only change ignore
    const onResize = () => {
      if (!fine && window.innerWidth === lw) return;
      lw = window.innerWidth; meas(); read(); wake();
    };
    const onLoad = () => { meas(); read(); wake(); };
    const onPointer = (e) => { tx0 = e.clientX / W - 0.5; ty0 = e.clientY / H - 0.5; wake(); };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('load', onLoad);
    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => { meas(); read(); wake(); });
      ro.observe(document.body);
    }
    if (fine) sec.addEventListener('pointermove', onPointer, { passive: true });

    goToStage.current = (k) => window.scrollTo({ top: secTop + ((k + 0.35) / n) * (secH - H), behavior: 'smooth' });

    meas(); read(); cur = tgt;
    setActive(clamp(Math.floor(cur * n + T / 2), 0, n - 1), true);

    function go() {
      if (ready || dead) return;
      ready = true; cur = tgt; render(); wake();
      // baaki frames background me decode karo
      fr.slice(2).reduce((p, im) => p.then(() => (dead || !im.decode ? 0 : im.decode().catch(() => {}))), Promise.resolve());
    }
    Promise.all(fr.slice(0, 2).map((im) => (im.decode ? im.decode().catch(() => {}) : 0))).then(go);
    goTimer = setTimeout(go, 3000);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      clearTimeout(tm); clearTimeout(st); clearTimeout(goTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
      sec.removeEventListener('pointermove', onPointer);
      if (ro) ro.disconnect();
    };
  }, [frameRefs, scrimRef]);

  const s = JOURNEY[stage];
  return (
    <section id="zj" ref={secRef} aria-label="Construction journey scroll experience">
      <div className="zj-stage" ref={stageRef}>
        <div className="zj-light" ref={lightRef} aria-hidden="true" />
        <div className="zj-shade" aria-hidden="true" />
        <div className="zj-haze" aria-hidden="true" />
        <div className={`zj-copy${out ? ' out' : ''}`} aria-live="polite">
          <small id="zj-k">{s.k}</small>
          <h2 id="zj-t">{s.t}</h2>
          <p id="zj-d">{s.d}</p>
        </div>
        <nav className="zj-steps" aria-label="Journey stages">
          {JOURNEY.map((j, k) => (
            <button
              key={j.label}
              className={`zj-dot${k === stage ? ' on' : ''}`}
              type="button"
              aria-label={`Stage ${k + 1}: ${j.label}`}
              onClick={() => goToStage.current(k)}
            >
              <span>{j.label}</span><i />
            </button>
          ))}
        </nav>
        <div className="zj-bar" aria-hidden="true"><span id="zj-b" ref={barRef} /></div>
        <div className="zj-hint" aria-hidden="true">SCROLL TO SEE THE JOURNEY <span>&darr;</span></div>
      </div>
    </section>
  );
}

/* =====================================================================
   9. HERO, MARQUEE, PROMISE BAND
   ===================================================================== */
function Hero() {
  const heroRef = useRef(null);
  const zoRef = useRef(null);
  useScrollSubscribe(({ y, ih }) => {
    const Z = zoRef.current; const h = heroRef.current;
    if (!Z || !h) return;
    const s = clamp((y - h.offsetTop) / ih, 0, 1);
    Z.style.scale = (1 - s * 0.3).toFixed(3);
    Z.style.translate = `0 ${(-s * 60).toFixed(0)}px`;
    Z.style.opacity = (1 - s * 0.9).toFixed(2);
  });
  return (
    <section className="hero" ref={heroRef}>
      <div className="hlogo" role="img" aria-label="ZU Developers" />
      <div className="bp" aria-hidden="true">
        <svg viewBox="0 0 400 300" fill="none" stroke="#7a1f33" strokeWidth="1.2">
          <path style={{ '--k': 0 }} pathLength="1" d="M10 285H390" />
          <path style={{ '--k': 1 }} pathLength="1" d="M45 285V125H130V285M45 165H130M45 205H130M45 245H130" />
          <path style={{ '--k': 2 }} pathLength="1" d="M150 285V40H252V285M150 80H252M150 120H252M150 160H252M150 200H252M150 240H252M201 40V5" />
          <path style={{ '--k': 3 }} pathLength="1" d="M272 285V150H355V285M272 190H355M272 230H355M313 150V112" />
        </svg>
      </div>
      <div className="badge" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <defs><path id="c" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0" /></defs>
          <text><textPath href="#c" textLength="485">ZU DEVELOPERS · BUILD WITH TRUST · BUILT TO LAST · </textPath></text>
        </svg>
      </div>
      <div className="wrap sh">
        <SplitHeading as="h1" className="zo" forceInAfter={150} elRef={zoRef}>
          Building legacies, <em>not just buildings.</em>
        </SplitHeading>
        <div className="row">
          <p className="rv" style={{ '--d': '.9s' }}>
            ZU Developers is a construction and building company in India. We design and deliver residential, commercial and large-scale projects with clear timelines and honest pricing.
          </p>
          <Btn className="" d="1.1s" href="#projects">See our projects</Btn>
        </div>
      </div>
    </section>
  );
}

/** Scrolling words band */
function Marquee() {
  const [ref, on] = useInView({ once: false, rootMargin: '120px 0px' });
  const words = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div className={`mq${on ? ' on' : ''}`} ref={ref} aria-hidden="true">
      <div>{words.map((w, i) => <span key={i}>{w}</span>)}</div>
    </div>
  );
}

/** Ek bada text jo scroll par side se slide hota hai */
function BigWord({ x, outline, children }) {
  const ref = useRef(null);
  const vis = useVisibleRef(ref);
  useScrollSubscribe(({ ih }) => {
    const el = ref.current;
    if (LITE || !el || !vis.current) return;
    const r = el.getBoundingClientRect();
    const t = clamp((ih - r.top) / (ih + r.height), 0, 1);
    el.style.translate = `${((t - 0.5) * x * window.innerWidth * (window.innerWidth < 700 ? 0.25 : 0.45)).toFixed(0)}px 0`;
    el.style.scale = (0.8 + (1 - Math.abs(t - 0.5) * 2) * 0.3).toFixed(3);
  });
  return <div ref={ref} className={`stl${outline ? ' o' : ''}`}>{children}</div>;
}

function PromiseBand() {
  return (
    <section className="st" aria-label="Our promise">
      <BigWord x={-1}>Design.</BigWord>
      <BigWord x={1} outline>Build.</BigWord>
      <BigWord x={-1}>Deliver.</BigWord>
    </section>
  );
}

/* =====================================================================
   10. ABOUT, STORY
   ===================================================================== */
function About() {
  return (
    <section id="about">
      <div className="wrap split">
        <SplitHeading>Built on trust. Finished on time.</SplitHeading>
        <div>
          <P>ZU Developers started with one promise: build well, and be straight with the people who trust us. Today we work with families, dealers, investors and large companies across India.</P>
          <P d=".1s">Our own engineers, site managers and craftspeople run every project from first drawing to final handover. You always know what is happening on site, what it costs and when it will be ready.</P>
          <div className="stats">
            {STATS.map((s) => <Stat key={s.label} {...s} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section id="story" className="st">
      <div className="wrap">
        <div className="st-g">
          <div className="st-l">
            <SplitHeading>Our <em>story.</em></SplitHeading>
            <Reveal as="blockquote" className="st-q">Build better tomorrow.</Reveal>
          </div>
          <div className="st-r">
            {STORY_PARAGRAPHS.map((t) => <P key={t.slice(0, 24)}>{t}</P>)}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   11. FOUNDER + DIRECTORS
   ===================================================================== */

/** Gol orbit + corners + photo frame + rotating badge (Founder/Directors dono me) */
function Portrait({ img, alt, w, h, pos, delay, badgeId, badgeText, badgeCenter, chips }) {
  const ref = useRef(null);
  const frRef = useRef(null);
  const [, seen] = useInView({}, ref);
  const [on, setOn] = useState(false); // animations sirf screen par chalein
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setOn(true); return undefined; }
    const io = new IntersectionObserver((es) => es.forEach((e) => setOn(e.isIntersecting)), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // desktop par photo hover tilt
  useEffect(() => {
    if (!FINE_POINTER) return undefined;
    const v = ref.current; const f = frRef.current;
    if (!v || !f) return undefined;
    const move = (e) => {
      const r = v.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      f.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
      f.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
    };
    const leave = () => { f.style.setProperty('--ry', '0deg'); f.style.setProperty('--rx', '0deg'); };
    v.addEventListener('pointermove', move);
    v.addEventListener('pointerleave', leave);
    return () => { v.removeEventListener('pointermove', move); v.removeEventListener('pointerleave', leave); };
  }, []);

  return (
    <div
      ref={ref}
      className={`fdr-v rv${seen ? ' in' : ''}${on ? ' on' : ''}`}
      style={delay ? { '--d': delay } : undefined}
    >
      <svg className="fdr-orb o1" viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="190" strokeWidth="1" strokeDasharray="3 9" opacity=".55" />
      </svg>
      <svg className="fdr-orb o2" viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="168" strokeWidth="1" strokeDasharray="70 14 6 14" opacity=".3" />
      </svg>
      <i className="k k1" /><i className="k k2" />
      <div className="fdr-fr" ref={frRef}>
        <img src={ASSET + img} alt={alt} width={w} height={h} decoding="async" style={pos ? { objectPosition: pos } : undefined} />
      </div>
      {chips && chips.map((c, i) => (
        <div key={c.label} className={`fdr-c fdr-c${i + 1} glass`}><b>{c.n}</b>{c.label}</div>
      ))}
      <div className="fdr-bd" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <defs><path id={badgeId} d="M100 100m-80 0a80 80 0 1 1 160 0a80 80 0 1 1-160 0" /></defs>
          <text><textPath href={`#${badgeId}`} textLength="490">{badgeText}</textPath></text>
        </svg>
        <b>{badgeCenter}</b>
      </div>
    </div>
  );
}

function SketchLine() {
  const [ref, seen] = useInView();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setOn(true); return undefined; }
    const io = new IntersectionObserver((es) => es.forEach((e) => setOn(e.isIntersecting)), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  const paths = [
    'M0 88H400',
    'M18 88V50H62V88M18 62H62M18 74H62',
    'M82 88V16H146V88M82 32H146M82 48H146M82 64H146M114 16V2',
    'M166 88V40H214V88M166 54H214M166 68H214',
    'M236 88V8H300V88M236 26H300M236 44H300M236 62H300M268 8V0',
    'M320 88V56H382V88M320 68H382M320 78H382',
  ];
  return (
    <div ref={ref} className={`fdr-sk rv${seen ? ' in' : ''}${on ? ' on' : ''}`} style={{ '--d': '.2s' }} aria-hidden="true">
      <svg viewBox="0 0 400 90">
        {paths.map((d, k) => <path key={k} style={{ '--k': k }} pathLength="1" d={d} />)}
      </svg>
    </div>
  );
}

function Founder() {
  return (
    <section id="founder" className="fdr">
      <div className="wrap fdr-g">
        <Portrait
          img="img-014-a53ab658c7.jpg"
          alt="Javed Khan JD, founder of ZU Developers, seated in his office"
          w={960} h={1286}
          badgeId="fb"
          badgeText="FOUNDER · ZU DEVELOPERS · YEARS BUILDING · "
          badgeCenter="30+"
          chips={[{ n: '150+', label: 'Projects delivered' }, { n: '101+', label: 'Happy clients' }]}
        />
        <div className="fdr-t">
          <Reveal as="small">Founder, ZU Developers</Reveal>
          <SplitHeading>
            Javed Khan <img className="jd-logo" src={`${ASSET}img-015-f7fc718e5c.png`} alt="JD" width={749} height={722} />
          </SplitHeading>
          <P zr>Javed Khan JD founded ZU Developers and has spent more than 30 years in construction. He built the company from the ground up on simple values: honest pricing, clear timelines and work that lasts.</P>
          <P zr d=".1s">Under his lead, ZU Developers has delivered over 150 projects for more than 100 happy clients, and 15 sites are being built right now.</P>
          <Reveal className="fdr-tag" d=".2s">Build better tomorrow.</Reveal>
          <Btn d=".3s" href="#contact">Talk to us</Btn>
          <SketchLine />
        </div>
      </div>
    </section>
  );
}

function DirectorCard({ person }) {
  return (
    <article className="dir-c">
      <Portrait
        img={person.img} alt={person.alt} w={person.w} h={person.h} pos={person.pos}
        delay={person.delay}
        badgeId={person.id}
        badgeText="DIRECTOR · CO-FOUNDER · ZU DEVELOPERS · "
        badgeCenter="ZU"
      />
      <div className="dir-t">
        <Reveal as="small">Director &amp; Co-founder</Reveal>
        <Reveal as="h3" d=".05s">{person.name}</Reveal>
        <Reveal className="tg" d=".1s">{person.tagline}</Reveal>
        <P d=".15s" words={false}><b>Experience</b>{person.experience}</P>
        <P d=".2s" words={false}><b>Mindset</b>{person.mindset}</P>
      </div>
    </article>
  );
}

function Directors() {
  return (
    <section id="directors" className="dir">
      <div className="wrap">
        <div className="dir-h">
          <SplitHeading>The next <em>generation.</em></SplitHeading>
          <P>Two directors and co-founders who work alongside Javed Khan JD, carrying the same promise forward: build well, and be straight with the people who trust us.</P>
        </div>
        <div className="dir-g">
          {DIRECTORS.map((p) => <DirectorCard key={p.id} person={p} />)}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   12. SERVICES
   ===================================================================== */
function Services() {
  return (
    <section id="services">
      <div className="wrap">
        <SplitHeading>What we build</SplitHeading>
        <div className="tri">
          {SERVICES.map((s) => (
            <Reveal as="article" className="glass" d={s.d} key={s.h}>
              <h3>{s.h}</h3>
              <P rv={false}>{s.p}</P>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   13. PROJECT LIBRARY (+ optional modal)
   ===================================================================== */

/** SVG ke ids ko prefix lagata hai taaki modal me duplicate id conflict na ho */
const prefixSvgIds = (svg) =>
  svg.replace(/id="(\w+)"/g, 'id="m$1"').replace(/url\(#(\w+)\)/g, 'url(#m$1)');

const ProjectCard = memo(function ProjectCard({ p, index, hidden, forceIn, popDelay, onOpen, onPopEnd }) {
  const ref = useRef(null);
  const [, seen] = useInView({}, ref);
  const [, onScreen] = useInView({ once: false, rootMargin: '120px' }, ref);
  const art = p.svg + (p.tag ? `<span class="lb-t">${p.tag}</span>` : '');
  const popping = popDelay != null;
  const cls = [
    'lb-card glass rv',
    seen || forceIn ? 'in' : '',
    onScreen ? 'on' : '',
    popping ? 'pop' : '',
  ].filter(Boolean).join(' ');
  const style = { '--d': p.d };
  if (popping) style['--pd'] = popDelay;
  const interactive = ENABLE_PROJECT_MODAL;
  return (
    <article
      ref={ref}
      className={cls}
      style={style}
      hidden={hidden}
      {...(interactive ? {
        tabIndex: 0,
        onClick: () => onOpen(index),
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(index); } },
      } : {})}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) onPopEnd(index); }}
    >
      <div className="lb-art" dangerouslySetInnerHTML={{ __html: art }} />
      <div className="lb-b">
        <h3>{p.name}</h3>
        <p className="lb-loc"><PinIcon /><span>{p.loc}</span></p>
      </div>
    </article>
  );
});

/** Project detail popup (ENABLE_PROJECT_MODAL = true par chalta hai) */
function ProjectModal({ index, onIndex, onClose }) {
  const open = index !== null;
  const [stage, setStage] = useState('all');
  const innerRef = useRef(null);
  const closeRef = useRef(null);
  const touch = useRef({ x: 0, y: 0 });
  const p = PROJECTS[open ? index : 0];
  const total = PROJECTS.length;
  const go = (i) => { setStage('all'); onIndex((i + total) % total); };

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('lbo');
    if (closeRef.current) closeRef.current.focus({ preventScroll: true });
    return () => document.documentElement.classList.remove('lbo');
  }, [open]);

  useEffect(() => { if (open && innerRef.current) innerRef.current.scrollTop = 0; }, [open, index]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'Tab' && innerRef.current) trapTab(e, innerRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const photos = (p.photos || []).filter((x) => stage === 'all' || x.s === stage);
  const waHref = waLink(`Hello ZU Developers, I would like to know more about ${p.name} (${p.loc}).`);

  return createPortal(
    <div className={`lbm${open ? ' on' : ''}`} id="lbm" hidden={!open} role="dialog" aria-modal="true" aria-labelledby="lbm-t">
      <div className="lbm-bk" onClick={onClose} />
      <div className="lbm-in" ref={innerRef}>
        <button className="lbm-x" type="button" aria-label="Close project" ref={closeRef} onClick={onClose}><CloseIcon /></button>
        <div
          className="lbm-art"
          dangerouslySetInnerHTML={{ __html: prefixSvgIds(p.svg) }}
          onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touch.current.x;
            const dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
          }}
        />
        <div className="lbm-bd">
          <small id="lbm-k">{`Project ${String((index ?? 0) + 1).padStart(2, '0')} of ${String(total).padStart(2, '0')}`}</small>
          <h3 id="lbm-t">{p.name}</h3>
          <p className="lbm-loc" id="lbm-l"><PinIcon size={18} /><span>{p.loc}</span></p>
          <div className="lbm-st" role="tablist" aria-label="Construction stage">
            {PROJECT_STAGES.map(([key, label]) => (
              <button key={key} type="button" className="ls" role="tab" aria-selected={stage === key} onClick={() => setStage(key)}>{label}</button>
            ))}
          </div>
          <div className="lbm-ph" id="lbm-ph" aria-live="polite">
            {photos.length === 0 ? (
              <div className="lbm-em">
                <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                  <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" d="M3 7h4l2-3h6l2 3h4v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
                {stage === 'all' ? 'Site photos for this project will be added soon.' : 'Photos from this stage will be added soon.'}
              </div>
            ) : photos.map((x) => (
              <figure key={x.u}>
                <img decoding="async" src={ASSET + x.u} alt={p.name + (x.c ? `, ${x.c}` : '')} />
                {x.c ? <figcaption>{x.c}</figcaption> : null}
              </figure>
            ))}
          </div>
          <div className="lbm-ac">
            <a className="btn" id="lbm-wa" href={waHref} target="_blank" rel="noopener noreferrer">Ask about this project</a>
            <div className="lbm-nv">
              <button type="button" id="lbm-p" aria-label="Previous project" onClick={() => go(index - 1)}>&larr;</button>
              <button type="button" id="lbm-n" aria-label="Next project" onClick={() => go(index + 1)}>&rarr;</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Projects() {
  const [region, setRegion] = useState('all');
  const [forced, setForced] = useState(() => new Set());
  const [pops, setPops] = useState({});
  const [openIdx, setOpenIdx] = useState(null);
  const lastFocus = useRef(null);
  const gridRef = useRef(null);

  const isShown = (p) => region === 'all' || p.r === region;

  const chooseRegion = (key) => {
    setRegion(key);
    const nf = new Set(forced);
    const np = {};
    let n = 0;
    PROJECTS.forEach((p, i) => {
      if (key === 'all' || p.r === key) {
        nf.add(i);
        np[i] = `${(Math.min(n++, 8) * 0.05).toFixed(2)}s`;
      }
    });
    setForced(nf);
    setPops(np);
  };

  // modal open/close + browser back button
  const openModal = (i) => {
    lastFocus.current = document.activeElement;
    if (openIdx === null) { try { window.history.pushState({ lbm: 1 }, ''); } catch (e) { /* ignore */ } }
    setOpenIdx(i);
  };
  const hideModal = () => {
    setOpenIdx((cur) => (cur === null ? cur : null));
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus({ preventScroll: true });
  };
  const closeModal = () => {
    if (window.history.state && window.history.state.lbm) { try { window.history.back(); return; } catch (e) { /* ignore */ } }
    hideModal();
  };
  useEffect(() => {
    window.addEventListener('popstate', hideModal);
    return () => window.removeEventListener('popstate', hideModal);
  }, []);

  // desktop par card ke upar mouse-spotlight
  useEffect(() => {
    const g = gridRef.current;
    if (!g || !FINE_POINTER) return undefined;
    let raf = 0; let tc = null; let px = 0; let py = 0;
    const move = (e) => {
      tc = e.target.closest && e.target.closest('.lb-card');
      px = e.clientX; py = e.clientY;
      if (!raf && tc) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (!tc) return;
          const r = tc.getBoundingClientRect();
          tc.style.setProperty('--sx', `${(px - r.left).toFixed(0)}px`);
          tc.style.setProperty('--sy', `${(py - r.top).toFixed(0)}px`);
        });
      }
    };
    g.addEventListener('pointermove', move, { passive: true });
    return () => { g.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);

  const clearPop = (i) => setPops((s) => { if (s[i] == null) return s; const c = { ...s }; delete c[i]; return c; });

  return (
    <>
      <section id="projects" className="lb">
        <div className="wrap">
          <div className="lb-h">
            <SplitHeading>Project <em>Library.</em></SplitHeading>
            <P>Our projects, each with its location.</P>
          </div>
          <Reveal className="lb-f" role="tablist" aria-label="Filter projects by area">
            {PROJECT_FILTERS.map(([key, label]) => (
              <button key={key} className="lf" role="tab" aria-selected={region === key} onClick={() => chooseRegion(key)}>{label}</button>
            ))}
          </Reveal>
          <div className="lb-g" ref={gridRef}>
            {PROJECTS.map((p, i) => (
              <ProjectCard
                key={p.name}
                p={p}
                index={i}
                hidden={!isShown(p)}
                forceIn={forced.has(i)}
                popDelay={pops[i]}
                onOpen={openModal}
                onPopEnd={clearPop}
              />
            ))}
          </div>
        </div>
      </section>
      {ENABLE_PROJECT_MODAL && (
        <ProjectModal index={openIdx} onIndex={setOpenIdx} onClose={closeModal} />
      )}
    </>
  );
}

/* =====================================================================
   14. GALLERY (+ Lightbox)
   ===================================================================== */
const GALLERY_STEP = 12;

const API_GALLERY_CATEGORIES = {
  'roads-paving': 'roads',
  'drainage-utilities': 'drain',
  'boundary-walls': 'walls',
  'gates-entrances': 'gates',
  'structures-foundations': 'struct',
  'finished-landscaped': 'done',
  'on-site': 'site',
};

const galleryImageUrl = (item) => item.url || `${ASSET}${item.src}`;

function GalleryItem({ item, onOpen }) {
  const [ref, seen] = useInView();
  return (
    <button
      ref={ref}
      type="button"
      className={`gl-i rv${seen ? ' in' : ''}`}
      aria-label={`Open photo: ${item.t}`}
      onClick={() => onOpen(item)}
    >
      <img src={galleryImageUrl(item)} width={item.iw} height={item.ih} alt={item.t} decoding="async" loading="lazy" />
      <span className="gl-c">{GALLERY_LABELS[item.c] || 'Project photos'}</span>
    </button>
  );
}

function Lightbox({ items, index, open, onClose, onIndex }) {
  const closeRef = useRef(null);
  const touch = useRef({ x: 0, y: 0 });
  const total = items.length;
  const item = open && total ? items[((index % total) + total) % total] : null;
  const show = (i) => onIndex((i + total) % total);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('glo');
    if (closeRef.current) closeRef.current.focus({ preventScroll: true });
    return () => document.documentElement.classList.remove('glo');
  }, [open]);

  // agli photo pehle se load kar lo
  useEffect(() => {
    if (!open || total < 2) return;
    const nx = items[(index + 1) % total];
    if (nx) { const im = new Image(); im.src = galleryImageUrl(nx); }
  }, [open, index, items, total]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'ArrowLeft') show(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <div className="glb" id="glb" hidden={!open} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="glb-bk" onClick={onClose} />
      <figure
        className="glb-f"
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
        }}
      >
        <img id="glb-i" alt={item ? item.t : ''} {...(item ? { src: galleryImageUrl(item) } : {})} />
        <figcaption>
          <span id="glb-t">{item ? item.t : ''}</span>
          <b id="glb-n">{item ? `${index + 1} / ${total}` : ''}</b>
        </figcaption>
      </figure>
      <button type="button" className="glb-x" aria-label="Close photo" ref={closeRef} onClick={onClose}><CloseIcon /></button>
      <button type="button" className="glb-a glb-p" id="glb-p" aria-label="Previous photo" onClick={() => show(index - 1)}>&larr;</button>
      <button type="button" className="glb-a glb-nx" id="glb-nx" aria-label="Next photo" onClick={() => show(index + 1)}>&rarr;</button>
    </div>,
    document.body,
  );
}

function Gallery() {
  const [cat, setCat] = useState('all');
  const [limit, setLimit] = useState(GALLERY_STEP);
  const [lb, setLb] = useState({ open: false, index: 0 });
  const lastFocus = useRef(null);
  const { data: uploadedGallery, error: galleryError } = useGetGalleryQuery('all');

  const matches = useMemo(() => {
    const uploadedItems = (Array.isArray(uploadedGallery?.photos) ? uploadedGallery.photos : [])
      .filter((photo) => photo.url && API_GALLERY_CATEGORIES[photo.category])
      .map((photo) => ({
        key: photo._id,
        url: photo.url,
        c: API_GALLERY_CATEGORIES[photo.category],
        t: `${GALLERY_LABELS[API_GALLERY_CATEGORIES[photo.category]]} project photo`,
      }));

    return [...uploadedItems, ...GALLERY].filter((item) => cat === 'all' || item.c === cat);
  }, [cat, uploadedGallery]);
  const visible = matches.slice(0, limit);
  const left = matches.length - Math.min(matches.length, limit);
  const galleryErrorMessage = galleryError?.data?.message
    || galleryError?.error
    || (galleryError ? 'Uploaded photos could not be loaded.' : '');

  const chooseCat = (key) => { setCat(key); setLimit(GALLERY_STEP); };

  const openLb = (item) => {
    lastFocus.current = document.activeElement;
    const i = matches.indexOf(item);
    if (!lb.open) { try { window.history.pushState({ glb: 1 }, ''); } catch (e) { /* ignore */ } }
    setLb({ open: true, index: i < 0 ? 0 : i });
  };
  const hideLb = () => {
    setLb((s) => (s.open ? { ...s, open: false } : s));
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus({ preventScroll: true });
  };
  const closeLb = () => {
    if (window.history.state && window.history.state.glb) { try { window.history.back(); return; } catch (e) { /* ignore */ } }
    hideLb();
  };
  useEffect(() => {
    window.addEventListener('popstate', hideLb);
    return () => window.removeEventListener('popstate', hideLb);
  }, []);

  return (
    <>
      <section id="gallery" className="gl">
        <div className="wrap">
          <div className="gl-h">
            <SplitHeading>Our work, <em>in pictures.</em></SplitHeading>
            <P>Photos taken on our sites: roads, drains, walls, gates and finished landscapes. Tap any photo to see it full size.</P>
          </div>
          <Reveal className="gl-f" role="tablist" aria-label="Filter photos by type of work">
            {GALLERY_FILTERS.map(([key, label]) => (
              <button key={key} type="button" className="gf" role="tab" aria-selected={cat === key} onClick={() => chooseCat(key)}>{label}</button>
            ))}
          </Reveal>
          {galleryErrorMessage && (
            <p className="admin-dashboard__inline-error" role="status">
              New uploaded photos are temporarily unavailable. {galleryErrorMessage}
            </p>
          )}
          <div className="gl-g" id="glg">
            {visible.map((g) => <GalleryItem key={g.key || g.src} item={g} onOpen={openLb} />)}
          </div>
          <div className="gl-m" hidden={left <= 0}>
            <button type="button" className="btn" id="glm" onClick={() => setLimit((l) => l + GALLERY_STEP)}>
              {`Show more photos (${left} left)`}
            </button>
          </div>
        </div>
      </section>
      <Lightbox
        items={matches}
        index={lb.index}
        open={lb.open}
        onClose={closeLb}
        onIndex={(i) => setLb((s) => ({ ...s, index: i }))}
      />
    </>
  );
}

/* =====================================================================
   15. TRUST, PROCESS, TESTIMONIALS, CLIENTS
   ===================================================================== */
function TrustHeading({ children }) {
  const [ref, seen] = useInView();
  return (
    <div ref={ref} className={`tr-s rv${seen ? ' in' : ''}`}>
      <span className="tr-b" />
      <h3>{children}</h3>
    </div>
  );
}

function TrustIcon({ shapes }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes.map(([tag, attrs], i) => (tag === 'circle'
        ? <circle key={i} cx={attrs.cx} cy={attrs.cy} r={attrs.r} />
        : <path key={i} d={attrs.d} />))}
    </svg>
  );
}

function Trust() {
  return (
    <section id="trust" className="tr">
      <div className="wrap">
        <div className="tr-h">
          <SplitHeading>Why clients <em>trust us.</em></SplitHeading>
          <P>ZU Developers is a family-led company. We earn trust the slow way: by building well, being honest, and letting you see the work for yourself.</P>
        </div>

        <TrustHeading>How we grew</TrustHeading>
        <ol className="tl">
          {TIMELINE.map((t) => (
            <Reveal as="li" className="tl-i" d={t.d} key={t.h}>
              <div className="tl-n"><b>{t.n}</b><span>{t.u}</span></div>
              <h3>{t.h}</h3>
              <p>{t.p}</p>
            </Reveal>
          ))}
        </ol>

        <TrustHeading>What we promise</TrustHeading>
        <div className="tr-g">
          {TRUST_CARDS.map((c) => (
            <Reveal as="article" className="tr-c glass" d={c.d} key={c.h}>
              <TrustIcon shapes={c.icon} />
              <h3>{c.h}</h3>
              <p>{c.p}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="tr-a">
          <div>
            <h3>See it for yourself.</h3>
            <p>Browse our projects and site photos, or ask us about visiting a site. We are happy to show you the work.</p>
          </div>
          <div className="tr-bt">
            <Btn reveal={false} href="#projects">See our projects</Btn>
            <Btn
              reveal={false}
              href={waLink('Hello ZU Developers, I would like to visit one of your sites.')}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask to visit a site
            </Btn>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="process">
      <div className="wrap">
        <SplitHeading>How we work</SplitHeading>
        <div className="steps">
          {PROCESS_STEPS.map((s) => (
            <Reveal className="glass" d={s.d === '0s' ? undefined : s.d} key={s.h}>
              <h3>{s.h}</h3>
              <P rv={false}>{s.p}</P>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section>
      <div className="wrap">
        <SplitHeading>What clients <em>say.</em></SplitHeading>
        <div className="tri">
          {QUOTES.map((q) => (
            <Reveal className="q glass" d={q.d === '0s' ? undefined : q.d} key={q.s}>
              <p>{q.p}</p>
              <small>{q.s}</small>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Clients() {
  return (
    <section>
      <div className="wrap">
        <SplitHeading>Trusted by clients and partners</SplitHeading>
        <P zr style={{ marginTop: 30, color: 'var(--mute)' }}>
          Projects we have delivered for our clients, dealers, companies and partners.
        </P>
        <div className="cl">
          {CLIENTS.map((c) => (
            <Reveal className={`glass${c.partner ? ' cl-p' : ''}`} d={c.d} key={c.name}>
              {c.name}<small>{c.loc}</small>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   16. FAQ, CONTACT, FOOTER, WHATSAPP
   ===================================================================== */
function Faq() {
  return (
    <section id="faq" className="fq">
      <div className="wrap">
        <div className="fq-g">
          <div className="fq-l">
            <SplitHeading>Questions, <em>answered.</em></SplitHeading>
            <P>The things clients ask us most. If yours is not here, ask us directly. We are happy to talk.</P>
            <Btn href={waLink('Hello ZU Developers, I have a question about your work.')} target="_blank" rel="noopener noreferrer">
              Ask on WhatsApp
            </Btn>
          </div>
          <div className="fq-r">
            {FAQS.map((f) => (
              <Reveal as="details" className="fq-i" d={f.d} open={f.open || undefined} key={f.q}>
                <summary><span>{f.q}</span><i aria-hidden="true" /></summary>
                <div className="fq-a"><p>{f.a}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const onSubmit = (e) => {
    e.preventDefault();
    const fm = e.currentTarget;
    const f = new FormData(fm);
    if (f.get('_honey')) return; // spam bot
    const nm = f.get('n'); const ct = f.get('c'); const ms = f.get('m');
    const wl = waLink(`Hello ZU Developers, my name is ${nm}. ${ms} (Contact: ${ct})`);
    setBusy(true);
    setStatus(null);

    const ok = () => {
      fm.reset();
      setBusy(false);
      setStatus(<>Thank you. Your enquiry has been sent and we will contact you soon. <a href={wl} target="_blank" rel="noopener noreferrer">Continue on WhatsApp</a></>);
    };
    const bad = () => {
      setBusy(false);
      setStatus(<>Please <a href={wl} target="_blank" rel="noopener noreferrer">send your enquiry on WhatsApp</a> or email {EMAIL}.</>);
    };

    if (!ENABLE_FORMSUBMIT) { bad(); return; }
    fetch(`https://formsubmit.co/ajax/${EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Name: nm, Contact: ct, Message: ms,
        _subject: `New enquiry from ZU Developers website: ${nm}`,
        _template: 'table', _captcha: 'false',
      }),
    })
      .then((r) => r.json())
      .then((j) => ((j && (j.success === true || j.success === 'true')) ? ok() : bad()))
      .catch(bad);
  };

  return (
    <Reveal as="form" id="f" className="glass" onSubmit={onSubmit}>
      <label>Name<input name="n" required autoComplete="name" /></label>
      <label>Email or phone<input name="c" required /></label>
      <label>Tell us about your project<textarea name="m" required /></label>
      <input
        type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
      />
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send enquiry'}</button>
      <p className="fs" id="fs" role="status" aria-live="polite">{status}</p>
    </Reveal>
  );
}

function Contact() {
  return (
    <section id="contact">
      <div className="wrap ct">
        <div>
          <SplitHeading>Let us build <em>yours.</em></SplitHeading>
          <Reveal as="dl">
            <dt>Email</dt>
            <dd><a href={`mailto:${EMAIL}`}>{EMAIL}</a></dd>
            <dt>Phone</dt>
            <dd><a href="tel:+919691091766">+91 96910 91766</a></dd>
            <dt>WhatsApp</dt>
            <dd><a href={WA_GENERAL} target="_blank" rel="noopener noreferrer">Chat with us</a></dd>
            <dt>Office address</dt>
            <dd>B-7 Kashif Complex, Malviya Nagar, Bhopal, PIN code 462003</dd>
            <dt>Hours</dt>
            <dd>Mon to Sat, 10 am to 6 pm</dd>
          </Reveal>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="lg" role="img" aria-label="ZU Developer logo" />
      © 2026 ZU Developers. All rights reserved.
    </footer>
  );
}

function WhatsAppFloat() {
  return (
    <a className="wa" href={WA_GENERAL} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 13.9c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 .9c.3.1.5.2.6.3.1.2.1.8-.1 1.3z" />
      </svg>
    </a>
  );
}

/* =====================================================================
   17. APP-LEVEL BEHAVIOUR + ROOT
   ===================================================================== */

/** #anchor links par smooth (eased) scroll */
function useSmoothAnchors() {
  useEffect(() => {
    const R = document.documentElement;
    let raf = 0; let cvt = 0;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const stop = () => cancelAnimationFrame(raf);
    const go = (y) => {
      stop();
      const y0 = window.scrollY; const dy = y - y0;
      if (Math.abs(dy) < 2) return;
      const dur = Math.min(1100, Math.max(550, Math.abs(dy) * 0.3));
      const t0 = performance.now();
      const step = (n) => {
        const t = Math.min(1, (n - t0) / dur);
        window.scrollTo(0, y0 + dy * ease(t));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const onKey = (e) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) stop();
    };
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      requestAnimationFrame(() => {
        R.classList.add('cvv'); // sections ko temporarily visible rakho taaki height sahi nape
        const y = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 76;
        go(Math.max(0, y));
        clearTimeout(cvt);
        cvt = setTimeout(() => R.classList.remove('cvv'), Math.min(1100, Math.max(550, Math.abs(y - window.scrollY) * 0.3)) + 400);
        try { window.history.replaceState(null, '', `#${id}`); } catch (x) { /* ignore */ }
      });
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(cvt);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const frameRefs = useRef([]);
  const scrimRef = useRef(null);

  useSmoothAnchors();

  // <head> settings (title, theme colour)
  useEffect(() => {
    document.title = PAGE_TITLE;
    document.documentElement.lang = 'en';
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = '#f5efe4';
  }, []);

  // mobile menu: body lock + Escape
  useEffect(() => {
    document.body.classList.toggle('mo', menuOpen);
    return () => document.body.classList.remove('mo');
  }, [menuOpen]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Preloader />
      <ScrollBar />
      <BackgroundFrames frameRefs={frameRefs} scrimRef={scrimRef} />
      <Watermark />
      <HeaderBar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((o) => !o)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="top">
        <JourneySection frameRefs={frameRefs} scrimRef={scrimRef} />
        <Hero />
        <Marquee />
        <PromiseBand />
        <About />
        <Story />
        <Founder />
        <Directors />
        <Services />
        <Projects />
        <Gallery />
        <Trust />
        <Process />
        <Testimonials />
        <Clients />
        <Faq />
        <Contact />
      </main>

      <Footer />
      <WhatsAppFloat />
      <Cursor />
    </>
  );
}
