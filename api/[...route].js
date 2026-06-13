// Master catch-all router for Vercel Hobby tier consolidation

import paystackWebhook from './paystack-webhook.js'
import createSubaccount from './create-subaccount.js'
import resolveAccount from './resolve-account.js'
import shipbubbleRates from './shipbubble-rates.js'
import shipbubbleCreateShipment from './shipbubble-create-shipment.js'
import shipbubbleWebhook from './shipbubble-webhook.js'
import aiDescribe from './ai-describe.js'
import checkoutInitialize from './checkout-initialize.js'
import billingInitialize from './billing-initialize.js'
import validateDiscount from './validate-discount.js'
import submitReview from './submit-review.js'
import markDelivered from './mark-delivered.js'
import deleteAccount from './delete-account.js'
import expiryCron from './expiry-cron.js'
import adminHealth from './admin-health.js'

export default async function handler(req, res) {
  try {
    const { route } = req.query || {}
    const endpoint = route ? route[0] : ''

    switch (endpoint) {
      case 'paystack-webhook':
        return await paystackWebhook(req, res)
      case 'create-subaccount':
        return await createSubaccount(req, res)
      case 'resolve-account':
        return await resolveAccount(req, res)
      case 'shipbubble-rates':
        return await shipbubbleRates(req, res)
      case 'shipbubble-create-shipment':
        return await shipbubbleCreateShipment(req, res)
      case 'shipbubble-webhook':
        return await shipbubbleWebhook(req, res)
      case 'ai-describe':
        return await aiDescribe(req, res)
      case 'checkout-initialize':
        return await checkoutInitialize(req, res)
      case 'billing-initialize':
        return await billingInitialize(req, res)
      case 'validate-discount':
        return await validateDiscount(req, res)
      case 'submit-review':
        return await submitReview(req, res)
      case 'mark-delivered':
        return await markDelivered(req, res)
      case 'delete-account':
        return await deleteAccount(req, res)
      case 'expiry-cron':
        return await expiryCron(req, res)
      case 'admin-health':
        return await adminHealth(req, res)
      default:
        res.status(404).json({ error: 'Not found' })
        return
    }
  } catch (err) {
    console.error('[catch-all router] error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
