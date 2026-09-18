// src/components/admin/emailTemplate.js
//
// Small, dependency-free helpers shared by the Email Broadcast console and its
// designer. Kept out of EmailDesigner.jsx so the Code and Preview views work
// without loading the whole drag-and-drop editor.

export const STARTER_HTML = `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="background-color:#16a34a;padding:24px 32px;color:#ffffff;font-size:22px;font-weight:bold;border-radius:12px 12px 0 0;">Sellapage</td></tr>
      <tr><td style="padding:32px;color:#111827;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 16px 0;">Hi {{businessName}},</p>
        <p style="margin:0 0 24px 0;">Write your message here. Drag boxes, images and buttons in from the panel on the right, and double click any text to edit it.</p>
        <a href="https://www.sellapage.com.ng/dashboard" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;">Open my dashboard</a>
      </td></tr>
      <tr><td style="padding:20px 32px;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6;">Sellapage, sellapage.com.ng</td></tr>
    </table>
  </td></tr>
</table>`

/** The body of a full HTML document, or the string itself if it is a fragment. */
export function bodyInner(html) {
  const m = String(html || '').match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return m ? m[1] : String(html || '')
}

/** A complete email document around designer output. */
export function wrapDocument(inner) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">${inner}</body></html>`
}


const SAMPLE = {
  businessName: 'Mama Nkechi Kitchen',
  storeLink: 'https://www.sellapage.com.ng/mamankechi',
  email: 'vendor@example.com',
  unsubscribeUrl: '#unsubscribe',
}

/** Fills merge tags with sample values, for the on-screen preview only. */
export function previewHtml(html) {
  const filled = String(html || '').replace(/\{\{\s*(businessName|storeLink|email|unsubscribeUrl)\s*\}\}/g, (_, k) => SAMPLE[k])
  return /<html/i.test(filled) ? filled : wrapDocument(filled)
}

export const MERGE_TAGS = [
  { tag: '{{businessName}}', label: 'Business name' },
  { tag: '{{storeLink}}', label: 'Store link' },
  { tag: '{{email}}', label: 'Their email' },
  { tag: '{{unsubscribeUrl}}', label: 'Unsubscribe link' },
]
