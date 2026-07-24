import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Sellapage'
const SITE_URL = 'https://sellapage.com.ng'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`
const DEFAULT_DESCRIPTION = 'Sellapage is the all-in-one commerce platform for Nigerian businesses. Run products, services, checkout, delivery, customers, analytics, and growth from one dashboard. Free to start.'

export default function SEO({
  title,
  description,
  image,
  url,
  keywords,
  type = 'website',
  jsonLd,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Run Your Entire Business from One Dashboard`
  const desc = description || DEFAULT_DESCRIPTION
  const img = image || DEFAULT_IMAGE
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <link rel="canonical" href={pageUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_NG" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}
