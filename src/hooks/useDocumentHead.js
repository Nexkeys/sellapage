//src/hooks/useDocumentHead.js/
// No SEO/head library exists anywhere in this codebase (confirmed: zero pages set
// a dynamic per-route title/meta description today, no react-helmet installed).
// Small hand-built hook instead of adding a dependency for it.
import { useEffect } from 'react'

export function useDocumentHead({ title, description }) {
  useEffect(() => {
    const prevTitle = document.title
    let metaEl = document.querySelector('meta[name="description"]')
    let createdMeta = false
    const prevDescription = metaEl ? metaEl.getAttribute('content') : null

    if (title) document.title = title

    if (description) {
      if (!metaEl) {
        metaEl = document.createElement('meta')
        metaEl.setAttribute('name', 'description')
        document.head.appendChild(metaEl)
        createdMeta = true
      }
      metaEl.setAttribute('content', description)
    }

    return () => {
      document.title = prevTitle
      if (metaEl) {
        if (createdMeta) {
          metaEl.remove()
        } else if (prevDescription !== null) {
          metaEl.setAttribute('content', prevDescription)
        }
      }
    }
  }, [title, description])
}
