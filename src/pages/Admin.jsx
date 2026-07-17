//src/pages/Admin.jsx/
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Lock, Loader2, RefreshCw, Database, Cloud, Globe, 
  Sparkles, TrendingUp, Users, Package, Clock, ChevronRight,
  Search, Copy, ChevronLeft, Check, AlertCircle, AlertTriangle, Shield
} from 'lucide-react';
import { getAdminRole, canAccessTab, getRoleLabel } from '../utils/adminRoles';

const ADMIN_TABS = [
  { id: 'health', label: 'System Health & Logs', icon: Database },
  { id: 'directory', label: 'Merchant Directory', icon: Users },
  { id: 'referrals', label: 'Referrals', icon: TrendingUp },
  { id: 'withdrawals', label: 'Withdrawals', icon: Clock },
]



export default function Admin() {
  const { user } = useAuth();
  
  // ── Admin Role ──
  const [adminRole, setAdminRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState('health');

  // ── Tab A: Health State ──
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [countdown, setCountdown] = useState(30);

  // ── Tab B: Directory State ──
  const [dirData, setDirData] = useState(null);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirError, setDirError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [approvingId, setApprovingId] = useState(null);
  const LIMIT = 10;

  // ── Tab C: Referrals State ──
  const [refStats, setRefStats] = useState(null);
  const [refRewards, setRefRewards] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState('');

  // ── Tab D: Withdrawals State ──
  const [withdrawals, setWithdrawals] = useState([]);
  const [wdLoading, setWdLoading] = useState(false);
  const [wdError, setWdError] = useState('');
  const [wdStatusFilter, setWdStatusFilter] = useState('pending');
  const [processingWd, setProcessingWd] = useState(null);

  // ── Fetch Actions ──
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const res = await fetch('/api/admin-health?action=health', {
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': import.meta.env.VITE_ADMIN_SECRET_TOKEN || '',
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || errBody.error || `Health fetch failed (${res.status})`);
      }
      const json = await res.json();
      setHealthData(json);
      setLastRefreshed(new Date());
      setCountdown(30);
    } catch (err) {
      setHealthError(err.message || 'Failed to extract system performance records.');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchDirectory = useCallback(async (pageNum = 1, searchQuery = '') => {
    setDirLoading(true);
    setDirError('');
    try {
      const url = `/api/admin-health?action=directory&page=${pageNum}&limit=${LIMIT}&search=${encodeURIComponent(searchQuery)}&payoutFilter=${payoutFilter}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': import.meta.env.VITE_ADMIN_SECRET_TOKEN || '',
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || errBody.error || `Directory fetch failed (${res.status})`);
      }
      const json = await res.json();
      setDirData(json);
    } catch (err) {
      setDirError('Failed to load merchant directory.');
    } finally {
      setDirLoading(false);
    }
  }, []);

  const fetchReferrals = useCallback(async () => {
    setRefLoading(true);
    setRefError('');
    try {
      const [statsRes, rewardsRes] = await Promise.all([
        fetch('/api/admin-referrals?action=stats', {
          headers: { 'x-admin-token': import.meta.env.VITE_ADMIN_SECRET_TOKEN || '' },
        }),
        fetch('/api/admin-referrals?action=rewards&limit=20', {
          headers: { 'x-admin-token': import.meta.env.VITE_ADMIN_SECRET_TOKEN || '' },
        }),
      ]);
      if (!statsRes.ok || !rewardsRes.ok) throw new Error('Failed to load referral data');
      const statsData = await statsRes.json();
      const rewardsData = await rewardsRes.json();
      setRefStats(statsData.stats);
      setRefRewards(rewardsData.rewards || []);
    } catch (err) {
      setRefError('Failed to load referral data.');
    } finally {
      setRefLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async (status = 'pending') => {
    setWdLoading(true);
    setWdError('');
    try {
      const res = await fetch(`/api/admin-referrals?action=withdrawals&status=${status}&limit=50`, {
        headers: { 'x-admin-token': import.meta.env.VITE_ADMIN_SECRET_TOKEN || '' },
      });
      if (!res.ok) throw new Error('Failed to load withdrawals');
      const data = await res.json();
      setWithdrawals(data.withdrawals || []);
    } catch (err) {
      setWdError('Failed to load withdrawals.');
    } finally {
      setWdLoading(false);
    }
  }, []);

  const processWithdrawal = useCallback(async (withdrawalId, status) => {
    setProcessingWd(withdrawalId);
    try {
      const res = await fetch('/api/admin-referrals?action=process-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': import.meta.env.VITE_ADMIN_SECRET_TOKEN || '',
        },
        body: JSON.stringify({ withdrawalId, status }),
      });
      if (!res.ok) throw new Error('Failed to process withdrawal');
      fetchWithdrawals(wdStatusFilter);
    } catch (err) {
      console.error('processWithdrawal error:', err);
    } finally {
      setProcessingWd(null);
    }
  }, [wdStatusFilter, fetchWithdrawals]);

  // ── Fetch Admin Role ──
  useEffect(() => {
    if (!user) { setRoleLoading(false); return }
    getAdminRole(user.uid)
      .then(role => {
        setAdminRole(role)
        setRoleLoading(false)
        if (role) {
          const firstTab = ADMIN_TABS.find(t => canAccessTab(role, t.id))
          if (firstTab) setActiveTab(firstTab.id)
        }
      })
      .catch(err => {
        console.error('[Admin] Role check failed:', err)
        setRoleLoading(false)
      })
  }, [user])

  // ── Lifecycle Hooks ──
  useEffect(() => {
    if (!user || !adminRole) return;

    if (activeTab === 'health' && !healthData) {
      fetchHealth();
    } else if (activeTab === 'directory' && !dirData) {
      fetchDirectory(page, search);
    } else if (activeTab === 'referrals' && !refStats) {
      fetchReferrals();
    } else if (activeTab === 'withdrawals') {
      fetchWithdrawals(wdStatusFilter);
    }
  }, [user, activeTab, adminRole]);

  useEffect(() => {
    if (!user || !adminRole) return;
    
    // Optimization: Only heartbeat on Health Tab
    let interval;
    if (activeTab === 'health') {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            fetchHealth();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(30); // Freeze/Reset when switching away
    }
    return () => clearInterval(interval);
  }, [user, activeTab, fetchHealth]);

  // Debounced Search for Directory
  useEffect(() => {
    if (activeTab !== 'directory') return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchDirectory(1, search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, activeTab, fetchDirectory]);

  // Refetch directory when payoutFilter changes while on the directory tab
  useEffect(() => {
    if (activeTab === 'directory') {
      setPage(1);
      fetchDirectory(1, search);
    }
  }, [payoutFilter]);


  // ── Utils ──
  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusConfig = (service, value) => {
    if (!value) return { label: 'Error', color: 'bg-red-50 text-red-500 border-red-200' };
    
    if (service === 'firestore') return { label: 'Connected', color: 'bg-green-50 text-green-600 border-green-200' };
    if (service === 'cloudinary') return { label: 'Active', color: 'bg-green-50 text-green-600 border-green-200' };
    if (service === 'netlify') {
      return value.siteStatus === 'ready' 
        ? { label: 'Online', color: 'bg-green-50 text-green-600 border-green-200' }
        : { label: value.siteStatus || 'Unknown', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    }
    if (service === 'ai') {
      return { label: 'Active', color: 'bg-green-50 text-green-600 border-green-200' };
    }
    return { label: 'Active', color: 'bg-green-50 text-green-600 border-green-200' };
  };

  // ── Authorization Shield ──
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full">
          <Loader2 size={24} className="animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || !adminRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Lock size={24} className="text-red-500" />
          </div>
          <h1 className="font-display font-extrabold text-gray-900 text-lg mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm leading-relaxed">This page is restricted to admin accounts. Contact the Super Admin to get access.</p>
        </div>
      </div>
    );
  }

  const displayedStores = (dirData?.stores || []).filter(store => {
    if (payoutFilter === 'unverified') {
      // Only show stores that have a subaccount and payoutsVerified explicitly false
      return store.subaccountCode && store.payoutsVerified === false;
    }
    return true;
  });

  const togglePayoutVerification = async (storeId, verified) => {
    setApprovingId(storeId);
    try {
      const res = await fetch('/api/admin-health?action=verify_payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': import.meta.env.VITE_ADMIN_SECRET_TOKEN || '',
        },
        body: JSON.stringify({ storeId, verified }),
      });
      if (!res.ok) throw new Error('Failed to update payout verification');
      // Refresh directory
      fetchDirectory(page, search);
    } catch (err) {
      console.error('togglePayoutVerification error:', err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Header & Segmented Tab Bar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Operations Console</h1>
              <div className="flex items-center gap-2 mt-1">
                <Shield size={12} className="text-green-600" />
                <p className="text-green-600 text-xs font-bold uppercase tracking-wider">
                  {getRoleLabel(adminRole)}
                </p>
              </div>
            </div>
            {activeTab === 'health' && (
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex-shrink-0"
              >
                {healthLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh Now
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row p-1 bg-gray-100 rounded-xl gap-1 overflow-x-auto">
            {ADMIN_TABS.filter(t => canAccessTab(adminRole, t.id)).map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB A: SYSTEM HEALTH */}
        {/* ============================================================== */}
        {activeTab === 'health' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {healthError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                {healthError}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Infrastructure Overview</h2>
              <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">
                Auto-refresh in {countdown}s
              </p>
            </div>

            {/* Service Status Cluster Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'firestore', name: 'Firebase Firestore', desc: 'Core platform document records', data: healthData?.platform, icon: <Database size={18} className="text-blue-600" /> },
                { id: 'cloudinary', name: 'Cloudinary Storage', desc: 'Merchant images and cloud assets', data: healthData?.cloudinary, icon: <Cloud size={18} className="text-blue-600" /> },
                { id: 'netlify', name: 'Netlify Instance', desc: 'Production site deployment state', data: healthData?.netlify, icon: <Globe size={18} className="text-blue-600" /> },
                { id: 'ai', name: 'NVIDIA AI Engine', desc: 'Automatic descriptions generation', data: healthData?.ai, icon: <Sparkles size={18} className="text-blue-600" /> }
              ].map(service => {
                const status = getStatusConfig(service.id, service.data);
                return (
                  <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex flex-col justify-between min-h-[130px]">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100/50 flex-shrink-0">
                        {service.icon}
                      </div>
                      <span className={`text-[11px] font-black tracking-wide uppercase px-2.5 py-1 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm tracking-tight">{service.name}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5 leading-tight font-medium">{service.desc}</p>
                      
                      {/* Special Injections for Health Cards */}
                      {service.id === 'ai' && healthData?.ai && (
                        <p className="text-[10px] text-green-600 font-bold mt-2 font-mono">
                          Total Generations: {healthData.ai.totalAiGenerations?.toLocaleString() || 0}
                        </p>
                      )}
                      {service.id === 'netlify' && healthData?.netlify?.netlifyCredits !== undefined && healthData?.netlify?.netlifyCredits !== null && (
                        <p className="text-[10px] text-green-600 font-bold mt-2 font-mono">
                          Available Netlify Balance/Credits: ${(healthData.netlify.netlifyCredits).toFixed(2)} USD
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Platform Core Infrastructure Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Stores', value: healthData?.platform?.totalStores, desc: `Starter: ${healthData?.platform?.starterStores || 0}`, icon: <TrendingUp size={16} /> },
                { 
                  label: 'Paying Subscribers', 
                  value: (healthData?.platform?.growthStores || 0) + (healthData?.platform?.proStores || 0) + (healthData?.platform?.premiumStores || 0), 
                  subLabel: `Growth: ${healthData?.platform?.growthStores || 0} · Pro: ${healthData?.platform?.proStores || 0} · Premium: ${healthData?.platform?.premiumStores || 0}`, 
                  icon: <Users size={16} /> 
                },
                { label: 'Premium Stores', value: healthData?.platform?.premiumStores || 0, desc: 'Paid premium-tier subscribers', icon: <Star size={16} /> },
                { label: 'Total Products', value: healthData?.platform?.totalProducts, desc: 'Across entire collection group', icon: <Package size={16} /> },
                { label: 'Total Leads', value: healthData?.platform?.totalLeads, desc: 'Registered interest records', icon: <Clock size={16} /> }
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-gray-400">
                    <span className="text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                    {stat.icon}
                  </div>
                  <p className="text-3xl font-black text-green-600 tracking-tight">
                    {stat.value !== undefined && stat.value !== null ? stat.value.toLocaleString() : '—'}
                  </p>
                  {stat.subLabel ? (
                    <p className="text-[11px] text-gray-400 font-medium">{stat.subLabel}</p>
                  ) : (
                    <p className="text-[11px] text-gray-400 font-medium">{stat.desc}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Bandwidth and Storage Arrays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-2">
                  <Cloud size={16} className="text-gray-400" /> Cloudinary Bandwidth Allocation
                </h3>
                {healthData?.cloudinary ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <p className="font-bold text-gray-700">Cloud Storage Asset Bulk</p>
                        <p className="font-mono text-gray-500">{healthData.cloudinary.storageUsedGB.toFixed(2)} GB / {healthData.cloudinary.storageLimitGB.toFixed(0)} GB</p>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            healthData.cloudinary.storagePercent >= 90 ? 'bg-red-500' : healthData.cloudinary.storagePercent >= 70 ? 'bg-amber-400' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(healthData.cloudinary.storagePercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5 font-medium">{healthData.cloudinary.storagePercent.toFixed(1)}% space occupied ({healthData.cloudinary.totalAssets.toLocaleString()} assets)</p>
                    </div>
                    <div className="border-t border-gray-50 pt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <p className="font-bold text-gray-700">Image Pipeline Delivery Bandwidth</p>
                        <p className="font-mono text-gray-500">{(healthData.cloudinary.bandwidthUsedBytes / (1024**3)).toFixed(2)} GB / {(healthData.cloudinary.bandwidthLimitBytes / (1024**3)).toFixed(0)} GB</p>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            healthData.cloudinary.bandwidthPercent >= 90 ? 'bg-red-500' : healthData.cloudinary.bandwidthPercent >= 70 ? 'bg-amber-400' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(healthData.cloudinary.bandwidthPercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5 font-medium">{healthData.cloudinary.bandwidthPercent.toFixed(1)}% bandwidth consumed</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-300">Cloudinary tracking statistics unavailable.</p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 flex flex-col justify-between min-h-[220px]">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-2">
                    <Globe size={16} className="text-gray-400" /> Netlify Traffic Capacity
                  </h3>
                  {healthData?.netlify && healthData.netlify.bandwidthUsedGB !== null ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <p className="font-bold text-gray-700">Platform Infrastructure Bandwidth</p>
                        <p className="font-mono text-gray-500">{healthData.netlify.bandwidthUsedGB.toFixed(2)} GB / {healthData.netlify.bandwidthLimitGB.toFixed(0)} GB</p>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            healthData.netlify.bandwidthPercent >= 90 ? 'bg-red-500' : healthData.netlify.bandwidthPercent >= 70 ? 'bg-amber-400' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(healthData.netlify.bandwidthPercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5 font-medium">{healthData.netlify.bandwidthPercent.toFixed(1)}% capacity consumed</p>
                    </div>
                  ) : (
                    <p className="text-xs italic text-gray-300 mt-4">Netlify routing bandwidth metrics unavailable.</p>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 font-medium bg-gray-50 border border-gray-100/60 p-3 rounded-xl mt-4">
                  Netlify bandwidth allocations reset on your next account billing cycle.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB B: MERCHANT DIRECTORY */}
        {/* ============================================================== */}
        {activeTab === 'directory' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {dirError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                {dirError}
              </div>
            )}

            {/* Filter Strip */}
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <Search size={18} className="text-gray-400 ml-2" />
              <input
                type="text"
                placeholder="Search by store name or handle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder-gray-400"
              />
              {dirLoading && <Loader2 size={16} className="text-gray-300 animate-spin mr-2" />}
            </div>

            {/* Payout Filter Sub-nav */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => { setPayoutFilter('all'); setPage(1); fetchDirectory(1, search); }}
                className={`text-sm font-semibold px-3 py-1 rounded-lg ${payoutFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-50 text-gray-600'}`}>
                All Stores
              </button>
              <button
                onClick={() => { setPayoutFilter('unverified'); setPage(1); fetchDirectory(1, search); }}
                className={`text-sm font-semibold px-3 py-1 rounded-lg ${payoutFilter === 'unverified' ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-50 text-gray-600'}`}>
                Unverified Payouts Only
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
              {/* Desktop Render Frame */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-gray-600">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black tracking-wider uppercase text-gray-400">
                      <th className="px-5 py-4">Merchant Profile</th>
                      <th className="px-5 py-4">Subscription Status</th>
                      <th className="px-5 py-4">Registration Source</th>
                      <th className="px-5 py-4">Timelines & Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayedStores.map((store) => (
                      <tr key={store.id} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="font-bold text-gray-900 text-sm tracking-tight">{store.storeName || 'Unnamed Business'}</div>
                          <div className="text-[11px] text-gray-400 font-mono mb-2">@{store.handle}</div>
                          
                          <div className="flex flex-col gap-1 text-[11px] font-medium text-gray-500">
                            <div className="flex items-center gap-2">
                              <span className="w-4 flex justify-center text-gray-400">EMAIL</span>
                              <span className="truncate max-w-[180px]">{store.ownerEmail || 'No Email'}</span>
                              {store.ownerEmail && (
                                <button onClick={() => copyToClipboard(store.ownerEmail, `email-${store.id}`)} className="text-gray-300 hover:text-blue-500 transition-colors">
                                  {copiedId === `email-${store.id}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-4 flex justify-center text-gray-400">WHATSAPP</span>
                              <span className="truncate max-w-[180px]">{store.whatsappNumber || 'No Phone'}</span>
                              {store.whatsappNumber && (
                                <button onClick={() => copyToClipboard(store.whatsappNumber, `phone-${store.id}`)} className="text-gray-300 hover:text-blue-500 transition-colors">
                                  {copiedId === `phone-${store.id}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>

                            {/* Payout Profile */}
                            <div className="mt-2 pt-2 border-t border-gray-100 pt-3">
                              <div className="text-[11px] text-gray-500 font-medium mb-1">Payout Profile</div>
                              {!store.subaccountCode ? (
                                <div className="text-xs text-gray-400">No Bank Connected</div>
                              ) : (
                                <div className="flex items-center justify-between gap-4">
                                  <div className="text-xs text-gray-600">
                                    <div>Bank: {store.payoutBankName || 'Unknown'}</div>
                                    <div className="mt-0.5">Account: {store.payoutAccountNumberMasked || 'Masked'}</div>
                                    <div className="mt-0.5 font-mono text-[11px] text-gray-400">Subacct: {store.subaccountCode}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div>
                                      {store.payoutsVerified ? (
                                        <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">Verified Payouts</span>
                                      ) : (
                                        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">Awaiting Verification</span>
                                      )}
                                    </div>
                                    <div>
                                      {store.subaccountCode && !store.payoutsVerified ? (
                                        <button
                                          onClick={() => togglePayoutVerification(store.id, true)}
                                          disabled={approvingId === store.id}
                                          className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg"
                                        >
                                          {approvingId === store.id ? 'Approving...' : 'Approve Bank Details'}
                                        </button>
                                      ) : store.subaccountCode && store.payoutsVerified ? (
                                        <button
                                          onClick={() => togglePayoutVerification(store.id, false)}
                                          disabled={approvingId === store.id}
                                          className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg"
                                        >
                                          {approvingId === store.id ? 'Updating...' : 'Revoke Verification'}
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-5 py-4 align-top pt-5">
                          <div className="flex flex-col items-start gap-2">
                            <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full border ${
                              store.plan === 'pro' ? 'bg-gray-900 text-white border-gray-900' :
                              store.plan === 'growth' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {store.plan}
                            </span>
                            {store.isPlanExpired && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                <AlertTriangle size={10} /> Plan Expired / Past Due
                              </span>
                            )}
                            {store.isManualOverride && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <AlertCircle size={10} /> Manual Override
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top pt-5">
                          {(() => {
                            // Case 1: Field completely missing (Old Users)
                            if (store.referredBy === undefined) {
                              return <span className="text-xs font-medium text-gray-400 italic">Not Referred</span>;
                            }
                            
                            // Case 2: Explicitly marked as organic
                            if (store.referredBy === null || store.referredBy === '' || store.referredBy?.toLowerCase() === 'organic') {
                              return <span className="text-xs font-bold text-gray-500">Organic</span>;
                            }
                            
                            // Case 3: Actual Influencer / Referral Code present
                            return (
                              <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 inline-block uppercase tracking-wider">
                                {store.referredBy}
                              </span>
                            );
                          })()}
                        </td>
                        
                        <td className="px-5 py-4 align-top pt-5">
                          <div className="flex flex-col gap-1.5 text-xs">
                            <div className="flex justify-between items-center text-gray-500">
                              <span className="font-medium">Activation:</span>
                              <span className="font-mono">{store.isManualOverride ? 'N/A - Manual Override' : (store.planStartDate ? new Date(store.planStartDate).toLocaleDateString('en-NG') : 'N/A')}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500">
                              <span className="font-medium">Expiration:</span>
                              <span className={`font-mono ${store.isPlanExpired ? 'text-red-500 font-bold' : ''}`}>
                                {store.isManualOverride ? 'N/A - Manual Override' : (store.planEndDate ? new Date(store.planEndDate).toLocaleDateString('en-NG') : 'Lifetime')}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-gray-900">
                              <span className="font-bold text-[11px] uppercase tracking-wider text-gray-400">Total Leads</span>
                              <span className="font-black text-sm bg-gray-100 px-2 py-0.5 rounded">{store.leadCount}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!dirLoading && displayedStores.length === 0 && (
                      <tr>
                        <td colSpan="3" className="p-10 text-center text-gray-400 text-sm italic">
                          No merchants found matching your query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="block lg:hidden divide-y divide-gray-100">
                {displayedStores.map((store) => (
                  <div key={store.id} className="p-5 flex flex-col gap-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900 text-base">{store.storeName || 'Unnamed Business'}</div>
                        <div className="text-[11px] text-gray-400 font-mono mb-1">@{store.handle}</div>
                        <div className="mt-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Registration Source</span>
                          {(() => {
                            // Case 1: Field completely missing (Old Users)
                            if (store.referredBy === undefined) {
                              return <span className="text-xs font-medium text-gray-400 italic mt-0.5 inline-block">Not Referred</span>;
                            }
                            
                            // Case 2: Explicitly marked as organic
                            if (store.referredBy === null || store.referredBy === '' || store.referredBy?.toLowerCase() === 'organic') {
                              return <span className="text-xs font-bold text-gray-500 mt-0.5 inline-block">Organic</span>;
                            }
                            
                            // Case 3: Actual Influencer / Referral Code present
                            return (
                              <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 inline-block mt-0.5">
                                {store.referredBy}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                          store.plan === 'pro' ? 'bg-gray-900 text-white border-gray-900' :
                          store.plan === 'growth' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {store.plan}
                        </span>
                        {store.isPlanExpired && (
                          <span className="text-[8px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            Expired
                          </span>
                        )}
                        {store.isManualOverride && (
                          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-medium">Activation</span>
                        <span className="font-mono text-gray-700">{store.isManualOverride ? 'N/A' : (store.planStartDate ? new Date(store.planStartDate).toLocaleDateString('en-NG') : 'N/A')}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-medium">Expiration</span>
                        <span className={`font-mono text-gray-700 ${store.isPlanExpired ? 'text-red-500 font-bold' : ''}`}>
                          {store.isManualOverride ? 'N/A' : (store.planEndDate ? new Date(store.planEndDate).toLocaleDateString('en-NG') : 'Lifetime')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1 text-[11px] font-medium text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 font-bold tracking-wider">EMAIL</span>
                          <span className="truncate max-w-[120px]">{store.ownerEmail || 'No Email'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 font-bold tracking-wider">WHATSAPP</span>
                          <span className="truncate max-w-[120px]">{store.whatsappNumber || 'No Phone'}</span>
                        </div>

                        {/* Payout Profile */}
                        <div className="mt-2 pt-2 border-t border-gray-100 pt-3">
                          <div className="text-[11px] text-gray-500 font-medium mb-1">Payout Profile</div>
                          {!store.subaccountCode ? (
                            <div className="text-xs text-gray-400">No Bank Connected</div>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-xs text-gray-600">
                                <div>Bank: {store.payoutBankName || 'Unknown'}</div>
                                <div className="mt-0.5">Account: {store.payoutAccountNumberMasked || 'Masked'}</div>
                                <div className="mt-0.5 font-mono text-[11px] text-gray-400">Subacct: {store.subaccountCode}</div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div>
                                  {store.payoutsVerified ? (
                                    <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">Verified Payouts</span>
                                  ) : (
                                    <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">Awaiting Verification</span>
                                  )}
                                </div>
                                <div>
                                  {store.subaccountCode && !store.payoutsVerified ? (
                                    <button
                                      onClick={() => togglePayoutVerification(store.id, true)}
                                      disabled={approvingId === store.id}
                                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg"
                                    >
                                      {approvingId === store.id ? 'Approving...' : 'Approve Bank Details'}
                                    </button>
                                  ) : store.subaccountCode && store.payoutsVerified ? (
                                    <button
                                      onClick={() => togglePayoutVerification(store.id, false)}
                                      disabled={approvingId === store.id}
                                      className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg"
                                    >
                                      {approvingId === store.id ? 'Updating...' : 'Revoke Verification'}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">Leads</span>
                        <span className="font-black text-base text-gray-900">{store.leadCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!dirLoading && displayedStores.length === 0 && (
                  <div className="p-10 text-center text-gray-400 text-sm italic">
                    No merchants found.
                  </div>
                )}
              </div>

              {/* Pagination Footer */}
              <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, page - 1);
                    setPage(newPage);
                    fetchDirectory(newPage, search);
                  }}
                  disabled={page === 1 || dirLoading}
                  className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                
                <span className="text-xs font-semibold text-gray-500">
                  Page {dirData?.meta?.currentPage || 1} of {dirData?.meta?.totalPages || 1}
                </span>

                <button
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    fetchDirectory(newPage, search);
                  }}
                  disabled={!dirData?.meta || page >= dirData.meta.totalPages || dirLoading}
                  className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB C: REFERRALS */}
        {/* ============================================================== */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {refError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{refError}</div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Referral Program Overview</h2>
              <button onClick={fetchReferrals} disabled={refLoading} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                {refLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
              </button>
            </div>

            {refLoading && !refStats ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div>
            ) : refStats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Referrals', value: refStats.totalReferrals },
                    { label: 'Pending Rewards', value: `₦${(refStats.totalPending / 100).toLocaleString()}` },
                    { label: 'Paid Out', value: `₦${(refStats.totalRewardsPaid / 100).toLocaleString()}` },
                    { label: 'Pending Withdrawals', value: refStats.pendingWithdrawals },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4">
                      <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                      <p className="text-xl font-black text-gray-900 mt-1">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-bold text-sm text-gray-800">Recent Rewards</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {refRewards.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">No referral rewards yet.</div>
                    ) : refRewards.map(r => (
                      <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{r.referredUserName || r.referredUserEmail || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{r.plan} plan · {new Date(r.createdAt).toLocaleDateString('en-NG')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">₦{(r.rewardAmount / 100).toLocaleString()}</p>
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

        {/* ============================================================== */}
        {/* TAB D: WITHDRAWALS */}
        {/* ============================================================== */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {wdError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{wdError}</div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Withdrawal Queue</h2>
              <div className="flex gap-2">
                {['pending', 'completed', 'rejected', 'all'].map(status => (
                  <button
                    key={status}
                    onClick={() => { setWdStatusFilter(status); fetchWithdrawals(status); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${wdStatusFilter === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {wdLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={24} /></div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {withdrawals.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No withdrawal requests.</div>
                  ) : withdrawals.map(w => (
                    <div key={w.id} className="px-4 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{w.storeName || 'Unknown Store'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{w.bankName} · {w.bankAccount} · {w.bankAccountName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(w.createdAt).toLocaleString('en-NG')}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-gray-900">₦{(w.amount / 100).toLocaleString()}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${w.status === 'completed' ? 'bg-green-100 text-green-700' : w.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{w.status}</span>
                          {w.status === 'pending' && (
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => processWithdrawal(w.id, 'completed')}
                                disabled={processingWd === w.id}
                                className="text-[11px] font-bold bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                              >
                                {processingWd === w.id ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => processWithdrawal(w.id, 'rejected')}
                                disabled={processingWd === w.id}
                                className="text-[11px] font-bold bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-all disabled:opacity-50"
                              >
                                Reject
                              </button>
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

      </div>
    </div>
  );
}