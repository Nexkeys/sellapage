import { themes, CLASSIC_DEFAULT_THEME, getOptimizedImageUrl } from './themes'

/**
 * Resolves business page theme tokens from persisted store data plus optional draft overrides.
 * Mirrors StorePage.jsx theme extraction so dashboard preview and live page stay aligned.
 *
 * @param {object} store - Firestore store document
 * @param {object} [draft] - Unsaved overrides
 * @param {string} [draft.themeId] - Theme id to preview (e.g. previewThemeId)
 * @param {object} [draft.themeMetadata] - Partial themeMetadata (footerText, heroBannerUrl, customColors)
 * @param {object} [options]
 * @param {number} [options.bannerWidth=1200] - Cloudinary width for hero banner
 */
export function resolveStoreThemeTokens(store, draft = {}, options = {}) {
  const bannerWidth = options.bannerWidth ?? 1200

  const themeId = draft.themeId ?? store?.storeTheme
  const hasExplicitTheme = !!themeId && themeId !== 'classic-default'
  const activeThemeObj = hasExplicitTheme
    ? (themes.find(t => t.id === themeId) ?? CLASSIC_DEFAULT_THEME)
    : CLASSIC_DEFAULT_THEME

  const meta = {
    ...store?.themeMetadata,
    ...(draft.themeMetadata ?? {}),
  }
  const customColors = meta.customColors ?? {}

  const themeBg = customColors.background ?? activeThemeObj.defaultColors.background
  const themeText = customColors.text ?? activeThemeObj.defaultColors.text
  const themePrimary = customColors.primary
    ?? (hasExplicitTheme
      ? activeThemeObj.defaultColors.primary
      : (store?.themeColor || activeThemeObj.defaultColors.primary))
  const themeCard = customColors.card ?? activeThemeObj.defaultColors.card
  const themeAccent = customColors.accent ?? activeThemeObj.defaultColors.accent
  const headerFont = activeThemeObj.typography.headerFontFamily
  const bodyFont = activeThemeObj.typography.bodyFontFamily
  const fontUrl = activeThemeObj.typography.fontUrl ?? ''
  const heroBannerUrl = getOptimizedImageUrl(meta.heroBannerUrl ?? '', bannerWidth)
  const footerText = meta.footerText ?? activeThemeObj.defaultThemeText.footer

  const previewThemeObj = {
    ...activeThemeObj,
    defaultColors: {
      ...activeThemeObj.defaultColors,
      background: themeBg,
      card: themeCard,
      text: themeText,
      primary: themePrimary,
      accent: themeAccent,
    },
  }

  return {
    themeId: themeId || 'classic-default',
    hasExplicitTheme,
    activeThemeObj,
    previewThemeObj,
    themeBg,
    themeText,
    themePrimary,
    themeCard,
    themeAccent,
    headerFont,
    bodyFont,
    fontUrl,
    heroBannerUrl,
    footerText,
    customColors,
  }
}
