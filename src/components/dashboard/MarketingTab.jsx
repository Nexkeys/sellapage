import { useState, useEffect } from 'react'
import { Megaphone, Share2, MessageCircle, Zap, Check, ChevronRight, Copy, Loader2, ArrowRight } from 'lucide-react'
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'

const DAILY_TASKS = [
  { day: 0, text: 'Weekend Traffic Prep: Review your top-performing offers list to verify availability for weekend shoppers.' },
  { day: 1, text: 'Price Audit: Review your catalog prices to stay competitive for the week.' },
  { day: 2, text: 'Bio-Link Check: Confirm your store URL is pinned inside your social media profile bios.' },
  { day: 3, text: 'Engagement Drill-down: Review your newly calculated Store Engagement Rate metric.' },
  { day: 4, text: 'Catalog Clean-Up: Audit active stock levels and toggle visibility for out-of-stock items.' },
  { day: 5, text: 'Weekend Traffic Prep: Review your top-performing offers list to verify availability for weekend shoppers.' },
  { day: 6, text: 'Catalog Clean-Up: Audit active stock levels and toggle visibility for out-of-stock items.' },
]

export default function MarketingTab({ store, storeUrl, navigateTo }) {
  const [marketingPoints, setMarketingPoints] = useState(store?.marketingPoints || 0)
  const [rolloutStatus, setRolloutStatus] = useState(store?.['marketing' + 'Waitlist'] || [])
  const [copied, setCopied] = useState(false)
  
  // Checklist local states
  const [checkedShare, setCheckedShare] = useState(false)
  const [checkedQueue, setCheckedQueue] = useState(false)
  const [checkedDaily, setCheckedDaily] = useState(false)
  
  const [updatingTask, setUpdatingTask] = useState(null)

  // Sync basic store metrics and read persistent daily checklist state from local storage
  useEffect(() => {
    setMarketingPoints(store?.marketingPoints || 0)
    setRolloutStatus(store?.['marketing' + 'Waitlist'] || [])

    if (store?.id) {
      const todayStr = new Date().toDateString() // e.g., "Tue May 26 2026"
      const savedProgress = localStorage.getItem(`sellapage_checklist_${store.id}_${todayStr}`)
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress)
        setCheckedShare(!!parsed.share)
        setCheckedQueue(!!parsed.queue)
        setCheckedDaily(!!parsed.daily)
      } else {
        setCheckedShare(false)
        setCheckedQueue(false)
        setCheckedDaily(false)
      }
    }
  }, [store])

  // Helper to persist checkmark state safely across dashboard navigation changes
  const saveChecklistProgress = (taskId, status) => {
    if (!store?.id) return
    const todayStr = new Date().toDateString()
    const storageKey = `sellapage_checklist_${store.id}_${todayStr}`
    
    const existing = localStorage.getItem(storageKey)
    const currentMap = existing ? JSON.parse(existing) : { share: false, queue: false, daily: false }
    
    currentMap[taskId] = status
    localStorage.setItem(storageKey, JSON.stringify(currentMap))
  }

  const name = store?.businessName || 'my business'
  const url  = storeUrl || 'https://sellapage.com.ng/your-business'
  const promoText = `Explore ${name} on Sellapage: ${url}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promoText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    if (!checkedShare) {
      handleTaskCompletion('share')
      setCheckedShare(true)
      saveChecklistProgress('share', true)
    }
  }

  const handleTaskCompletion = async (taskId) => {
    if (!store?.id) return
    setUpdatingTask(taskId)
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        marketingPoints: increment(10)
      })
      setMarketingPoints(prev => prev + 10)
    } catch (err) {
      console.error('Failed to update points', err)
    } finally {
      setUpdatingTask(null)
    }
  }

  const joinRollout = async (featureName) => {
    if (!store?.id || rolloutStatus.includes(featureName)) return
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        ['marketing' + 'Waitlist']: arrayUnion(featureName)
      })
      setRolloutStatus(prev => [...prev, featureName])
    } catch (err) {
      console.error('Failed to join rollout', err)
    }
  }

  const maxPoints = 500
  const progressPercent = Math.min((marketingPoints / maxPoints) * 100, 100)
  
  let rankLabel = 'Getting Started'
  if (marketingPoints >= 151 && marketingPoints <= 350) rankLabel = 'Active Growth Hub'
  else if (marketingPoints > 350) rankLabel = 'Elite Consistent Seller'

  const currentDayOfWeek = new Date().getDay()
  const contextualTask = DAILY_TASKS.find(t => t.day === currentDayOfWeek)?.text || DAILY_TASKS[1].text

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Growth Workspace</h1>
        <p className="text-gray-500 text-sm mt-1">Operational milestones and marketing strategy hub.</p>
      </div>

      {/* Monthly Success Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Monthly Success Score</h2>
            <p className="text-gray-500 text-xs mt-0.5">Complete daily tasks to unlock growth tiers.</p>
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-black text-sm border border-green-100 flex-shrink-0 text-center">
            {marketingPoints} / 500 pts
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <span>{rankLabel}</span>
            <span>Milestone: 500</span>
          </div>
        </div>
      </div>

      {/* Daily Growth Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900 text-base">Daily Growth Checklist</h2>
          <p className="text-gray-500 text-xs mt-0.5">Check off these operational basics every day to grow your score.</p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Task 1: Share Link */}
          <div className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-colors hover:bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1">
              <button 
                onClick={copyToClipboard}
                disabled={checkedShare}
                className={`w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                  checkedShare ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-green-500'
                }`}
              >
                {checkedShare && <Check size={14} strokeWidth={3} />}
              </button>
              <div>
                <p className={`font-bold text-sm ${checkedShare ? 'text-gray-400 line-through' : 'text-gray-900'}`}>Share Your Business Link</p>
                <p className="text-gray-500 text-xs mt-1 max-w-lg leading-relaxed">Copy your sales text and share it on WhatsApp status or social media.</p>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex-shrink-0 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition-all ml-10 sm:ml-0"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          {/* Task 2: Processing Queue */}
          <div className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-colors hover:bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1">
              <button 
                onClick={() => {
                  if (!checkedQueue) {
                    handleTaskCompletion('queue')
                    setCheckedQueue(true)
                    saveChecklistProgress('queue', true)
                  }
                }}
                disabled={checkedQueue}
                className={`w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                  checkedQueue ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-green-500'
                }`}
              >
                {checkedQueue && <Check size={14} strokeWidth={3} />}
              </button>
              <div>
                <p className={`font-bold text-sm ${checkedQueue ? 'text-gray-400 line-through' : 'text-gray-900'}`}>Clear the Processing Queue</p>
                <p className="text-gray-500 text-xs mt-1 max-w-lg leading-relaxed">Ensure all pending orders and active customer leads are properly attended to.</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!checkedQueue) {
                  handleTaskCompletion('queue')
                  setCheckedQueue(true)
                  saveChecklistProgress('queue', true)
                }
                navigateTo('orders')
              }}
              className="flex-shrink-0 flex items-center gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl text-xs font-bold transition-all ml-10 sm:ml-0"
            >
              Go to Orders <ArrowRight size={14} />
            </button>
          </div>

          {/* Task 3: Contextual Daily Task */}
          <div className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-colors hover:bg-gray-50/50">
            <div className="flex items-start gap-4 flex-1">
              <button 
                onClick={() => {
                  if (!checkedDaily) {
                    handleTaskCompletion('daily')
                    setCheckedDaily(true)
                    saveChecklistProgress('daily', true)
                  }
                }}
                disabled={checkedDaily}
                className={`w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                  checkedDaily ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-green-500'
                }`}
              >
                {checkedDaily && <Check size={14} strokeWidth={3} />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-sm ${checkedDaily ? 'text-gray-400 line-through' : 'text-gray-900'}`}>Today's Growth Focus</p>
                  <span className="bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-purple-100">Dynamic</span>
                </div>
                <p className={`text-xs mt-1 max-w-lg leading-relaxed ${checkedDaily ? 'text-gray-400' : 'text-gray-500'}`}>{contextualTask}</p>
              </div>
            </div>
            {updatingTask === 'daily' && <Loader2 size={16} className="animate-spin text-gray-400 ml-10 sm:ml-0" />}
          </div>
        </div>
      </div>

      {/* Growth Campaign Rollout */}
      <div className="pt-4">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Growth Campaigns</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* WhatsApp Broadcast */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full transition-all hover:border-gray-200 hover:shadow-md">
            <div className="w-12 h-12 bg-green-50 rounded-xl border border-green-100 flex items-center justify-center mb-4">
              <MessageCircle size={22} className="text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-2">WhatsApp Broadcast</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 flex-1">
              Send a blast message to all your customers at once. Great for announcing new arrivals or promos natively.
            </p>
            {rolloutStatus.includes('WhatsApp Broadcast') ? (
              <div className="w-full bg-gray-50 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-default">
                <Check size={16} /> Added to Priority Rollout
              </div>
            ) : (
              <button
                onClick={() => joinRollout('WhatsApp Broadcast')}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Join Priority Rollout
              </button>
            )}
          </div>

          {/* Promotions & Discounts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full transition-all hover:border-gray-200 hover:shadow-md">
            <div className="w-12 h-12 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center mb-4">
              <Zap size={22} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-2">Promotions & Discounts</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 flex-1">
              Create time-limited discount codes to create urgency and drive more sales from your audience.
            </p>
            {rolloutStatus.includes('Promotions & Discounts') ? (
              <div className="w-full bg-gray-50 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-default">
                <Check size={16} /> Added to Priority Rollout
              </div>
            ) : (
              <button
                onClick={() => joinRollout('Promotions & Discounts')}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              >
                Join Priority Rollout
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
