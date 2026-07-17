import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Lock, Loader2, RefreshCw, Database, Cloud, Globe,
  Sparkles, TrendingUp, Users, Package, Clock, ChevronRight,
  Search, Copy, ChevronLeft, Check, AlertCircle, AlertTriangle,
  Shield, Star, FileCheck, Link2, Flag, LifeBuoy, BarChart3,
  Wallet, Menu, X, ChevronDown, ExternalLink, CircleDot
} from 'lucide-react';
import { getAdminRole, canAccessTab, getRoleLabel } from '../utils/adminRoles';

const ADMIN_TABS = [
  { id: 'health', label: 'System Health', icon: Database, short: 'Health', color: 'text-blue-600' },
  { id: 'directory', label: 'Merchants', icon: Users, short: 'Merchants', color: 'text-indigo-600' },
  { id: 'referrals', label: 'Referrals', icon: TrendingUp, short: 'Referrals', color: 'text-emerald-600' },
  { id: 'withdrawals', label: 'Payouts', icon: Clock, short: 'Payouts', color: 'text-amber-600' },
  { id: 'cac', label: 'CAC Verification', icon: FileCheck, short: 'CAC', color: 'text-orange-600' },
  { id: 'domains', label: 'Custom Domains', icon: Link2, short: 'Domains', color: 'text-violet-600' },
  { id: 'flags', label: 'Feature Flags', icon: Flag, short: 'Flags', color: 'text-rose-600' },
  { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy, short: 'Tickets', color: 'text-cyan-600' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, short: 'Analytics', color: 'text-teal-600' },
  { id: 'revenue', label: 'Revenue', icon: Wallet, short: 'Revenue', color: 'text-pink-600' },
  { id: 'admins', label: 'Team', icon: Shield, short: 'Team', color: 'text-gray-900' },
];

export default function Admin() {
  const { user } = useAuth();
  const [adminRole, setAdminRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const token = import.meta.env.VITE_ADMIN_SECRET_TOKEN || '';
  const authHeaders = { 'x-admin-token': token };

  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const [dirData, setDirData] = useState(null);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirError, setDirError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [approvingId, setApprovingId] = useState(null);
  const LIMIT = 10;

  const [refStats, setRefStats] = useState(null);
  const [refRewards, setRefRewards] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState('');

  const [withdrawals, setWithdrawals] = useState([]);
  const [wdLoading, setWdLoading] = useState(false);
  const [wdError, setWdError] = useState('');
  const [wdStatusFilter, setWdStatusFilter] = useState('pending');
  const [processingWd, setProcessingWd] = useState(null);

  const [adminList, setAdminList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const [cacData, setCacData] = useState(null);
  const [cacLoading, setCacLoading] = useState(false);
  const [cacError, setCacError] = useState('');
  const [cacStatusFilter, setCacStatusFilter] = useState('all');
  const [cacPage, setCacPage] = useState(1);

  const [domainData, setDomainData] = useState(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [domainPage, setDomainPage] = useState(1);

  const [flags, setFlags] = useState([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState('');
  const [newFlagId, setNewFlagId] = useState('');
  const [newFlagDesc, setNewFlagDesc] = useState('');

  const [tickets, setTickets] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [ticketPage, setTicketPage] = useState(1);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [signupSeries, setSignupSeries] = useState([]);
  const [orderData, setOrderData] = useState(null);

  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState('');

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const res = await fetch('/api/admin-health?action=health', { headers: authHeaders });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Health fetch failed (${res.status})`); }
      setHealthData(await res.json());
      setLastRefreshed(new Date());
      setCountdown(30);
    } catch (err) { setHealthError(err.message); }
    finally { setHealthLoading(false); }
  }, []);

  const fetchDirectory = useCallback(async (pageNum = 1, searchQuery = '') => {
    setDirLoading(true);
    setDirError('');
    try {
      const res = await fetch(`/api/admin-health?action=directory&page=${pageNum}&limit=${LIMIT}&search=${encodeURIComponent(searchQuery)}&payoutFilter=${payoutFilter}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Directory fetch failed');
      setDirData(await res.json());
    } catch (err) { setDirError('Failed to load merchants.'); }
    finally { setDirLoading(false); }
  }, [payoutFilter]);

  const fetchReferrals = useCallback(async () => {
    setRefLoading(true);
    setRefError('');
    try {
      const [s, r] = await Promise.all([
        fetch('/api/admin-referrals?action=stats', { headers: authHeaders }),
        fetch('/api/admin-referrals?action=rewards&limit=20', { headers: authHeaders }),
      ]);
      if (!s.ok || !r.ok) throw new Error('Failed');
      setRefStats((await s.json()).stats);
      setRefRewards((await r.json()).rewards || []);
    } catch { setRefError('Failed to load referral data.'); }
    finally { setRefLoading(false); }
  }, []);

  const fetchWithdrawals = useCallback(async (status = 'pending') => {
    setWdLoading(true);
    setWdError('');
    try {
      const res = await fetch(`/api/admin-referrals?action=withdrawals&status=${status}&limit=50`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed');
      setWithdrawals((await res.json()).withdrawals || []);
    } catch { setWdError('Failed to load withdrawals.'); }
    finally { setWdLoading(false); }
  }, []);

  const processWithdrawal = useCallback(async (withdrawalId, status) => {
    setProcessingWd(withdrawalId);
    try {
      const res = await fetch('/api/admin-referrals?action=process-withdrawal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ withdrawalId, status, adminUid: user?.uid }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchWithdrawals(wdStatusFilter);
    } catch (e) { console.error(e); }
    finally { setProcessingWd(null); }
  }, [wdStatusFilter, fetchWithdrawals, user]);

  const fetchAdmins = useCallback(async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      const res = await fetch('/api/admin-manage?action=list', { headers: authHeaders });
      if (!res.ok) throw new Error('Failed');
      setAdminList((await res.json()).admins || []);
    } catch { setAdminError('Failed to load admin team.'); }
    finally { setAdminLoading(false); }
  }, []);

  const fetchCac = useCallback(async () => {
    setCacLoading(true);
    setCacError('');
    try {
      const res = await fetch(`/api/admin-cac?action=list&page=${cacPage}&limit=20&status=${cacStatusFilter}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed');
      setCacData(await res.json());
    } catch { setCacError('Failed to load CAC data.'); }
    finally { setCacLoading(false); }
  }, [cacPage, cacStatusFilter]);

  const fetchDomains = useCallback(async () => {
    setDomainLoading(true);
    setDomainError('');
    try {
      const res = await fetch(`/api/admin-domains?action=list&page=${domainPage}&limit=20`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed');
      setDomainData(await res.json());
    } catch { setDomainError('Failed to load domains.'); }
    finally { setDomainLoading(false); }
  }, [domainPage]);

  const fetchFlags = useCallback(async () => {
    setFlagsLoading(true);
    setFlagsError('');
    try {
      const res = await fetch('/api/admin-flags?action=list', { headers: authHeaders });
      if (!res.ok) throw new Error('Failed');
      setFlags((await res.json()).flags || []);
    } catch { setFlagsError('Failed to load feature flags.'); }
    finally { setFlagsLoading(false); }
  }, []);

  const toggleFlag = useCallback(async (flagId, currentEnabled) => {
    try {
      await fetch('/api/admin-flags?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ flagId, enabled: !currentEnabled }),
      });
      fetchFlags();
    } catch (e) { console.error(e); }
  }, [fetchFlags]);

  const createFlag = useCallback(async () => {
    if (!newFlagId.trim()) return;
    try {
      await fetch('/api/admin-flags?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ flagId: newFlagId.trim(), enabled: false, description: newFlagDesc }),
      });
      setNewFlagId('');
      setNewFlagDesc('');
      fetchFlags();
    } catch (e) { console.error(e); }
  }, [newFlagId, newFlagDesc, fetchFlags]);

  const fetchTickets = useCallback(async () => {
    setTicketLoading(true);
    setTicketError('');
    try {
      const res = await fetch(`/api/admin-tickets?action=list&page=${ticketPage}&limit=20&status=${ticketStatusFilter}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTickets(data.tickets || []);
      setTicketStats(data.stats);
    } catch { setTicketError('Failed to load support tickets.'); }
    finally { setTicketLoading(false); }
  }, [ticketPage, ticketStatusFilter]);

  const updateTicketStatus = useCallback(async (ticketId, status) => {
    try {
      await fetch('/api/admin-tickets?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ ticketId, status }),
      });
      fetchTickets();
    } catch (e) { console.error(e); }
  }, [fetchTickets]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const [overview, signups, orders] = await Promise.all([
        fetch('/api/admin-analytics?action=overview', { headers: authHeaders }),
        fetch('/api/admin-analytics?action=signups&days=30', { headers: authHeaders }),
        fetch('/api/admin-analytics?action=orders&days=30', { headers: authHeaders }),
      ]);
      if (!overview.ok) throw new Error('Failed');
      setAnalytics((await overview.json()).analytics);
      const sData = await signups.json();
      setSignupSeries(sData.series || []);
      const oData = await orders.json();
      setOrderData(oData.orders);
    } catch { setAnalyticsError('Failed to load analytics.'); }
    finally { setAnalyticsLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) { setRoleLoading(false); return; }
    getAdminRole(user.uid).then(role => {
      setAdminRole(role);
      setRoleLoading(false);
      if (role) {
        const first = ADMIN_TABS.find(t => canAccessTab(role, t.id));
        if (first) setActiveTab(first.id);
      }
    }).catch(() => setRoleLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user || !adminRole) return;
    const loaders = {
      health: () => { if (!healthData) fetchHealth(); },
      directory: () => { if (!dirData) fetchDirectory(page, search); },
      referrals: () => { if (!refStats) fetchReferrals(); },
      withdrawals: () => fetchWithdrawals(wdStatusFilter),
      admins: () => { if (adminList.length === 0) fetchAdmins(); },
      cac: () => fetchCac(),
      domains: () => fetchDomains(),
      flags: () => fetchFlags(),
      tickets: () => fetchTickets(),
      analytics: () => fetchAnalytics(),
      revenue: () => {},
    };
    loaders[activeTab]?.();
  }, [user, activeTab, adminRole]);

  useEffect(() => {
    if (!user || !adminRole) return;
    let interval;
    if (activeTab === 'health') {
      interval = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { fetchHealth(); return 30; } return prev - 1; });
      }, 1000);
    } else { setCountdown(30); }
    return () => clearInterval(interval);
  }, [user, activeTab, fetchHealth, adminRole]);

  useEffect(() => {
    if (activeTab !== 'directory') return;
    const t = setTimeout(() => { setPage(1); fetchDirectory(1, search); }, 500);
    return () => clearTimeout(t);
  }, [search, activeTab, fetchDirectory]);

  useEffect(() => {
    if (activeTab === 'directory') { setPage(1); fetchDirectory(1, search); }
  }, [payoutFilter]);

  const copyToClipboard = (text, id) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const togglePayoutVerification = async (storeId, verified) => {
    setApprovingId(storeId);
    try {
      await fetch('/api/admin-health?action=verify_payout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ storeId, verified }),
      });
      fetchDirectory(page, search);
    } catch (e) { console.error(e); }
    finally { setApprovingId(null); }
  };

  if (roleLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full"><Loader2 size={24} className="animate-spin text-gray-400 mx-auto mb-4" /><p className="text-gray-400 text-sm">Checking permissions...</p></div></div>;
  if (!user || !adminRole) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full"><div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100"><Lock size={24} className="text-red-500" /></div><h1 className="font-display font-extrabold text-gray-900 text-lg mb-2">Access Denied</h1><p className="text-gray-400 text-sm leading-relaxed">This page is restricted to admin accounts.</p></div></div>;

  const accessibleTabs = ADMIN_TABS.filter(t => canAccessTab(adminRole, t.id));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Header */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden p-2 rounded-xl bg-gray-100 text-gray-600 flex-shrink-0">
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">Operations Console</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Shield size={12} className="text-green-600 flex-shrink-0" />
                  <p className="text-green-600 text-xs font-bold uppercase tracking-wider">{getRoleLabel(adminRole)}</p>
                </div>
              </div>
            </div>
            {activeTab === 'health' && (
              <button onClick={fetchHealth} disabled={healthLoading} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0">
                {healthLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span className="hidden sm:inline">Refresh Now</span>
              </button>
            )}
          </div>

          {/* Desktop Tab Bar */}
          <div className="hidden sm:flex mt-4 p-1 bg-gray-100 rounded-xl gap-1 overflow-x-auto scrollbar-hide">
            {accessibleTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 lg:px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>
                  <Icon size={15} /> <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden">{tab.short}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-3 p-2 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-3 gap-1">
              {accessibleTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}>
                    <Icon size={16} />
                    <span>{tab.short}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* HEALTH TAB */}
        {/* ============================================================ */}
        {activeTab === 'health' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {healthError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{healthError}</div>}

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm">Infrastructure Overview</h2>
              <p className="text-gray-400 text-[11px] font-medium">Auto-refresh in {countdown}s</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { id: 'firestore', name: 'Firebase Firestore', desc: 'Core database', data: healthData?.platform, icon: <Database size={18} className="text-blue-600" /> },
                { id: 'cloudinary', name: 'Cloudinary Storage', desc: 'Images & assets', data: healthData?.cloudinary, icon: <Cloud size={18} className="text-blue-600" /> },
                { id: 'vercel', name: 'Vercel Instance', desc: 'Deployment', data: healthData?.vercel, icon: <Globe size={18} className="text-blue-600" /> },
                { id: 'ai', name: 'NVIDIA AI Engine', desc: 'AI descriptions', data: healthData?.ai, icon: <Sparkles size={18} className="text-blue-600" /> }
              ].map(service => {
                const ok = service.data;
                return (
                  <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 flex flex-col justify-between min-h-[120px]">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100/50">{service.icon}</div>
                      <span className={`text-[10px] font-black tracking-wide uppercase px-2.5 py-1 rounded-full border ${ok ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                        {ok ? 'Online' : 'Error'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{service.name}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{service.desc}</p>
                      {service.id === 'ai' && healthData?.ai && (
                        <div className="mt-2 space-y-0.5">
                          <p className="text-[10px] text-green-600 font-bold font-mono">Total: {healthData.ai.totalAiGenerations?.toLocaleString() || 0}</p>
                          <p className="text-[10px] text-gray-400 font-mono">Today: {healthData.ai.today || 0} · Week: {healthData.ai.thisWeek || 0} · Month: {healthData.ai.thisMonth || 0}</p>
                        </div>
                      )}
                      {service.id === 'vercel' && healthData?.vercel && (
                        <p className="text-[10px] text-green-600 font-bold mt-2 font-mono">Region: {healthData.vercel.region} · Env: {healthData.vercel.environment || 'prod'}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Total Stores', value: healthData?.platform?.totalStores, icon: <TrendingUp size={14} /> },
                { label: 'Paying', value: (healthData?.platform?.growthStores || 0) + (healthData?.platform?.proStores || 0) + (healthData?.platform?.premiumStores || 0), icon: <Users size={14} /> },
                { label: 'Premium', value: healthData?.platform?.premiumStores || 0, icon: <Star size={14} /> },
                { label: 'Products', value: healthData?.platform?.totalProducts, icon: <Package size={14} /> },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4">
                  <div className="flex items-center justify-between text-gray-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-black text-green-600">{s.value?.toLocaleString() ?? '—'}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2"><Cloud size={14} className="text-gray-400" /> Cloud Storage</h3>
                {healthData?.cloudinary ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1"><p className="font-bold text-gray-700">Storage</p><p className="font-mono text-gray-500">{healthData.cloudinary.storageUsedGB.toFixed(2)} / {healthData.cloudinary.storageLimitGB.toFixed(0)} GB</p></div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${healthData.cloudinary.storagePercent >= 90 ? 'bg-red-500' : healthData.cloudinary.storagePercent >= 70 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${Math.min(healthData.cloudinary.storagePercent, 100)}%` }} /></div>
                      <p className="text-[10px] text-gray-400 mt-1">{healthData.cloudinary.storagePercent.toFixed(1)}% · {healthData.cloudinary.totalAssets.toLocaleString()} assets</p>
                    </div>
                    <div className="border-t border-gray-50 pt-3">
                      <div className="flex items-center justify-between text-xs mb-1"><p className="font-bold text-gray-700">Bandwidth</p><p className="font-mono text-gray-500">{(healthData.cloudinary.bandwidthUsedBytes / (1024**3)).toFixed(2)} GB</p></div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${healthData.cloudinary.bandwidthPercent >= 90 ? 'bg-red-500' : healthData.cloudinary.bandwidthPercent >= 70 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${Math.min(healthData.cloudinary.bandwidthPercent, 100)}%` }} /></div>
                      <p className="text-[10px] text-gray-400 mt-1">{healthData.cloudinary.bandwidthPercent.toFixed(1)}% consumed</p>
                    </div>
                  </div>
                ) : <p className="text-xs italic text-gray-300">Unavailable</p>}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-3"><Globe size={14} className="text-gray-400" /> Vercel Deployment</h3>
                {healthData?.vercel ? (
                  <div className="space-y-2.5">
                    {['status', 'region', 'environment'].map(k => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <p className="font-bold text-gray-700 capitalize">{k}</p>
                        <span className={`font-mono ${k === 'status' ? 'text-green-600 font-bold' : 'text-gray-500'}`}>{healthData.vercel[k] || '—'}</span>
                      </div>
                    ))}
                    {healthData.vercel.recentDeployments?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent Deploys</p>
                        {healthData.vercel.recentDeployments.slice(0, 3).map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <CircleDot size={10} className={d.state === 'READY' ? 'text-green-500' : 'text-amber-500'} />
                            <span className="text-gray-700 truncate flex-1">{d.commitMessage || 'No message'}</span>
                            <span className="text-gray-400 flex-shrink-0">{d.branch}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : <p className="text-xs italic text-gray-300">Unavailable</p>}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DIRECTORY TAB */}
        {/* ============================================================ */}
        {activeTab === 'directory' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {dirError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{dirError}</div>}

            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <Search size={18} className="text-gray-400 ml-1" />
              <input type="text" placeholder="Search merchants..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder-gray-400" />
              {dirLoading && <Loader2 size={16} className="text-gray-300 animate-spin" />}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['all', 'unverified'].map(f => (
                <button key={f} onClick={() => { setPayoutFilter(f); setPage(1); fetchDirectory(1, search); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${payoutFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'all' ? 'All Stores' : 'Unverified Payouts'}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black tracking-wider uppercase text-gray-400">
                      <th className="px-5 py-3">Merchant</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Source</th>
                      <th className="px-5 py-3">Dates & Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(dirData?.stores || []).map(store => (
                      <tr key={store.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900 text-sm">{store.storeName || 'Unnamed'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">@{store.handle}</p>
                          <div className="flex flex-col gap-1 mt-2 text-[11px] text-gray-500">
                            <div className="flex items-center gap-1.5"><span className="w-4 text-center text-gray-400 text-[9px] font-bold">EMAIL</span><span className="truncate max-w-[160px]">{store.ownerEmail || '—'}</span>
                              {store.ownerEmail && <button onClick={() => copyToClipboard(store.ownerEmail, `e-${store.id}`)} className="text-gray-300 hover:text-blue-500">{copiedId === `e-${store.id}` ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}</button>}
                            </div>
                            <div className="flex items-center gap-1.5"><span className="w-4 text-center text-gray-400 text-[9px] font-bold">WA</span><span className="truncate max-w-[160px]">{store.whatsappNumber || '—'}</span></div>
                          </div>
                          {store.subaccountCode && (
                            <div className="mt-2 pt-2 border-t border-gray-100 text-[11px]">
                              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Payout</p>
                              <p className="text-gray-600 mt-0.5">{store.payoutBankName || '—'} · {store.payoutAccountNumberMasked || '—'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {store.payoutsVerified ? <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Verified</span> : <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>}
                                {!store.payoutsVerified && store.subaccountCode && (
                                  <button onClick={() => togglePayoutVerification(store.id, true)} disabled={approvingId === store.id} className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-lg">{approvingId === store.id ? '...' : 'Approve'}</button>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top pt-5">
                          <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-1 rounded-full border ${store.plan === 'pro' ? 'bg-gray-900 text-white border-gray-900' : store.plan === 'growth' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{store.plan}</span>
                          {store.isPlanExpired && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 ml-1 inline-block mt-1">Expired</span>}
                        </td>
                        <td className="px-5 py-4 align-top pt-5">
                          {store.referredBy === undefined ? <span className="text-[11px] text-gray-400 italic">Not Referred</span> :
                           !store.referredBy ? <span className="text-[11px] font-bold text-gray-500">Organic</span> :
                           <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{store.referredBy}</span>}
                        </td>
                        <td className="px-5 py-4 align-top pt-5 text-xs text-gray-500">
                          <p>Start: {store.planStartDate ? new Date(store.planStartDate).toLocaleDateString('en-NG') : '—'}</p>
                          <p className={store.isPlanExpired ? 'text-red-500 font-bold' : ''}>End: {store.planEndDate ? new Date(store.planEndDate).toLocaleDateString('en-NG') : 'Lifetime'}</p>
                          <p className="mt-1 font-bold text-gray-900">Leads: {store.leadCount}</p>
                        </td>
                      </tr>
                    ))}
                    {!dirLoading && (dirData?.stores || []).length === 0 && <tr><td colSpan="4" className="p-10 text-center text-gray-400 text-sm">No merchants found.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="block lg:hidden divide-y divide-gray-100">
                {(dirData?.stores || []).map(store => (
                  <div key={store.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{store.storeName || 'Unnamed'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">@{store.handle}</p>
                      </div>
                      <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ml-2 ${store.plan === 'pro' ? 'bg-gray-900 text-white border-gray-900' : store.plan === 'growth' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{store.plan}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-gray-400">Email:</span> <span className="text-gray-700 truncate block">{store.ownerEmail || '—'}</span></div>
                      <div><span className="text-gray-400">WA:</span> <span className="text-gray-700 truncate block">{store.whatsappNumber || '—'}</span></div>
                      <div><span className="text-gray-400">Leads:</span> <span className="font-bold text-gray-900">{store.leadCount}</span></div>
                      <div>{store.subaccountCode && (store.payoutsVerified ? <span className="text-green-600 font-bold">Payout ✓</span> : <span className="text-amber-600 font-bold">Payout pending</span>)}</div>
                    </div>
                  </div>
                ))}
                {!dirLoading && (dirData?.stores || []).length === 0 && <div className="p-10 text-center text-gray-400 text-sm">No merchants found.</div>}
              </div>

              <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchDirectory(p, search); }} disabled={page === 1 || dirLoading} className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-gray-50"><ChevronLeft size={14} /> Prev</button>
                <span className="text-xs font-semibold text-gray-500">Page {dirData?.meta?.currentPage || 1} / {dirData?.meta?.totalPages || 1}</span>
                <button onClick={() => { const p = page + 1; setPage(p); fetchDirectory(p, search); }} disabled={!dirData?.meta || page >= dirData.meta.totalPages || dirLoading} className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next <ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* REFERRALS TAB */}
        {/* ============================================================ */}
        {activeTab === 'referrals' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {refError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{refError}</div>}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Referral Program</h2>
              <button onClick={fetchReferrals} disabled={refLoading} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                {refLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
              </button>
            </div>
            {refLoading && !refStats ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : refStats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Referrals', value: refStats.totalReferrals, color: 'text-emerald-600' },
                    { label: 'Pending Rewards', value: `₦${(refStats.totalPending / 100).toLocaleString()}`, color: 'text-amber-600' },
                    { label: 'Paid Out', value: `₦${(refStats.totalRewardsPaid / 100).toLocaleString()}`, color: 'text-green-600' },
                    { label: 'Pending Payouts', value: refStats.pendingWithdrawals, color: 'text-orange-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                      <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-bold text-sm text-gray-800">Recent Rewards</h3></div>
                  <div className="divide-y divide-gray-50">
                    {refRewards.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No referral rewards yet. When vendors upgrade to a paid plan, rewards will appear here.</div> :
                      refRewards.map(r => (
                        <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{r.referredStoreName || r.referredUserName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{r.plan} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-NG') : '—'}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-sm font-bold text-green-600">₦{((r.rewardAmount || 0) / 100).toLocaleString()}</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* WITHDRAWALS TAB */}
        {/* ============================================================ */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {wdError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{wdError}</div>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800">Withdrawal Queue</h2>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['pending', 'completed', 'rejected', 'all'].map(s => (
                  <button key={s} onClick={() => { setWdStatusFilter(s); fetchWithdrawals(s); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${wdStatusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
            </div>
            {wdLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {withdrawals.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No withdrawal requests.</div> :
                    withdrawals.map(w => (
                      <div key={w.id} className="px-4 py-4 hover:bg-gray-50/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{w.storeName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{w.bankName} · {w.bankAccount}</p>
                            <p className="text-xs text-gray-400">{w.createdAt ? new Date(w.createdAt).toLocaleString('en-NG') : '—'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-black text-gray-900">₦{((w.amount || 0) / 100).toLocaleString()}</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${w.status === 'completed' ? 'bg-green-100 text-green-700' : w.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{w.status}</span>
                            {w.status === 'pending' && (
                              <div className="flex gap-1.5 mt-2 justify-end">
                                <button onClick={() => processWithdrawal(w.id, 'completed')} disabled={processingWd === w.id} className="text-[11px] font-bold bg-green-600 text-white px-3 py-1 rounded-lg disabled:opacity-50">{processingWd === w.id ? '...' : 'Approve'}</button>
                                <button onClick={() => processWithdrawal(w.id, 'rejected')} disabled={processingWd === w.id} className="text-[11px] font-bold bg-red-100 text-red-700 px-3 py-1 rounded-lg disabled:opacity-50">Reject</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* CAC VERIFICATION TAB */}
        {/* ============================================================ */}
        {activeTab === 'cac' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {cacError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{cacError}</div>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800">CAC Verification</h2>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['all', 'verified', 'pending', 'not_submitted', 'rejected'].map(f => (
                  <button key={f} onClick={() => { setCacStatusFilter(f); setCacPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${cacStatusFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f === 'not_submitted' ? 'Not Submitted' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            </div>

            {cacData?.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Total', value: cacData.stats.total, color: 'text-gray-900' },
                  { label: 'Verified', value: cacData.stats.verified, color: 'text-green-600' },
                  { label: 'Pending', value: cacData.stats.pending, color: 'text-amber-600' },
                  { label: 'Not Submitted', value: cacData.stats.notSubmitted, color: 'text-gray-500' },
                  { label: 'Rejected', value: cacData.stats.rejected, color: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                    <p className={`text-xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {cacLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {(cacData?.stores || []).length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No merchants found.</div> :
                    cacData.stores.map(s => (
                      <div key={s.id} className="px-4 py-3 hover:bg-gray-50/50 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{s.storeName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">@{s.handle}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${s.cacVerified ? 'bg-green-50 text-green-600 border-green-200' : s.cacStatus === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : s.cacStatus === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{s.cacStatus}</span>
                        </div>
                      </div>
                    ))}
                </div>
                {cacData?.total > 20 && (
                  <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <button onClick={() => setCacPage(Math.max(1, cacPage - 1))} disabled={cacPage === 1} className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50"><ChevronLeft size={14} /> Prev</button>
                    <span className="text-xs font-semibold text-gray-500">Page {cacPage} / {Math.ceil(cacData.total / 20)}</span>
                    <button onClick={() => setCacPage(cacPage + 1)} disabled={cacPage * 20 >= cacData.total} className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50">Next <ChevronRight size={14} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* DOMAINS TAB */}
        {/* ============================================================ */}
        {activeTab === 'domains' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {domainError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{domainError}</div>}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Custom Domains</h2>
              <button onClick={fetchDomains} disabled={domainLoading} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl text-xs font-bold">
                {domainLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
              </button>
            </div>

            {domainData?.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Domains', value: domainData.stats.total, color: 'text-gray-900' },
                  { label: 'Verified', value: domainData.stats.verified, color: 'text-green-600' },
                  { label: 'Pending', value: domainData.stats.pending, color: 'text-amber-600' },
                  { label: 'Failed', value: domainData.stats.failed, color: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                    <p className={`text-xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {domainLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {(domainData?.stores || []).length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No custom domains configured.</div> :
                    domainData.stores.map(s => (
                      <div key={s.id} className="px-4 py-3 hover:bg-gray-50/50 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{s.storeName}</p>
                          <p className="text-xs text-violet-600 font-mono truncate flex items-center gap-1"><Link2 size={12} />{s.customDomain}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${s.domainStatus === 'verified' ? 'bg-green-50 text-green-600 border-green-200' : s.domainStatus === 'failed' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{s.domainStatus}</span>
                      </div>
                    ))}
                </div>
                {domainData?.total > 20 && (
                  <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <button onClick={() => setDomainPage(Math.max(1, domainPage - 1))} disabled={domainPage === 1} className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50"><ChevronLeft size={14} /> Prev</button>
                    <span className="text-xs font-semibold text-gray-500">Page {domainPage} / {Math.ceil(domainData.total / 20)}</span>
                    <button onClick={() => setDomainPage(domainPage + 1)} disabled={domainPage * 20 >= domainData.total} className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50">Next <ChevronRight size={14} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* FEATURE FLAGS TAB */}
        {/* ============================================================ */}
        {activeTab === 'flags' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {flagsError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{flagsError}</div>}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Feature Flags</h2>
              <button onClick={fetchFlags} disabled={flagsLoading} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl text-xs font-bold">
                {flagsLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Create New Flag</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Flag ID (e.g. dark_mode)" value={newFlagId} onChange={e => setNewFlagId(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                <input type="text" placeholder="Description (optional)" value={newFlagDesc} onChange={e => setNewFlagDesc(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                <button onClick={createFlag} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0">Add</button>
              </div>
            </div>

            {flagsLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {flags.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No feature flags configured yet.</div> :
                    flags.map(f => (
                      <div key={f.id} className="px-4 py-3 hover:bg-gray-50/50 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 font-mono">{f.flagId || f.id}</p>
                          {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                        </div>
                        <button onClick={() => toggleFlag(f.flagId || f.id, f.enabled)}
                          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${f.enabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                          <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${f.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SUPPORT TICKETS TAB */}
        {/* ============================================================ */}
        {activeTab === 'tickets' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {ticketError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{ticketError}</div>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800">Support Tickets</h2>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['all', 'open', 'in_progress', 'resolved'].map(f => (
                  <button key={f} onClick={() => { setTicketStatusFilter(f); setTicketPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${ticketStatusFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            </div>

            {ticketStats && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Open', value: ticketStats.open, color: 'text-red-600' },
                  { label: 'In Progress', value: ticketStats.inProgress, color: 'text-amber-600' },
                  { label: 'Resolved', value: ticketStats.resolved, color: 'text-green-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                    <p className={`text-xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {ticketLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {tickets.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No support tickets found.</div> :
                    tickets.map(t => (
                      <div key={t.id} className="px-4 py-4 hover:bg-gray-50/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{t.subject || t.message || 'No subject'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{t.userEmail || t.storeName || 'Unknown'} · {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-NG') : '—'}</p>
                            {t.message && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.message}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${(t.status === 'open' || !t.status) ? 'bg-red-50 text-red-600 border-red-200' : t.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{t.status || 'open'}</span>
                            {t.status !== 'resolved' && (
                              <button onClick={() => updateTicketStatus(t.id, t.status === 'open' ? 'in_progress' : 'resolved')}
                                className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-lg hover:bg-green-200">{t.status === 'open' ? 'Start' : 'Resolve'}</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* ANALYTICS TAB */}
        {/* ============================================================ */}
        {activeTab === 'analytics' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {analyticsError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{analyticsError}</div>}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Platform Analytics</h2>
              <button onClick={fetchAnalytics} disabled={analyticsLoading} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl text-xs font-bold">
                {analyticsLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
              </button>
            </div>

            {analyticsLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : analytics && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Stores', value: analytics.totalStores, color: 'text-gray-900' },
                    { label: 'Premium Stores', value: analytics.premiumStores, color: 'text-green-600' },
                    { label: 'Conversion Rate', value: `${analytics.conversionRate}%`, color: 'text-emerald-600' },
                    { label: 'Open Tickets', value: analytics.openTickets, color: 'text-red-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-xs p-4">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                      <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value?.toLocaleString?.() ?? s.value ?? '—'}</p>
                    </div>
                  ))}
                </div>

                {signupSeries.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Signups (Last 30 Days)</h3>
                    <div className="flex items-end gap-1 h-32">
                      {signupSeries.map((d, i) => {
                        const max = Math.max(...signupSeries.map(s => s.count), 1);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                            <div className="w-full bg-green-500 rounded-t" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
                            <span className="text-[8px] text-gray-400 hidden sm:block">{d.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {orderData && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Orders (Last 30 Days)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Orders', value: orderData.total },
                        { label: 'Paid', value: orderData.paid },
                        { label: 'Delivered', value: orderData.delivered },
                        { label: 'Revenue', value: `₦${((orderData.revenue || 0) / 100).toLocaleString()}` },
                      ].map(s => (
                        <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{s.label}</p>
                          <p className="text-lg font-black text-gray-900 mt-0.5">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* REVENUE TAB */}
        {/* ============================================================ */}
        {activeTab === 'revenue' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {revenueError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{revenueError}</div>}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Revenue Overview</h2>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 text-center">
              <Wallet size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-500">Revenue analytics coming soon.</p>
              <p className="text-xs text-gray-400 mt-1">This will show Paystack transaction data and MRR metrics.</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TEAM TAB */}
        {/* ============================================================ */}
        {activeTab === 'admins' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {adminError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{adminError}</div>}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Admin Team</h2>
              <button onClick={fetchAdmins} disabled={adminLoading} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl text-xs font-bold">
                {adminLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
              </button>
            </div>
            {adminLoading && adminList.length === 0 ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div> : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {adminList.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No admin accounts found.</div> :
                    adminList.map(a => (
                      <div key={a.id} className="px-4 py-4 hover:bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 font-mono truncate">{a.id}</p>
                            <p className="text-xs text-gray-500">By {a.assignedBy || '—'} · {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString('en-NG') : '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${a.role === 'super_admin' ? 'bg-gray-900 text-white border-gray-900' : a.role === 'finance' ? 'bg-green-50 text-green-700 border-green-200' : a.role === 'operations' ? 'bg-purple-50 text-purple-700 border-purple-200' : a.role === 'support' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{getRoleLabel(a.role)}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${a.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.active !== false ? 'Active' : 'Off'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 sm:hidden z-50">
        <div className="flex items-center justify-around py-2 px-1">
          {accessibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1 text-[9px] font-bold transition-colors min-w-0 flex-1 ${activeTab === tab.id ? tab.color : 'text-gray-400'}`}>
                <Icon size={17} />
                <span className="truncate">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
