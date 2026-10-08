// src/components/dashboard/marketing/ContentKitTab.jsx
//
// Turns a product the vendor already has into something they can post today:
// a sized image for Instagram, WhatsApp status or TikTok, plus a caption and
// hashtags. No designer, no Canva, no data cost beyond the photo they uploaded.
//
// Everything renders in the browser on a <canvas>. Nothing is uploaded, nothing
// is generated server-side, so it costs no function invocations and works on a
// cheap phone.
//
// THE TRAP THIS FILE EXISTS TO AVOID
// Drawing a cross-origin image onto a canvas TAINTS it, and a tainted canvas
// throws SecurityError on toBlob(). Product photos are on Cloudinary, so every
// card would fail to download. The image is therefore loaded with
// crossOrigin='anonymous' BEFORE its src is set (order matters), and if that
// still fails the card renders without the photo rather than breaking. A vendor
// always gets something they can post.
//
// Redesigned 2026-10-08 to match Get found: products as photos to tap, size
// and style as visual choices, and the card shown inside a phone, the way it
// will look when posted. Phones that can share files get a Share button that
// hands the image and caption straight to WhatsApp, Instagram or TikTok.
import { useState, useEffect, useRef, useCallback } from 'react'
import { Image as ImageIcon, Download, Loader2, RefreshCw, Share2 } from 'lucide-react'
import { getProducts } from '../../../firebase/products'
import { Panel, CopyButton, Notice, PhoneFrame, SideLabel, INPUT, useCopy } from './ui'

const FORMATS = [
  { id: 'square', label: 'Instagram post', w: 1080, h: 1080 },
  { id: 'story', label: 'Story / Status / TikTok', w: 1080, h: 1920 },
]

const THEMES = [
  { id: 'clean', label: 'Clean', bg: '#ffffff', fg: '#0f172a', sub: '#64748b', accent: '#16a34a' },
  { id: 'dark', label: 'Dark', bg: '#0f172a', fg: '#ffffff', sub: '#94a3b8', accent: '#22c55e' },
  { id: 'warm', label: 'Warm', bg: '#fff7ed', fg: '#7c2d12', sub: '#9a3412', accent: '#ea580c' },
]

const naira = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? `₦${n.toLocaleString('en-NG')}` : ''
}

/**
 * Loads an image in a canvas-safe way.
 * crossOrigin MUST be set before src or the request is made without the CORS
 * header and the canvas is tainted anyway. Resolves null on failure so the
 * caller can fall back rather than throw.
 */
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Wraps text to a pixel width, since canvas has no line breaking of its own. */
function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    } else {
      line = test
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && words.length) {
    const last = lines[maxLines - 1]
    if (ctx.measureText(`${last}...`).width > maxWidth) {
      lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 3)) + '...'
    }
  }
  return lines
}

function buildCaption(product, store, storeUrl) {
  const price = naira(product.price)
  const name = product.name
  const shop = store?.businessName || store?.storeName || 'our store'
  const lines = [
    price ? `${name} - ${price}` : name,
    '',
    product.description ? String(product.description).replace(/\s+/g, ' ').trim().slice(0, 160) : '',
    '',
    `Order from ${shop}: ${storeUrl}`,
  ]
  return lines.filter((l, i) => l !== '' || i !== 0).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function buildHashtags(product, store) {
  const base = ['sellapage']
  const words = `${product.category || ''} ${product.name || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)
  const areas = (store?.seo?.serviceAreas || []).map((a) => a.toLowerCase().replace(/\s+/g, ''))
  const tags = [...new Set([...words, ...areas.slice(0, 2), 'nigeria', ...base])]
  return tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')
}

export default function ContentKitTab({ store, storeUrl }) {
  const canvasRef = useRef(null)
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [format, setFormat] = useState(FORMATS[0])
  const [theme, setTheme] = useState(THEMES[0])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [photoBlocked, setPhotoBlocked] = useState(false)
  const [copied, copy] = useCopy()
  // File sharing is a phone feature (Android Chrome, iOS Safari); laptops
  // mostly cannot, so the button only appears where it will work.
  const [canShare] = useState(() => {
    try { return !!navigator.canShare?.({ files: [new File([''], 'post.jpg', { type: 'image/jpeg' })] }) } catch { return false }
  })
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const items = await getProducts(store.id, 60)
        if (cancelled) return
        setProducts(items)
        setSelected(items[0] || null)
      } catch {
        if (!cancelled) setError('Could not load your products.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [store?.id])

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !selected) return
    setDrawing(true)
    setPhotoBlocked(false)

    const { w, h } = format
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')

    // Webfonts are not guaranteed ready when the component mounts, and canvas
    // silently falls back to a default face if they are not.
    try { await document.fonts?.ready } catch { /* older browsers */ }

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    // ---------------------------------------------------------------------
    // LAYOUT
    //
    // Measured before anything is drawn, because the first version positioned
    // the image from the TOP with a hardcoded text allowance and the store URL
    // from the BOTTOM independently. On a square card those two anchors landed
    // 3px apart while the price glyphs were 81px tall, so the price was drawn
    // straight through the URL.
    //
    // Now the text stack is measured first and the image takes whatever height
    // is left. Nothing can overlap because every band's height is known before
    // a single pixel is drawn.
    // ---------------------------------------------------------------------
    const pad = Math.round(w * 0.072)
    const contentW = w - pad * 2

    const titleSize = Math.round(w * 0.058)
    const titleLead = Math.round(titleSize * 1.22)
    const priceSize = Math.round(w * 0.082)
    const descSize = Math.round(w * 0.034)
    const descLead = Math.round(descSize * 1.45)
    const footSize = Math.round(w * 0.032)

    ctx.textBaseline = 'top'

    ctx.font = `700 ${titleSize}px "DM Sans", system-ui, sans-serif`
    const titleLines = wrap(ctx, selected.name, contentW, 2)

    const price = naira(selected.price)

    ctx.font = `400 ${descSize}px "DM Sans", system-ui, sans-serif`
    const descLines =
      format.id === 'story' && selected.description
        ? wrap(ctx, selected.description, contentW, 3)
        : []

    const gapAfterImage = Math.round(w * 0.055)
    const gapTitleToPrice = Math.round(w * 0.022)
    const gapToDesc = descLines.length ? Math.round(w * 0.028) : 0
    const footerBand = footSize + Math.round(w * 0.055) // rule + breathing room

    const textH =
      titleLines.length * titleLead +
      (price ? gapTitleToPrice + priceSize : 0) +
      (descLines.length ? gapToDesc + descLines.length * descLead : 0)

    // Whatever is left over belongs to the photo.
    const imgH = h - pad * 2 - gapAfterImage - textH - footerBand
    const imgBox = { x: pad, y: pad, w: contentW, h: Math.max(imgH, Math.round(h * 0.25)) }

    const src = selected.imageUrl || selected.imageUrls?.[0]
    const img = await loadImage(src)

    const radius = Math.round(w * 0.03)
    const clipRounded = () => {
      ctx.beginPath()
      ctx.moveTo(imgBox.x + radius, imgBox.y)
      ctx.arcTo(imgBox.x + imgBox.w, imgBox.y, imgBox.x + imgBox.w, imgBox.y + imgBox.h, radius)
      ctx.arcTo(imgBox.x + imgBox.w, imgBox.y + imgBox.h, imgBox.x, imgBox.y + imgBox.h, radius)
      ctx.arcTo(imgBox.x, imgBox.y + imgBox.h, imgBox.x, imgBox.y, radius)
      ctx.arcTo(imgBox.x, imgBox.y, imgBox.x + imgBox.w, imgBox.y, radius)
      ctx.closePath()
    }

    if (img) {
      const scale = Math.max(imgBox.w / img.width, imgBox.h / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.save()
      clipRounded()
      ctx.clip()
      // Many product photos are shot on white, so a plain white card makes the
      // image edges vanish. A faint tile behind it keeps the shape readable.
      ctx.fillStyle = theme.id === 'dark' ? '#1e293b' : '#f1f5f9'
      ctx.fillRect(imgBox.x, imgBox.y, imgBox.w, imgBox.h)
      ctx.drawImage(img, imgBox.x + (imgBox.w - dw) / 2, imgBox.y + (imgBox.h - dh) / 2, dw, dh)
      ctx.restore()
    } else if (src) {
      // Cloudinary refused the CORS request. Say so rather than silently
      // shipping a card with a blank rectangle where the product should be.
      setPhotoBlocked(true)
      ctx.save()
      clipRounded()
      ctx.fillStyle = theme.id === 'dark' ? '#1e293b' : '#f1f5f9'
      ctx.fill()
      ctx.restore()
    }

    let y = imgBox.y + imgBox.h + gapAfterImage

    ctx.fillStyle = theme.fg
    ctx.font = `700 ${titleSize}px "DM Sans", system-ui, sans-serif`
    for (const line of titleLines) {
      ctx.fillText(line, pad, y)
      y += titleLead
    }

    if (price) {
      y += gapTitleToPrice
      ctx.fillStyle = theme.accent
      ctx.font = `800 ${priceSize}px "DM Sans", system-ui, sans-serif`
      ctx.fillText(price, pad, y)
      y += priceSize
    }

    if (descLines.length) {
      y += gapToDesc
      ctx.fillStyle = theme.sub
      ctx.font = `400 ${descSize}px "DM Sans", system-ui, sans-serif`
      for (const line of descLines) {
        ctx.fillText(line, pad, y)
        y += descLead
      }
    }

    // Footer sits on the baseline of the card, separated by a hairline so the
    // store address reads as an address and not as part of the description.
    const footY = h - pad - footSize
    ctx.strokeStyle = theme.id === 'dark' ? '#1e293b' : '#e2e8f0'
    ctx.lineWidth = Math.max(1, Math.round(w * 0.002))
    ctx.beginPath()
    ctx.moveTo(pad, footY - Math.round(w * 0.028))
    ctx.lineTo(w - pad, footY - Math.round(w * 0.028))
    ctx.stroke()

    ctx.fillStyle = theme.accent
    ctx.beginPath()
    ctx.arc(pad + footSize * 0.28, footY + footSize * 0.5, footSize * 0.28, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = theme.sub
    ctx.font = `600 ${footSize}px "DM Sans", system-ui, sans-serif`
    const handle = (storeUrl || '').replace(/^https?:\/\//, '')
    ctx.fillText(handle, pad + footSize, footY)

    setDrawing(false)
  }, [selected, format, theme, storeUrl])

  useEffect(() => { draw() }, [draw])

  const fileName = () => `${(selected?.name || 'post').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${format.id}.jpg`

  const share = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/jpeg', 0.92),
      )
      const file = new File([blob], fileName(), { type: 'image/jpeg' })
      await navigator.share({ files: [file], text: selected ? buildCaption(selected, store, storeUrl) : '' })
    } catch (e) {
      // Closing the share sheet is not an error worth showing.
      if (e?.name !== 'AbortError') setError('Could not open sharing. Save the image instead and post it from your gallery.')
    }
  }

  const download = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      // JPEG, not PNG. Measured on a real 1080x1920 card: PNG 1961KB vs JPEG
      // 227KB at quality 0.92, visually identical for a photo. That is 8x less
      // mobile data for a vendor uploading to Instagram or WhatsApp status,
      // which is the whole audience for this tool. The cards have solid
      // backgrounds, so losing PNG transparency costs nothing.
      // (The quality argument is also silently ignored for PNG, so the old
      // 0.95 was doing nothing at all.)
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/jpeg', 0.92),
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName()
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Only reachable if the canvas got tainted, which the CORS handling above
      // is designed to prevent. Say what to do instead of failing silently.
      setError('Could not save the image. Try a different product photo, or take a screenshot of the preview.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100/70" />)}
      </div>
    )
  }

  if (!products.length) {
    return (
      <Panel>
        <div className="py-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><ImageIcon size={26} /></span>
          <p className="mt-3 text-[15px] font-bold text-gray-800">Add a product first</p>
          <p className="mt-1 text-[13px] text-gray-500">Once you have a product with a photo, you can turn it into a post here.</p>
        </div>
      </Panel>
    )
  }

  const caption = selected ? buildCaption(selected, store, storeUrl) : ''
  const hashtags = selected ? buildHashtags(selected, store) : ''
  const handle = store?.businessName || store?.storeName || 'Your store'

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <Panel icon={ImageIcon} title="Pick a product" sub={`${products.length} product${products.length === 1 ? '' : 's'}. Tap one to turn it into a post.`}>
          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] sm:grid sm:grid-cols-4 sm:overflow-visible xl:grid-cols-5">
            {products.slice(0, 30).map((p) => {
              const on = selected?.id === p.id
              const src = p.imageUrl || p.imageUrls?.[0]
              return (
                <button key={p.id} type="button" onClick={() => setSelected(p)} aria-pressed={on}
                  className={`w-28 flex-shrink-0 overflow-hidden rounded-xl border-2 text-left transition sm:w-auto ${on ? 'border-forest-600 shadow-lg shadow-forest/10' : 'border-transparent ring-1 ring-gray-100 hover:ring-forest-200'}`}>
                  {src ? <img src={src} alt="" loading="lazy" className="aspect-square w-full bg-gray-50 object-cover" /> : <span className="flex aspect-square w-full items-center justify-center bg-gray-50 text-gray-300"><ImageIcon size={22} /></span>}
                  <span className="block truncate px-2 py-1.5 text-[11.5px] font-semibold text-gray-700">{p.name}</span>
                </button>
              )
            })}
          </div>
          {products.length > 30 && (
            <select value={selected?.id || ''} onChange={(e) => setSelected(products.find((p) => p.id === e.target.value))} className={`${INPUT} mt-3`} aria-label="All products">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Panel title="Size">
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFormat(f)} aria-pressed={format.id === f.id}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition ${format.id === f.id ? 'border-forest-600 bg-forest-50 text-forest-800' : 'border-gray-200 text-gray-600 hover:border-forest-200'}`}>
                  <span className={`rounded-md border-2 ${format.id === f.id ? 'border-forest-600' : 'border-gray-300'} ${f.id === 'square' ? 'h-9 w-9' : 'h-11 w-[25px]'}`} />
                  <span className="text-[11.5px] font-bold leading-tight">{f.label}</span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Style">
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTheme(t)} aria-pressed={theme.id === t.id}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition ${theme.id === t.id ? 'border-forest-600 bg-forest-50' : 'border-gray-200 hover:border-forest-200'}`}>
                  <span className="relative h-9 w-9 overflow-hidden rounded-full ring-1 ring-black/10" style={{ background: t.bg }}><span className="absolute bottom-1.5 left-1.5 h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} /></span>
                  <span className="text-[11.5px] font-bold text-gray-700">{t.label}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="Caption" right={<CopyButton done={copied === 'caption'} onClick={() => copy(caption, 'caption')} />}>
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3.5 font-sans text-[13px] leading-relaxed text-gray-700">{caption}</pre>
        </Panel>
        <Panel title="Hashtags" right={<CopyButton done={copied === 'tags'} onClick={() => copy(hashtags, 'tags')} />}>
          <p className="break-words rounded-xl bg-gray-50 p-3.5 text-[13px] leading-relaxed text-forest-700">{hashtags}</p>
        </Panel>

        {error && <Notice tone="error">{error}</Notice>}
      </div>

      <aside className="min-w-0 space-y-3 lg:sticky lg:top-4">
        <SideLabel>{format.id === 'story' ? 'As a story or status' : 'As an Instagram post'}</SideLabel>
        <div className="rounded-2xl bg-gradient-to-br from-forest-50 to-white p-5 ring-1 ring-forest-100">
          <PhoneFrame>
            {format.id === 'square' && (
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2px]"><span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[9px] font-extrabold text-gray-800">{handle.slice(0, 2).toUpperCase()}</span></span>
                <span className="truncate text-[11.5px] font-bold text-gray-900">{handle}</span>
              </div>
            )}
            <div className={`relative bg-gray-50 ${format.id === 'story' ? 'px-0' : ''}`}>
              <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: `${format.w} / ${format.h}` }} />
              {drawing && <span className="absolute inset-0 flex items-center justify-center bg-white/40"><Loader2 size={20} className="animate-spin text-forest-600" /></span>}
            </div>
            {format.id === 'square' && (
              <div className="px-3 pb-3 pt-2">
                <p className="text-[11px] font-bold text-gray-900">{handle}</p>
                <p className="line-clamp-2 text-[11px] leading-snug text-gray-600">{caption}</p>
              </div>
            )}
          </PhoneFrame>
        </div>

        {photoBlocked && <Notice tone="warn">This product photo could not be loaded into the card, so it was left out. The rest of the post still works. Re-uploading the photo usually fixes it.</Notice>}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={download} className={`flex items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-[13px] font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 active:scale-[0.99] ${canShare ? '' : 'col-span-2'}`}>
            <Download size={15} /> Save image
          </button>
          {canShare && (
            <button type="button" onClick={share} className="flex items-center justify-center gap-2 rounded-xl border border-forest-200 bg-white px-4 py-3 text-[13px] font-bold text-forest-700 transition hover:bg-forest-50">
              <Share2 size={15} /> Share
            </button>
          )}
        </div>
        <button type="button" onClick={draw} className="mx-auto flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-gray-800"><RefreshCw size={13} />Redraw</button>
      </aside>
    </div>
  )
}
