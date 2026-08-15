import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  X,
} from 'lucide-react'
import CursorGrid from './CursorGrid'
import Prism from './Prism'

const PUBLIC_BASE = import.meta.env.BASE_URL
const publicAsset = (path) => `${PUBLIC_BASE}${path.replace(/^\/+/, '')}`
const REMOTE_ASSET = publicAsset('picture/')

const asset = (path) => `${REMOTE_ASSET}${path}`
const pad = (value, size = 2) => String(value).padStart(size, '0')
const fileName = (prefix, index, suffix = '') => `${prefix}-${pad(index)}${suffix}.jpg`

const galleryConfigs = [
  {
    id: 'gtm',
    chapter: 'GTM',
    title: 'PRODUCT GTM',
    desc: 'Launch pages, detail visuals, and product storytelling systems.',
    thumbDir: 'gtm/thumbs',
    thumbPre: 'gtm',
    thumbSuffix: '-t',
    fullDir: 'gtm/long',
    fullPre: 'gtm',
    max: 4,
    long: true,
  },
  {
    id: 'marketing',
    chapter: 'MARKETING',
    title: 'MARKETING',
    desc: 'Campaign scenes built for e-commerce rhythm and seasonal conversion.',
    thumbDir: 'marketing/thumbs',
    thumbPre: 'mk',
    thumbSuffix: '-t',
    fullDir: 'marketing/full',
    fullPre: 'mk',
    max: 20,
  },
  {
    id: 'practice',
    chapter: 'WORKS',
    title: 'WORKS',
    desc: 'Form studies, render experiments, and visual direction fragments.',
    thumbDir: 'practice/thumbs',
    thumbPre: 'pr',
    thumbSuffix: '-t',
    fullDir: 'practice/full',
    fullPre: 'pr',
    max: 40,
    masonry: true,
  },
]

const gtmProjectTitles = ['思域保温杯', '豹贝保温杯', '企鹅智能壶', '青云壶']
const kataFriends = Array.from({ length: 23 }, (_, i) => `gtm/long/Kata Friends/kf-${pad(i + 1)}.jpg`)

function useIntro() {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.body.classList.add('intro-lock')
    const started = performance.now()
    let raf = 0
    const tick = () => {
      const next = Math.min(100, ((performance.now() - started) / 2200) * 100)
      setProgress(next)
      if (next < 100) {
        raf = requestAnimationFrame(tick)
      } else {
        window.setTimeout(() => {
          setDone(true)
          document.body.classList.remove('intro-lock')
          document.body.classList.add('hero-ready')
        }, 420)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      document.body.classList.remove('intro-lock')
    }
  }, [])

  return { progress, done }
}

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('in-view')),
      { threshold: 0.18 },
    )
    document.querySelectorAll('.chapter-enter, .reveal-card').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])
}

function useChapter() {
  const [chapter, setChapter] = useState('INTRO')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (active?.target?.dataset?.chapter) setChapter(active.target.dataset.chapter)
      },
      { rootMargin: '-32% 0px -48% 0px', threshold: [0.08, 0.2, 0.4, 0.62] },
    )
    document.querySelectorAll('[data-chapter]').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return chapter
}

function useLocalNumber(key) {
  const [count, setCount] = useState(() => Number(localStorage.getItem(key) || 0))
  const bump = (delta) => {
    setCount((current) => {
      const next = Math.max(0, current + delta)
      localStorage.setItem(key, String(next))
      return next
    })
  }
  return [count, bump]
}

function useGalleryItems() {
  return useMemo(() => {
    const byGallery = {}
    galleryConfigs.forEach((cfg) => {
      byGallery[cfg.id] = Array.from({ length: cfg.max }, (_, index) => {
        const i = index + 1
        const thumbName = `${cfg.thumbDir}/${fileName(cfg.thumbPre, i, cfg.thumbSuffix)}`
        const type = cfg.long ? 'long' : 'std'
        const full = `${cfg.fullDir}/${fileName(cfg.fullPre, i)}`
        return {
          id: `${cfg.id}-${pad(i)}`,
          gallery: cfg.id,
          chapter: cfg.chapter,
          index: i,
          type,
          title: cfg.id === 'gtm' ? gtmProjectTitles[index] : `${cfg.chapter} ${pad(i)}`,
          thumb: asset(thumbName),
          video: cfg.id === 'gtm' ? asset(thumbName.replace(/\.jpg$/i, '.mp4')) : '',
          full: asset(full),
        }
      })
    })
    return byGallery
  }, [])
}

function CountUp({ to, padTo = 2 }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    let raf = 0
    let started = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return
      started = performance.now()
      const tick = (now) => {
        const t = Math.min(1, (now - started) / 950)
        setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])

  return <span ref={ref}>{pad(value, padTo)}</span>
}

function ParticleTitle() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !ctx) return undefined

    let particles = []
    let pointer = { x: -9999, y: -9999, active: false }
    let raf = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      const size = Math.min(rect.width / 5.1, rect.height * 0.78)
      ctx.font = `900 ${size}px Anton, Impact, Arial Narrow, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText('RENDER WORK', rect.width / 2, rect.height / 2)
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const points = []
      const gap = rect.width < 760 ? 9 : 7
      for (let y = 0; y < canvas.height; y += gap * dpr) {
        for (let x = 0; x < canvas.width; x += gap * dpr) {
          const alpha = image.data[(y * canvas.width + x) * 4 + 3]
          if (alpha > 90) points.push({ x: x / dpr, y: y / dpr })
        }
      }
      particles = points.slice(0, 3800).map((point) => ({
        x: point.x + (Math.random() - 0.5) * 28,
        y: point.y + (Math.random() - 0.5) * 28,
        tx: point.x,
        ty: point.y,
        vx: 0,
        vy: 0,
      }))
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.fillStyle = 'rgba(245, 241, 245, .92)'
      particles.forEach((p) => {
        let dx = p.tx - p.x
        let dy = p.ty - p.y
        if (pointer.active) {
          const px = p.x - pointer.x
          const py = p.y - pointer.y
          const dist = Math.hypot(px, py)
          if (dist < 145) {
            const force = (1 - dist / 145) * 7
            dx += (px / Math.max(dist, 1)) * force * 11
            dy += (py / Math.max(dist, 1)) * force * 11
          }
        }
        p.vx = (p.vx + dx * 0.035) * 0.82
        p.vy = (p.vy + dy * 0.035) * 0.82
        p.x += p.vx
        p.y += p.vy
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.15, 0, Math.PI * 2)
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }

    const move = (event) => {
      const rect = canvas.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true }
    }
    const leave = () => {
      pointer.active = false
    }

    build()
    draw()
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    window.addEventListener('resize', build)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerleave', leave)
      window.removeEventListener('resize', build)
    }
  }, [])

  return (
    <div className="hero-particle-module" aria-label="Interactive particle title">
      <canvas ref={canvasRef} />
    </div>
  )
}

function CursorGridBackground({ paper = false }) {
  return (
    <div className={`section-cursor-grid ${paper ? 'section-cursor-grid--paper' : ''}`} aria-hidden="true">
      <CursorGrid
        cellSize={35}
        color={paper ? '#707070' : '#5c5c5c'}
        radius={140}
        falloff="linear"
        holdTime={400}
        fadeDuration={800}
        lineWidth={0.8}
        maxOpacity={0.2}
        fillOpacity={0}
        gridOpacity={0}
        cellRadius={0}
        clickPulse
        pulseSpeed={600}
      />
    </div>
  )
}

function IntroLoader({ done, progress }) {
  return (
    <div id="intro-loader" className={done ? 'done' : ''} style={{ '--intro-fill-clip': `${100 - progress}%` }}>
      <div className="intro-logo">
        <div className="intro-logo__base">
          <span>李艳林的</span>
          <span>个人作品</span>
        </div>
        <div className="intro-logo__fill" aria-hidden="true">
          <div className="intro-logo__fill-copy">
            <span>李艳林的</span>
            <span>个人作品</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Nav({ chapter, menuOpen, setMenuOpen }) {
  const links = [
    ['home', 'HOME', '首页'],
    ['resume', 'RESUME', '简历'],
    ['gtm', 'WORK', '作品'],
    ['contact', 'CONTACT', '联系'],
  ]

  return (
    <>
      <nav className={chapter === 'RESUME' ? 'paper-nav' : ''}>
        <a href="#home" className="logo">
          LIN
        </a>
        <div className="nav-r">
          <div className="links">
            {links.map(([id, chapterKey, label]) => (
              <a key={id} href={`#${id}`} className={chapter === chapterKey || (chapterKey === 'WORK' && ['GTM', 'MARKETING', 'WORKS'].includes(chapter)) ? 'active' : ''}>
                {label}
              </a>
            ))}
          </div>
          <button className="nav-burger" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={18} />
          </button>
        </div>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'active' : ''}`} aria-hidden={!menuOpen}>
        {links.map(([id, chapterKey, label], index) => (
          <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
            <span>
              {label}
              <em>{pad(index + 1)}</em>
            </span>
          </a>
        ))}
        <div className="mobile-menu__social">
          <a href="https://www.zcool.com.cn/u/23931684?sort=8&p=1#tab_anchor" target="_blank" rel="noreferrer">
            ZCOOL <ArrowUpRight size={14} />
          </a>
          <a href="https://www.xiaohongshu.com/user/profile/625fca7e0000000010007fbd" target="_blank" rel="noreferrer">
            RED <ArrowUpRight size={14} />
          </a>
          <span>EMAIL PRIVATE</span>
        </div>
      </div>
    </>
  )
}

function ChapterRail({ chapter }) {
  const chapterMap = {
    INTRO: ['00', 0.04],
    HOME: ['01', 0.1],
    RESUME: ['02', 0.3],
    GTM: ['01', 0.5],
    MARKETING: ['02', 0.68],
    WORKS: ['03', 0.86],
    CONTACT: ['06', 1],
  }
  const [index, progress] = chapterMap[chapter] || chapterMap.HOME
  const chapterLabel = {
    INTRO: '序章',
    HOME: '首页',
    RESUME: '简历',
    GTM: '作品',
    MARKETING: '作品',
    WORKS: '作品',
    CONTACT: '联系',
  }[chapter] || '首页'
  return (
    <div className="chapter-rail" style={{ '--chapter-progress': progress }} aria-hidden="true">
      <span className="chapter-progress">
        <i />
      </span>
      <span className="chapter-index">{index}</span>
      <span>{chapterLabel}</span>
      <span className="chapter-hotkeys">
        <span>H</span>
        <span>M</span>
        <span>G</span>
        <span>P</span>
      </span>
    </div>
  )
}

function Hero() {
  return (
    <header id="home" className="hero-panel" data-chapter="HOME">
      <CursorGridBackground />
      <div className="hero-mark" aria-hidden="true">
        LIN
      </div>
      <ParticleTitle />
      <h1 className="hero-fallback-title" aria-label="RENDER WORK">
        <span>RENDER WORK</span>
      </h1>
      <div className="hero-meta" aria-hidden="true">
        <span className="hero-meta__left">
          <span className="meta-icon">+</span>
          Since <CountUp to={2026} padTo={4} />
        </span>
        <span className="hero-meta__right">
          SZ 22.54N / 114.06E
          <MapPin size={15} />
        </span>
      </div>
    </header>
  )
}

function StudioArchive() {
  return (
    <section className="studio-archive chapter-enter" aria-label="Studio archive">
      <div className="studio-archive__prism" aria-hidden="true">
        <Prism
          animationType="hover"
          timeScale={0.5}
          height={3.6}
          baseWidth={6.4}
          scale={3.6}
          hueShift={-0.1416}
          colorFrequency={2.35}
          noise={0.35}
          glow={0.4}
          bloom={0.85}
          hoverStrength={1.2}
          inertia={0.08}
          suspendWhenOffscreen
        />
      </div>
      <div className="studio-archive__title-wrap">
        <div className="studio-archive__eyebrow" aria-hidden="true">
          <span>INDEX 01 / 06</span>
          <span>STUDIO ARCHIVE</span>
          <span>2026</span>
        </div>
        <h2 className="studio-archive__title">
          <span className="archive-line">Product Render</span>
          <span className="archive-line">GTM Launch Systems</span>
          <span className="archive-line">Campaign KV</span>
          <span className="archive-line">Visual Studies</span>
          <span className="archive-line archive-line--muted">Curated as a Visual Archive.</span>
        </h2>
      </div>
      <div className="studio-archive__body">
        <p className="studio-archive__summary">
          <span aria-hidden="true">*</span> Launch-ready product imagery, campaign key visuals, and visual studies collected across active channels.
        </p>
        <div className="studio-stats" aria-label="Archive stats">
          <span>
            <strong>
              <CountUp to={72} />
            </strong>
            <i>Curated Works</i>
          </span>
          <span>
            <strong>
              <CountUp to={6} padTo={1} />
            </strong>
            <i>Visual Chapters</i>
          </span>
          <span>
            <strong>
              <CountUp to={3} padTo={1} />
            </strong>
            <i>Active Channels</i>
          </span>
        </div>
      </div>
    </section>
  )
}

function Resume() {
  return (
    <section id="resume" className="resume-section chapter-enter" data-chapter="RESUME">
      <CursorGridBackground paper />
      <div className="resume-heading">
        <span>索引 02 / 06 - 个人介绍</span>
        <h2>
          COMMERCIAL
          <br />
          PRODUCT RENDER
          <br />
          ARTIST
          <br />
          VISUAL DELIVERY.
        </h2>
      </div>
      <div className="resume-grid">
        <aside className="resume-profile">
          <img src={publicAsset('lin-avatar.jpg')} alt="李艳林头像" />
          <div>
            <span className="resume-label">身份</span>
            <strong>李艳林 / LIN</strong>
          </div>
        </aside>
        <div className="resume-copy">
          <p>
            5年商业产品渲染实战经验，具备全流程落地能力，熟练使用C4D+Octane完成模型优化、材质调校、场景布光、渲染输出及后期精修。擅长结合ChatGPT等AI工具辅助创意构思、梳理视觉方案、提炼产品卖点，有效提升策划与沟通效率。熟悉电商视觉规范，可独立完成白底产品图、细节特写、场景效果图、详情及活动海报等整套视觉制作。能精准把握工业设计诉求，严格控制产品外观还原度与统一视觉调性，高效应对新品开发、多配色迭代及大促集中出图等各类项目需求。持续关注可持续设计趋势，致力于提升渲染效率与画面真实感。
          </p>
          <div className="resume-list">
            <div>
              <span>姓名</span>
              <strong>李艳林 / LIN</strong>
            </div>
            <div>
              <span>出生</span>
              <strong>2001.12.28</strong>
            </div>
            <div>
              <span>方向</span>
              <strong>商业产品渲染 / 电商视觉 / 活动海报</strong>
            </div>
            <div>
              <span>工具</span>
              <strong>C4D / Octane / Photoshop / ChatGPT</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CategoryTitle({ config, number }) {
  return (
    <section id={config.id} className="cat-t chapter-enter" data-chapter={config.chapter} data-num={pad(number)}>
      <CursorGridBackground />
      <div className="cat-index" aria-hidden="true">
        <b>{pad(number)}</b>
        <span>INDEX {pad(number)} / 03 - 2026</span>
      </div>
      <strong>{config.title}</strong>
      <em>{config.desc}</em>
    </section>
  )
}

function GalleryCard({ item, openLightbox }) {
  const [liked, setLiked] = useState(() => localStorage.getItem(`isLk_${item.id}`) === '1')
  const [count, bump] = useLocalNumber(`lk_${item.id}`)

  const toggleLike = (event) => {
    event.stopPropagation()
    setLiked((nextLiked) => {
      bump(nextLiked ? -1 : 1)
      localStorage.setItem(`isLk_${item.id}`, nextLiked ? '0' : '1')
      return !nextLiked
    })
  }

  return (
    <article
      className={`img-box reveal-card ${item.gallery === 'gtm' ? 'gtm-project-card' : 'work-project-card'}`}
      style={{ '--card-image': `url(${item.thumb})` }}
      onClick={() => openLightbox(item.gallery, item.index - 1)}
    >
      <img src={item.thumb} alt={`${item.chapter} work ${pad(item.index)}`} loading="lazy" decoding="async" />
      {item.video ? <video src={item.video} poster={item.thumb} muted loop playsInline autoPlay aria-hidden="true" onLoadedData={(event) => event.currentTarget.parentElement?.classList.add('has-video')} /> : null}
      {item.gallery === 'gtm' ? (
        <div className="gtm-project-title" aria-hidden="true">
          <span>GTM {pad(item.index)}</span>
          <strong>{item.title}</strong>
          <ArrowUpRight size={16} />
        </div>
      ) : (
        <div className="archive-card-label" aria-hidden="true">
          {item.chapter}
          {pad(item.index)}
        </div>
      )}
      <button className={`item-like ${liked ? 'liked' : ''}`} onClick={toggleLike} type="button" aria-label="Like work">
        <Heart size={14} />
        <span>{count}</span>
      </button>
    </article>
  )
}

function Gallery({ config, items, openLightbox }) {
  return (
    <div id={`gallery-${config.id}`} className={`${config.masonry ? 'grid-masonry' : 'grid-fixed'} ${config.id === 'gtm' ? 'gtm-gallery' : ''} chapter-enter`} data-chapter={config.chapter}>
      <CursorGridBackground />
      {items.map((item) => (
        <GalleryCard key={item.id} item={item} openLightbox={openLightbox} />
      ))}
    </div>
  )
}

function Lightbox({ lightbox, itemsByGallery, close, setIndex }) {
  const activeItems = lightbox ? itemsByGallery[lightbox.gallery] || [] : []
  const item = lightbox ? activeItems[lightbox.index] : null
  const [touchStart, setTouchStart] = useState(null)

  const move = (direction) => {
    if (!activeItems.length) return
    setIndex((lightbox.index + direction + activeItems.length) % activeItems.length)
  }

  useEffect(() => {
    if (!item) return undefined
    document.body.classList.add('lb-open')
    document.body.style.overflow = 'hidden'
    const handler = (event) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') move(1)
      if (event.key === 'ArrowLeft') move(-1)
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.classList.remove('lb-open')
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handler)
    }
  }, [item])

  const endSwipe = (event) => {
    if (!touchStart) return
    const dx = event.clientX - touchStart.x
    const dy = event.clientY - touchStart.y
    setTouchStart(null)
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1)
  }

  return (
    <div
      id="lb"
      className={`${item ? 'active' : ''} ${item?.type === 'long' ? 'long-mode' : ''} ${item?.type === 'kata' ? 'kata-mode' : ''}`}
      onClick={(event) => event.target.id === 'lb' && close()}
      onPointerDown={(event) => setTouchStart({ x: event.clientX, y: event.clientY })}
      onPointerUp={endSwipe}
    >
      <button id="lb-close" type="button" aria-label="Close image" onClick={close}>
        <X size={18} />
      </button>
      <div className="lb-info" aria-hidden={!item}>
        <strong>
          {pad((lightbox?.index || 0) + 1)} / {pad(activeItems.length || 0)}
        </strong>
        <span>{item?.type === 'kata' ? 'KATA FRIENDS' : item?.chapter || 'ARCHIVE'}</span>
      </div>
      {item?.type !== 'kata' ? (
        <>
          <button className="lb-nav lb-prev" type="button" aria-label="Previous" onClick={(event) => { event.stopPropagation(); move(-1) }}>
            <ChevronLeft size={28} />
          </button>
          <button className="lb-nav lb-next" type="button" aria-label="Next" onClick={(event) => { event.stopPropagation(); move(1) }}>
            <ChevronRight size={28} />
          </button>
        </>
      ) : null}
      <div id="lb-content">
        {item?.type === 'kata' ? (
          <div className="kata-container">
            <div className="kata-track">
              {kataFriends.map((src, index) => (
                <div className="kata-card" key={src} style={{ '--kata-delay': `${index * 30}ms` }}>
                  <div className="kata-media">
                    <img src={asset(src)} alt={`Kata Friends ${pad(index + 1)}`} loading="lazy" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : item ? (
          <img
            className={item.type === 'long' ? 'img-long' : 'img-std'}
            src={item.full}
            alt={item.title}
            onError={(event) => {
              if (event.currentTarget.dataset.fallback) return
              event.currentTarget.dataset.fallback = 'true'
              event.currentTarget.src = item.thumb
            }}
          />
        ) : null}
      </div>
      {item?.type === 'std' ? (
        <div className="lb-strip">
          {activeItems.map((stripItem, index) => (
            <button key={stripItem.id} type="button" className={index === lightbox.index ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setIndex(index) }}>
              <img src={stripItem.thumb} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Guestbook({ open, setOpen }) {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tb_guestbook') || '[]')
    } catch {
      return []
    }
  })
  const [draft, setDraft] = useState('')

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    const next = [{ text, time: new Date().toLocaleString() }, ...messages].slice(0, 24)
    setMessages(next)
    localStorage.setItem('tb_guestbook', JSON.stringify(next))
    setDraft('')
  }

  return (
    <aside id="global-cmt-box" className={open ? 'active' : ''} aria-hidden={!open}>
      <div className="guestbook-head">
        <h3>GUESTBOOK</h3>
        <button type="button" aria-label="Close guestbook" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
      </div>
      <div className="guestbook-list">
        {messages.length ? messages.map((message, index) => (
          <article key={`${message.time}-${index}`}>
            <p>{message.text}</p>
            <span>{message.time}</span>
          </article>
        )) : <p className="empty">No messages yet...</p>}
      </div>
      <div className="guestbook-input">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder="Type a message..." />
      </div>
    </aside>
  )
}

function FloatingActions({ setGuestOpen }) {
  const [topVisible, setTopVisible] = useState(false)
  const [liked, setLiked] = useState(() => localStorage.getItem('tb_is_lk') === '1')
  const [count, bump] = useLocalNumber('tb_lks')

  useEffect(() => {
    const onScroll = () => setTopVisible(window.scrollY > window.innerHeight * 0.55)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fab-box">
      <button className="fab" type="button" aria-label="Open guestbook" onClick={() => setGuestOpen(true)}>
        <MessageCircle size={18} />
      </button>
      <button
        className={`fab fab-like ${liked ? 'liked' : ''}`}
        type="button"
        aria-label="Like site"
        onClick={() => {
          setLiked((isLiked) => {
            bump(isLiked ? -1 : 1)
            localStorage.setItem('tb_is_lk', isLiked ? '0' : '1')
            return !isLiked
          })
        }}
      >
        <Heart size={18} />
        <span>{count}</span>
      </button>
      <button className={`fab top-fab ${topVisible ? 'visible' : ''}`} type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ChevronUp size={20} />
      </button>
    </div>
  )
}

function Cursor() {
  const ref = useRef(null)

  useEffect(() => {
    const cursor = ref.current
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!cursor || !fine || reduce) {
      if (cursor) cursor.style.display = 'none'
      return undefined
    }
    document.documentElement.classList.add('has-cursor')
    const move = (event) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`
      cursor.classList.add('is-visible')
      const target = event.target
      const interactive = target.closest?.('a,button,input,.lb-nav,.item-like')
      const view = !interactive && target.closest?.('.img-box,.kata-card')
      cursor.classList.toggle('is-hover', !!interactive)
      cursor.classList.toggle('is-view', !!view)
    }
    const hide = () => cursor.classList.remove('is-visible')
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('mouseleave', hide)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('mouseleave', hide)
    }
  }, [])

  return (
    <div id="cursor" ref={ref} aria-hidden="true">
      <span className="cursor-view">
        <ArrowUpRight size={16} />
      </span>
    </div>
  )
}

function Contact() {
  return (
    <section id="contact" className="cta-band chapter-enter" data-chapter="CONTACT" aria-label="Contact call to action">
      <CursorGridBackground />
      <span className="signature-watermark" aria-label="LIN signature">
        LIN
      </span>
    </section>
  )
}

export default function App() {
  const { progress, done } = useIntro()
  const chapter = useChapter()
  const itemsByGallery = useGalleryItems()
  const [menuOpen, setMenuOpen] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  useReveal()

  const openLightbox = (gallery, index) => setLightbox({ gallery, index })

  return (
    <>
      <IntroLoader done={done} progress={progress} />
      <Lightbox lightbox={lightbox} itemsByGallery={itemsByGallery} close={() => setLightbox(null)} setIndex={(index) => setLightbox((current) => current && { ...current, index })} />
      <Guestbook open={guestOpen} setOpen={setGuestOpen} />
      <Nav chapter={chapter} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <ChapterRail chapter={chapter} />
      <FloatingActions setGuestOpen={setGuestOpen} />
      <div className="gradual-blur" aria-hidden="true" />
      <main>
        <Hero />
        <StudioArchive />
        <Resume />
        <div className="paper-to-dark-arc" aria-hidden="true" />
        {galleryConfigs.map((config, index) => (
          <div key={config.id}>
            <CategoryTitle config={config} number={index + 1} />
            <Gallery config={config} items={itemsByGallery[config.id]} openLightbox={openLightbox} />
          </div>
        ))}
        <Contact />
      </main>
      <Cursor />
    </>
  )
}
