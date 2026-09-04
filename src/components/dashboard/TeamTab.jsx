//src/components/dashboard/TeamTab.jsx/
import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, RefreshCw, UserPlus, Copy, Check, X, Trash2, Shield,
  ChevronRight, Clock, Users as UsersIcon, Pencil,
} from 'lucide-react'
import { auth } from '../../firebase/auth'
import { OWNER_ONLY_TABS } from '../../utils/staffRoles'
import OtpVerifyModal from '../OtpVerifyModal'

// A store's own assignable-tab list - mirrors DashboardLayout's NAV_ITEMS
// minus group separators and OWNER_ONLY_TABS, so the Role Builder only ever
// offers tabs that could plausibly be granted. Kept in sync manually since
// DashboardLayout doesn't export a plain list - small, stable set.
const ASSIGNABLE_TAB_LABELS = {
  overview: 'Dashboard', products: 'Products', services: 'Services', categories: 'Categories',
  ledger: 'Ledger', receipts: 'Receipts', orders: 'Orders', bookings: 'Bookings',
  delivery: 'Delivery', customers: 'Customers', leads: 'Leads', analytics: 'Analytics',
  marketing: 'Marketing', discounts: 'Discounts', reviews: 'Reviews',
  'referral-program': 'Referral Program', 'google-ads': 'Google Ads', 'job-listings': 'Job Listings',
  'online-store': 'Business Page', payouts: 'Payouts', 'mobile-app': 'Mobile App',
  'custom-domain': 'Custom Domain', 'cac-verification': 'CAC Verification', support: 'Support',
}
const ASSIGNABLE_TAB_IDS = Object.keys(ASSIGNABLE_TAB_LABELS).filter((id) => !OWNER_ONLY_TABS.includes(id))

async function authHeaders() {
  const token = await auth.currentUser.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

export default function TeamTab({ store }) {
  const [roles, setRoles] = useState([])
  const [staff, setStaff] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [expandedRoleId, setExpandedRoleId] = useState(null)
  const [editingRole, setEditingRole] = useState(null) // roleId being edited, or 'new'
  const [roleForm, setRoleForm] = useState({ name: '', tabs: {} })
  const [savingRole, setSavingRole] = useState(false)

  const [inviteRoleId, setInviteRoleId] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [newCode, setNewCode] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const [reassigning, setReassigning] = useState(null)
  const [busyId, setBusyId] = useState(null)
  // Pending step-up verification: { purpose, title, description, run }.
  const [otpFlow, setOtpFlow] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const headers = await authHeaders()
      const [rolesRes, staffRes, invitesRes] = await Promise.all([
        fetch('/api/staff-roles?action=list', { headers }),
        fetch('/api/staff-manage?action=list', { headers }),
        fetch('/api/staff-invites?action=list', { headers }),
      ])
      const [rolesData, staffData, invitesData] = await Promise.all([rolesRes.json(), staffRes.json(), invitesRes.json()])
      if (!rolesRes.ok) throw new Error(rolesData.error || 'Failed to load roles')
      setRoles(rolesData.roles || [])
      setStaff(staffData.staff || [])
      setInvites(invitesData.invites || [])
      if (!inviteRoleId && rolesData.roles?.length) setInviteRoleId(rolesData.roles[0].id)
    } catch (err) {
      setError(err.message || 'Failed to load Team data.')
    } finally {
      setLoading(false)
    }
  }, [inviteRoleId])

  useEffect(() => { fetchAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const roleName = (roleId) => roles.find((r) => r.id === roleId)?.name || 'Unknown role'

  const openEditRole = (role) => {
    const tabMap = {}
    ;(role.tabs || []).forEach((t) => { tabMap[t.tabId] = t.access })
    setRoleForm({ name: role.name, tabs: tabMap })
    setEditingRole(role.id)
  }
  const openNewRole = () => {
    setRoleForm({ name: '', tabs: {} })
    setEditingRole('new')
  }
  const toggleTabAccess = (tabId) => {
    setRoleForm((prev) => {
      const current = prev.tabs[tabId]
      const next = { ...prev.tabs }
      if (!current) next[tabId] = 'read'
      else if (current === 'read') next[tabId] = 'write'
      else delete next[tabId]
      return { ...prev, tabs: next }
    })
  }
  const saveRole = async () => {
    if (!roleForm.name.trim()) return
    setSavingRole(true)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const tabs = Object.entries(roleForm.tabs).map(([tabId, access]) => ({ tabId, access }))
      const action = editingRole === 'new' ? 'create' : 'update'
      const body = editingRole === 'new' ? { name: roleForm.name, tabs } : { roleId: editingRole, name: roleForm.name, tabs }
      const res = await fetch(`/api/staff-roles?action=${action}`, { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save role')
      setEditingRole(null)
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingRole(false)
    }
  }
  const deleteRole = async (roleId) => {
    if (!window.confirm('Delete this role? Staff currently on it must be reassigned first.')) return
    setBusyId(roleId)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const res = await fetch('/api/staff-roles?action=delete', { method: 'POST', headers, body: JSON.stringify({ roleId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete role')
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // Each of these three actions requires a freshly emailed code. The server
  // independently re-checks and burns that verification inside the handler,
  // so this prompt is UX - it is not what enforces the guard.
  const createInvite = () => {
    if (!inviteRoleId) return
    setError('')
    setOtpFlow({
      purpose: 'staff_invite',
      title: 'Confirm staff invite',
      description: 'An invite code gives someone access to your store. Enter the code we just emailed you.',
      run: performCreateInvite,
    })
  }

  const performCreateInvite = async () => {
    setCreatingInvite(true); setError('')
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const res = await fetch('/api/staff-invites?action=create', { method: 'POST', headers, body: JSON.stringify({ roleId: inviteRoleId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create invite')
      setNewCode(data.code)
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingInvite(false)
    }
  }
  const revokeInvite = async (code) => {
    setBusyId(code)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      await fetch('/api/staff-invites?action=revoke', { method: 'POST', headers, body: JSON.stringify({ code }) })
      fetchAll()
    } finally {
      setBusyId(null)
    }
  }
  const copyCode = (code) => {
    const link = `${window.location.origin}/join-team?code=${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  const reassignRole = (membershipId, roleId) => {
    setError('')
    setOtpFlow({
      purpose: 'staff_role_change',
      title: 'Confirm role change',
      description: "Changing a role changes what this person can see and do. Enter the code we just emailed you.",
      run: () => performReassignRole(membershipId, roleId),
    })
  }

  const performReassignRole = async (membershipId, roleId) => {
    setBusyId(membershipId)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const res = await fetch('/api/staff-manage?action=update-role', { method: 'POST', headers, body: JSON.stringify({ membershipId, roleId }) })
      // Previously unchecked - a 403 from the step-up guard would have been
      // swallowed and looked like a silent no-op.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || 'Failed to change role')
      }
      setReassigning(null)
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const removeStaff = (membershipId) => {
    if (!window.confirm('Remove this staff member? They will be logged out immediately.')) return
    setError('')
    setOtpFlow({
      purpose: 'staff_remove',
      title: 'Confirm staff removal',
      description: 'This revokes their access and logs them out immediately. Enter the code we just emailed you.',
      run: () => performRemoveStaff(membershipId),
    })
  }

  const performRemoveStaff = async (membershipId) => {
    setBusyId(membershipId)
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
      const res = await fetch('/api/staff-manage?action=remove', { method: 'POST', headers, body: JSON.stringify({ membershipId }) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || 'Failed to remove staff member')
      }
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (store?.plan !== 'premium') {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UsersIcon size={24} className="text-indigo-500" />
          </div>
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Team Accounts - Premium Feature</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            Invite staff with custom roles and permissions. Available on the Premium plan.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">Team</h2>
          <p className="text-xs text-gray-400 mt-0.5">Invite staff and control what each role can see and do.</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-300">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{error}</div>}

      {/* Invite panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-1.5"><UserPlus size={15} /> Invite a staff member</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          >
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button
            onClick={createInvite}
            disabled={creatingInvite || !inviteRoleId}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
          >
            {creatingInvite ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Generate Invite
          </button>
        </div>
        {newCode && (
          <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Invite created - valid 72 hours</p>
              <p className="text-sm font-mono font-bold text-green-800 truncate">{window.location.origin}/join-team?code={newCode}</p>
            </div>
            <button onClick={() => copyCode(newCode)} className="flex-shrink-0 text-green-700 hover:text-green-900 p-1.5">
              {copiedCode === newCode ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2">Max {10} pending invites, {5}/hour, {10} active staff seats.</p>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100"><h3 className="font-bold text-xs text-gray-800">Pending Invites</h3></div>
          <div className="divide-y divide-gray-50">
            {invites.map((inv) => (
              <div key={inv.code} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-mono font-bold text-gray-900">{inv.code}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {roleName(inv.roleId)} · expires {new Date(inv.expiresAt).toLocaleString('en-NG')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => copyCode(inv.code)} className="text-gray-400 hover:text-green-600 p-1.5">
                    {copiedCode === inv.code ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button onClick={() => revokeInvite(inv.code)} disabled={busyId === inv.code} className="text-[11px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg disabled:opacity-50">
                    {busyId === inv.code ? '...' : 'Revoke'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active staff */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100"><h3 className="font-bold text-xs text-gray-800">Active Staff ({staff.length}/10)</h3></div>
        <div className="divide-y divide-gray-50">
          {staff.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No staff yet - send an invite above.</div>
          ) : staff.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{s.email}</p>
                {reassigning === s.id ? (
                  <select
                    autoFocus
                    defaultValue={s.roleId}
                    onChange={(e) => reassignRole(s.id, e.target.value)}
                    onBlur={() => setReassigning(null)}
                    className="mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1"
                  >
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setReassigning(s.id)} className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    <Shield size={9} /> {roleName(s.roleId)} <Pencil size={9} />
                  </button>
                )}
              </div>
              <button onClick={() => removeStaff(s.id)} disabled={busyId === s.id} className="flex-shrink-0 text-red-400 hover:text-red-600 p-1.5 disabled:opacity-50">
                {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Role Builder */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-xs text-gray-800">Roles</h3>
          <button onClick={openNewRole} className="text-[11px] font-bold text-green-600 hover:text-green-700">+ New Role</button>
        </div>
        <div className="divide-y divide-gray-50">
          {roles.map((role) => {
            const isOpen = expandedRoleId === role.id
            return (
              <div key={role.id}>
                <button onClick={() => setExpandedRoleId(isOpen ? null : role.id)} className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight size={14} className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    <p className="text-sm font-bold text-gray-900 truncate">{role.name}</p>
                    {role.isPreset && <span className="text-[9px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">preset</span>}
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{(role.tabs || []).length} tab{(role.tabs || []).length === 1 ? '' : 's'}</span>
                </button>
                {isOpen && (
                  <div className="bg-gray-50/60 px-4 py-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(role.tabs || []).length === 0 ? (
                        <span className="text-xs text-gray-400">No tabs granted.</span>
                      ) : role.tabs.map((t) => (
                        <span key={t.tabId} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${t.access === 'write' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {ASSIGNABLE_TAB_LABELS[t.tabId] || t.tabId} · {t.access}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditRole(role)} className="text-[11px] font-bold bg-gray-900 text-white px-3 py-1.5 rounded-lg">Edit</button>
                      <button onClick={() => deleteRole(role.id)} disabled={busyId === role.id} className="text-[11px] font-bold bg-red-100 text-red-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
                        {busyId === role.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Role editor modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editingRole === 'new' ? 'New Role' : 'Edit Role'}</h3>
              <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <input
              value={roleForm.name}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Role name, e.g. Cashier"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 mb-4"
            />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Tap a tab to cycle: none → read → write</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {ASSIGNABLE_TAB_IDS.map((tabId) => {
                const access = roleForm.tabs[tabId]
                return (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => toggleTabAccess(tabId)}
                    className={`text-left px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      access === 'write' ? 'bg-green-50 border-green-300 text-green-700'
                      : access === 'read' ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    {ASSIGNABLE_TAB_LABELS[tabId]}
                    <span className="block text-[9px] font-semibold uppercase mt-0.5">{access || 'none'}</span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={saveRole}
              disabled={savingRole || !roleForm.name.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {savingRole && <Loader2 size={14} className="animate-spin" />} Save Role
            </button>
          </div>
        </div>
      )}

      <OtpVerifyModal
        open={!!otpFlow}
        purpose={otpFlow?.purpose}
        title={otpFlow?.title}
        description={otpFlow?.description}
        onClose={() => setOtpFlow(null)}
        onVerified={async () => {
          const flow = otpFlow
          setOtpFlow(null)
          await flow?.run?.()
        }}
      />
    </div>
  )
}
