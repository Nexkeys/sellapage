// src/ops/tabs/index.js
//
// Every tab with a console screen of its own (Phase 3), loaded only when it is
// opened. A tab missing here falls back to the original admin page, embedded.
import { lazy } from 'react'

export const TAB_VIEWS = {
  tickets: lazy(() => import('./SupportInbox')),
  recovery: lazy(() => import('./RecoveryDesk')),
  withdrawals: lazy(() => import('./PayoutsQueue')),
  directory: lazy(() => import('./MerchantDirectory')),
  cac: lazy(() => import('./CacDesk')),
  reports: lazy(() => import('./ReportCases')),
  jobs: lazy(() => import('./JobsBoard')),
  reviews: lazy(() => import('./ReviewsWall')),
  domains: lazy(() => import('./DomainsMap')),
  referrals: lazy(() => import('./ReferralNetwork')),
  analytics: lazy(() => import('./AnalyticsStudio')),
  revenue: lazy(() => import('./RevenueLedger')),
  trials: lazy(() => import('./TrialsStudio')),
  usage: lazy(() => import('./QuotaClock')),
  'sella-ai': lazy(() => import('./SellaMeter')),
  'ai-describe': lazy(() => import('./EngineRoom')),
  newsletter: lazy(() => import('./NewsletterList')),
  partners: lazy(() => import('./PartnersPipeline')),
  announcements: lazy(() => import('./AnnouncementStudio')),
  push: lazy(() => import('./PushStudio')),
  blog: lazy(() => import('./BlogDesk')),
  marketplace: lazy(() => import('./DropshipHub')),
  sms: lazy(() => import('./SmsStudio')),
  email: lazy(() => import('./EmailStudio')),
}
