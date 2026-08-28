// src/components/dashboard/CustomersTab.jsx/
import { useState, useEffect, useMemo } from 'react'
import { Lock, Loader2, ChevronDown, MessageCircle, Users, Mail, CreditCard } from 'lucide-react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { fetchStoreCollectionAsStaff, isActingAsStaffFor } from '../../utils/staffDataFetch'

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatNaira(amount) {
  if (amount == null) return '₦0'
  return `₦${Number(amount).toLocaleString('en-NG')}`
}

function formatDate(dateValue) {
  if (!dateValue) return '-'
  const date = typeof dateValue?.toDate === 'function' ? dateValue.toDate() : new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomersTab({ store, isPro, navigateTo }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('totalSpent')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!store?.id || !isPro) {
      setLoading(false)
      return
    }

    const fetchCustomers = async () => {
      try {
        if (isActingAsStaffFor(store.id)) {
          const items = await fetchStoreCollectionAsStaff('customers', store.id)
          items.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
          setCustomers(items)
          return
        }
        const q = query(
          collection(db, 'stores', store.id, 'customers'),
          orderBy('totalSpent', 'desc')
        )
        const snapshot = await getDocs(q)
        setCustomers(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
        )
      } catch (err) {
        console.error('Failed to fetch customers:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [store?.id, isPro])

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers

    if (search.trim()) {
      const query = search.toLowerCase().trim()
      filtered = filtered.filter(customer => {
        const nameMatch = (customer.name || '').toLowerCase().includes(query)
        const phoneMatch = (customer.phone || '').toLowerCase().includes(query)
        const emailMatch = (customer.email || '').toLowerCase().includes(query)
        return nameMatch || phoneMatch || emailMatch
      })
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'totalSpent':
          return (b.totalSpent || 0) - (a.totalSpent || 0)
        case 'orderCount':
          return (b.orderCount || 0) - (a.orderCount || 0)
        case 'lastOrderDate':
          const aDate = typeof a.lastOrderDate?.toDate === 'function' ? a.lastOrderDate.toDate() : new Date(a.lastOrderDate || 0)
          const bDate = typeof b.lastOrderDate?.toDate === 'function' ? b.lastOrderDate.toDate() : new Date(b.lastOrderDate || 0)
          return bDate.getTime() - aDate.getTime()
        default:
          return 0
      }
    })
  }, [customers, search, sortBy])

  if (!isPro) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/80">
          <div className="relative px-6 py-14 text-center sm:px-10 sm:py-16">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
              <Lock size={34} className="text-green-600" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-green-600">
              Pro and Premium
            </p>
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
              Customer Directory
            </h1>
            <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-gray-500 sm:text-base">
              Every customer who completes a checkout order gets a profile automatically. See their name, contact, total orders, total spend, and message them directly on WhatsApp.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-green-200/70 transition-all duration-200 hover:bg-green-700 hover:shadow-lg"
            >
              <CreditCard size={16} />
              Upgrade to Pro
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 size={36} className="animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  const storeUrl = store ? `${window.location.origin}/${store.storeName}` : ''

  if (!loading && customers.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <section className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm transition-all duration-200 sm:py-20">
          <div className="mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-green-50 ring-[6px] ring-green-50/80">
            <Users size={30} className="text-green-600" strokeWidth={1.75} />
          </div>
          <h2 className="mb-2 text-xl font-extrabold tracking-tight text-gray-950">
            No customers yet
          </h2>
          <p className="mb-8 max-w-md text-sm leading-relaxed text-gray-500">
            Customer profiles are created automatically when someone completes a checkout order on your store. Share your store link to start getting orders.
          </p>
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-green-200/70 transition-all duration-200 hover:bg-green-700 hover:shadow-lg"
            >
              View your store
            </a>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-green-600">
            Customers
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-[1.7rem]">
            Customer Directory
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-500">
            Buyers who have completed checkout orders from your store.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Users size={14} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:bg-white"
          />
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'totalSpent', label: 'By Spend' },
          { key: 'orderCount', label: 'By Orders' },
          { key: 'lastOrderDate', label: 'By Recent' },
        ].map((sort) => (
          <button
            key={sort.key}
            onClick={() => setSortBy(sort.key)}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all duration-150 ${
              sortBy === sort.key
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-700 hover:bg-green-50/40'
            }`}
          >
            {sort.label}
          </button>
        ))}
      </div>

      {/* Total count */}
      <p className="text-xs font-semibold text-gray-400">
        {filteredAndSortedCustomers.length} {filteredAndSortedCustomers.length === 1 ? 'customer' : 'customers'}
      </p>

      {/* Customer cards */}
      <div className="space-y-4">
        {filteredAndSortedCustomers.map((customer) => {
          const isExpanded = expandedId === customer.id
          const whatsappUrl = customer.phone
            ? `https://wa.me/${customer.phone.replace(/\D/g, '')}`
            : null

          return (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:border-gray-200"
            >
              {/* Summary row */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-extrabold text-base">
                      {getInitials(customer.name)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-950">
                      {customer.name || 'Unknown Customer'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {customer.phone || 'No phone'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-green-600">
                      {formatNaira(customer.totalSpent)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {customer.orderCount || 0} {customer.orderCount === 1 ? 'order' : 'orders'}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0 border-t border-gray-100 bg-gray-50/50">
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        <span>{customer.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-xs font-bold text-gray-400 uppercase">Total spend:</span>
                        <span className="font-extrabold text-gray-900">{formatNaira(customer.totalSpent)}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-xs font-bold text-gray-400 uppercase">First order:</span>
                        <span>{formatDate(customer.firstOrderDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-xs font-bold text-gray-400 uppercase">Last order:</span>
                        <span>{formatDate(customer.lastOrderDate)}</span>
                      </div>
                    </div>
                  </div>
                  {whatsappUrl && (
                    <div className="mt-4">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-extrabold text-green-700 border border-green-300 rounded-xl bg-white hover:bg-green-50 hover:border-green-400 transition-all duration-200"
                      >
                        <MessageCircle size={16} />
                        Message on WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
