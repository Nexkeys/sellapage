// src/components/admin/EmailDesigner.jsx
//
// The drag-and-drop email designer inside Admin > Email Broadcast.
//
// GrapesJS with its newsletter preset, bundled into Sellapage itself: no
// external app, no account, nothing to log into. Lazy-loaded by
// EmailBroadcast.jsx so the rest of the admin panel does not pay for it.
//
// Self-contained on purpose:
//   - GrapesJS normally pulls Font Awesome from cdnjs for its toolbar icons.
//     `cssIcons: ''` switches that off and the same font is bundled from npm.
//   - The preset's image blocks point at via.placeholder.com, which no longer
//     serves images. Those are swapped for a local placeholder as they land.
//   - Images the admin adds upload to Cloudinary, the same as Push Broadcast.
//
// The parent talks to it through a ref: getHtml(), getProject(), setHtml().
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import grapesjs from 'grapesjs'
import newsletterPreset from 'grapesjs-preset-newsletter'
import 'grapesjs/dist/css/grapes.min.css'
import 'font-awesome/css/font-awesome.min.css'
import { uploadSingleImage } from '../../firebase/products'
import { STARTER_HTML, bodyInner, wrapDocument } from './emailTemplate'

// A neutral grey box in place of the dead via.placeholder.com images.
const PLACEHOLDER_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" fill="#9ca3af" font-family="Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Double click to add an image</text></svg>',
)}`

const EmailDesigner = forwardRef(function EmailDesigner({ initialProject, initialHtml, onError }, ref) {
  const containerRef = useRef(null)
  const editorRef = useRef(null)

  useImperativeHandle(ref, () => ({
    /** Email-ready HTML: CSS inlined, wrapped in a full document. */
    getHtml() {
      const editor = editorRef.current
      if (!editor) return ''
      return wrapDocument(editor.runCommand('gjs-get-inlined-html'))
    },
    /** The editable design, so the next edit reopens exactly as it was left. */
    getProject() {
      const editor = editorRef.current
      return editor ? JSON.stringify(editor.getProjectData()) : null
    },
    /** Replace the design with raw HTML, from the Code view. */
    setHtml(html) {
      editorRef.current?.setComponents(bodyInner(html))
    },
  }), [])

  useEffect(() => {
    const editor = grapesjs.init({
      container: containerRef.current,
      height: '72vh',
      width: 'auto',
      fromElement: false,
      storageManager: false,
      cssIcons: '',
      plugins: [(ed) => newsletterPreset(ed, { showBlocksOnLoad: true })],
      assetManager: {
        upload: false,
        autoAdd: true,
        async uploadFile(event) {
          const files = event.dataTransfer ? event.dataTransfer.files : event.target.files
          for (const file of Array.from(files || [])) {
            try {
              const url = await uploadSingleImage(file, 'sellapage/email')
              editor.AssetManager.add({ src: url })
            } catch (err) {
              onError?.(`Image upload failed: ${err?.message || 'unknown error'}`)
            }
          }
        },
      },
    })
    editorRef.current = editor

    editor.on('component:add', (component) => {
      if (component.get('type') === 'image' && /via\.placeholder\.com/.test(component.getSrc?.() || component.get('src') || '')) {
        component.set('src', PLACEHOLDER_IMG)
      }
    })

    editor.onReady(() => {
      let loaded = false
      if (initialProject) {
        try {
          editor.loadProjectData(typeof initialProject === 'string' ? JSON.parse(initialProject) : initialProject)
          loaded = true
        } catch {
          // A damaged design falls back to the saved HTML below.
        }
      }
      if (!loaded) editor.setComponents(bodyInner(initialHtml || STARTER_HTML))
    })

    return () => {
      editor.destroy()
      editorRef.current = null
    }
    // Mounted once per campaign; the parent remounts with a new key to switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="rounded-xl overflow-hidden border border-gray-200" />
})

export default EmailDesigner
