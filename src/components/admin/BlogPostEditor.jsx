//src/components/admin/BlogPostEditor.jsx/
// Tiptap-based post composer used by BlogAdmin.jsx. Self-contained: hydrates
// itself from `get-post` when editing, owns all form state, and posts directly
// to blog-admin.js on save.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, LinkIcon,
  ImageIcon, Undo, Redo, Loader2, X, UploadCloud, AlertCircle, Plus,
} from 'lucide-react'
import { uploadSingleImage } from '../../firebase/products'
import { slugify } from '../../utils/slugify'

const EMPTY_FORM = {
  title: '', slug: '', excerpt: '', featuredImageUrl: '', category: '', tags: [],
  metaTitle: '', metaDescription: '', authorName: 'Sellapage Team', commentsEnabled: true,
}

export default function BlogPostEditor({ token, adminUid, postId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [slugTouched, setSlugTouched] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState('draft')
  const [scheduledAt, setScheduledAt] = useState('')
  const [featuredFile, setFeaturedFile] = useState(null)
  const [featuredPreview, setFeaturedPreview] = useState('')
  const [categories, setCategories] = useState([])
  const [loadingPost, setLoadingPost] = useState(!!postId)
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const featuredInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your post…' }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'blog-content min-h-[240px] outline-none px-4 py-3 text-sm' },
    },
  })

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/blog-admin?action=list-categories', { headers: { 'x-admin-token': token } })
    const data = await res.json().catch(() => ({}))
    setCategories(data.categories || [])
  }, [token])

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    if (!postId || !editor) return
    let cancelled = false
    ;(async () => {
      setLoadingPost(true)
      try {
        const res = await fetch(`/api/blog-admin?action=get-post&id=${postId}`, { headers: { 'x-admin-token': token } })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load post')
        const p = data.post
        if (cancelled) return
        setForm({
          title: p.title, slug: p.slug, excerpt: p.excerpt, featuredImageUrl: p.featuredImageUrl,
          category: p.category, tags: p.tags || [], metaTitle: p.metaTitle, metaDescription: p.metaDescription,
          authorName: p.authorName, commentsEnabled: p.commentsEnabled,
        })
        setFeaturedPreview(p.featuredImageUrl || '')
        setSlugTouched(true)
        setStatus(p.status)
        if (p.publishedAt && p.status === 'scheduled') {
          setScheduledAt(new Date(p.publishedAt).toISOString().slice(0, 16))
        }
        editor.commands.setContent(p.contentHtml || '')
      } catch (err) {
        setError(err.message)
      } finally {
        if (!cancelled) setLoadingPost(false)
      }
    })()
    return () => { cancelled = true }
  }, [postId, editor, token])

  const handleTitleChange = (e) => {
    const title = e.target.value
    setForm(prev => ({ ...prev, title, slug: slugTouched ? prev.slug : slugify(title) }))
  }

  const handleSlugChange = (e) => {
    setSlugTouched(true)
    setForm(prev => ({ ...prev, slug: slugify(e.target.value) }))
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (!t || form.tags.includes(t)) { setTagInput(''); return }
    setForm(prev => ({ ...prev, tags: [...prev.tags, t] }))
    setTagInput('')
  }

  const removeTag = (t) => setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }))

  const handleFeaturedChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Featured image must be under 5MB.'); return }
    setFeaturedFile(file)
    const reader = new FileReader()
    reader.onload = () => setFeaturedPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleInlineImagePick = () => fileInputRef.current?.click()

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    setUploadingInlineImage(true)
    setError('')
    try {
      const url = await uploadSingleImage(file, 'sellapage/blog-inline')
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      setError('Failed to upload image.')
    } finally {
      setUploadingInlineImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('Link URL', previousUrl)
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url.trim() }).run()
  }

  const validate = (targetStatus) => {
    if (!form.title.trim()) return 'Please enter a title.'
    if (!editor || !editor.getHTML() || editor.getHTML() === '<p></p>') return 'Please write the post content.'
    if (!form.category) return 'Please choose a category.'
    if (targetStatus === 'scheduled') {
      if (!scheduledAt) return 'Please choose a date/time to schedule this post.'
      if (new Date(scheduledAt).getTime() <= Date.now()) return 'Scheduled time must be in the future.'
    }
    return ''
  }

  const handleSave = async (targetStatus) => {
    setError('')
    setStatus(targetStatus)
    const validationError = validate(targetStatus)
    if (validationError) { setError(validationError); return }

    setSaving(true)
    try {
      let featuredImageUrl = form.featuredImageUrl
      if (featuredFile) {
        featuredImageUrl = await uploadSingleImage(featuredFile, 'sellapage/blog')
      }

      const payload = {
        ...form,
        featuredImageUrl,
        contentHtml: editor.getHTML(),
        status: targetStatus,
        adminUid,
        publishedAt: targetStatus === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
      }

      const action = postId ? 'update-post' : 'create-post'
      if (postId) payload.id = postId

      const res = await fetch(`/api/blog-admin?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save post')
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const ToolbarBtn = ({ icon: Icon, active, onClick, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${active ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      <Icon size={15} />
    </button>
  )

  if (loadingPost || !editor) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-sm">{postId ? 'Edit Post' : 'New Post'}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X size={16} /></button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title *</label>
        <input value={form.title} onChange={handleTitleChange} placeholder="Post title" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Slug</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 whitespace-nowrap">sellapage.com.ng/blog/</span>
          <input value={form.slug} onChange={handleSlugChange} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category *</label>
          <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20">
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Author</label>
          <input value={form.authorName} onChange={e => setForm(prev => ({ ...prev, authorName: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              {t} <button onClick={() => removeTag(t)}><X size={10} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Add a tag, press Enter" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20" />
          <button type="button" onClick={addTag} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"><Plus size={13} /></button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Excerpt (optional)</label>
        <textarea value={form.excerpt} onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))} rows={2} placeholder="Short summary shown on cards — auto-generated from the post if left blank" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Featured Image</label>
        <div className="flex flex-wrap gap-2">
          {featuredPreview ? (
            <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={featuredPreview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => { setFeaturedPreview(''); setFeaturedFile(null); setForm(prev => ({ ...prev, featuredImageUrl: '' })) }} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <X size={16} className="text-white" />
              </button>
            </div>
          ) : (
            <label className="w-28 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30">
              <UploadCloud size={16} className="text-gray-300" />
              <span className="text-[10px] text-gray-300 font-medium">Upload</span>
              <input ref={featuredInputRef} type="file" accept="image/*" className="hidden" onChange={handleFeaturedChange} />
            </label>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Content *</label>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/60 px-2 py-1.5">
            <ToolbarBtn icon={Bold} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" />
            <ToolbarBtn icon={Italic} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" />
            <ToolbarBtn icon={Heading2} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" />
            <ToolbarBtn icon={Heading3} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3" />
            <ToolbarBtn icon={List} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list" />
            <ToolbarBtn icon={ListOrdered} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list" />
            <ToolbarBtn icon={Quote} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote" />
            <ToolbarBtn icon={LinkIcon} active={editor.isActive('link')} onClick={handleSetLink} title="Link" />
            <button type="button" onClick={handleInlineImagePick} disabled={uploadingInlineImage} title="Insert image" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50">
              {uploadingInlineImage ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInlineImageUpload} />
            <div className="flex-1" />
            <ToolbarBtn icon={Undo} onClick={() => editor.chain().focus().undo().run()} title="Undo" />
            <ToolbarBtn icon={Redo} onClick={() => editor.chain().focus().redo().run()} title="Redo" />
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="bg-gray-50/60 rounded-xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-bold text-gray-700">SEO</p>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">SEO Title (optional)</label>
          <input value={form.metaTitle} onChange={e => setForm(prev => ({ ...prev, metaTitle: e.target.value }))} placeholder={form.title || 'Defaults to the post title'} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Meta Description (optional)</label>
          <textarea value={form.metaDescription} onChange={e => setForm(prev => ({ ...prev, metaDescription: e.target.value }))} rows={2} placeholder="Defaults to the excerpt" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
        <input type="checkbox" checked={form.commentsEnabled} onChange={e => setForm(prev => ({ ...prev, commentsEnabled: e.target.checked }))} className="rounded border-gray-300 text-green-500 focus:ring-green-400" />
        Allow comments on this post
      </label>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex gap-2">
          {['draft', 'scheduled', 'publish'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatus(opt === 'publish' ? 'published' : opt)}
              className={`flex-1 py-2 rounded-xl border text-xs font-bold text-center transition-all ${
                (opt === 'publish' ? status === 'published' : status === opt)
                  ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-100'
                  : 'border-gray-200 hover:border-green-300 text-gray-600 bg-white'
              }`}
            >
              {opt === 'publish' ? 'Publish' : opt === 'scheduled' ? 'Schedule' : 'Draft'}
            </button>
          ))}
        </div>
        {status === 'scheduled' && (
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20" />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => handleSave(status === 'published' ? 'published' : status)}
            disabled={saving}
            className="flex-1 sm:flex-none px-5 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : status === 'published' ? 'Publish Now' : status === 'scheduled' ? 'Schedule Post' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}
