import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GISMap } from './GISMap';
import { LocationDrawer } from './LocationDrawer';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  Truck,
  Layers,
  MapPin,
  Navigation,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Sliders,
  BellRing,
  Send,
  Plus,
  Trash2,
  Compass,
  Hospital,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  XCircle,
  Activity
} from 'lucide-react';

import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { VillageIsolationImpact, ReportCluster, EmergencyContact, SOSIncident, ProviderStatusResponse, NotificationDispatch } from '../types';

export const AuthorityCommandView: React.FC = () => {
  const {
    overview,
    sosIncidents,
    citizenReports,
    emergencyContacts,
    alertConfig,
    alertHistory,
    setSelectedDistrict,
    setOpenDrawer,
    refreshData,
    acknowledgeSOS,
    escalateSOS,
    resolveSOS,
    updateAlertConfig,
    refreshContacts,
    sendManualAlert,
    t
  } = useApp();

  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'MAP' | 'SOS_QUEUE' | 'REPORT_VERIFICATION' | 'ISOLATION_STUDIO' | 'EMERGENCY_CONTACTS' | 'ALERT_HISTORY'>('MAP');
  const [isolationData, setIsolationData] = useState<VillageIsolationImpact[]>([]);
  const [reportClusters, setReportClusters] = useState<ReportCluster[]>([]);
  const [expandedSOSId, setExpandedSOSId] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null);
  const [diagnosticsList, setDiagnosticsList] = useState<NotificationDispatch[]>([]);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  // Jurisdiction Filters
  const [sosJurisdictionFilter, setSosJurisdictionFilter] = useState<string>('ALL');
  const [reportJurisdictionFilter, setReportJurisdictionFilter] = useState<string>('ALL');

  // Controlled Test Email Recipient Selection Modal State
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [recipientModalStep, setRecipientModalStep] = useState<'SELECT' | 'CONFIRM' | 'SENDING' | 'RESULT'>('SELECT');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [customRecipientEmail, setCustomRecipientEmail] = useState('');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [customRecipientsList, setCustomRecipientsList] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [testEmailResultSummary, setTestEmailResultSummary] = useState<any>(null);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // Acknowledge Modal State

  const defaultOfficerTitle = user?.name 
    ? `${user.name} (${user.role.toUpperCase()})` 
    : 'Insp. R. Bora (SDRF Lead)';
  const [ackModalSOS, setAckModalSOS] = useState<SOSIncident | null>(null);
  const [ackOfficerName, setAckOfficerName] = useState(defaultOfficerTitle);
  const [ackNotes, setAckNotes] = useState('Control Room acknowledged. Team dispatched to sector.');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  // Escalate Modal State
  const [escModalSOS, setEscModalSOS] = useState<SOSIncident | null>(null);
  const [escTargetLevel, setEscTargetLevel] = useState<number>(2);
  const [escReason, setEscReason] = useState('Hazard severity exceeding local SDRF sector capacity.');
  const [isSubmittingEsc, setIsSubmittingEsc] = useState(false);

  // Resolve Modal State
  const [resModalSOS, setResModalSOS] = useState<SOSIncident | null>(null);
  const [resOfficerName, setResOfficerName] = useState(defaultOfficerTitle);
  const [resNotes, setResNotes] = useState('Civilians safely extracted. Roadside slope stabilizing.');
  const [resTeam, setResTeam] = useState('SDRF Quick Reaction Force (Unit 04)');
  const [isSubmittingRes, setIsSubmittingRes] = useState(false);

  // Manual Broadcast Modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastDistrict, setBroadcastDistrict] = useState(user?.jurisdiction || 'Dima Hasao');
  const [broadcastState, setBroadcastState] = useState('Assam');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'CRITICAL' | 'WARNING' | 'WATCH'>('CRITICAL');
  const [broadcastMessage, setBroadcastMessage] = useState('URGENT: Flash rockfall risk on NH-27. All civilian traffic suspend movement immediately.');
  const [broadcastLevel, setBroadcastLevel] = useState<number>(1);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Add Contact Modal
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('SDRF Field Officer');
  const [newContactPhone, setNewContactPhone] = useState('+91 94350 ');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactLevel, setNewContactLevel] = useState(1);

  // Filter State
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('ALL');

  // Real-time ticking clock for escalation countdown
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadProviderStatus = async () => {
    try {
      const res = await api.getProviderStatus();
      setProviderStatus(res);
    } catch {}
  };

  const loadDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    try {
      const res = await api.getNotificationDiagnostics(50);
      setDiagnosticsList(res.dispatches || []);
    } catch (e) {
      console.error('Failed to load diagnostics', e);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    api.getVillageIsolationAnalysis().then(setIsolationData);
    api.getReportClusters().then(setReportClusters);
    loadProviderStatus();
  }, []);

  const openSOSCount = sosIncidents.filter(s => s.status !== 'RESOLVED' && s.status !== 'CANCELLED').length;

  // --- Controlled Test Email Recipient Selection Handlers ---
  const openRecipientModal = (preselectContact?: EmergencyContact) => {
    if (preselectContact) {
      setSelectedRecipientIds(new Set([preselectContact.id]));
    } else if (emergencyContacts.length > 0) {
      // Default behavior: Exactly ONE recipient selected
      setSelectedRecipientIds(new Set([emergencyContacts[0].id]));
    } else {
      setSelectedRecipientIds(new Set());
    }
    setRecipientModalStep('SELECT');
    setRecipientSearchQuery('');
    setCustomRecipientEmail('');
    setCustomRecipientName('');
    setTestEmailResultSummary(null);
    setIsSendingTestEmail(false);
    setShowRecipientModal(true);
  };


  const toggleRecipientSelection = (id: string) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (filteredContacts: EmergencyContact[]) => {
    const filteredIds = filteredContacts.map(c => c.id);
    const allSelected = filteredIds.every(id => selectedRecipientIds.has(id));
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filteredIds.forEach(id => next.delete(id));
      } else {
        filteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleAddCustomRecipient = () => {
    const email = customRecipientEmail.trim();
    if (!email || !email.includes('@')) return;
    const customId = `CUSTOM-${Date.now()}`;
    const name = customRecipientName.trim() || 'Authorized Test Recipient';
    const newEntry = { id: customId, name, email, role: 'Direct Verification Recipient' };
    setCustomRecipientsList(prev => [...prev, newEntry]);
    setSelectedRecipientIds(prev => new Set([...prev, customId]));
    setCustomRecipientEmail('');
    setCustomRecipientName('');
  };

  const getSelectedRecipientsList = () => {
    const list: Array<{ email: string; name: string; contact_id?: string; role: string; level: number }> = [];
    emergencyContacts.forEach(c => {
      if (selectedRecipientIds.has(c.id) && c.email) {
        list.push({
          email: c.email,
          name: c.name,
          contact_id: c.id,
          role: c.role,
          level: c.escalation_level
        });
      }
    });
    customRecipientsList.forEach(cr => {
      if (selectedRecipientIds.has(cr.id) && cr.email) {
        list.push({
          email: cr.email,
          name: cr.name,
          role: cr.role,
          level: 1
        });
      }
    });
    return list;
  };

  const handleProceedToConfirm = () => {
    if (getSelectedRecipientsList().length === 0) return;
    setRecipientModalStep('CONFIRM');
  };

  const handleExecuteSendTestEmail = async () => {
    const targets = getSelectedRecipientsList();
    if (targets.length === 0) return;

    setRecipientModalStep('SENDING');
    setIsSendingTestEmail(true);

    try {
      const res = await api.sendTestEmail({
        recipients: targets,
        message: 'Official verification email confirming controlled Brevo transactional delivery to selected recipients.'
      });
      setTestEmailResultSummary(res);
      setRecipientModalStep('RESULT');
    } catch (e: any) {
      setTestEmailResultSummary({
        status: 'FAILED',
        recipient_count: targets.length,
        success_count: 0,
        failure_count: targets.length,
        dispatches: targets.map(t => ({
          recipient: t.email,
          name: t.name,
          status: 'FAILED',
          response: e?.message || 'Dispatch error'
        }))
      });
      setRecipientModalStep('RESULT');
    } finally {
      setIsSendingTestEmail(false);
      await refreshData();
    }
  };

  const handleAcknowledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ackModalSOS) return;
    setIsSubmittingAck(true);
    await acknowledgeSOS(ackModalSOS.id, ackOfficerName, ackNotes);
    setIsSubmittingAck(false);
    setAckModalSOS(null);
    await refreshData();
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escModalSOS) return;
    setIsSubmittingEsc(true);
    await escalateSOS(escModalSOS.id, escTargetLevel, escReason);
    setIsSubmittingEsc(false);
    setEscModalSOS(null);
    await refreshData();
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resModalSOS) return;
    setIsSubmittingRes(true);
    await resolveSOS(resModalSOS.id, resOfficerName, resNotes, resTeam);
    setIsSubmittingRes(false);
    setResModalSOS(null);
    await refreshData();
  };

  const handleManualBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);
    await sendManualAlert({
      title: `EMERGENCY ALERT: ${broadcastDistrict.toUpperCase()}`,
      severity: broadcastSeverity,
      district: broadcastDistrict,
      state: broadcastState,
      message: broadcastMessage,
      escalation_level: broadcastLevel,
      channels: ['EMAIL', 'DASHBOARD']
    });
    setIsBroadcasting(false);
    setShowBroadcastModal(false);
    await refreshData();
  };

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createEmergencyContact({
      name: newContactName,
      role: newContactRole,
      phone: newContactPhone,
      email: newContactEmail,
      escalation_level: newContactLevel,
      is_enabled: true,
      email_enabled: true,
      in_app_enabled: true,
      priority_order: 1
    });
    await refreshContacts();
    setShowAddContactModal(false);
    setNewContactName('');
    setNewContactEmail('');
  };

  const handleToggleContactChannel = async (contact: EmergencyContact, field: 'email_enabled' | 'in_app_enabled' | 'is_enabled') => {
    await api.updateEmergencyContact(contact.id, { [field]: !contact[field] });
    await refreshContacts();
  };

  const handleDeleteContact = async (contactId: string) => {
    if (confirm('Delete this emergency contact?')) {
      await api.deleteEmergencyContact(contactId);
      await refreshContacts();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 w-full overflow-hidden bg-[#0b0f19]">
      {/* Top Operational KPI Bar */}
      <div className="bg-[#111827] border-b border-[#334155] px-4 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs shrink-0">
        {/* Critical Zones */}
        <div className="bg-[#162032] p-2 rounded-lg border border-red-900/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400">{t('kpi_critical_zones')}</div>
            <div className="text-base font-bold text-red-400">
              {overview?.active_critical_zones || 0} {t('districts_unit')}
            </div>
          </div>
          <ShieldAlert className="w-4 h-4 text-red-500" />
        </div>

        {/* Warning Zones */}
        <div className="bg-[#162032] p-2 rounded-lg border border-orange-900/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400">{t('kpi_warning_zones')}</div>
            <div className="text-base font-bold text-orange-400">
              {overview?.active_warning_zones || 0} {t('districts_unit')}
            </div>
          </div>
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        </div>

        {/* Active SOS Beacons */}
        <div
          onClick={() => setActiveTab('SOS_QUEUE')}
          className="bg-[#162032] p-2 rounded-lg border border-red-800 flex items-center justify-between cursor-pointer hover:border-red-500 transition"
        >
          <div>
            <div className="text-[10px] text-slate-400">Open SOS Beacons</div>
            <div className="text-base font-bold text-red-400 flex items-center space-x-1">
              <span>{openSOSCount}</span>
              {openSOSCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
            </div>
          </div>
          <Radio className="w-4 h-4 text-red-400" />
        </div>

        {/* Live Command WebSockets Status */}
        <div
          onClick={() => setActiveTab('ALERT_HISTORY')}
          className="bg-[#162032] p-2 rounded-lg border border-slate-700 flex items-center justify-between cursor-pointer hover:border-sky-500 transition"
        >
          <div>
            <div className="text-[10px] text-slate-400">Command WebSockets</div>
            <div className="text-xs font-bold flex items-center space-x-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-400">
                ACTIVE (LIVE)
              </span>
            </div>
          </div>
          <Activity className="w-4 h-4 text-sky-400" />
        </div>

        {/* Brevo Email Provider Status */}
        <div
          onClick={() => setActiveTab('EMERGENCY_CONTACTS')}
          className="bg-[#162032] p-2 rounded-lg border border-slate-700 flex items-center justify-between cursor-pointer hover:border-teal-500 transition"
        >
          <div>
            <div className="text-[10px] text-slate-400">Brevo Email Gateway</div>
            <div className="text-xs font-bold flex items-center space-x-1 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${providerStatus?.email.is_configured ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={providerStatus?.email.is_configured ? 'text-emerald-400' : 'text-red-400'}>
                {providerStatus?.email.is_configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
              </span>
            </div>
          </div>
          <Mail className="w-4 h-4 text-teal-400" />
        </div>

        {/* Demo Mode & Alert Automation */}
        <div
          onClick={() => setActiveTab('EMERGENCY_CONTACTS')}
          className="bg-[#162032] p-2 rounded-lg border border-slate-700 flex items-center justify-between cursor-pointer hover:border-sky-500 transition"
        >
          <div>
            <div className="text-[10px] text-slate-400">Alert Automation</div>
            <div className="text-xs font-bold flex items-center space-x-1 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${alertConfig?.automated_risk_alerting_active ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={alertConfig?.automated_risk_alerting_active ? 'text-emerald-400' : 'text-amber-400'}>
                {alertConfig?.automated_risk_alerting_active ? 'ACTIVE (75%)' : 'PAUSED'}
              </span>
            </div>
          </div>
          <BellRing className="w-4 h-4 text-sky-400" />
        </div>
      </div>

      {/* Operational Broadcast & Infrastructure Status Bar */}
      <div className="bg-[#0a0e17] border-b border-[#1f293d] px-4 py-1.5 flex flex-wrap items-center justify-between text-xs shrink-0 gap-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="px-3 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded text-[11px] font-bold shadow transition cursor-pointer flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Manual Emergency Broadcast</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${providerStatus?.email.is_configured ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            <span className="text-slate-300">Brevo Email: <strong className={providerStatus?.email.is_configured ? 'text-emerald-400' : 'text-red-400'}>{providerStatus?.email.is_configured ? 'ACTIVE' : 'NOT CONFIGURED'}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Live In-App: <strong className="text-emerald-400">CONNECTED</strong></span>
          </div>
        </div>
      </div>

      {/* Dedicated Sub-View Navigation Strip */}
      <div className="bg-[#0f172a] border-b border-[#334155]/80 px-4 py-1.5 flex items-center justify-between text-xs z-20 shrink-0">
        <div className="flex items-center space-x-1.5 bg-[#162032] p-1 rounded-xl border border-[#334155] overflow-x-auto">
          <button
            onClick={() => setActiveTab('MAP')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
              activeTab === 'MAP' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('tab_gis_command')}
          </button>
          <button
            onClick={() => setActiveTab('SOS_QUEUE')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'SOS_QUEUE' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Emergency SOS & Escalation ({openSOSCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('REPORT_VERIFICATION')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
              activeTab === 'REPORT_VERIFICATION' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('tab_citizen_triage')} ({citizenReports.length})
          </button>
          <button
            onClick={() => setActiveTab('ISOLATION_STUDIO')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ISOLATION_STUDIO' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{t('tab_isolation_studio')} ({isolationData.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('EMERGENCY_CONTACTS')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'EMERGENCY_CONTACTS' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Admin, Gateways & Contacts ({emergencyContacts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ALERT_HISTORY')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ALERT_HISTORY' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Dispatch Audit Log ({alertHistory.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {user && (
            <div className="hidden md:flex items-center space-x-2 bg-[#162032] border border-[#334155] px-2.5 py-1 rounded-lg text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-200 font-semibold">{user.name || user.email}</span>
              <span className="text-slate-500 font-mono">&bull;</span>
              <span className="text-amber-400 font-mono">{user.badge_number || user.role.toUpperCase()}</span>
              {user.jurisdiction && (
                <>
                  <span className="text-slate-500 font-mono">&bull;</span>
                  <span className="text-emerald-400 font-medium">{user.jurisdiction}</span>
                </>
              )}
            </div>
          )}

          <button
            onClick={async () => {
              await refreshData();
              await loadProviderStatus();
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
            title="Refresh All Feeds"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 min-w-0 w-full">
        <div className="flex-1 flex flex-col relative h-full min-h-0 min-w-0 w-full overflow-hidden">
          {activeTab === 'MAP' && <GISMap />}

          {/* Upgraded SOS Queue & Escalation Hub */}
          {activeTab === 'SOS_QUEUE' && (() => {
            const availableDistricts = Array.from(new Set(sosIncidents.map(s => s.district).filter(Boolean)));
            const displaySOS = sosJurisdictionFilter === 'ALL'
              ? sosIncidents
              : sosIncidents.filter(s => s.district?.toLowerCase() === sosJurisdictionFilter.toLowerCase());

            return (
              <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4 text-slate-100">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-700 pb-3 gap-2">
                  <div>
                    <h2 className="text-lg font-bold flex items-center space-x-2 text-red-400">
                      <Radio className="w-5 h-5" />
                      <span>Emergency SOS & Rapid Response Escalation Hub</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time multi-tier command grid. Beacons auto-escalate across Level 1 &rarr; Level 2 &rarr; Level 3 every {alertConfig?.escalation_timeout_seconds || 120}s until acknowledged.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Jurisdiction Filter */}
                    <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <select
                        value={sosJurisdictionFilter}
                        onChange={(e) => setSosJurisdictionFilter(e.target.value)}
                        className="bg-transparent text-white text-xs border-none outline-none cursor-pointer"
                      >
                        <option value="ALL" className="bg-slate-900 text-white">All Jurisdictions ({sosIncidents.length})</option>
                        {user?.jurisdiction && (
                          <option value={user.jurisdiction} className="bg-slate-900 text-emerald-300 font-bold">
                            My Jurisdiction: {user.jurisdiction}
                          </option>
                        )}
                        {availableDistricts
                          .filter(d => d !== user?.jurisdiction)
                          .map(d => (
                            <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {displaySOS.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-[#162032] rounded-2xl border border-slate-700 space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <div className="font-bold text-base text-white">All Emergency Queues Clear</div>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {sosJurisdictionFilter === 'ALL'
                        ? 'No open SOS beacons awaiting triage. Live SOS distress beacons submitted by citizens will appear here in real-time.'
                        : `No SOS distress beacons pending in jurisdiction ${sosJurisdictionFilter}. Switch filter to "All Jurisdictions" to see total queue.`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-12">
                    {displaySOS.map((sos) => {
                    const isExpanded = expandedSOSId === sos.id;
                    const escLevel = sos.current_escalation_level || 1;

                    // Compute escalation countdown
                    const createdAtMs = new Date(sos.created_at).getTime();
                    const timeoutSecs = alertConfig?.escalation_timeout_seconds || 120;
                    const elapsedSecs = Math.floor((nowTimestamp - createdAtMs) / 1000);
                    const remainingSecs = Math.max(0, timeoutSecs - (elapsedSecs % timeoutSecs));
                    const isPendingAck = sos.status === 'NEW' || sos.status === 'AWAITING_ACKNOWLEDGEMENT' || sos.status === 'ESCALATED';

                    return (
                      <div
                        key={sos.id}
                        className={`bg-[#162032] p-5 rounded-2xl border shadow-xl transition space-y-4 ${
                          sos.status === 'RESOLVED'
                            ? 'border-slate-800 opacity-70'
                            : escLevel >= 3
                            ? 'border-purple-500/90 shadow-purple-950/50'
                            : escLevel === 2
                            ? 'border-red-500/90 shadow-red-950/50'
                            : 'border-amber-500/80'
                        }`}
                      >
                        {/* Header Badge Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs text-red-400">{sos.id}</span>

                            {/* Escalation Level Badge */}
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                              escLevel >= 3
                                ? 'bg-purple-950 text-purple-300 border border-purple-500 animate-pulse'
                                : escLevel === 2
                                ? 'bg-red-950 text-red-300 border border-red-500'
                                : 'bg-amber-950 text-amber-300 border border-amber-600'
                            }`}>
                              LEVEL {escLevel}: {
                                escLevel === 1 ? 'Primary Response (SDRF / DDMA)' :
                                escLevel === 2 ? 'District & State Leadership' :
                                'Apex Command (NDRF / Chief Sec)'
                              }
                            </span>

                            {/* Status Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              sos.status === 'ACKNOWLEDGED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : sos.status === 'RESOLVED'
                                ? 'bg-slate-800 text-slate-400'
                                : sos.status === 'ESCALATED'
                                ? 'bg-purple-950 text-purple-300 border border-purple-600'
                                : 'bg-red-950 text-red-400 border border-red-700 animate-pulse'
                            }`}>
                              {sos.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="text-right text-[11px] text-slate-400 font-mono">
                            {new Date(sos.created_at).toLocaleTimeString()} &bull; ({sos.latitude.toFixed(4)}, {sos.longitude.toFixed(4)})
                          </div>
                        </div>

                        {/* Location and distress text */}
                        <div className="space-y-1">
                          <div className="text-base font-bold text-white flex items-center space-x-2">
                            <span>{sos.district}, {sos.state}</span>
                            <span className="text-xs text-slate-400 font-normal">
                              &bull; {sos.people_affected} {sos.people_affected > 1 ? 'people trapped' : 'person in distress'}
                            </span>
                            {sos.contact_phone && (
                              <span className="text-xs text-sky-400 font-normal">
                                &bull; Phone: {sos.contact_phone}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            {sos.message}
                          </p>
                        </div>

                        {/* Auto-Escalation Countdown Progress Bar */}
                        {isPendingAck && escLevel < (alertConfig?.max_escalation_level || 3) && (
                          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-red-950 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-red-400" />
                                <span>Auto-Escalation Timer to <strong>Level {escLevel + 1}</strong></span>
                              </span>
                              <strong className="text-red-400 font-mono">{remainingSecs}s remaining</strong>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-red-600 to-amber-500 h-full transition-all duration-1000"
                                style={{ width: `${((timeoutSecs - remainingSecs) / timeoutSecs) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Acknowledgement / Resolution Metadata */}
                        {sos.acknowledged_at && (
                          <div className="text-xs bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded-lg flex items-center justify-between text-emerald-300">
                            <div className="flex items-center space-x-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>
                                Acknowledged by <strong>{sos.acknowledged_by || 'Officer'}</strong>: "{sos.acknowledgement_notes || 'Confirmed'}"
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {new Date(sos.acknowledged_at).toLocaleTimeString()}
                            </span>
                          </div>
                        )}

                        {/* Attached Risk Context Expander */}
                        {sos.risk_context && (
                          <div>
                            <button
                              onClick={() => setExpandedSOSId(isExpanded ? null : sos.id)}
                              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1 cursor-pointer"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Hide Attached Risk & Infrastructure Context' : 'View Attached Live Risk Context & Nearby Facilities'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 bg-[#111827] border border-slate-700 p-4 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                  <div className="bg-[#1e293b] p-2 rounded">
                                    <span className="text-slate-400 block text-[10px]">Landslide Risk</span>
                                    <strong className="text-red-400">
                                      {sos.risk_context.current_risk || 'CRITICAL'} ({((sos.risk_context.probability || 0.84) * 100).toFixed(0)}%)
                                    </strong>
                                  </div>
                                  <div className="bg-[#1e293b] p-2 rounded">
                                    <span className="text-slate-400 block text-[10px]">24h Rainfall</span>
                                    <strong className="text-slate-200">{sos.risk_context.rainfall_24h_mm || 88.5} mm</strong>
                                  </div>
                                  <div className="bg-[#1e293b] p-2 rounded">
                                    <span className="text-slate-400 block text-[10px]">Soil Saturation</span>
                                    <strong className="text-slate-200">{sos.risk_context.soil_moisture_pct || 74}%</strong>
                                  </div>
                                  <div className="bg-[#1e293b] p-2 rounded">
                                    <span className="text-slate-400 block text-[10px]">Model Confidence</span>
                                    <strong className="text-sky-400">{((sos.risk_context.confidence || 0.94) * 100).toFixed(0)}%</strong>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {sos.risk_context.nearest_hospital && (
                                    <div className="bg-[#1e293b] p-2.5 rounded flex items-center space-x-2 text-[11px]">
                                      <Hospital className="w-4 h-4 text-sky-400 shrink-0" />
                                      <div>
                                        <div className="font-bold text-slate-200">{sos.risk_context.nearest_hospital.name}</div>
                                        <div className="text-[10px] text-slate-400">
                                          Distance: ~{sos.risk_context.nearest_hospital.distance_km} km &bull; Beds: {sos.risk_context.nearest_hospital.beds || 50}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {sos.risk_context.nearest_shelter && (
                                    <div className="bg-[#1e293b] p-2.5 rounded flex items-center space-x-2 text-[11px]">
                                      <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                                      <div>
                                        <div className="font-bold text-slate-200">{sos.risk_context.nearest_shelter.name}</div>
                                        <div className="text-[10px] text-slate-400">
                                          Distance: ~{sos.risk_context.nearest_shelter.distance_km} km &bull; Cap: {sos.risk_context.nearest_shelter.capacity || 200}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons Bar */}
                        <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-slate-400">
                            Assigned Response Team: <strong className="text-sky-300">{sos.assigned_team || 'Pending SDRF Unit Assignment'}</strong>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Acknowledge Button */}
                            {sos.status !== 'ACKNOWLEDGED' && sos.status !== 'RESOLVED' && (
                              <button
                                onClick={() => setAckModalSOS(sos)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow transition cursor-pointer flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Acknowledge SOS</span>
                              </button>
                            )}

                            {/* Manual Escalate Button */}
                            {sos.status !== 'RESOLVED' && escLevel < 3 && (
                              <button
                                onClick={() => {
                                  setEscModalSOS(sos);
                                  setEscTargetLevel(escLevel + 1);
                                }}
                                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg shadow transition cursor-pointer flex items-center space-x-1"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Manual Escalate to Level {escLevel + 1}</span>
                              </button>
                            )}

                            {/* Resolve Button */}
                            {sos.status !== 'RESOLVED' && (
                              <button
                                onClick={() => setResModalSOS(sos)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition cursor-pointer flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Resolved</span>
                              </button>
                            )}

                            {/* Locate on Map Button */}
                            <button
                              onClick={() => {
                                setSelectedDistrict(sos.district);
                                setActiveTab('MAP');
                                setOpenDrawer(true);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 transition cursor-pointer flex items-center space-x-1"
                            >
                              <MapPin className="w-3.5 h-3.5 text-sky-400" />
                              <span>Locate on Map</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })()}

          {/* Admin & Emergency Contacts Matrix Tab */}
          {activeTab === 'EMERGENCY_CONTACTS' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                    <h2 className="text-lg font-bold flex items-center space-x-2 text-teal-400">
                    <Sliders className="w-5 h-5" />
                    <span>Emergency Contacts & Live Notification Gateways</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure real Brevo Email API notification delivery, test real-time dispatches, and manage emergency response contacts.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openRecipientModal()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer flex items-center space-x-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Quick Test Email</span>
                  </button>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Contact</span>
                  </button>
                </div>
              </div>

              {/* Real Provider Gateways Status Card */}
              {providerStatus && (
                <div className="bg-[#162032] p-5 rounded-2xl border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-sm text-white">Live Notification Gateway Readiness</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      DEMO MODE: <strong className={providerStatus.demo_mode ? 'text-purple-400' : 'text-emerald-400'}>{providerStatus.demo_mode ? 'ENABLED (SIMULATED)' : 'DISABLED (REAL PROVIDERS ONLY)'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Brevo Transactional Email Gateway Status */}
                    <div className="bg-[#0f172a] p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-teal-400" />
                          <span>Brevo Transactional Email Provider</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600">
                            AUTOMATIC EMAILS DISABLED
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            providerStatus.email.is_configured
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                              : 'bg-red-950 text-red-300 border border-red-700'
                          }`}>
                            {providerStatus.email.is_configured ? 'GATEWAY READY' : 'NOT CONFIGURED'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Verified Sender: <strong>{providerStatus.email.sender_email || 'aaradhysharma2007@gmail.com'}</strong> &bull; Manual Admin Control Only
                      </p>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-teal-400 font-mono font-semibold">Policy: Zero Automatic Emails</span>
                        <button
                          onClick={() => openRecipientModal()}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-[11px] transition cursor-pointer"
                        >
                          Manual Send Email
                        </button>
                      </div>
                    </div>


                    {/* Live Command Dashboard & WebSocket Status */}
                    <div className="bg-[#0f172a] p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-sky-400" />
                          <span>In-App & WebSocket Broadcast Hub</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                          LIVE DISPATCH ACTIVE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Real-time low-latency authority notifications & live dashboard synchronization.
                      </p>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono">Protocol: WebSocket (/ws)</span>
                        <span className="text-[11px] text-emerald-400 font-bold">Connected</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alert Engine Automation Settings Card */}
              {alertConfig && (
                <div className="bg-[#162032] p-5 rounded-2xl border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div className="flex items-center space-x-2">
                      <BellRing className="w-4 h-4 text-sky-400" />
                      <h3 className="font-bold text-sm text-white">Automated Risk Threshold & Escalation Rules</h3>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <span className="text-slate-300">Automation Engine:</span>
                      <input
                        type="checkbox"
                        checked={alertConfig.automated_risk_alerting_active}
                        onChange={(e) => updateAlertConfig({ automated_risk_alerting_active: e.target.checked })}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                      <span className={`font-bold ${alertConfig.automated_risk_alerting_active ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {alertConfig.automated_risk_alerting_active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-slate-300 block mb-1">
                        Risk Alert Trigger Threshold: <strong>{((alertConfig.risk_alert_threshold || 0.75) * 100).toFixed(0)}%</strong>
                      </label>
                      <input
                        type="range"
                        min="0.50"
                        max="0.95"
                        step="0.05"
                        value={alertConfig.risk_alert_threshold}
                        onChange={(e) => updateAlertConfig({ risk_alert_threshold: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400">Default: 75% Critical Landslide Probability</span>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">
                        Auto-Escalation Timeout: <strong>{alertConfig.escalation_timeout_seconds || 120}s</strong>
                      </label>
                      <input
                        type="range"
                        min="30"
                        max="300"
                        step="15"
                        value={alertConfig.escalation_timeout_seconds || 120}
                        onChange={(e) => updateAlertConfig({ escalation_timeout_seconds: parseInt(e.target.value) })}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400">Default: 120s before advancing to next level</span>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">
                        Alert Cooldown Window: <strong>{((alertConfig.alert_cooldown_seconds || 600) / 60).toFixed(0)} min</strong>
                      </label>
                      <input
                        type="range"
                        min="60"
                        max="1800"
                        step="60"
                        value={alertConfig.alert_cooldown_seconds || 600}
                        onChange={(e) => updateAlertConfig({ alert_cooldown_seconds: parseInt(e.target.value) })}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400">Suppresses duplicate regional spam</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts Grid by Escalation Tier */}
              {[1, 2, 3].map((level) => {
                const tierContacts = emergencyContacts.filter(c => c.escalation_level === level);
                const levelTitle =
                  level === 1 ? 'Level 1: Primary Response (SDRF & District Emergency Control Room)' :
                  level === 2 ? 'Level 2: District & State Leadership (District Magistrate & SDMA)' :
                  'Level 3: Apex Emergency (NDRF Battalion HQ & Chief Secretary)';

                return (
                  <div key={level} className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm font-bold text-slate-200">
                      <span className={`w-3 h-3 rounded-full ${level === 1 ? 'bg-amber-400' : level === 2 ? 'bg-orange-500' : 'bg-purple-500'}`}></span>
                      <span>{levelTitle} ({tierContacts.length})</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tierContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3 text-xs shadow hover:border-slate-600 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-white text-sm">{contact.name}</div>
                              <div className="text-[11px] text-teal-400">{contact.role}</div>
                            </div>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                              title="Delete contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1 text-slate-300 text-[11px]">
                            <div className="flex items-center space-x-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{contact.phone}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          </div>

                          {/* Channel Toggles & Real Test Buttons */}
                          <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleToggleContactChannel(contact, 'email_enabled')}
                                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                                  contact.email_enabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                EMAIL
                              </button>
                              <button
                                onClick={() => handleToggleContactChannel(contact, 'in_app_enabled')}
                                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                                  contact.in_app_enabled ? 'bg-sky-950 text-sky-300 border border-sky-600' : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                IN-APP
                              </button>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => openRecipientModal(contact)}
                                className="px-2 py-0.5 bg-teal-800 hover:bg-teal-700 text-teal-200 font-bold rounded transition cursor-pointer"
                                title="Select this contact for live test email"
                              >
                                Test Email
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Alert History & Dispatch Logs Tab */}
          {activeTab === 'ALERT_HISTORY' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                  <h2 className="text-lg font-bold flex items-center space-x-2 text-purple-400">
                    <BellRing className="w-5 h-5" />
                    <span>Multi-Channel Notification Dispatch Audit Trail</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable logs of all live Brevo SMS, Brevo Email, and WebSocket dispatches with exact provider HTTP response codes and reference IDs.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      loadDiagnostics();
                      setShowDiagnosticsModal(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Gateway Diagnostics Inspector</span>
                  </button>
                  <select
                    value={alertTypeFilter}
                    onChange={(e) => setAlertTypeFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-1.5"
                  >
                    <option value="ALL">All Alert Types</option>
                    <option value="AUTOMATED_RISK_THRESHOLD">Automated Risk Threshold</option>
                    <option value="SOS_BEACON">SOS Beacons</option>
                    <option value="ESCALATION">Escalation Events</option>
                    <option value="MANUAL_BROADCAST">Manual Broadcast</option>
                  </select>
                </div>
              </div>

              {alertHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-[#162032] rounded-xl border border-slate-700">
                  No dispatch logs found.
                </div>
              ) : (
                <div className="space-y-3 pb-8">
                  {alertHistory
                    .filter(a => alertTypeFilter === 'ALL' || a.alert_type === alertTypeFilter)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white">{item.title}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' :
                                item.severity === 'WARNING' ? 'bg-orange-950 text-orange-300 border border-orange-700' :
                                'bg-yellow-950 text-yellow-300'
                              }`}>
                                {item.severity}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                                {item.alert_type}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Target Region: <strong>{item.district}, {item.state}</strong> &bull; Channels: {item.channels.join(', ')}
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-slate-400 font-mono">
                            {new Date(item.created_at).toLocaleTimeString()} &bull; {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          {item.message}
                        </p>

                        {/* Dispatches List */}
                        {item.dispatches && item.dispatches.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Dispatched Recipients ({item.dispatches.length}):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                              {item.dispatches.map((d) => {
                                const statusStyle =
                                  d.status === 'DELIVERED'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                    : d.status === 'PROVIDER_ACCEPTED'
                                    ? 'bg-sky-950 text-sky-300 border border-sky-600'
                                    : d.status === 'DELIVERY_PENDING'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-600'
                                    : d.status === 'NOT_CONFIGURED'
                                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                    : d.status === 'SIMULATED'
                                    ? 'bg-purple-950 text-purple-300 border border-purple-700'
                                    : 'bg-red-950 text-red-300 border border-red-700';

                                return (
                                  <div
                                    key={d.id}
                                    className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-200 truncate">{d.contact_name || d.recipient}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${statusStyle}`}>
                                        {d.status}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                                      <span>{d.channel} &bull; L{d.escalation_level} ({d.contact_role || 'Officer'})</span>
                                      {d.http_status && (
                                        <span className="font-mono text-slate-500">HTTP {d.http_status}</span>
                                      )}
                                    </div>
                                    {d.provider_reference && (
                                      <div className="text-[10px] text-sky-400/90 font-mono truncate">
                                        Ref: {d.provider_reference}
                                      </div>
                                    )}
                                    {d.delivery_event && (
                                      <div className="text-[10px] text-emerald-400/90 font-mono">
                                        Event: {d.delivery_event}
                                      </div>
                                    )}
                                    {d.provider_response && (
                                      <div className="text-[10px] text-slate-500 font-mono truncate" title={d.provider_response}>
                                        {d.provider_response}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Citizen Reports Verification Tab */}
          {activeTab === 'REPORT_VERIFICATION' && (() => {
            const availableDistricts = Array.from(new Set(citizenReports.map(r => r.district).filter(Boolean)));
            const displayReports = reportJurisdictionFilter === 'ALL'
              ? citizenReports
              : citizenReports.filter(r => r.district?.toLowerCase() === reportJurisdictionFilter.toLowerCase());

            const handleUpdateReport = async (reportId: string, status: 'VERIFIED' | 'REJECTED') => {
              const notes = `Officer ${user?.name || user?.badge_number || 'SDRF Lead'} marked report as ${status}.`;
              await api.updateCitizenReportStatus(reportId, status, notes);
              await refreshData();
            };

            return (
              <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6 text-slate-100">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-700 pb-3 gap-2">
                  <div>
                    <h2 className="text-lg font-bold flex items-center space-x-2 text-orange-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span>{t('triage_title')}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automated spatial duplicate clustering (&le;3.5km) & Gemini Computer Vision photo hazard triage.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Jurisdiction Filter */}
                    <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <select
                        value={reportJurisdictionFilter}
                        onChange={(e) => setReportJurisdictionFilter(e.target.value)}
                        className="bg-transparent text-white text-xs border-none outline-none cursor-pointer"
                      >
                        <option value="ALL" className="bg-slate-900 text-white">All Jurisdictions ({citizenReports.length})</option>
                        {user?.jurisdiction && (
                          <option value={user.jurisdiction} className="bg-slate-900 text-emerald-300 font-bold">
                            My Jurisdiction: {user.jurisdiction}
                          </option>
                        )}
                        {availableDistricts
                          .filter(d => d !== user?.jurisdiction)
                          .map(d => (
                            <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                          ))}
                      </select>
                    </div>

                    <span className="text-xs text-slate-400 font-mono hidden sm:inline">{t('verification_pipeline')}</span>
                  </div>
                </div>

                {/* Spatial Duplicate Incident Clusters */}
                {reportClusters.length > 0 && (
                  <div className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3">
                    <div className="font-bold text-xs text-slate-200 flex items-center justify-between">
                      <span className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-orange-400" />
                        <span>Spatio-Temporal Report Clusters (Duplicate Suppression Active)</span>
                      </span>
                      <span className="text-[10px] text-orange-400 font-mono">
                        {reportClusters.length} Active Hotspot Clusters
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reportClusters.map((cluster) => (
                        <div
                          key={cluster.cluster_id}
                          className="bg-slate-900/90 p-3 rounded-xl border border-slate-700 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sky-400">{cluster.cluster_id}</span>
                            <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 text-[10px] font-bold">
                              {cluster.report_count} Citizen Submissions
                            </span>
                          </div>
                          <div className="font-bold text-white">
                            {cluster.district}, {cluster.state}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Centroid: ({cluster.centroid_lat.toFixed(4)}, {cluster.centroid_lon.toFixed(4)}) &bull; Categories: {cluster.categories.join(', ')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Latest Report: {new Date(cluster.latest_report_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Reports List */}
                {displayReports.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-[#162032] rounded-xl border border-slate-700">
                    {reportJurisdictionFilter === 'ALL'
                      ? t('no_citizen_reports_msg')
                      : `No citizen hazard reports recorded in jurisdiction ${reportJurisdictionFilter}.`}
                  </div>
                ) : (
                  <div className="space-y-3 pb-8">
                    {displayReports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3 text-xs shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-sm">{report.category}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                                {report.district}, {report.state}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                report.verification_status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-600' :
                                report.verification_status === 'REJECTED' ? 'bg-red-950 text-red-400 border border-red-600' :
                                'bg-amber-950 text-amber-400 border border-amber-600'
                              }`}>
                                {report.verification_status}
                              </span>
                            </div>
                            <p className="text-slate-300 mt-1.5">{report.description}</p>
                          </div>
                          <div className="text-right text-[11px] text-slate-400 font-mono">
                            {new Date(report.created_at || report.timestamp || Date.now()).toLocaleTimeString()}
                          </div>
                        </div>

                        {/* Reporter details for verified authorities */}
                        {(report.reporter_phone || report.reporter_email) && (
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-500 font-medium">Citizen Contact:</span>
                            {report.reporter_phone && (
                              <span className="text-sky-300 font-mono">{report.reporter_phone}</span>
                            )}
                            {report.reporter_email && (
                              <span className="text-slate-300">{report.reporter_email}</span>
                            )}
                            {report.verified_by_officer && (
                              <span className="text-emerald-400 ml-auto">
                                Verified by: <strong>{report.verified_by_officer}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        {/* AI Verification Confidence */}
                        {report.ai_confidence_score !== undefined && (
                          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              Computer Vision Confidence: <strong className="text-sky-400">{((report.ai_confidence_score || 0.85) * 100).toFixed(0)}%</strong>
                            </span>
                            <span className="text-slate-400">
                              AI Category: <strong className="text-slate-200">{report.ai_classification_tag || report.category}</strong>
                            </span>
                          </div>
                        )}

                        {/* Action buttons for officer verification */}
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {report.id}
                          </span>
                          <div className="flex items-center space-x-2">
                            {report.verification_status !== 'VERIFIED' && (
                              <button
                                onClick={() => handleUpdateReport(report.id, 'VERIFIED')}
                                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify Report</span>
                              </button>
                            )}
                            {report.verification_status !== 'REJECTED' && (
                              <button
                                onClick={() => handleUpdateReport(report.id, 'REJECTED')}
                                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Village Isolation Studio Tab */}
          {activeTab === 'ISOLATION_STUDIO' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div>
                  <h2 className="text-lg font-bold flex items-center space-x-2 text-indigo-400">
                    <Truck className="w-5 h-5" />
                    <span>{t('isolation_studio_title')}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lifeline road severance graph modeling. Calculates isolated populations, cut-off medical centres, and suggests alternate footpaths & drone drop zones.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pb-8">
                {isolationData.map((iso) => {
                  const statusBg =
                    iso.status === 'BLOCKED' ? 'bg-red-950 text-red-300 border-red-800' :
                    iso.status === 'AT_RISK' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                    'bg-emerald-950 text-emerald-300 border-emerald-800';

                  return (
                    <div
                      key={iso.highway_id}
                      className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3 shadow-lg hover:border-slate-600 transition"
                    >
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <div>
                          <span className="font-bold text-sm text-white">{iso.highway_id}</span>
                          <div className="text-[11px] text-slate-400">{iso.highway_name}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBg}`}>
                          {iso.status}
                        </span>
                      </div>

                      {/* Route info */}
                      {iso.route && (
                        <div className="text-xs text-slate-300 font-medium">
                          Route: <span className="text-slate-200">{iso.route}</span>
                        </div>
                      )}

                      {/* Cut-off Villages */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-amber-400 flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Cut-Off Villages ({iso.cut_off_villages.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {iso.cut_off_villages.map((v, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] border border-slate-700">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Severed Services */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-red-400 flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Critical Services Severed</span>
                        </div>
                        <ul className="text-[11px] text-slate-300 list-disc pl-4 space-y-0.5">
                          {iso.critical_services_severed.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Alternate Footpaths / Airdrop Zones */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1.5">
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Alternate Relief & Airdrop Zones</span>
                        </div>
                        <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-700/80">
                          {(iso.alternate_footpath_or_airdrop_zones || iso.alternate_relief_routes || []).join(' &bull; ')}
                        </div>
                      </div>

                      {/* Stats Footer */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Isolated Pop: <strong className="text-white">{iso.isolated_population_est.toLocaleString()}</strong>
                        </span>
                        <span className="font-mono text-indigo-300 font-bold">
                          Lifeline Score: {iso.lifeline_score || iso.lifeline_connectivity_score || 90}/100
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {activeTab === 'MAP' && <LocationDrawer />}
      </div>

      {/* Controlled Test Email Recipient Selection & Confirmation Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-xl w-full p-6 rounded-2xl space-y-5 text-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center space-x-2">
                    <span>
                      {recipientModalStep === 'SELECT' && 'SELECT TEST EMAIL RECIPIENTS'}
                      {recipientModalStep === 'CONFIRM' && 'CONFIRM TEST EMAIL DELIVERY'}
                      {recipientModalStep === 'SENDING' && 'DISPATCHING TRANSACTIONAL TEST EMAILS'}
                      {recipientModalStep === 'RESULT' && 'TEST EMAIL DISPATCH REPORT'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {recipientModalStep === 'SELECT' && 'Choose exact authorized recipients. Only checked recipients will receive the test.'}
                    {recipientModalStep === 'CONFIRM' && 'Explicit confirmation required before triggering Brevo REST API dispatch.'}
                    {recipientModalStep === 'SENDING' && 'Executing real-time transactional dispatch via Brevo REST API...'}
                    {recipientModalStep === 'RESULT' && 'Per-recipient delivery status and Brevo gateway diagnostics.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecipientModal(false)}
                disabled={isSendingTestEmail}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer disabled:opacity-30"
              >
                &times;
              </button>
            </div>

            {/* STEP 1: RECIPIENT SELECTION INTERFACE */}
            {recipientModalStep === 'SELECT' && (() => {
              const query = recipientSearchQuery.toLowerCase().trim();
              const filteredContacts = emergencyContacts.filter(c => 
                !query ||
                c.name.toLowerCase().includes(query) ||
                c.role.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                `level ${c.escalation_level}`.includes(query)
              );

              const selectedCount = getSelectedRecipientsList().length;
              const allFilteredSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedRecipientIds.has(c.id));

              return (
                <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                  {/* Search and Select All Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search by name, role, email, or escalation level..."
                        value={recipientSearchQuery}
                        onChange={(e) => setRecipientSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
                      {recipientSearchQuery && (
                        <button
                          onClick={() => setRecipientSearchQuery('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                    {filteredContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleSelectAll(filteredContacts)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                      >
                        {allFilteredSelected ? 'Deselect All' : 'Select All Filtered'}
                      </button>
                    )}
                  </div>

                  {/* Authorized Contacts Checkbox List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60 border border-slate-800 rounded-xl p-2 bg-slate-900/50">
                    {filteredContacts.length === 0 && customRecipientsList.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No authorized contacts match your query. Add a custom recipient below.
                      </div>
                    ) : (
                      filteredContacts.map(contact => {
                        const isChecked = selectedRecipientIds.has(contact.id);
                        return (
                          <label
                            key={contact.id}
                            className={`flex items-start space-x-3 p-2.5 rounded-lg border transition cursor-pointer ${
                              isChecked
                                ? 'bg-teal-950/40 border-teal-600/80 text-white'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRecipientSelection(contact.id)}
                              className="mt-0.5 rounded border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer h-4 w-4"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-slate-100 truncate">{contact.name}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  contact.escalation_level === 1 ? 'bg-teal-950 text-teal-300 border border-teal-700' :
                                  contact.escalation_level === 2 ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' :
                                  'bg-purple-950 text-purple-300 border border-purple-700'
                                }`}>
                                  Level {contact.escalation_level}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{contact.role}</div>
                              <div className="text-[10px] text-teal-400/90 font-mono truncate">{contact.email}</div>
                            </div>
                          </label>
                        );
                      })
                    )}

                    {/* Custom Added Recipients */}
                    {customRecipientsList.map(cr => {
                      const isChecked = selectedRecipientIds.has(cr.id);
                      return (
                        <label
                          key={cr.id}
                          className={`flex items-start space-x-3 p-2.5 rounded-lg border transition cursor-pointer ${
                            isChecked
                              ? 'bg-purple-950/40 border-purple-600/80 text-white'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRecipientSelection(cr.id)}
                            className="mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-purple-200 truncate">{cr.name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-700">
                                Custom Verification
                              </span>
                            </div>
                            <div className="text-[10px] text-purple-400 font-mono truncate">{cr.email}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Add Custom Authorized Recipient Input */}
                  <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                      <Plus className="w-3.5 h-3.5 text-teal-400" />
                      <span>Add Custom Direct Verification Recipient</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Officer / Tester Name"
                        value={customRecipientName}
                        onChange={(e) => setCustomRecipientName(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                      <input
                        type="email"
                        placeholder="recipient@domain.gov.in"
                        value={customRecipientEmail}
                        onChange={(e) => setCustomRecipientEmail(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomRecipient}
                        disabled={!customRecipientEmail || !customRecipientEmail.includes('@')}
                        className="bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed py-1.5"
                      >
                        + Add Recipient
                      </button>
                    </div>
                  </div>

                  {/* Selection Summary and Dynamic Action Button */}
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-300">
                      Selected: <strong className="text-teal-400 font-bold">{selectedCount}</strong> {selectedCount === 1 ? 'recipient' : 'recipients'}
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setShowRecipientModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleProceedToConfirm}
                        disabled={selectedCount === 0}
                        className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer ${
                          selectedCount > 0
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        <span>
                          {selectedCount === 0 && 'SEND TO 0 RECIPIENTS'}
                          {selectedCount === 1 && 'SEND TO 1 RECIPIENT'}
                          {selectedCount > 1 && `SEND TO ${selectedCount} RECIPIENTS`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* STEP 2: FINAL CONFIRMATION DIALOG (SINGLE OR MULTIPLE RECIPIENT PROTECTION) */}
            {recipientModalStep === 'CONFIRM' && (() => {
              const selectedTargets = getSelectedRecipientsList();
              const isMultiple = selectedTargets.length > 1;

              return (
                <div className="space-y-4 text-xs">
                  {isMultiple ? (
                    /* Multiple Recipient Protection Dialog */
                    <div className="bg-amber-950/50 border-2 border-amber-500/80 p-4 rounded-xl space-y-3">
                      <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
                        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                        <span>MULTIPLE RECIPIENT CONFIRMATION</span>
                      </div>
                      <div className="text-amber-100 text-xs leading-relaxed space-y-1">
                        <p className="font-semibold text-amber-200">
                          You have selected {selectedTargets.length} recipients.
                        </p>
                        <p className="text-amber-300/90 text-[11px]">
                          This action will send the message to exactly {selectedTargets.length} recipients.
                        </p>
                        <p className="text-amber-200 font-bold pt-1">
                          Do you want to continue?
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Single Recipient Confirmation Dialog */
                    <div className="bg-emerald-950/40 border border-emerald-500/70 p-4 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-emerald-300 font-bold text-sm">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>CONFIRM EMAIL DELIVERY</span>
                      </div>
                      <p className="text-slate-300 text-xs">
                        Controlled transactional delivery via official Brevo REST API gateway. Exactly ONE email will be sent.
                      </p>
                    </div>
                  )}

                  {/* Recipient Preview Display */}
                  <div className="space-y-2 max-h-52 overflow-y-auto border border-slate-800 rounded-xl p-3 bg-slate-900/80">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-1.5">
                      <span>SELECTED RECIPIENTS</span>
                      <span className="font-mono text-teal-400">TOTAL: {selectedTargets.length} RECIPIENT{selectedTargets.length === 1 ? '' : 'S'}</span>
                    </div>
                    {selectedTargets.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                        <div className="truncate flex items-center space-x-2">
                          <span className="font-mono text-slate-500 text-[11px]">{idx + 1}.</span>
                          <span className="font-semibold text-slate-200">{t.name}</span>
                          <span className="text-slate-400 text-[11px]">&mdash; {t.role}</span>
                        </div>
                        <span className="font-mono text-teal-400 text-[11px] shrink-0 ml-2">{t.email}</span>
                      </div>
                    ))}
                  </div>

                  {/* Confirmation Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setRecipientModalStep('SELECT')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel / Modify Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteSendTestEmail}
                      className={`px-5 py-2 font-bold rounded-lg text-xs transition shadow-lg flex items-center space-x-1.5 cursor-pointer ${
                        isMultiple
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/60'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isMultiple
                          ? `YES, SEND TO ${selectedTargets.length} RECIPIENTS`
                          : 'SEND EMAIL'}
                      </span>
                    </button>
                  </div>
                </div>
              );

            })()}

            {/* STEP 3: IN-PROGRESS DISPATCH SPINNER */}
            {recipientModalStep === 'SENDING' && (
              <div className="p-10 text-center space-y-4">
                <RefreshCw className="w-10 h-10 text-teal-400 animate-spin mx-auto" />
                <div className="font-bold text-base text-white">
                  Dispatching to {getSelectedRecipientsList().length} Selected Recipient(s)...
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Communicating with Brevo transactional gateway (POST /v3/smtp/email) with IPv4 socket binding.
                </p>
              </div>
            )}

            {/* STEP 4: PER-RECIPIENT RESULTS */}
            {recipientModalStep === 'RESULT' && testEmailResultSummary && (
              <div className="space-y-4 text-xs overflow-hidden flex flex-col flex-1">
                {/* Status Banner */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  testEmailResultSummary.status === 'COMPLETED'
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                    : testEmailResultSummary.status === 'PARTIAL_SUCCESS'
                    ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                    : 'bg-red-950/60 border-red-600 text-red-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    {testEmailResultSummary.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <div className="font-bold text-sm">
                        {testEmailResultSummary.status === 'COMPLETED'
                          ? `All ${testEmailResultSummary.recipient_count} Test Emails Successfully Dispatched`
                          : `Dispatched: ${testEmailResultSummary.success_count} succeeded, ${testEmailResultSummary.failure_count} failed`}
                      </div>
                      <div className="text-[11px] opacity-90">
                        Provider: Brevo REST API v3 &bull; Zero unintended recipients dispatched.
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/40 border border-current">
                    {testEmailResultSummary.status}
                  </span>
                </div>

                {/* Per-recipient breakdown cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56">
                  {testEmailResultSummary.dispatches?.map((d: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-white">{d.name || 'Emergency Officer'}</strong>
                          <span className="text-[11px] text-slate-400 font-mono ml-2">{d.recipient}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          d.status === 'DELIVERED' || d.status === 'PROVIDER_ACCEPTED' || d.status === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-red-950 text-red-300 border border-red-700'
                        }`}>
                          {d.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>Provider: <strong className="text-teal-300">{d.provider || 'Brevo'}</strong></span>
                        {d.http_status && <span>HTTP Status: <strong className="text-amber-400 font-mono">{d.http_status}</strong></span>}
                        {d.provider_reference && <span>Message ID: <strong className="text-emerald-400 font-mono">{d.provider_reference}</strong></span>}
                      </div>

                      {d.response && (
                        <div className="text-[10px] font-mono text-slate-300 bg-black/30 p-1.5 rounded truncate">
                          {d.response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      loadDiagnostics();
                      setShowDiagnosticsModal(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Open Diagnostics Inspector
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setRecipientModalStep('SELECT')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Send Another Test
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRecipientModal(false)}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Gateway Diagnostics Inspector Modal */}
      {showDiagnosticsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-5xl w-full p-6 rounded-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <span>Brevo Gateway Diagnostics Inspector</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit log of exact provider request attempts, HTTP statuses, provider message IDs, acceptance states, and carrier delivery events.
                </p>
              </div>
              <button
                onClick={() => setShowDiagnosticsModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center space-x-4">
                <span>Network Egress: <strong className="text-emerald-400">Strict IPv4 Binding Active</strong></span>
                <span>Email Gateway: <strong className="text-teal-300">/v3/smtp/email</strong></span>
                <span>Broadcast Hub: <strong className="text-sky-300">WebSocket Active</strong></span>
              </div>
              <button
                onClick={loadDiagnostics}
                disabled={isLoadingDiagnostics}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDiagnostics ? 'animate-spin' : ''}`} />
                <span>Sync & Refresh Logs</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {diagnosticsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
                  {isLoadingDiagnostics ? 'Loading diagnostics...' : 'No notification dispatch diagnostic logs available.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-900/90">
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Channel</th>
                        <th className="p-2.5">Recipient (E.164)</th>
                        <th className="p-2.5">HTTP Status</th>
                        <th className="p-2.5">Brevo Message ID</th>
                        <th className="p-2.5">Dispatch Status</th>
                        <th className="p-2.5">Provider Event</th>
                        <th className="p-2.5">Rejection / Provider Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                      {diagnosticsList.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/60 transition">
                          <td className="p-2.5 text-slate-400 whitespace-nowrap text-[10px]">
                            {new Date(d.attempted_at || d.created_at || Date.now()).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                              d.channel === 'SMS' ? 'bg-sky-950 text-sky-300 border border-sky-700' :
                              d.channel === 'EMAIL' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                              'bg-purple-950 text-purple-300'
                            }`}>
                              {d.channel}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-200 font-sans">
                            <div>{d.contact_name || 'Officer'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{d.normalized_recipient || d.recipient}</div>
                          </td>
                          <td className="p-2.5">
                            {d.http_status ? (
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                d.http_status >= 200 && d.http_status < 300 ? 'text-emerald-400 bg-emerald-950/60' : 'text-red-400 bg-red-950/60'
                              }`}>
                                HTTP {d.http_status}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-2.5 text-sky-300 truncate max-w-[140px]" title={d.provider_reference}>
                            {d.provider_reference || <span className="text-slate-600">None</span>}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                              d.status === 'DELIVERED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                              d.status === 'PROVIDER_ACCEPTED' ? 'bg-sky-950 text-sky-300 border border-sky-600' :
                              d.status === 'DELIVERY_PENDING' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
                              d.status === 'NOT_CONFIGURED' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                              'bg-red-950 text-red-300 border border-red-700'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="p-2.5">
                            {d.delivery_event ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                d.delivery_event === 'delivered' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                                d.delivery_event === 'rejected' ? 'bg-red-950 text-red-300 border border-red-700' :
                                'bg-slate-800 text-amber-300'
                              }`}>
                                {d.delivery_event}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Pending event</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-300 max-w-[240px] truncate font-sans text-[11px]" title={d.rejection_reason || d.provider_response || d.error_message}>
                            {d.rejection_reason || d.provider_response || d.error_message || <span className="text-slate-600">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700">
              <button
                onClick={() => setShowDiagnosticsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acknowledge SOS Modal */}
      {ackModalSOS && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-md w-full p-6 rounded-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <span>Acknowledge SOS Incident: {ackModalSOS.id}</span>
              </h3>
              <button
                onClick={() => setAckModalSOS(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Acknowledging this beacon halts the automatic escalation timer and confirms that control room officers have assumed incident management.
            </p>

            <form onSubmit={handleAcknowledgeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Responding Officer Name & Role:</label>
                <input
                  type="text"
                  value={ackOfficerName}
                  onChange={(e) => setAckOfficerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Operational Response Notes:</label>
                <textarea
                  rows={3}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingAck}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  {isSubmittingAck ? 'Acknowledging...' : 'Confirm Acknowledged'}
                </button>
                <button
                  type="button"
                  onClick={() => setAckModalSOS(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Escalate SOS Modal */}
      {escModalSOS && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-md w-full p-6 rounded-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2 text-red-400">
                <Zap className="w-5 h-5" />
                <span>Manual Command Escalation</span>
              </h3>
              <button
                onClick={() => setEscModalSOS(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Immediately triggers notification dispatch to higher command levels (Fast2SMS, Brevo, Dashboard) and attaches live hazard context.
            </p>

            <form onSubmit={handleEscalateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Target Escalation Tier:</label>
                <select
                  value={escTargetLevel}
                  onChange={(e) => setEscTargetLevel(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value={2}>Level 2: District & State Leadership (DM / SEC / SDMA)</option>
                  <option value={3}>Level 3: Apex Emergency (NDRF HQ / Chief Secretary)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Escalation Justification / Reason:</label>
                <textarea
                  rows={3}
                  value={escReason}
                  onChange={(e) => setEscReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingEsc}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  {isSubmittingEsc ? 'Escalating...' : 'Dispatch Escalation Alert'}
                </button>
                <button
                  type="button"
                  onClick={() => setEscModalSOS(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve SOS Modal */}
      {resModalSOS && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-md w-full p-6 rounded-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>Mark SOS Incident Resolved: {resModalSOS.id}</span>
              </h3>
              <button
                onClick={() => setResModalSOS(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Resolving Authority / Officer:</label>
                <input
                  type="text"
                  value={resOfficerName}
                  onChange={(e) => setResOfficerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Assigned Unit / Rescuers:</label>
                <input
                  type="text"
                  value={resTeam}
                  onChange={(e) => setResTeam(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Resolution Summary / Extraction Notes:</label>
                <textarea
                  rows={3}
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingRes}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  {isSubmittingRes ? 'Resolving...' : 'Confirm Resolution & Close Incident'}
                </button>
                <button
                  type="button"
                  onClick={() => setResModalSOS(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-md w-full p-6 rounded-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2 text-indigo-400">
                <Send className="w-5 h-5" />
                <span>Manual Emergency Alert Broadcast</span>
              </h3>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualBroadcastSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">District:</label>
                  <input
                    type="text"
                    value={broadcastDistrict}
                    onChange={(e) => setBroadcastDistrict(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">State:</label>
                  <input
                    type="text"
                    value={broadcastState}
                    onChange={(e) => setBroadcastState(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Severity Tier:</label>
                  <select
                    value={broadcastSeverity}
                    onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="WARNING">WARNING</option>
                    <option value="WATCH">WATCH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Target Contact Level:</label>
                  <select
                    value={broadcastLevel}
                    onChange={(e) => setBroadcastLevel(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value={1}>Level 1 (SDRF / DDMA)</option>
                    <option value={2}>Level 2 (DM / SDMA)</option>
                    <option value={3}>Level 3 (NDRF / Apex)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Broadcast Message Payload:</label>
                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  {isBroadcasting ? 'Broadcasting...' : 'Broadcast Multi-Channel Alert'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Emergency Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-md w-full p-6 rounded-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2 text-teal-400">
                <Plus className="w-5 h-5" />
                <span>Add Emergency Contact</span>
              </h3>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name:</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="E.g. Col. P. Sharma"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Designation & Agency Role:</label>
                <input
                  type="text"
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value)}
                  placeholder="E.g. SDRF Incident Commander"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Phone Number:</label>
                  <input
                    type="tel"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Escalation Tier:</label>
                  <select
                    value={newContactLevel}
                    onChange={(e) => setNewContactLevel(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value={1}>Level 1 (SDRF / DDMA)</option>
                    <option value={2}>Level 2 (DM / SDMA)</option>
                    <option value={3}>Level 3 (NDRF / Apex)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email Address:</label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="officer@sdrf.gov.in"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  Save Emergency Contact
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
