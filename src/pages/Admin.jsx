import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Lock, Loader2, RefreshCw, Database, Cloud, Globe,
  Sparkles, TrendingUp, Users, Package, Clock, ChevronRight,
  Search, Copy, ChevronLeft, Check, AlertCircle, AlertTriangle,
  Shield, Star, FileCheck, Link2, Megaphone, LifeBuoy, BarChart3,
  Wallet, Menu, X, ExternalLink, CircleDot, Flag, Briefcase, BookOpen
} from 'lucide-react';
import { getAdminRole, canAccessTab, getRoleLabel } from '../utils/adminRoles';
import BlogAdmin from '../components/admin/BlogAdmin';

const ADMIN_TABS = [
  { id: 'health', label: 'System Health', icon: Database, short: 'Health' },
  { id: 'directory', label: 'Merchants', icon: Users, short: 'Merchants' },
  { id: 'referrals', label: 'Referrals', icon: TrendingUp, short: 'Referrals' },
  { id: 'withdrawals', label: 'Payouts', icon: Clock, short: 'Payouts' },
  { id: 'cac', label: 'CAC Verification', icon: FileCheck, short: 'CAC' },
  { id: 'domains', label: 'Custom Domains', icon: Link2, short: 'Domains' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, short: 'Alerts' },
  { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy, short: 'Tickets' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, short: 'Analytics' },
  { id: 'revenue', label: 'Revenue', icon: Wallet, short: 'Revenue' },
  { id: 'sella-ai', label: 'Sella AI Usage', icon: Sparkles, short: 'Sella AI' },
  { id: 'reports', label: 'Store Reports', icon: Flag, short: 'Reports' },
  { id: 'jobs', label: 'Job Listings', icon: Briefcase, short: 'Jobs' },
  { id: 'blog', label: 'Blog', icon: BookOpen, short: 'Blog' },
  { id: 'admins', label: 'Team', icon: Shield, short: 'Team' },
];

// Grouping used only by the mobile nav drawer — purely presentational, does not affect
// ADMIN_TABS, role filtering (canAccessTab), or any tab's content/logic.
const ADMIN_TAB_GROUPS = [
  { label: 'Overview', ids: ['health'] },
  { label: 'Merchants & Money', ids: ['directory', 'referrals', 'withdrawals', 'revenue'] },
  { label: 'Trust & Growth', ids: ['cac', 'domains', 'analytics'] },
  { label: 'Engagement', ids: ['announcements', 'tickets', 'sella-ai', 'reports', 'jobs', 'blog'] },
  { label: 'Team', ids: ['admins'] },
];

const PLAN_N = { premium: 0, pro: 1, growth: 2, starter: 3 };
const PLAN_C = { premium: 'bg-yellow-50 text-yellow-700 border-yellow-200', pro: 'bg-gray-900 text-white border-gray-900', growth: 'bg-green-50 text-green-700 border-green-200', starter: 'bg-gray-100 text-gray-600 border-gray-200' };

export default function Admin() {
  const { user } = useAuth();
  const [adminRole, setAdminRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = import.meta.env.VITE_ADMIN_SECRET_TOKEN || '';
  const H = { 'x-admin-token': token };

  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [countdown, setCountdown] = useState(30);

  const [dirData, setDirData] = useState(null);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirError, setDirError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [approvingId, setApprovingId] = useState(null);

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
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('support');
  const [newAdminName, setNewAdminName] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [cacData, setCacData] = useState(null);
  const [cacLoading, setCacLoading] = useState(false);
  const [cacError, setCacError] = useState('');
  const [cacStatusFilter, setCacStatusFilter] = useState('all');
  const [cacPage, setCacPage] = useState(1);

  const [domainData, setDomainData] = useState(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [domainPage, setDomainPage] = useState(1);

  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [annError, setAnnError] = useState('');
  const [newAnn, setNewAnn] = useState({ title: '', message: '', type: 'info' });

  const [tickets, setTickets] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [ticketPage, setTicketPage] = useState(1);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [topStores, setTopStores] = useState([]);
  const [signupSeries, setSignupSeries] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  const [revenueData, setRevenueData] = useState(null);
  const [revenueTxns, setRevenueTxns] = useState([]);
  const [storeRevenues, setStoreRevenues] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState('');
  const [revenueTab, setRevenueTab] = useState('platform');
  const [revenuePage, setRevenuePage] = useState(1);

  const [sellaData, setSellaData] = useState(null);
  const [sellaLoading, setSellaLoading] = useState(false);
  const [sellaError, setSellaError] = useState('');

  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [reportsStatusFilter, setReportsStatusFilter] = useState('all');
  const [reportsOffenseFilter, setReportsOffenseFilter] = useState('all');
  const [reportsPage, setReportsPage] = useState(1);
  const [expandedReport, setExpandedReport] = useState(null);
  const [reportNotes, setReportNotes] = useState('');
  const [updatingReport, setUpdatingReport] = useState(null);

  const [jobsData, setJobsData] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [jobsStatusFilter, setJobsStatusFilter] = useState('pending');
  const [expandedJob, setExpandedJob] = useState(null);
  const [rejectingJob, setRejectingJob] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [updatingJob, setUpdatingJob] = useState(null);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true); setHealthError('');
    try {
      const r = await fetch('/api/admin-health?action=health', { headers: H });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `${r.status}`); }
      setHealthData(await r.json()); setCountdown(30);
    } catch (e) { setHealthError(e.message); } finally { setHealthLoading(false); }
  }, []);

  const fetchDirectory = useCallback(async (p = 1, q = '') => {
    setDirLoading(true); setDirError('');
    try {
      const r = await fetch(`/api/admin-health?action=directory&page=${p}&limit=10&search=${encodeURIComponent(q)}&payoutFilter=${payoutFilter}`, { headers: H });
      if (!r.ok) throw new Error('Failed');
      setDirData(await r.json());
    } catch { setDirError('Failed to load merchants.'); } finally { setDirLoading(false); }
  }, [payoutFilter]);

  const fetchReferrals = useCallback(async () => {
    setRefLoading(true); setRefError('');
    try {
      const [s, r] = await Promise.all([
        fetch('/api/admin-referrals?action=stats', { headers: H }),
        fetch('/api/admin-referrals?action=rewards&limit=20', { headers: H }),
      ]);
      if (!s.ok || !r.ok) throw new Error('Failed');
      setRefStats((await s.json()).stats);
      setRefRewards((await r.json()).rewards || []);
    } catch { setRefError('Failed to load referral data.'); } finally { setRefLoading(false); }
  }, []);

  const fetchWithdrawals = useCallback(async (status = 'pending') => {
    setWdLoading(true); setWdError('');
    try {
      const r = await fetch(`/api/admin-referrals?action=withdrawals&status=${status}&limit=50`, { headers: H });
      if (!r.ok) throw new Error('Failed');
      setWithdrawals((await r.json()).withdrawals || []);
    } catch { setWdError('Failed.'); } finally { setWdLoading(false); }
  }, []);

  const processWithdrawal = useCallback(async (id, status, note = '') => {
    setProcessingWd(id);
    try {
      await fetch('/api/admin-referrals?action=process-withdrawal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify({ withdrawalId: id, status, note, adminUid: user?.uid }),
      });
      fetchWithdrawals(wdStatusFilter);
    } finally { setProcessingWd(null); }
  }, [wdStatusFilter, fetchWithdrawals, user]);

  const fetchAdmins = useCallback(async () => {
    setAdminLoading(true); setAdminError('');
    try {
      const r = await fetch('/api/admin-manage?action=list', { headers: H });
      if (!r.ok) throw new Error('Failed');
      setAdminList((await r.json()).admins || []);
    } catch { setAdminError('Failed.'); } finally { setAdminLoading(false); }
  }, []);

  const createAdmin = useCallback(async () => {
    if (!newAdminEmail.trim() || !newAdminPass) return;
    setCreatingAdmin(true);
    try {
      const r = await fetch('/api/admin-manage?action=create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify({ email: newAdminEmail.trim(), password: newAdminPass, role: newAdminRole, displayName: newAdminName }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Failed to create admin'); return; }
      setNewAdminEmail(''); setNewAdminPass(''); setNewAdminName(''); setShowCreateAdmin(false);
      fetchAdmins();
    } catch { alert('Failed to create admin.'); } finally { setCreatingAdmin(false); }
  }, [newAdminEmail, newAdminPass, newAdminRole, newAdminName, fetchAdmins]);

  const fetchCac = useCallback(async () => {
    setCacLoading(true); setCacError('');
    try {
      const r = await fetch(`/api/admin-cac?action=list&page=${cacPage}&limit=20&status=${cacStatusFilter}`, { headers: H });
      if (!r.ok) throw new Error('Failed');
      setCacData(await r.json());
    } catch { setCacError('Failed.'); } finally { setCacLoading(false); }
  }, [cacPage, cacStatusFilter]);

  const fetchDomains = useCallback(async () => {
    setDomainLoading(true); setDomainError('');
    try {
      const r = await fetch(`/api/admin-domains?action=list&page=${domainPage}&limit=20`, { headers: H });
      if (!r.ok) throw new Error('Failed');
      setDomainData(await r.json());
    } catch { setDomainError('Failed.'); } finally { setDomainLoading(false); }
  }, [domainPage]);

  const fetchAnnouncements = useCallback(async () => {
    setAnnLoading(true); setAnnError('');
    try {
      const r = await fetch('/api/admin-announcements?action=list', { headers: H });
      if (!r.ok) throw new Error('Failed');
      setAnnouncements((await r.json()).announcements || []);
    } catch { setAnnError('Failed.'); } finally { setAnnLoading(false); }
  }, []);

  const createAnnouncement = useCallback(async () => {
    if (!newAnn.title.trim() || !newAnn.message.trim()) return;
    try {
      await fetch('/api/admin-announcements?action=create', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify(newAnn),
      });
      setNewAnn({ title: '', message: '', type: 'info' });
      fetchAnnouncements();
    } catch (e) { console.error(e); }
  }, [newAnn, fetchAnnouncements]);

  const toggleAnnouncement = useCallback(async (id, currentActive) => {
    try {
      await fetch('/api/admin-announcements?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify({ announcementId: id, active: !currentActive }),
      });
      fetchAnnouncements();
    } catch (e) { console.error(e); }
  }, [fetchAnnouncements]);

  const deleteAnnouncement = useCallback(async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await fetch('/api/admin-announcements?action=delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify({ announcementId: id }),
      });
      fetchAnnouncements();
    } catch (e) { console.error(e); }
  }, [fetchAnnouncements]);

  const fetchTickets = useCallback(async () => {
    setTicketLoading(true); setTicketError('');
    try {
      const r = await fetch(`/api/admin-tickets?action=list&page=${ticketPage}&limit=20&status=${ticketStatusFilter}`, { headers: H });
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      setTickets(d.tickets || []);
      setTicketStats(d.stats);
    } catch { setTicketError('Failed.'); } finally { setTicketLoading(false); }
  }, [ticketPage, ticketStatusFilter]);

  const updateTicket = useCallback(async (id, status) => {
    try {
      await fetch('/api/admin-tickets?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify({ ticketId: id, status }),
      });
      fetchTickets();
    } catch (e) { console.error(e); }
  }, [fetchTickets]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true); setAnalyticsError('');
    try {
      const [ov, ts, su] = await Promise.all([
        fetch('/api/admin-analytics?action=overview', { headers: H }),
        fetch('/api/admin-analytics?action=top-stores&limit=10', { headers: H }),
        fetch('/api/admin-analytics?action=signups&days=30', { headers: H }),
      ]);
      if (!ov.ok) throw new Error('Failed');
      setAnalyticsData((await ov.json()).analytics);
      setTopStores((await ts.json()).stores || []);
      setSignupSeries((await su.json()).series || []);
    } catch { setAnalyticsError('Failed.'); } finally { setAnalyticsLoading(false); }
  }, []);

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true); setRevenueError('');
    try {
      const [p, sr] = await Promise.all([
        fetch('/api/admin-revenue?action=platform', { headers: H }),
        fetch('/api/admin-revenue?action=store-revenue&limit=20', { headers: H }),
      ]);
      if (!p.ok) throw new Error('Failed');
      setRevenueData((await p.json()).platform);
      setStoreRevenues((await sr.json()).stores || []);
    } catch { setRevenueError('Failed.'); } finally { setRevenueLoading(false); }
  }, []);

  const fetchSella = useCallback(async () => {
    setSellaLoading(true); setSellaError('');
    try {
      const r = await fetch('/api/admin-sella-ai?action=usage', { headers: H });
      if (!r.ok) throw new Error('Failed');
      setSellaData(await r.json());
    } catch { setSellaError('Failed to load Sella AI usage.'); } finally { setSellaLoading(false); }
  }, []);

  const fetchReports = useCallback(async (p = 1, status = 'all', offense = 'all') => {
    setReportsLoading(true); setReportsError('');
    try {
      const r = await fetch(`/api/admin-reports?action=list&page=${p}&limit=20&status=${status}&offense=${offense}`, { headers: H });
      if (!r.ok) throw new Error('Failed');
      setReportsData(await r.json());
    } catch { setReportsError('Failed to load reports.'); } finally { setReportsLoading(false); }
  }, []);

  const updateReportStatus = useCallback(async (reportId, status, adminNotes = '') => {
    setUpdatingReport(reportId);
    try {
      await fetch('/api/admin-reports?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify({ reportId, status, adminNotes }),
      });
      fetchReports(reportsPage, reportsStatusFilter, reportsOffenseFilter);
      setExpandedReport(null);
    } finally { setUpdatingReport(null); }
  }, [reportsPage, reportsStatusFilter, reportsOffenseFilter, fetchReports]);

  const fetchJobs = useCallback(async (status = 'pending') => {
    setJobsLoading(true); setJobsError('');
    try {
      const r = await fetch(`/api/admin-jobs?action=list&status=${status}`, { headers: H });
      if (!r.ok) throw new Error('Failed');
      setJobsData(await r.json());
    } catch { setJobsError('Failed to load job listings.'); } finally { setJobsLoading(false); }
  }, []);

  const updateJobStatus = useCallback(async (jobId, status, rejectionReason = '') => {
    setUpdatingJob(jobId);
    try {
      await fetch('/api/admin-jobs?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...H },
        body: JSON.stringify({ jobId, status, rejectionReason, adminUid: user?.uid }),
      });
      fetchJobs(jobsStatusFilter);
      setExpandedJob(null); setRejectingJob(null); setRejectReason('');
    } finally { setUpdatingJob(null); }
  }, [jobsStatusFilter, fetchJobs, user]);

  useEffect(() => {
    if (!user) { setRoleLoading(false); return; }
    getAdminRole(user.uid).then(role => {
      setAdminRole(role); setRoleLoading(false);
      if (role) { const f = ADMIN_TABS.find(t => canAccessTab(role, t.id)); if (f) setActiveTab(f.id); }
    }).catch(() => setRoleLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user || !adminRole) return;
    const m = {
      health: () => { if (!healthData) fetchHealth(); },
      directory: () => { if (!dirData) fetchDirectory(page, search); },
      referrals: () => { if (!refStats) fetchReferrals(); },
      withdrawals: () => fetchWithdrawals(wdStatusFilter),
      admins: () => { if (adminList.length === 0) fetchAdmins(); },
      cac: () => fetchCac(),
      domains: () => fetchDomains(),
      announcements: () => fetchAnnouncements(),
      tickets: () => fetchTickets(),
      analytics: () => fetchAnalytics(),
      revenue: () => fetchRevenue(),
      'sella-ai': () => fetchSella(),
      reports: () => fetchReports(reportsPage, reportsStatusFilter, reportsOffenseFilter),
      jobs: () => fetchJobs(jobsStatusFilter),
    };
    m[activeTab]?.();
  }, [user, activeTab, adminRole]);

  useEffect(() => {
    if (!user || !adminRole) return;
    let i;
    if (activeTab === 'health') {
      i = setInterval(() => { setCountdown(p => { if (p <= 1) { fetchHealth(); return 30; } return p - 1; }); }, 1000);
    } else { setCountdown(30); }
    return () => clearInterval(i);
  }, [user, activeTab, fetchHealth, adminRole]);

  useEffect(() => {
    if (activeTab !== 'directory') return;
    const t = setTimeout(() => { setPage(1); fetchDirectory(1, search); }, 500);
    return () => clearTimeout(t);
  }, [search, activeTab, fetchDirectory]);

  useEffect(() => { if (activeTab === 'directory') { setPage(1); fetchDirectory(1, search); } }, [payoutFilter]);

  const cp = (t, id) => { navigator.clipboard.writeText(t); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };
  const tpv = async (storeId, verified) => {
    setApprovingId(storeId);
    try { await fetch('/api/admin-health?action=verify_payout', { method: 'POST', headers: { 'Content-Type': 'application/json', ...H }, body: JSON.stringify({ storeId, verified }) }); fetchDirectory(page, search); } finally { setApprovingId(null); }
  };

  if (roleLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-400" /></div>;
  if (!user || !adminRole) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full"><Lock size={24} className="text-red-500 mx-auto mb-4" /><h1 className="font-bold text-gray-900 text-lg mb-2">Access Denied</h1><p className="text-gray-400 text-sm">Contact the Super Admin.</p></div></div>;

  const at = ADMIN_TABS.filter(t => canAccessTab(adminRole, t.id));

  const activeTabMeta = at.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4">
        {/* Header */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <button onClick={() => setMobileMenuOpen(true)} className="sm:hidden p-2 rounded-xl bg-gray-100 text-gray-600 flex-shrink-0" aria-label="Open menu"><Menu size={18} /></button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black text-gray-900 tracking-tight truncate">Operations Console</h1>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <Shield size={11} className="text-green-600 flex-shrink-0" />
                  <p className="text-green-600 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">{getRoleLabel(adminRole)}</p>
                  {activeTabMeta && (
                    <>
                      <span className="text-gray-300 text-[10px] sm:hidden flex-shrink-0">·</span>
                      <p className="text-gray-400 text-[10px] font-bold sm:hidden truncate">{activeTabMeta.label}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            {activeTab === 'health' && <button onClick={fetchHealth} disabled={healthLoading} className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0">{healthLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} <span className="hidden sm:inline">Refresh</span></button>}
          </div>
          <div className="hidden sm:flex mt-3 p-1 bg-gray-100 rounded-xl gap-1 overflow-x-auto scrollbar-hide">
            {at.map(tab => { const I = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><I size={14} /> <span className="hidden lg:inline">{tab.label}</span><span className="lg:hidden">{tab.short}</span></button>; })}
          </div>
        </div>

        {/* HEALTH */}
        {activeTab === 'health' && <div className="space-y-4 animate-in fade-in duration-200">
          {healthError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{healthError}</div>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[{ id: 'firestore', n: 'Firebase', d: 'Core database', data: healthData?.platform, i: <Database size={16} className="text-blue-600" /> },
              { id: 'cloudinary', n: 'Cloudinary', d: 'Images', data: healthData?.cloudinary, i: <Cloud size={16} className="text-blue-600" /> },
              { id: 'vercel', n: 'Vercel', d: 'Deployment', data: healthData?.vercel, i: <Globe size={16} className="text-blue-600" /> },
              { id: 'ai', n: 'AI Engine', d: 'Descriptions', data: healthData?.ai, i: <Sparkles size={16} className="text-blue-600" /> }
            ].map(s => <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3 flex flex-col justify-between min-h-[100px]">
              <div className="flex items-center justify-between mb-2"><div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">{s.i}</div><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${s.data ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>{s.data ? 'Online' : 'Error'}</span></div>
              <div><p className="font-bold text-gray-900 text-xs">{s.n}</p><p className="text-gray-400 text-[10px]">{s.d}</p>{s.id === 'ai' && healthData?.ai && <p className="text-[9px] text-green-600 font-bold mt-1 font-mono">T:{healthData.ai.totalAiGenerations||0} W:{healthData.ai.thisWeek||0} M:{healthData.ai.thisMonth||0}</p>}</div>
            </div>)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[{ l: 'Total Stores', v: healthData?.platform?.totalStores, i: <TrendingUp size={12} /> },
              { l: 'Paying', v: (healthData?.platform?.growthStores||0)+(healthData?.platform?.proStores||0)+(healthData?.platform?.premiumStores||0), i: <Users size={12} /> },
              { l: 'Premium', v: healthData?.platform?.premiumStores||0, i: <Star size={12} /> },
              { l: 'Products', v: healthData?.platform?.totalProducts, i: <Package size={12} /> },
            ].map((s,i) => <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3"><div className="flex items-center justify-between text-gray-400 mb-1"><span className="text-[9px] font-bold uppercase tracking-wider">{s.l}</span>{s.i}</div><p className="text-xl font-black text-green-600">{s.v?.toLocaleString()??'—'}</p></div>)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4">
              <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-3"><Cloud size={12} className="text-gray-400" /> Cloud Storage</h3>
              {healthData?.cloudinary ? <div className="space-y-3">
                <div><div className="flex justify-between text-[11px] mb-1"><span className="font-bold text-gray-700">Storage</span><span className="font-mono text-gray-500">{healthData.cloudinary.storageUsedGB.toFixed(2)}/{healthData.cloudinary.storageLimitGB.toFixed(0)} GB</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${healthData.cloudinary.storagePercent>=90?'bg-red-500':healthData.cloudinary.storagePercent>=70?'bg-amber-400':'bg-green-500'}`} style={{width:`${Math.min(healthData.cloudinary.storagePercent,100)}%`}} /></div></div>
                <div><div className="flex justify-between text-[11px] mb-1"><span className="font-bold text-gray-700">Bandwidth</span><span className="font-mono text-gray-500">{(healthData.cloudinary.bandwidthUsedBytes/(1024**3)).toFixed(2)} GB</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${healthData.cloudinary.bandwidthPercent>=90?'bg-red-500':healthData.cloudinary.bandwidthPercent>=70?'bg-amber-400':'bg-green-500'}`} style={{width:`${Math.min(healthData.cloudinary.bandwidthPercent,100)}%`}} /></div></div>
              </div> : <p className="text-xs text-gray-300 italic">Unavailable</p>}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4">
              <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-3"><Globe size={12} className="text-gray-400" /> Vercel</h3>
              {healthData?.vercel ? <div className="space-y-2">
                {['status','region','environment'].map(k=><div key={k} className="flex justify-between text-[11px]"><span className="font-bold text-gray-700 capitalize">{k}</span><span className={`font-mono ${k==='status'?'text-green-600 font-bold':'text-gray-500'}`}>{healthData.vercel[k]||'—'}</span></div>)}
                {healthData.vercel.recentDeployments?.length>0 && <div className="mt-2 pt-2 border-t border-gray-50 space-y-1.5"><p className="text-[9px] font-bold text-gray-400 uppercase">Recent</p>{healthData.vercel.recentDeployments.slice(0,3).map((d,i)=><div key={i} className="flex items-center gap-1.5 text-[10px]"><CircleDot size={8} className={d.state==='READY'?'text-green-500':'text-amber-500'} /><span className="text-gray-700 truncate flex-1">{d.commitMessage||'—'}</span><span className="text-gray-400">{d.branch}</span></div>)}</div>}
              </div> : <p className="text-xs text-gray-300 italic">Unavailable</p>}
            </div>
          </div>
        </div>}

        {/* DIRECTORY */}
        {activeTab === 'directory' && <div className="space-y-3 animate-in fade-in duration-200">
          {dirError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{dirError}</div>}
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2"><Search size={16} className="text-gray-400" /><input type="text" placeholder="Search merchants..." value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-400" />{dirLoading && <Loader2 size={14} className="text-gray-300 animate-spin" />}</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">{['all','unverified'].map(f=><button key={f} onClick={()=>{setPayoutFilter(f);setPage(1);fetchDirectory(1,search);}} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap ${payoutFilter===f?'bg-gray-900 text-white':'bg-gray-100 text-gray-600'}`}>{f==='all'?'All':'Unverified Payouts'}</button>)}</div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="hidden lg:block overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-gray-50/80 border-b border-gray-100 text-[9px] font-black uppercase text-gray-400 tracking-wider"><th className="px-4 py-3">Merchant</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Dates</th></tr></thead><tbody className="divide-y divide-gray-50">
              {(dirData?.stores||[]).map(s=><tr key={s.id} className="hover:bg-gray-50/60"><td className="px-4 py-3"><p className="font-bold text-gray-900">{s.storeName||'Unnamed'}</p><p className="text-[10px] text-gray-400 font-mono">@{s.handle}</p><div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500"><span className="text-gray-400 font-bold w-4">W</span><span className="truncate max-w-[120px]">{s.whatsappNumber||'—'}</span></div>{s.subaccountCode&&<div className="mt-1.5 pt-1.5 border-t border-gray-100 text-[10px]"><span className="text-gray-400 font-bold">Payout:</span> {s.payoutsVerified?<span className="text-green-600 font-bold">Verified</span>:<span className="text-amber-600 font-bold">Pending</span>}{!s.payoutsVerified&&s.subaccountCode&&<button onClick={()=>tpv(s.id,true)} disabled={approvingId===s.id} className="ml-2 text-[9px] bg-green-600 text-white px-2 py-0.5 rounded-lg">{approvingId===s.id?'...':'Approve'}</button>}</div>}</td>
              <td className="px-4 py-3 align-top"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${PLAN_C[s.plan]||PLAN_C.starter}`}>{s.plan}</span>{s.isPlanExpired&&<span className="text-[8px] font-bold text-red-600 ml-1">Expired</span>}</td>
              <td className="px-4 py-3 align-top">{!s.referredBy?<span className="text-[10px] text-gray-400 italic">Not Referred</span>:!s.referredBy?<span className="text-[10px] font-bold text-gray-500">Organic</span>:<span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{s.referredBy}</span>}</td>
              <td className="px-4 py-3 align-top text-[10px] text-gray-500"><p>Start: {s.planStartDate?new Date(s.planStartDate).toLocaleDateString('en-NG'):'—'}</p><p className={s.isPlanExpired?'text-red-500 font-bold':''}>End: {s.planEndDate?new Date(s.planEndDate).toLocaleDateString('en-NG'):'Lifetime'}</p></td>
              </tr>)}
              {!dirLoading&&(dirData?.stores||[]).length===0&&<tr><td colSpan="4" className="p-8 text-center text-gray-400 text-sm">No merchants found.</td></tr>}
            </tbody></table></div>
            <div className="block lg:hidden divide-y divide-gray-100">{(dirData?.stores||[]).map(s=><div key={s.id} className="p-3 space-y-2"><div className="flex justify-between items-start"><div className="min-w-0 flex-1"><p className="font-bold text-gray-900 text-sm truncate">{s.storeName||'Unnamed'}</p><p className="text-[10px] text-gray-400 font-mono">@{s.handle}</p></div><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${PLAN_C[s.plan]||PLAN_C.starter}`}>{s.plan}</span></div><div className="grid grid-cols-2 gap-1 text-[10px]"><span className="text-gray-500">W: {s.whatsappNumber||'—'}</span>{s.subaccountCode&&<span>{s.payoutsVerified?<span className="text-green-600 font-bold">Payout ✓</span>:<span className="text-amber-600 font-bold">Payout pending</span>}</span>}</div></div>)}</div>
            <div className="bg-gray-50/80 px-3 py-2 border-t border-gray-100 flex items-center justify-between">
              <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);fetchDirectory(p,search);}} disabled={page===1||dirLoading} className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50"><ChevronLeft size={12} /> Prev</button>
              <span className="text-[10px] font-semibold text-gray-500">Page {dirData?.meta?.currentPage||1}/{dirData?.meta?.totalPages||1}</span>
              <button onClick={()=>{const p=page+1;setPage(p);fetchDirectory(p,search);}} disabled={!dirData?.meta||page>=dirData.meta.totalPages||dirLoading} className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50">Next <ChevronRight size={12} /></button>
            </div>
          </div>
        </div>}

        {/* REFERRALS */}
        {activeTab === 'referrals' && <div className="space-y-4 animate-in fade-in duration-200">
          {refError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{refError}</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">Referral Program</h2><button onClick={fetchReferrals} disabled={refLoading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">{refLoading?<Loader2 size={12} className="animate-spin" />:<RefreshCw size={12} />} Refresh</button></div>
          {refLoading&&!refStats?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:refStats&&<>
            {refStats.highestEarner&&<div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4"><p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2">Top Referrer</p><div className="flex items-center justify-between"><div><p className="font-bold text-green-900">{refStats.highestEarner.storeName||'Unknown'}</p><p className="text-xs text-green-600">{refStats.highestEarner.totalReferrals} referrals</p>{refStats.highestEarner.email&&<p className="text-[10px] text-green-500 mt-0.5">{refStats.highestEarner.email}</p>}</div><p className="text-lg font-black text-green-700">{refStats.highestEarner.totalEarnedFormatted}</p></div></div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[
              { l: 'Total Referrals', v: refStats.totalReferrals, c: 'text-emerald-600' },
              { l: 'Total Earned', v: `NGN ${(refStats.totalRewardsEarned/100).toLocaleString()}`, c: 'text-emerald-600' },
              { l: 'Paid Out', v: `NGN ${(refStats.totalPaidOut/100).toLocaleString()}`, c: 'text-green-600' },
              { l: 'Pending Payouts', v: `NGN ${(refStats.totalPendingPayoutAmount/100).toLocaleString()}`, c: 'text-orange-600' },
            ].map(s=><div key={s.l} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{s.l}</p><p className={`text-lg font-black mt-0.5 ${s.c}`}>{s.value||s.v}</p></div>)}</div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="px-4 py-2.5 border-b border-gray-100"><h3 className="font-bold text-xs text-gray-800">Recent Rewards</h3></div><div className="divide-y divide-gray-50">{refRewards.length===0?<div className="p-6 text-center text-gray-400 text-sm">No rewards yet.</div>:refRewards.map(r=><div key={r.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 truncate">{r.referredStoreName||'Unknown'}</p><p className="text-[10px] text-gray-500">{r.plan} · {r.createdAt?new Date(r.createdAt).toLocaleDateString('en-NG'):'—'}</p></div><div className="text-right flex-shrink-0 ml-2"><p className="text-sm font-bold text-green-600">NGN {((r.rewardAmount||0)/100).toLocaleString()}</p><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status==='pending'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{r.status}</span></div></div>)}</div></div>
          </>}
        </div>}

        {/* WITHDRAWALS */}
        {activeTab === 'withdrawals' && <div className="space-y-4 animate-in fade-in duration-200">
          {wdError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{wdError}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><h2 className="font-bold text-gray-800">Withdrawal Queue</h2><div className="flex gap-1.5 overflow-x-auto pb-1">{['pending','completed','rejected','all'].map(s=><button key={s} onClick={()=>{setWdStatusFilter(s);fetchWithdrawals(s);}} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${wdStatusFilter===s?'bg-gray-900 text-white':'bg-gray-100 text-gray-600'}`}>{s[0].toUpperCase()+s.slice(1)}</button>)}</div></div>
          {wdLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="divide-y divide-gray-50">{withdrawals.length===0?<div className="p-6 text-center text-gray-400 text-sm">No withdrawal requests.</div>:withdrawals.map(w=><div key={w.id} className="px-4 py-3 hover:bg-gray-50/50"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 truncate">{w.storeName||'Unknown'}</p><div className="mt-1 space-y-0.5"><p className="flex items-center gap-1.5 text-[11px]"><span className="font-bold text-gray-900 font-mono">{w.bankAccount||'—'}</span>{w.bankAccount&&<button onClick={()=>cp(w.bankAccount,'wd-'+w.id)} className="text-gray-400 hover:text-green-600" title="Copy account number">{copiedId==='wd-'+w.id?<Check size={12} className="text-green-600" />:<Copy size={12} />}</button>}</p><p className="text-[11px] text-gray-600">{w.bankName||'—'}</p><p className="text-[11px] text-gray-600 font-medium">{w.bankAccountName||'—'}</p></div><p className="text-[10px] text-gray-400 mt-1">{w.createdAt?new Date(w.createdAt).toLocaleString('en-NG'):'—'}</p></div><div className="text-right flex-shrink-0"><p className="text-base font-black text-gray-900">NGN {((w.amount||0)/100).toLocaleString()}</p><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${w.status==='completed'?'bg-green-100 text-green-700':w.status==='rejected'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{w.status}</span>{w.status==='pending'&&<div className="flex gap-1.5 mt-1.5 justify-end"><button onClick={()=>processWithdrawal(w.id,'completed')} disabled={processingWd===w.id} className="text-[10px] font-bold bg-green-600 text-white px-2.5 py-0.5 rounded-lg disabled:opacity-50">{processingWd===w.id?'...':'Mark as Paid'}</button><button onClick={()=>{const reason=window.prompt('Reason for rejecting this payout (optional — the vendor will see it, and their balance will be restored):');if(reason!==null)processWithdrawal(w.id,'rejected',reason);}} disabled={processingWd===w.id} className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-lg disabled:opacity-50">Reject</button></div>}</div></div></div>)}</div></div>}
        </div>}

        {/* CAC */}
        {activeTab === 'cac' && <div className="space-y-4 animate-in fade-in duration-200">
          {cacError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{cacError}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><h2 className="font-bold text-gray-800">CAC Verification</h2><div className="flex gap-1.5 overflow-x-auto pb-1">{['all','verified','pending','not_submitted','rejected'].map(f=><button key={f} onClick={()=>{setCacStatusFilter(f);setCacPage(1);}} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${cacStatusFilter===f?'bg-gray-900 text-white':'bg-gray-100 text-gray-600'}`}>{f==='not_submitted'?'Not Submitted':f[0].toUpperCase()+f.slice(1)}</button>)}</div></div>
          {cacData?.stats&&<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{[{l:'Total',v:cacData.stats.total,c:'text-gray-900'},{l:'Verified',v:cacData.stats.verified,c:'text-green-600'},{l:'Pending',v:cacData.stats.pending,c:'text-amber-600'},{l:'Not Submitted',v:cacData.stats.notSubmitted,c:'text-gray-500'},{l:'Rejected',v:cacData.stats.rejected,c:'text-red-600'}].map(s=><div key={s.l} className="bg-white rounded-lg border border-gray-100 p-2.5 text-center"><p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p><p className={`text-lg font-black mt-0.5 ${s.c}`}>{s.value||s.v}</p></div>)}</div>}
          {cacLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="divide-y divide-gray-50">{(cacData?.stores||[]).length===0?<div className="p-6 text-center text-gray-400 text-sm">No merchants.</div>:cacData.stores.map(s=><div key={s.id} className="px-4 py-2.5 hover:bg-gray-50/50 flex items-center justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 truncate">{s.storeName}</p><p className="text-[10px] text-gray-400 font-mono">@{s.handle}</p></div><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${s.cacVerified?'bg-green-50 text-green-600 border-green-200':s.cacStatus==='rejected'?'bg-red-50 text-red-600 border-red-200':s.cacStatus==='pending'?'bg-amber-50 text-amber-600 border-amber-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>{s.cacStatus}</span></div>)}</div>{cacData?.total>20&&<div className="bg-gray-50/80 px-3 py-2 border-t border-gray-100 flex items-center justify-between"><button onClick={()=>setCacPage(Math.max(1,cacPage-1))} disabled={cacPage===1} className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50"><ChevronLeft size={12} /> Prev</button><span className="text-[10px] font-semibold text-gray-500">{cacPage}/{Math.ceil(cacData.total/20)}</span><button onClick={()=>setCacPage(cacPage+1)} disabled={cacPage*20>=cacData.total} className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50">Next <ChevronRight size={12} /></button></div>}</div>}
        </div>}

        {/* DOMAINS */}
        {activeTab === 'domains' && <div className="space-y-4 animate-in fade-in duration-200">
          {domainError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{domainError}</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">Custom Domains</h2><button onClick={fetchDomains} disabled={domainLoading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">{domainLoading?<Loader2 size={12} className="animate-spin" />:<RefreshCw size={12} />} Refresh</button></div>
          {domainData?.stats&&<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{[{l:'Total',v:domainData.stats.total,c:'text-gray-900'},{l:'Verified',v:domainData.stats.verified,c:'text-green-600'},{l:'Pending',v:domainData.stats.pending,c:'text-amber-600'},{l:'Failed',v:domainData.stats.failed,c:'text-red-600'}].map(s=><div key={s.l} className="bg-white rounded-lg border border-gray-100 p-2.5 text-center"><p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p><p className={`text-lg font-black mt-0.5 ${s.c}`}>{s.value||s.v}</p></div>)}</div>}
          {domainLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="divide-y divide-gray-50">{(domainData?.stores||[]).length===0?<div className="p-6 text-center text-gray-400 text-sm">No custom domains.</div>:domainData.stores.map(s=><div key={s.id} className="px-4 py-2.5 hover:bg-gray-50/50 flex items-center justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 truncate">{s.storeName}</p><p className="text-xs text-violet-600 font-mono truncate"><Link2 size={10} className="inline" /> {s.customDomain}</p></div><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${s.domainStatus==='verified'?'bg-green-50 text-green-600 border-green-200':s.domainStatus==='failed'?'bg-red-50 text-red-600 border-red-200':'bg-amber-50 text-amber-600 border-amber-200'}`}>{s.domainStatus}</span></div>)}</div>{domainData?.total>20&&<div className="bg-gray-50/80 px-3 py-2 border-t border-gray-100 flex items-center justify-between"><button onClick={()=>setDomainPage(Math.max(1,domainPage-1))} disabled={domainPage===1} className="text-[10px] font-bold bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50"><ChevronLeft size={12} /></button><span className="text-[10px] font-semibold text-gray-500">{domainPage}/{Math.ceil(domainData.total/20)}</span><button onClick={()=>setDomainPage(domainPage+1)} disabled={domainPage*20>=domainData.total} className="text-[10px] font-bold bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50"><ChevronRight size={12} /></button></div>}</div>}
        </div>}

        {/* ANNOUNCEMENTS */}
        {activeTab === 'announcements' && <div className="space-y-4 animate-in fade-in duration-200">
          {annError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{annError}</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">Announcements</h2><button onClick={fetchAnnouncements} disabled={annLoading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">{annLoading?<Loader2 size={12} className="animate-spin" />:<RefreshCw size={12} />} Refresh</button></div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Create Announcement</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"><input type="text" placeholder="Title" value={newAnn.title} onChange={e=>setNewAnn({...newAnn,title:e.target.value})} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" /><input type="text" placeholder="Message" value={newAnn.message} onChange={e=>setNewAnn({...newAnn,message:e.target.value})} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" /><select value={newAnn.type} onChange={e=>setNewAnn({...newAnn,type:e.target.value})} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none"><option value="info">Info</option><option value="warning">Warning</option><option value="promo">Promo</option></select></div><button onClick={createAnnouncement} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold">Post</button></div>
          {annLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="divide-y divide-gray-50">{announcements.length===0?<div className="p-6 text-center text-gray-400 text-sm">No announcements yet.</div>:announcements.map(a=><div key={a.id} className="px-4 py-3 hover:bg-gray-50/50 flex items-center justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-bold text-gray-900 truncate">{a.title}</p><span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${a.type==='warning'?'bg-amber-100 text-amber-700':a.type==='promo'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{a.type}</span></div><p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.message}</p><p className="text-[9px] text-gray-400 mt-0.5">{a.createdAt?new Date(a.createdAt).toLocaleDateString('en-NG'):''}</p></div><div className="flex items-center gap-2 flex-shrink-0"><button onClick={()=>toggleAnnouncement(a.id,a.active)} className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${a.active?'bg-green-500':'bg-gray-200'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${a.active?'translate-x-4':'translate-x-0'}`} /></button><button onClick={()=>deleteAnnouncement(a.id)} className="text-red-400 hover:text-red-600"><X size={14} /></button></div></div>)}</div></div>}
        </div>}

        {/* TICKETS */}
        {activeTab === 'tickets' && <div className="space-y-4 animate-in fade-in duration-200">
          {ticketError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{ticketError}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><h2 className="font-bold text-gray-800">Support Tickets</h2><div className="flex gap-1.5 overflow-x-auto pb-1">{['all','open','in_progress','resolved'].map(f=><button key={f} onClick={()=>{setTicketStatusFilter(f);setTicketPage(1);}} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${ticketStatusFilter===f?'bg-gray-900 text-white':'bg-gray-100 text-gray-600'}`}>{f==='in_progress'?'In Progress':f[0].toUpperCase()+f.slice(1)}</button>)}</div></div>
          {ticketStats&&<div className="grid grid-cols-3 gap-2">{[{l:'Open',v:ticketStats.open,c:'text-red-600'},{l:'In Progress',v:ticketStats.inProgress,c:'text-amber-600'},{l:'Resolved',v:ticketStats.resolved,c:'text-green-600'}].map(s=><div key={s.l} className="bg-white rounded-lg border border-gray-100 p-2.5 text-center"><p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p><p className={`text-lg font-black mt-0.5 ${s.c}`}>{s.value||s.v}</p></div>)}</div>}
          {ticketLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="divide-y divide-gray-50">{tickets.length===0?<div className="p-6 text-center text-gray-400 text-sm">No tickets found.</div>:tickets.map(t=><div key={t.id} className="px-4 py-3 hover:bg-gray-50/50">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 truncate">{t.message?.slice(0,80)||'No message'}{t.message?.length>80?'...':''}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  <span className="text-[10px] font-bold text-gray-500">{t.storeName||'Unknown'}</span>
                  {t.email&&<a href={`mailto:${t.email}`} className="text-[10px] text-blue-500 hover:underline">{t.email}</a>}
                  {t.whatsappNumber&&<a href={`https://wa.me/${t.whatsappNumber.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-600 hover:underline flex items-center gap-0.5"><ExternalLink size={8} /> WhatsApp</a>}
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${PLAN_C[t.plan]||PLAN_C.starter}`}>{t.plan}</span>
                  <span className="text-[9px] text-gray-400">{t.category}</span>
                  {t.storeId&&<span className="text-[8px] text-gray-300 font-mono">{t.storeId.slice(0,8)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${(t.status==='open'||!t.status)?'bg-red-50 text-red-600 border-red-200':t.status==='in_progress'?'bg-amber-50 text-amber-600 border-amber-200':'bg-green-50 text-green-600 border-green-200'}`}>{t.status||'open'}</span>
                {t.status!=='resolved'&&<button onClick={()=>updateTicket(t.id,t.status==='open'?'in_progress':'resolved')} className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-lg hover:bg-green-200">{t.status==='open'?'Start':'Resolve'}</button>}
              </div>
            </div>
            <p className="text-[10px] text-gray-400">{t.createdAt?new Date(t.createdAt).toLocaleString('en-NG'):''}</p>
          </div>)}</div></div>}
        </div>}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && <div className="space-y-4 animate-in fade-in duration-200">
          {analyticsError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{analyticsError}</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">Platform Analytics</h2><button onClick={fetchAnalytics} disabled={analyticsLoading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">{analyticsLoading?<Loader2 size={12} className="animate-spin" />:<RefreshCw size={12} />} Refresh</button></div>
          {analyticsLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:analyticsData&&<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
              {l:'Total Stores',v:analyticsData.totalStores,c:'text-gray-900'},
              {l:'Paid Stores',v:analyticsData.paidStores,c:'text-green-600'},
              {l:'Total Products',v:analyticsData.totalProducts,c:'text-blue-600'},
              {l:'Open Tickets',v:analyticsData.openTickets,c:'text-red-600'},
            ].map(s=><div key={s.l} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{s.l}</p><p className={`text-2xl font-black mt-0.5 ${s.c}`}>{s.value?.toLocaleString?.()??s.value??'—'}</p></div>)}</div>
            {topStores.length>0&&<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="px-4 py-2.5 border-b border-gray-100"><h3 className="font-bold text-xs text-gray-800">Most Viewed Stores (Top {topStores.length})</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-[9px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-50"><th className="px-4 py-2">#</th><th className="px-4 py-2">Store</th><th className="px-4 py-2">Contact</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2 text-right">Views</th><th className="px-4 py-2 text-right">Clicks</th><th className="px-4 py-2 text-right">Engagement</th></tr></thead><tbody className="divide-y divide-gray-50">{topStores.map((s,i)=><tr key={s.id} className="hover:bg-gray-50/60"><td className="px-4 py-2 font-bold text-gray-400">{i+1}</td><td className="px-4 py-2"><p className="font-bold text-gray-900 truncate max-w-[140px]">{s.storeName||'Unnamed'}</p><p className="text-[9px] text-gray-400 font-mono">@{s.handle}</p></td><td className="px-4 py-2"><p className="text-[10px] text-gray-500 truncate max-w-[120px]">{s.email||'—'}</p>{s.whatsappNumber&&<a href={`https://wa.me/${s.whatsappNumber.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-green-600 hover:underline flex items-center gap-0.5"><ExternalLink size={7} /> WA</a>}</td><td className="px-4 py-2"><span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${PLAN_C[s.plan]||PLAN_C.starter}`}>{s.plan}</span></td><td className="px-4 py-2 text-right font-bold text-gray-900">{s.totalViews.toLocaleString()}</td><td className="px-4 py-2 text-right text-gray-600">{s.totalClicks.toLocaleString()}</td><td className="px-4 py-2 text-right"><span className={`font-bold ${s.engagementRate>=50?'text-green-600':s.engagementRate>=20?'text-amber-600':'text-gray-500'}`}>{s.engagementRate}%</span></td></tr>)}</tbody></table></div></div>}
            {signupSeries.length>0&&<div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4"><h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-3">Signups (Last 30 Days)</h3><div className="flex items-end gap-0.5 h-24">{signupSeries.map((d,i)=>{const mx=Math.max(...signupSeries.map(s=>s.count),1);return <div key={i} className="flex-1 flex flex-col items-center" title={`${d.date}: ${d.count}`}><div className="w-full bg-green-500 rounded-t" style={{height:`${(d.count/mx)*100}%`,minHeight:2}} /></div>;})}</div><div className="flex justify-between mt-1"><span className="text-[8px] text-gray-400">{signupSeries[0]?.date?.slice(5)}</span><span className="text-[8px] text-gray-400">{signupSeries[signupSeries.length-1]?.date?.slice(5)}</span></div></div>}
          </>}
        </div>}

        {/* REVENUE */}
        {activeTab === 'revenue' && <div className="space-y-4 animate-in fade-in duration-200">
          {revenueError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{revenueError}</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">Revenue</h2><button onClick={fetchRevenue} disabled={revenueLoading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">{revenueLoading?<Loader2 size={12} className="animate-spin" />:<RefreshCw size={12} />} Refresh</button></div>
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl"><button onClick={()=>setRevenueTab('platform')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${revenueTab==='platform'?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}>Platform Revenue</button><button onClick={()=>setRevenueTab('stores')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${revenueTab==='stores'?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}>Store Revenue</button></div>
          {revenueLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<>
            {revenueTab==='platform'&&revenueData&&<div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Paystack Balance</p><p className="text-2xl font-black text-green-600 mt-1">{revenueData.hasApiKey?revenueData.balanceFormatted:'No API key'}</p></div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Volume</p><p className="text-2xl font-black text-gray-900 mt-1">{revenueData.hasApiKey?revenueData.totalVolumeFormatted:'—'}</p></div>
              </div>
              {revenueData.hasApiKey&&<div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Transactions</p><p className="text-xl font-black text-gray-900 mt-1">{revenueData.totalTransactions.toLocaleString()}</p></div>}
            </div>}
            {revenueTab==='stores'&&<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
              {storeRevenues.length===0?<div className="p-6 text-center text-gray-400 text-sm">No store revenue data yet.</div>:<>
                <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-[9px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-50 bg-gray-50/80"><th className="px-4 py-2">#</th><th className="px-4 py-2">Store</th><th className="px-4 py-2">Contact</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Revenue</th></tr></thead><tbody className="divide-y divide-gray-50">{storeRevenues.map((s,i)=><tr key={s.id} className="hover:bg-gray-50/60"><td className="px-4 py-2 font-bold text-gray-400">{i+1}</td><td className="px-4 py-2"><p className="font-bold text-gray-900 truncate max-w-[120px]">{s.storeName||'Unnamed'}</p></td><td className="px-4 py-2"><p className="text-[10px] text-gray-500 truncate max-w-[100px]">{s.email||'—'}</p>{s.whatsappNumber&&<a href={`https://wa.me/${s.whatsappNumber.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-green-600 hover:underline">WA</a>}</td><td className="px-4 py-2"><span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${PLAN_C[s.plan]||PLAN_C.starter}`}>{s.plan}</span></td><td className="px-4 py-2 text-right font-bold text-gray-900">{s.totalOrders}</td><td className="px-4 py-2 text-right font-bold text-green-600">{s.totalRevenueFormatted}</td></tr>)}</tbody></table></div>
              </>}
            </div>}
          </>}
        </div>}

        {/* SELLA AI USAGE */}
        {activeTab === 'sella-ai' && <div className="space-y-4 animate-in fade-in duration-200">
          {sellaError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{sellaError}</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">Sella AI — Business Partner Usage</h2><button onClick={fetchSella} disabled={sellaLoading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">{sellaLoading?<Loader2 size={12} className="animate-spin" />:<RefreshCw size={12} />} Refresh</button></div>
          {sellaLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:sellaData&&<>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
              {l:'Requests Today',v:sellaData.summary?.todayTotal,c:'text-green-600'},
              {l:'All-Time Requests',v:sellaData.summary?.allTimeTotal,c:'text-gray-900'},
              {l:'Active Vendors Today',v:sellaData.summary?.activeVendorsToday,c:'text-blue-600'},
              {l:'Vendors Ever Used',v:sellaData.summary?.vendorsEverUsed,c:'text-purple-600'},
            ].map(s=><div key={s.l} className="bg-white rounded-xl border border-gray-100 shadow-xs p-3"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{s.l}</p><p className={`text-2xl font-black mt-0.5 ${s.c}`}>{s.v?.toLocaleString?.()??s.v??'—'}</p></div>)}</div>
            <p className="text-[11px] text-gray-400">Daily limit per vendor: <span className="font-bold text-gray-600">{sellaData.dailyLimit}</span> requests.</p>
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100"><h3 className="font-bold text-xs text-gray-800">Per-Vendor Usage (Top {sellaData.stores?.length||0})</h3></div>
              {(!sellaData.stores||sellaData.stores.length===0)?<div className="p-6 text-center text-gray-400 text-sm">No Sella AI usage recorded yet.</div>:
              <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-[9px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-50 bg-gray-50/80"><th className="px-4 py-2">#</th><th className="px-4 py-2">Store</th><th className="px-4 py-2 text-right">Today</th><th className="px-4 py-2 text-right">Left Today</th><th className="px-4 py-2 text-right">All-Time</th></tr></thead><tbody className="divide-y divide-gray-50">{sellaData.stores.map((s,i)=><tr key={s.storeId} className="hover:bg-gray-50/60"><td className="px-4 py-2 font-bold text-gray-400">{i+1}</td><td className="px-4 py-2"><p className="font-bold text-gray-900 truncate max-w-[160px]">{s.businessName}</p><p className="text-[9px] text-gray-400 font-mono truncate max-w-[160px]">{s.storeId}</p></td><td className="px-4 py-2 text-right font-bold text-gray-900">{s.today}</td><td className="px-4 py-2 text-right"><span className={`font-bold ${s.remainingToday<=5?'text-red-600':s.remainingToday<=15?'text-amber-600':'text-green-600'}`}>{s.remainingToday}</span></td><td className="px-4 py-2 text-right text-gray-600">{s.allTime.toLocaleString()}</td></tr>)}</tbody></table></div>}
            </div>
          </>}
        </div>}

        {/* STORE REPORTS */}
        {activeTab === 'reports' && <div className="space-y-4 animate-in fade-in duration-200">
          {reportsError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{reportsError}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><h2 className="font-bold text-gray-800">Store Reports</h2><div className="flex gap-1.5 overflow-x-auto pb-1">{['all','pending','reviewed','resolved','dismissed'].map(f=><button key={f} onClick={()=>{setReportsStatusFilter(f);setReportsPage(1);fetchReports(1,f,reportsOffenseFilter);}} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${reportsStatusFilter===f?'bg-gray-900 text-white':'bg-gray-100 text-gray-600'}`}>{f[0].toUpperCase()+f.slice(1)}</button>)}</div></div>
          {reportsData?.stats&&<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">{[
            {l:'Total',v:reportsData.stats.total,c:'text-gray-900'},
            {l:'Pending',v:reportsData.stats.pending,c:'text-amber-600'},
            {l:'Reviewed',v:reportsData.stats.reviewed,c:'text-blue-600'},
            {l:'Resolved',v:reportsData.stats.resolved,c:'text-green-600'},
            {l:'Scam',v:reportsData.stats.scam,c:'text-red-600'},
            {l:'Non-Delivery',v:reportsData.stats.non_delivery,c:'text-orange-600'},
          ].map(s=><div key={s.l} className="bg-white rounded-lg border border-gray-100 p-2.5 text-center"><p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p><p className={`text-lg font-black mt-0.5 ${s.c}`}>{s.value||s.v}</p></div>)}</div>}
          <div className="flex gap-1.5 overflow-x-auto pb-1">{[{v:'all',l:'All Types'},{v:'scam',l:'Scam'},{v:'fake_products',l:'Fake Products'},{v:'non_delivery',l:'Non-Delivery'},{v:'identity_theft',l:'Identity Theft'},{v:'counterfeit',l:'Counterfeit'},{v:'other',l:'Other'}].map(f=><button key={f.v} onClick={()=>{setReportsOffenseFilter(f.v);setReportsPage(1);fetchReports(1,reportsStatusFilter,f.v);}} className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${reportsOffenseFilter===f.v?'bg-green-600 text-white':'bg-gray-100 text-gray-600'}`}>{f.l}</button>)}</div>
          {reportsLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="divide-y divide-gray-50">{(reportsData?.reports||[]).length===0?<div className="p-6 text-center text-gray-400 text-sm">No reports found.</div>:reportsData.reports.map(r=><div key={r.id} className="px-4 py-3 hover:bg-gray-50/50">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{r.storeUrl}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${r.offenseType==='scam'?'bg-red-50 text-red-600 border-red-200':r.offenseType==='fake_products'?'bg-amber-50 text-amber-600 border-amber-200':r.offenseType==='non_delivery'?'bg-orange-50 text-orange-600 border-orange-200':r.offenseType==='identity_theft'?'bg-purple-50 text-purple-600 border-purple-200':r.offenseType==='counterfeit'?'bg-pink-50 text-pink-600 border-pink-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>{r.offenseType.replace(/_/g,' ')}</span>
                    <span className="text-[10px] font-bold text-gray-500">by {r.reporterName}</span>
                    <span className="text-[10px] text-gray-400">via {r.whereMet?.replace(/_/g,' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${r.status==='pending'?'bg-amber-50 text-amber-600 border-amber-200':r.status==='reviewed'?'bg-blue-50 text-blue-600 border-blue-200':r.status==='resolved'?'bg-green-50 text-green-600 border-green-200':'bg-gray-100 text-gray-500 border-gray-200'}`}>{r.status}</span>
                  <button onClick={()=>{setExpandedReport(expandedReport===r.id?null:r.id);setReportNotes(r.adminNotes||'');}} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg hover:bg-gray-200">{expandedReport===r.id?'Close':'View'}</button>
                </div>
              </div>
              <p className="text-[9px] text-gray-400">{r.createdAt?new Date(r.createdAt).toLocaleString('en-NG'):''}</p>
              {expandedReport===r.id&&<div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div><span className="font-bold text-gray-500">Reporter:</span> <span className="text-gray-900">{r.reporterName}</span></div>
                  <div><span className="font-bold text-gray-500">Email:</span> <span className="text-gray-900">{r.reporterEmail}</span></div>
                  <div><span className="font-bold text-gray-500">Phone:</span> <span className="text-gray-900">{r.reporterPhone}</span></div>
                  <div><span className="font-bold text-gray-500">Met via:</span> <span className="text-gray-900 capitalize">{r.whereMet?.replace(/_/g,' ')}</span></div>
                </div>
                <div><span className="text-[10px] font-bold text-gray-500 uppercase">Description</span><p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{r.description}</p></div>
                {r.screenshotUrls?.length>0&&<div><span className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Screenshots</span><div className="flex gap-2 flex-wrap">{r.screenshotUrls.map((url,i)=><a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200 hover:border-green-400 transition-colors"><img src={url} alt={`Proof ${i+1}`} className="w-full h-full object-cover" /></a>)}</div></div>}
                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Admin Notes</label><textarea value={reportNotes} onChange={e=>setReportNotes(e.target.value)} placeholder="Add notes about this report..." rows={2} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none" /></div>
                <div className="flex flex-wrap gap-2">{[
                  {s:'reviewed',l:'Mark Reviewed',c:'bg-blue-600 hover:bg-blue-700 text-white'},
                  {s:'resolved',l:'Mark Resolved',c:'bg-green-600 hover:bg-green-700 text-white'},
                  {s:'dismissed',l:'Dismiss',c:'bg-gray-200 hover:bg-gray-300 text-gray-700'},
                  {s:'pending',l:'Reopen',c:'bg-amber-100 hover:bg-amber-200 text-amber-700'},
                ].map(b=><button key={b.s} onClick={()=>updateReportStatus(r.id,b.s,reportNotes)} disabled={updatingReport===r.id} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 ${b.c}`}>{updatingReport===r.id?'...':b.l}</button>)}</div>
              </div>}
            </div>)}</div>
            {reportsData?.total>20&&<div className="bg-gray-50/80 px-3 py-2 border-t border-gray-100 flex items-center justify-between"><button onClick={()=>{const p=Math.max(1,reportsPage-1);setReportsPage(p);fetchReports(p,reportsStatusFilter,reportsOffenseFilter);}} disabled={reportsPage===1} className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50"><ChevronLeft size={12} /> Prev</button><span className="text-[10px] font-semibold text-gray-500">{reportsPage}/{Math.ceil(reportsData.total/20)}</span><button onClick={()=>{const p=reportsPage+1;setReportsPage(p);fetchReports(p,reportsStatusFilter,reportsOffenseFilter);}} disabled={reportsPage*20>=reportsData.total} className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50">Next <ChevronRight size={12} /></button></div>}
          </div>}
        </div>}

        {/* JOB LISTINGS */}
        {activeTab === 'jobs' && <div className="space-y-4 animate-in fade-in duration-200">
          {jobsError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{jobsError}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><h2 className="font-bold text-gray-800">Job Listings</h2><div className="flex gap-1.5 overflow-x-auto pb-1">{['all','pending','approved','rejected'].map(f=><button key={f} onClick={()=>{setJobsStatusFilter(f);fetchJobs(f);}} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${jobsStatusFilter===f?'bg-gray-900 text-white':'bg-gray-100 text-gray-600'}`}>{f[0].toUpperCase()+f.slice(1)}</button>)}</div></div>
          {jobsData?.stats&&<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{[
            {l:'Total',v:jobsData.stats.total,c:'text-gray-900'},
            {l:'Pending',v:jobsData.stats.pending,c:'text-amber-600'},
            {l:'Approved',v:jobsData.stats.approved,c:'text-green-600'},
            {l:'Rejected',v:jobsData.stats.rejected,c:'text-red-600'},
          ].map(s=><div key={s.l} className="bg-white rounded-lg border border-gray-100 p-2.5 text-center"><p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p><p className={`text-lg font-black mt-0.5 ${s.c}`}>{s.v}</p></div>)}</div>}
          {jobsLoading?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="divide-y divide-gray-50">{(jobsData?.jobs||[]).length===0?<div className="p-6 text-center text-gray-400 text-sm">No job listings found.</div>:jobsData.jobs.map(j=><div key={j.id} className="px-4 py-3 hover:bg-gray-50/50">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[220px]">{j.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                    <span className="text-[10px] font-bold text-gray-500">{j.businessName}</span>
                    <span className="text-[10px] text-gray-400">· {j.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${j.status==='pending'?'bg-amber-50 text-amber-600 border-amber-200':j.status==='approved'?'bg-green-50 text-green-600 border-green-200':'bg-red-50 text-red-600 border-red-200'}`}>{j.status}</span>
                  <button onClick={()=>{setExpandedJob(expandedJob===j.id?null:j.id);setRejectingJob(null);setRejectReason('');}} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg hover:bg-gray-200">{expandedJob===j.id?'Close':'View'}</button>
                </div>
              </div>
              <p className="text-[9px] text-gray-400">{j.createdAt?new Date(j.createdAt).toLocaleString('en-NG'):''}</p>
              {expandedJob===j.id&&<div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div><span className="font-bold text-gray-500">Business:</span> <span className="text-gray-900">{j.businessName}</span> {j.storeSlug&&<a href={`/${j.storeSlug}`} target="_blank" rel="noopener noreferrer" className="text-green-600 underline ml-1">view store</a>}</div>
                  <div><span className="font-bold text-gray-500">Category:</span> <span className="text-gray-900 capitalize">{j.category?.replace(/_/g,' ')}</span></div>
                  <div><span className="font-bold text-gray-500">Type:</span> <span className="text-gray-900 capitalize">{j.jobType?.replace(/_/g,' ')}</span></div>
                  <div><span className="font-bold text-gray-500">Pay:</span> <span className="text-gray-900">{j.pay}</span></div>
                  <div><span className="font-bold text-gray-500">Location:</span> <span className="text-gray-900">{j.location}</span></div>
                  <div><span className="font-bold text-gray-500">Timeline:</span> <span className="text-gray-900">{j.availabilityTimeline}</span></div>
                </div>
                <div><span className="text-[10px] font-bold text-gray-500 uppercase">Must-Haves</span><p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{j.mustHaves}</p></div>
                <div><span className="text-[10px] font-bold text-gray-500 uppercase">Description</span><p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{j.description}</p></div>
                {j.imageUrl&&<div><span className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Image</span><a href={j.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded-xl overflow-hidden border border-gray-200 hover:border-green-400 transition-colors"><img src={j.imageUrl} alt={j.title} className="w-full h-full object-cover" /></a></div>}
                {j.status==='rejected'&&j.rejectionReason&&<div className="p-2.5 bg-red-50 border border-red-100 rounded-lg"><span className="text-[10px] font-bold text-red-700 uppercase">Previous Rejection Reason</span><p className="text-xs text-red-600 mt-0.5">{j.rejectionReason}</p></div>}

                {j.status==='pending'&&<div className="space-y-2">
                  {rejectingJob===j.id?<div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Rejection Reason (required)</label>
                    <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Explain what the vendor needs to fix..." rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={()=>updateJobStatus(j.id,'rejected',rejectReason)} disabled={updatingJob===j.id||!rejectReason.trim()} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">{updatingJob===j.id?'...':'Confirm Reject'}</button>
                      <button onClick={()=>{setRejectingJob(null);setRejectReason('');}} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700">Cancel</button>
                    </div>
                  </div>:<div className="flex flex-wrap gap-2">
                    <button onClick={()=>updateJobStatus(j.id,'approved')} disabled={updatingJob===j.id} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">{updatingJob===j.id?'...':'Approve'}</button>
                    <button onClick={()=>setRejectingJob(j.id)} disabled={updatingJob===j.id} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50">Reject</button>
                  </div>}
                </div>}
              </div>}
            </div>)}</div>
          </div>}
        </div>}

        {/* BLOG */}
        {activeTab === 'blog' && <BlogAdmin token={token} adminUid={user?.uid} />}

        {/* TEAM */}
        {activeTab === 'admins' && <div className="space-y-4 animate-in fade-in duration-200">
          {adminError&&<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">{adminError}</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">Admin Team</h2><div className="flex gap-2"><button onClick={()=>setShowCreateAdmin(!showCreateAdmin)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-bold">{showCreateAdmin?'Cancel':'+ New Admin'}</button><button onClick={fetchAdmins} disabled={adminLoading} className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-200">{adminLoading?<Loader2 size={12} className="animate-spin" />:<RefreshCw size={12} />}</button></div></div>
          {showCreateAdmin&&<div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 space-y-3"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Create New Admin</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input type="text" placeholder="Full Name" value={newAdminName} onChange={e=>setNewAdminName(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" /><input type="email" placeholder="Email" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" /><input type="password" placeholder="Password (min 6 chars)" value={newAdminPass} onChange={e=>setNewAdminPass(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" /><select value={newAdminRole} onChange={e=>setNewAdminRole(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"><option value="super_admin">Super Admin</option><option value="finance">Finance</option><option value="support">Support</option><option value="operations">Operations</option><option value="marketing">Marketing</option></select></div><button onClick={createAdmin} disabled={creatingAdmin||!newAdminEmail.trim()||!newAdminPass} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50">{creatingAdmin?'Creating...':'Create Admin'}</button></div>}
          {adminLoading&&adminList.length===0?<div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-600" size={24} /></div>:<div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden"><div className="divide-y divide-gray-50">{adminList.length===0?<div className="p-6 text-center text-gray-400 text-sm">No admins found.</div>:adminList.map(a=><div key={a.id} className="px-4 py-3 hover:bg-gray-50/50"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div className="min-w-0"><p className="text-xs font-bold text-gray-900 font-mono truncate">{a.id}</p>{a.email&&<p className="text-[10px] text-gray-500 mt-0.5">{a.email}</p>}<p className="text-[10px] text-gray-400">By {a.assignedBy||'—'} · {a.assignedAt?new Date(a.assignedAt).toLocaleDateString('en-NG'):''}</p></div><div className="flex items-center gap-2 flex-shrink-0"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${a.role==='super_admin'?'bg-gray-900 text-white border-gray-900':a.role==='finance'?'bg-green-50 text-green-700 border-green-200':a.role==='operations'?'bg-purple-50 text-purple-700 border-purple-200':a.role==='support'?'bg-cyan-50 text-cyan-700 border-cyan-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>{getRoleLabel(a.role)}</span><span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${a.active!==false?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{a.active!==false?'Active':'Off'}</span></div></div></div>)}</div></div>}
        </div>}
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Shield size={16} className="text-green-600 flex-shrink-0" />
                <span className="font-black text-gray-900 text-sm tracking-tight truncate">Operations Console</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0" aria-label="Close menu"><X size={18} /></button>
            </div>
            <p className="px-4 pt-3 text-[10px] font-bold text-green-600 uppercase tracking-wider">{getRoleLabel(adminRole)}</p>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {ADMIN_TAB_GROUPS.map(group => {
                const groupTabs = at.filter(t => group.ids.includes(t.id));
                if (!groupTabs.length) return null;
                return (
                  <div key={group.label}>
                    <p className="px-2 pb-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-400">{group.label}</p>
                    <div className="space-y-0.5">
                      {groupTabs.map(tab => {
                        const I = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <I size={16} className="flex-shrink-0" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
