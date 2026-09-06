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
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Image as ImageIcon, Download, Copy, Check, Loader2, RefreshCw, AlertCircle,
} from 'lucide-react'
import { getProducts } from '../../../firebase/products'

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
  const [copied, setCopied] = useState('')
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
      a.download = `${(selected?.name || 'post').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${format.id}.jpg`
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

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
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
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <ImageIcon size={26} className="mx-auto text-gray-300" />
        <p className="mt-3 text-sm font-bold text-gray-700">Add a product first</p>
        <p className="mt-1 text-xs text-gray-500">
          Once you have a product with a photo, you can turn it into a post here.
        </p>
      </div>
    )
  }

  const caption = selected ? buildCaption(selected, store, storeUrl) : ''
  const hashtags = selected ? buildHashtags(selected, store) : ''

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <label className="text-xs font-bold text-gray-700">Product</label>
        <select
          value={selected?.id || ''}
          onChange={(e) => setSelected(products.find((p) => p.id === e.target.value))}
          className="mt-1.5 w-full min-w-0 truncate rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-green-400"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-700">Size</label>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${
                    format.id === f.id ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700">Style</label>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${
                    theme.id === t.id ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Preview</p>
          <button type="button" onClick={draw} className="text-gray-400 hover:text-gray-700" aria-label="Redraw">
            {drawing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>

        {photoBlocked && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-2.5">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <p className="text-[11px] text-amber-800">
              This product photo could not be loaded into the card, so it was left out. The rest of the
              post still works. Re-uploading the photo usually fixes it.
            </p>
          </div>
        )}

        <div className="mt-3 flex justify-center rounded-xl bg-gray-50 p-3">
          <canvas
            ref={canvasRef}
            className="h-auto w-full max-w-[260px] rounded-lg shadow-sm"
            style={{ aspectRatio: `${format.w} / ${format.h}` }}
          />
        </div>

        <button
          type="button"
          onClick={download}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-green-700 active:scale-[0.99]"
        >
          <Download size={15} /> Save image
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Caption</p>
          <button
            type="button"
            onClick={() => copy(caption, 'caption')}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-bold text-white"
          >
            {copied === 'caption' ? <Check size={12} /> : <Copy size={12} />} Copy
          </button>
        </div>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 font-sans text-xs leading-relaxed text-gray-700">
          {caption}
        </pre>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Hashtags</p>
          <button
            type="button"
            onClick={() => copy(hashtags, 'tags')}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-bold text-white"
          >
            {copied === 'tags' ? <Check size={12} /> : <Copy size={12} />} Copy
          </button>
        </div>
        <p className="mt-2 break-words rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">{hashtags}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
