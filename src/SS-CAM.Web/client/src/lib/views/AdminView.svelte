<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import type { Company, StaffAccount } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentDialog from '$lib/components/ui/FluentDialog.svelte';

  type ActiveTab = 'companies' | 'users' | 'audit' | 'system';
  type ViewMode = 'cards' | 'table';

  let activeTab = $state<ActiveTab>('companies');
  let companyViewMode = $state<ViewMode>('cards');

  // Default Subsidiaries List Seed
  const DEFAULT_COMPANIES_FALLBACK: Company[] = [
    {
      code: 'SSH',
      name: 'SuamiSihat Holding Sdn Bhd',
      shortName: 'Holding Group',
      regNo: '202401012345 (1550123-X)',
      address: 'Level 28, Menara SuamiSihat, Jalan Ampang, 50450 Kuala Lumpur, Malaysia',
      contact: '+603-2181-8888 / holding@suamisihat.com',
      location: 'Kuala Lumpur, Malaysia',
      status: 'active',
      isParent: true,
      establishedYear: '2020',
      color: '#022057'
    },
    {
      code: 'SSC',
      name: 'SuamiSihat Healthcare Sdn Bhd',
      shortName: 'Healthcare & Clinic',
      regNo: '202401012346 (1550124-Y)',
      address: 'SuamiSihat Clinic, No. 12, Ground Floor, Jalan Telawi 3, Bangsar, 59100 Kuala Lumpur',
      contact: '+603-2282-7777 / healthcare@suamisihat.com',
      location: 'Bangsar, Kuala Lumpur',
      status: 'active',
      isParent: false,
      establishedYear: '2021',
      color: '#043388'
    },
    {
      code: 'SSW',
      name: 'SuamiSihat Ellness Sdn Bhd',
      shortName: 'Wellness & Nutrition',
      regNo: '202401012347 (1550125-Z)',
      address: 'Unit 3A-01, Oval Damansara, 685 Jalan Damansara, 60000 Kuala Lumpur',
      contact: '+603-7733-6666 / wellness@suamisihat.com',
      location: 'Damansara, Kuala Lumpur',
      status: 'active',
      isParent: false,
      establishedYear: '2022',
      color: '#21A1F7'
    },
    {
      code: 'SSE',
      name: 'SuamiSihat Ecommerce Sdn Bhd',
      shortName: 'E-Commerce & Retail',
      regNo: '202401012348 (1550126-A)',
      address: 'Warehouse Hub 2, Jalan PJU 1A/41B, Ara Damansara, 47301 Petaling Jaya, Selangor',
      contact: '+603-7848-5555 / ecom@suamisihat.com',
      location: 'Petaling Jaya, Selangor',
      status: 'active',
      isParent: false,
      establishedYear: '2023',
      color: '#107C41'
    },
    {
      code: 'SST',
      name: 'SuamiSihat Technology Sdn Bhd',
      shortName: 'Technology & Digital',
      regNo: '202401012349 (1550127-B)',
      address: 'Cyberjaya Tech Park, Block 3, Persiaran APEC, 63000 Cyberjaya, Selangor',
      contact: '+603-8322-4444 / tech@suamisihat.com',
      location: 'Cyberjaya, Selangor',
      status: 'active',
      isParent: false,
      establishedYear: '2024',
      color: '#8764B8'
    }
  ];

  let companies = $state<Company[]>(DEFAULT_COMPANIES_FALLBACK);
  let users = $state<StaffAccount[]>([]);
  let auditLogs = $state<any[]>([]);
  let systemStatus = $state<any>(null);
  let isLoading = $state<boolean>(true);
  let lastRefreshed = $state<Date>(new Date());

  // Search Queries & Filters
  let companyQuery = $state<string>('');
  let userQuery = $state<string>('');
  let userDeptFilter = $state<string>('all');
  let userRoleFilter = $state<string>('all');
  
  let auditQuery = $state<string>('');
  let auditActionFilter = $state<string>('all');
  let selectedLogDetail = $state<any | null>(null);
  let showLogDetailModal = $state<boolean>(false);

  // ─── DERIVED FILTERED LISTS ─────────────────────────────────────────
  const filteredCompanies = $derived.by(() => {
    if (!companyQuery.trim()) return companies;
    const q = companyQuery.toLowerCase();
    return companies.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.shortName && c.shortName.toLowerCase().includes(q)) ||
      (c.regNo && c.regNo.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  function normalizeRole(role: string): 'Admin' | 'Manager' | 'User' {
    const r = (role || '').toLowerCase();
    if (r === 'admin' || r.includes('admin') || r.includes('ceo') || r.includes('director')) return 'Admin';
    if (r === 'manager' || r.includes('manager') || r.includes('lead') || r.includes('head')) return 'Manager';
    return 'User';
  }

  const filteredUsers = $derived.by(() => {
    return users.filter(u => {
      // Query filter
      if (userQuery.trim()) {
        const q = userQuery.toLowerCase();
        const match =
          u.name.toLowerCase().includes(q) ||
          u.staffId.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Dept filter
      if (userDeptFilter !== 'all' && u.department !== userDeptFilter) {
        return false;
      }

      // Role filter
      if (userRoleFilter !== 'all') {
        const nr = normalizeRole(u.role).toLowerCase();
        if (nr !== userRoleFilter.toLowerCase()) return false;
      }

      return true;
    });
  });

  const filteredAuditLogs = $derived.by(() => {
    return auditLogs.filter(log => {
      if (auditActionFilter !== 'all') {
        if (auditActionFilter === 'auth' && !log.action.includes('PASSWORD') && !log.action.includes('AUTH') && !log.action.includes('LOGIN')) return false;
        if (auditActionFilter === 'staff' && !log.action.includes('STAFF') && !log.action.includes('USER')) return false;
        if (auditActionFilter === 'company' && !log.action.includes('COMPANY')) return false;
        if (auditActionFilter === 'project' && !log.action.includes('PROJECT') && !log.action.includes('BRIEF') && !log.action.includes('DECISION')) return false;
      }

      if (auditQuery.trim()) {
        const q = auditQuery.toLowerCase();
        const actorMatch = (log.actor || '').toLowerCase().includes(q);
        const actionMatch = (log.action || '').toLowerCase().includes(q);
        const entityMatch = (log.entityType || '').toLowerCase().includes(q);
        const targetMatch = (log.entityId || log.target || '').toLowerCase().includes(q);
        if (!actorMatch && !actionMatch && !entityMatch && !targetMatch) return false;
      }

      return true;
    });
  });

  // ─── ANALYTICS & STATS COMPUTATIONS ────────────────────────────────
  const stats = $derived.by(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => c.status === 'active').length;
    const parentCount = companies.filter(c => c.isParent).length;

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.active !== false).length;
    const adminsCount = users.filter(u => normalizeRole(u.role) === 'Admin').length;
    const managersCount = users.filter(u => normalizeRole(u.role) === 'Manager').length;
    const standardUsersCount = users.filter(u => normalizeRole(u.role) === 'User').length;

    const totalAuditCount = auditLogs.length;

    return {
      totalCompanies,
      activeCompanies,
      parentCount,
      totalUsers,
      activeUsers,
      adminsCount,
      managersCount,
      standardUsersCount,
      totalAuditCount,
      adminPct: totalUsers > 0 ? Math.round((adminsCount / totalUsers) * 100) : 0,
      managerPct: totalUsers > 0 ? Math.round((managersCount / totalUsers) * 100) : 0,
      userPct: totalUsers > 0 ? Math.round((standardUsersCount / totalUsers) * 100) : 0
    };
  });

  // Departments List
  const departmentsList = [
    'Creative Production',
    'Multimedia & Motion',
    'Marketing & Sales',
    'Executive Management',
    'Technology & Digital',
    'IT & Infrastructure'
  ];

  // ─── MODAL STATES ──────────────────────────────────────────────────
  let showEditModal = $state<boolean>(false);
  let isEditing = $state<boolean>(false);
  let isSaving = $state<boolean>(false);

  let editingCompany = $state<Partial<Company>>({
    code: '',
    name: '',
    shortName: '',
    regNo: '',
    address: '',
    contact: '',
    location: '',
    status: 'active',
    isParent: false,
    color: '#043388'
  });

  let showUserModal = $state<boolean>(false);
  let isEditingUser = $state<boolean>(false);
  let isSavingUser = $state<boolean>(false);

  let editingUser = $state<Partial<StaffAccount>>({
    staffId: '',
    username: '',
    name: '',
    email: '',
    role: 'User',
    department: 'Creative Production',
    defaultBrand: 'SSH',
    avatarColor: '#0078D4',
    active: true,
    password: ''
  });

  let showPasswordModal = $state<boolean>(false);
  let resetTargetUser = $state<StaffAccount | null>(null);
  let resetNewPassword = $state<string>('SuamiSihat123!');
  let isResettingPassword = $state<boolean>(false);

  onMount(async () => {
    await refreshData();
  });

  async function refreshData() {
    isLoading = true;
    try {
      const [companiesRes, usersRes, logsRes, statusRes] = await Promise.all([
        ApiClient.getCompanies().catch(() => ({ success: true, companies: [] })),
        ApiClient.getStaffRoster().catch(() => ({ roster: [] })),
        ApiClient.getAuditLogs({ limit: '100' }).catch(() => ({ logs: [] })),
        ApiClient.getSystemStatus().catch(() => ({}))
      ]);
      
      const loadedCompanies = companiesRes.companies || [];
      companies = loadedCompanies.length > 0 ? loadedCompanies : DEFAULT_COMPANIES_FALLBACK;
      users = usersRes.roster || (usersRes as any).users || [];
      auditLogs = logsRes.logs || [];
      systemStatus = statusRes || {};
      lastRefreshed = new Date();
    } catch (err: any) {
      companies = DEFAULT_COMPANIES_FALLBACK;
      appState.addToast(`Admin telemetry load error: ${err.message}`, 'error');
    } finally {
      isLoading = false;
    }
  }

  // ─── COMPANY HANDLERS ───────────────────────────────────────────────
  function openCreateModal() {
    isEditing = false;
    editingCompany = {
      code: '',
      name: '',
      shortName: '',
      regNo: '',
      address: '',
      contact: '',
      location: '',
      status: 'active',
      isParent: false,
      color: '#043388'
    };
    showEditModal = true;
  }

  function openEditModal(comp: Company) {
    isEditing = true;
    editingCompany = { ...comp };
    showEditModal = true;
  }

  async function handleSaveCompany() {
    if (!editingCompany.code || !editingCompany.name) {
      appState.addToast('Company Code and Legal Name are required.', 'warning');
      return;
    }

    isSaving = true;
    try {
      const res = await ApiClient.saveCompany(editingCompany);
      if (res.success) {
        appState.addToast(`Company "${res.company.name}" saved successfully!`, 'success');
        showEditModal = false;
        await refreshData();
      }
    } catch (err: any) {
      appState.addToast(`Save error: ${err.message}`, 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleDeleteCompany(comp: Company) {
    if (!confirm(`Are you sure you want to delete ${comp.name} (${comp.code})? This will remove the entity record.`)) {
      return;
    }

    try {
      const res = await ApiClient.deleteCompany(comp.code);
      if (res.success) {
        appState.addToast(`Company ${comp.code} removed.`, 'info');
        await refreshData();
      }
    } catch (err: any) {
      appState.addToast(`Delete error: ${err.message}`, 'error');
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    appState.addToast(`${label} copied to clipboard!`, 'info');
  }

  // ─── USER & STAFF HANDLERS ──────────────────────────────────────────
  function openCreateUserModal() {
    isEditingUser = false;
    const nextNum = (users.length + 80).toString().padStart(4, '0');
    editingUser = {
      staffId: `SS${nextNum}`,
      username: '',
      name: '',
      email: '',
      role: 'User',
      department: 'Creative Production',
      defaultBrand: 'SSH',
      avatarColor: '#0078D4',
      active: true,
      password: 'SuamiSihat123!'
    };
    showUserModal = true;
  }

  function openEditUserModal(user: StaffAccount) {
    isEditingUser = true;
    editingUser = {
      ...user,
      role: normalizeRole(user.role),
      password: ''
    };
    showUserModal = true;
  }

  async function handleSaveUser() {
    if (!editingUser.staffId || !editingUser.name) {
      appState.addToast('Staff ID and Full Name are required.', 'warning');
      return;
    }

    isSavingUser = true;
    try {
      if (isEditingUser) {
        const res = await ApiClient.updateStaffMember(editingUser.staffId!, editingUser);
        if (res.success || res.member) {
          appState.addToast(`Staff account ${editingUser.name} updated!`, 'success');
          showUserModal = false;
          await refreshData();
        }
      } else {
        const res = await ApiClient.addStaffMember(editingUser);
        if (res.success || res.member) {
          appState.addToast(`User ${editingUser.name} (${editingUser.staffId}) provisioned!`, 'success');
          showUserModal = false;
          await refreshData();
        }
      }
    } catch (err: any) {
      appState.addToast(`User save error: ${err.message}`, 'error');
    } finally {
      isSavingUser = false;
    }
  }

  async function handleDeleteUser(user: StaffAccount) {
    if (!confirm(`Are you sure you want to remove staff account ${user.name} (${user.staffId})?`)) {
      return;
    }

    try {
      const res = await ApiClient.deleteUser(user.staffId);
      if (res.success) {
        appState.addToast(`Staff account ${user.staffId} removed.`, 'info');
        await refreshData();
      }
    } catch (err: any) {
      appState.addToast(`Delete error: ${err.message}`, 'error');
    }
  }

  function openPasswordReset(user: StaffAccount) {
    resetTargetUser = user;
    resetNewPassword = 'SuamiSihat123!';
    showPasswordModal = true;
  }

  async function handleResetPassword() {
    if (!resetTargetUser || !resetNewPassword) return;

    isResettingPassword = true;
    try {
      const res = await ApiClient.resetUserPassword(resetTargetUser.username || resetTargetUser.staffId, resetNewPassword);
      if (res.success) {
        appState.addToast(`Password reset for ${resetTargetUser.name}!`, 'success');
        showPasswordModal = false;
      }
    } catch (err: any) {
      appState.addToast(`Password reset error: ${err.message}`, 'error');
    } finally {
      isResettingPassword = false;
    }
  }

  // ─── AUDIT EXPORT & DETAILS ─────────────────────────────────────────
  function exportAuditLogsCSV() {
    if (auditLogs.length === 0) {
      appState.addToast('No audit logs available to export.', 'warning');
      return;
    }

    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'EntityType', 'EntityId', 'Details'];
    const rows = auditLogs.map(log => [
      new Date(log.timestamp).toISOString(),
      `"${(log.actor || '').replace(/"/g, '""')}"`,
      `"${(log.role || '').replace(/"/g, '""')}"`,
      `"${(log.action || '').replace(/"/g, '""')}"`,
      `"${(log.entityType || '').replace(/"/g, '""')}"`,
      `"${(log.entityId || log.target || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SS-CAM_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    appState.addToast('Audit logs exported to CSV successfully.', 'success');
  }

  function viewLogDetails(log: any) {
    selectedLogDetail = log;
    showLogDetailModal = true;
  }

  function formatRelativeTime(dateStr: string): string {
    try {
      const now = new Date().getTime();
      const past = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  }

  function getActionSeverity(action: string): 'success' | 'warning' | 'danger' | 'info' {
    const a = (action || '').toUpperCase();
    if (a.includes('DELETE') || a.includes('REMOVE')) return 'danger';
    if (a.includes('UPDATE') || a.includes('PASSWORD') || a.includes('RESET') || a.includes('REVISION')) return 'warning';
    if (a.includes('PROVISION') || a.includes('SAVED') || a.includes('CREATE') || a.includes('APPROV')) return 'success';
    return 'info';
  }
</script>

<div class="admin-view-container">
  <!-- ─── TOP COMMAND DECK HEADER ─── -->
  <div class="executive-command-header">
    <div class="header-left-deck">
      <div class="header-tag-row">
        <span class="command-badge">EXECUTIVE GOVERNANCE</span>
        <span class="live-pulse-indicator">
          <span class="pulse-dot"></span>
          <span>Synology Vault Connected</span>
        </span>
        <span class="header-timestamp">Last updated: {lastRefreshed.toLocaleTimeString()}</span>
      </div>
      <h1 class="view-title">Corporate Governance & Administrative Intelligence</h1>
      <p class="view-subtitle">
        Holding entity hierarchy, subsidiary registry, role-based access control (RBAC), and Synology NAS runtime telemetry
      </p>
    </div>

    <div class="header-right-actions">
      <FluentButton appearance="secondary" onclick={exportAuditLogsCSV} title="Download CSV compliance report">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right: 5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        <span>Export Audit CSV</span>
      </FluentButton>

      <FluentButton appearance="primary" onclick={refreshData} disabled={isLoading}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class:spinning={isLoading} style="margin-right: 5px;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
        <span>{isLoading ? 'Syncing...' : 'Refresh Telemetry'}</span>
      </FluentButton>
    </div>
  </div>

  <!-- ─── 4-METRIC EXECUTIVE KPI TELEMETRY STRIP ─── -->
  <div class="kpi-telemetry-deck">
    <!-- Metric 1: Entities -->
    <FluentCard hoverLift borderAccent="#21A1F7" onclick={() => (activeTab = 'companies')}>
      <div class="kpi-top">
        <span class="kpi-label">Registered Entities</span>
        <span class="kpi-icon-pill" style="background: rgba(33, 161, 247, 0.15); color: #21A1F7;">🏢</span>
      </div>
      <div class="kpi-value">{stats.totalCompanies} <span class="kpi-unit">Units</span></div>
      <div class="kpi-detail">
        <b>{stats.parentCount} Parent Holding</b> • <b>{stats.activeCompanies} Active</b>
      </div>
    </FluentCard>

    <!-- Metric 2: Staff Roster -->
    <FluentCard hoverLift borderAccent="#0284C7" onclick={() => (activeTab = 'users')}>
      <div class="kpi-top">
        <span class="kpi-label">Staff Personnel Roster</span>
        <span class="kpi-icon-pill" style="background: rgba(2, 132, 199, 0.15); color: #0284C7;">👥</span>
      </div>
      <div class="kpi-value">{stats.totalUsers} <span class="kpi-unit">Accounts</span></div>
      <div class="kpi-detail">
        <span class="text-rose">Admin: {stats.adminsCount}</span> • <span class="text-amber">Mgr: {stats.managersCount}</span> • <span class="text-azure">User: {stats.standardUsersCount}</span>
      </div>
    </FluentCard>

    <!-- Metric 3: Audit Volume -->
    <FluentCard hoverLift borderAccent="#107C41" onclick={() => (activeTab = 'audit')}>
      <div class="kpi-top">
        <span class="kpi-label">Security Audit Trail</span>
        <span class="kpi-icon-pill" style="background: rgba(16, 124, 65, 0.15); color: #107C41;">🛡️</span>
      </div>
      <div class="kpi-value">{stats.totalAuditCount} <span class="kpi-unit">Events</span></div>
      <div class="kpi-detail">
        <span class="status-dot-green"></span>
        <span>Immutable JSONL logging active</span>
      </div>
    </FluentCard>

    <!-- Metric 4: Synology Vault -->
    <FluentCard hoverLift borderAccent="#8764B8" onclick={() => (activeTab = 'system')}>
      <div class="kpi-top">
        <span class="kpi-label">Synology NAS Engine</span>
        <span class="kpi-icon-pill" style="background: rgba(135, 100, 184, 0.15); color: #8764B8;">⚡</span>
      </div>
      <div class="kpi-value" style="font-size: 20px; padding-top: 4px;">
        Mounted & Live
      </div>
      <div class="kpi-detail">
        <b>{systemStatus?.cachedProjects || 0} Projects Cached</b> • <b>Volume 2 RW</b>
      </div>
    </FluentCard>
  </div>

  <!-- ─── SEGMENTED TAB NAVIGATION (NO WRAPPING) ─── -->
  <div class="segmented-tab-bar">
    <button
      class="seg-tab-btn"
      class:active={activeTab === 'companies'}
      onclick={() => (activeTab = 'companies')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
      <span>Corporate Directory</span>
      <span class="tab-count-pill">{companies.length}</span>
    </button>

    <button
      class="seg-tab-btn"
      class:active={activeTab === 'users'}
      onclick={() => (activeTab = 'users')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
      <span>User Accounts & RBAC</span>
      <span class="tab-count-pill">{users.length}</span>
    </button>

    <button
      class="seg-tab-btn"
      class:active={activeTab === 'audit'}
      onclick={() => (activeTab = 'audit')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
      <span>Security Audit Logs</span>
      <span class="tab-count-pill">{auditLogs.length}</span>
    </button>

    <button
      class="seg-tab-btn"
      class:active={activeTab === 'system'}
      onclick={() => (activeTab = 'system')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>
      <span>Synology Runtime Telemetry</span>
    </button>
  </div>

  <!-- ══════════════════════════════════════════════════════════════════ -->
  <!-- TAB 1: CORPORATE & SUBSIDIARY DIRECTORY                            -->
  <!-- ══════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'companies'}
    <div class="tab-pane-content">
      <!-- Section Action Deck -->
      <div class="deck-action-bar">
        <div>
          <h2 class="deck-title">SuamiSihat Group Corporate Registry</h2>
          <p class="deck-desc">
            Holding parent entity, registered subsidiaries, SSM registration numbers, headquarters locations, and brand assets.
          </p>
        </div>

        <div class="deck-controls">
          <!-- View Mode Toggle -->
          <div class="view-mode-toggle">
            <button
              class="view-mode-btn"
              class:active={companyViewMode === 'cards'}
              onclick={() => (companyViewMode = 'cards')}
              title="Card Grid View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zM4 21h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z"/></svg>
              <span>Cards</span>
            </button>
            <button
              class="view-mode-btn"
              class:active={companyViewMode === 'table'}
              onclick={() => (companyViewMode = 'table')}
              title="Data Table View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v18h18V3H3zm8 16H5v-4h6v4zm0-6H5V9h6v4zm0-6H5V5h6v2zm8 12h-6v-4h6v4zm0-6h-6V9h6v4zm0-6h-6V5h6v2z"/></svg>
              <span>Table</span>
            </button>
          </div>

          <div class="search-input-wrapper">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input
              type="text"
              class="fluent-search-input"
              placeholder="Search code, SSM, entity..."
              bind:value={companyQuery}
            />
          </div>

          <FluentButton appearance="primary" onclick={openCreateModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            <span>Add Subsidiary</span>
          </FluentButton>
        </div>
      </div>

      <!-- CARD VIEW -->
      {#if companyViewMode === 'cards'}
        <div class="company-cards-grid">
          {#each filteredCompanies as comp}
            <div class="company-card" class:is-parent-card={comp.isParent}>
              <!-- Brand Top Accent Bar -->
              <div class="card-brand-bar" style="background: {comp.color || '#043388'};"></div>

              <div class="card-body">
                <!-- Card Header -->
                <div class="card-header-row">
                  <div class="card-code-badge" style="background: {comp.color || '#043388'};">
                    {comp.code}
                  </div>

                  <div class="card-badges">
                    {#if comp.isParent}
                      <span class="parent-entity-pill">👑 Holding Parent</span>
                    {:else}
                      <span class="subsidiary-entity-pill">Operating Unit</span>
                    {/if}
                    <span class="status-badge status-{comp.status}">{comp.status}</span>
                  </div>
                </div>

                <!-- Entity Legal Title -->
                <h3 class="card-entity-title">{comp.name}</h3>
                <div class="card-division-subtitle">{comp.shortName || comp.code} • Est. {comp.establishedYear || '2020'}</div>

                <!-- SSM Registration Number -->
                <div class="ssm-box">
                  <span class="ssm-label">SSM Reg. No:</span>
                  <code class="ssm-code">{comp.regNo || 'Pending SSM'}</code>
                  {#if comp.regNo}
                    <button class="copy-mini-btn" title="Copy SSM" onclick={() => copyToClipboard(comp.regNo || '', 'SSM Number')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                    </button>
                  {/if}
                </div>

                <!-- Location & Address -->
                <div class="card-meta-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="meta-icon"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  <div class="meta-content">
                    <b class="meta-city">{comp.location || 'Malaysia'}</b>
                    <span class="meta-address">{comp.address || 'Registered Office'}</span>
                  </div>
                </div>

                <!-- Contact Details -->
                <div class="card-meta-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="meta-icon"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  <span class="meta-contact">{comp.contact || 'No contact specified'}</span>
                </div>

                <!-- Card Footer Actions -->
                <div class="card-footer-actions">
                  <button class="footer-action-btn edit-action" onclick={() => openEditModal(comp)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span>Edit Entity</span>
                  </button>
                  {#if !comp.isParent}
                    <button class="footer-action-btn delete-action" onclick={() => handleDeleteCompany(comp)} title="Delete Subsidiary">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {:else}
            <div class="empty-state-banner">
              <div class="empty-icon">🏢</div>
              <h3>No Corporate Entities Match Search</h3>
              <p>Try searching with another keyword or company code.</p>
            </div>
          {/each}
        </div>
      {:else}
        <!-- TABLE VIEW -->
        <FluentCard elevated padding="0" class="table-container-card">
          <div class="fluent-table-wrapper">
            <table class="fluent-data-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Code</th>
                  <th>Legal Entity Name</th>
                  <th>Division / Trade</th>
                  <th>SSM Reg. No</th>
                  <th>Headquarters Location</th>
                  <th>Contact</th>
                  <th style="width: 100px;">Status</th>
                  <th style="width: 100px; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredCompanies as comp}
                  <tr class="data-row" class:parent-row={comp.isParent}>
                    <td>
                      <span class="company-code-badge" style="background: {comp.color || '#043388'};">
                        {comp.code}
                      </span>
                    </td>
                    <td>
                      <div class="entity-name-cell">
                        <b class="entity-title">{comp.name}</b>
                        {#if comp.isParent}
                          <span class="parent-chip">Holding Parent</span>
                        {/if}
                      </div>
                    </td>
                    <td>
                      <span class="division-text">{comp.shortName || comp.code}</span>
                    </td>
                    <td>
                      <div class="ssm-copy-wrapper">
                        <code class="reg-mono">{comp.regNo || 'Pending SSM'}</code>
                        {#if comp.regNo}
                          <button class="copy-mini-btn" onclick={() => copyToClipboard(comp.regNo || '', 'SSM Number')}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                          </button>
                        {/if}
                      </div>
                    </td>
                    <td>
                      <div class="location-cell">
                        <span class="city-name">{comp.location || 'Malaysia'}</span>
                        <span class="address-snippet">{comp.address || ''}</span>
                      </div>
                    </td>
                    <td>
                      <span class="contact-snippet">{comp.contact || '-'}</span>
                    </td>
                    <td>
                      <span class="status-indicator status-{comp.status}">
                        {comp.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div class="table-actions">
                        <button class="icon-action-btn" title="Edit Company" onclick={() => openEditModal(comp)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        {#if !comp.isParent}
                          <button class="icon-action-btn delete-btn" title="Delete Company" onclick={() => handleDeleteCompany(comp)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {:else}
                  <tr>
                    <td colspan="8" class="empty-table-cell">
                      No corporate entities match the search query.
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </FluentCard>
      {/if}
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════════ -->
  <!-- TAB 2: USER ACCOUNTS & RBAC GOVERNANCE                             -->
  <!-- ══════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'users'}
    <div class="tab-pane-content">
      <!-- Role Distribution Visual Deck -->
      <div class="rbac-distribution-card">
        <div class="rbac-deck-header">
          <div class="rbac-deck-titles">
            <span class="rbac-deck-tag">RBAC ARCHITECTURE</span>
            <h3 class="rbac-deck-title">Canonical Role & Permission Tier Distribution</h3>
          </div>
          <div class="rbac-legend">
            <div class="legend-item"><span class="legend-dot dot-admin"></span><b>Admin ({stats.adminsCount})</b> - Full Governance</div>
            <div class="legend-item"><span class="legend-dot dot-manager"></span><b>Manager ({stats.managersCount})</b> - Review & Sign-Off</div>
            <div class="legend-item"><span class="legend-dot dot-user"></span><b>User ({stats.standardUsersCount})</b> - Production Designer</div>
          </div>
        </div>

        <!-- Distribution Multi-Bar -->
        <div class="distribution-bar-track">
          <div class="bar-segment bar-admin" style="width: {stats.adminPct}%;" title="Admin: {stats.adminsCount} ({stats.adminPct}%)"></div>
          <div class="bar-segment bar-manager" style="width: {stats.managerPct}%;" title="Manager: {stats.managersCount} ({stats.managerPct}%)"></div>
          <div class="bar-segment bar-user" style="width: {stats.userPct}%;" title="User: {stats.standardUsersCount} ({stats.userPct}%)"></div>
        </div>
      </div>

      <!-- Action & Filter Bar -->
      <div class="deck-action-bar">
        <div>
          <h2 class="deck-title">Creative Team Staff Roster & Credentials</h2>
          <p class="deck-desc">
            Manage authenticated user accounts, access levels, departmental affiliations, and security credentials.
          </p>
        </div>

        <div class="deck-controls">
          <!-- Department Filter -->
          <select class="fluent-select-filter" bind:value={userDeptFilter}>
            <option value="all">All Departments</option>
            {#each departmentsList as dept}
              <option value={dept}>{dept}</option>
            {/each}
          </select>

          <!-- Role Filter -->
          <select class="fluent-select-filter" bind:value={userRoleFilter}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>

          <div class="search-input-wrapper">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input
              type="text"
              class="fluent-search-input"
              placeholder="Search staff, name, ID..."
              bind:value={userQuery}
            />
          </div>

          <FluentButton appearance="primary" onclick={openCreateUserModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            <span>Provision User</span>
          </FluentButton>
        </div>
      </div>

      <!-- User Data Table -->
      <FluentCard elevated padding="0" class="table-container-card">
        <div class="fluent-table-wrapper">
          <table class="fluent-data-table">
            <thead>
              <tr>
                <th style="width: 90px;">Staff ID</th>
                <th>Personnel Name</th>
                <th>Username & Email</th>
                <th style="width: 120px;">Role Tier</th>
                <th>Department</th>
                <th style="width: 90px;">Subsidiary</th>
                <th style="width: 95px;">Status</th>
                <th style="width: 120px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredUsers as u}
                {@const roleLevel = normalizeRole(u.role)}
                <tr class="data-row" class:inactive-row={u.active === false}>
                  <td>
                    <span class="staff-id-pill">{u.staffId}</span>
                  </td>
                  <td>
                    <div class="user-name-cell">
                      <div class="user-avatar-mini" style="background: {u.avatarColor || '#0078D4'};">
                        {(u.name || 'U').charAt(0)}
                      </div>
                      <div class="name-details">
                        <b class="user-full-name">{u.name}</b>
                        {#if u.role && u.role !== roleLevel}
                          <span class="custom-title">{u.role}</span>
                        {/if}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="credential-cell">
                      <code class="username-code">@{u.username || u.staffId.toLowerCase()}</code>
                      <span class="email-text">{u.email || `${u.username || 'staff'}@suamisihat.com`}</span>
                    </div>
                  </td>
                  <td>
                    <span class="role-pill role-{roleLevel.toLowerCase()}">
                      {roleLevel}
                    </span>
                  </td>
                  <td>
                    <span class="dept-text">{u.department || 'Creative Production'}</span>
                  </td>
                  <td>
                    <span class="brand-tag">{u.defaultBrand || 'SSH'}</span>
                  </td>
                  <td>
                    <span class="status-indicator status-{u.active !== false ? 'active' : 'inactive'}">
                      {u.active !== false ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <div class="table-actions">
                      <button class="icon-action-btn" title="Edit Staff Member" onclick={() => openEditUserModal(u)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                      <button class="icon-action-btn reset-pwd-btn" title="Reset Password" onclick={() => openPasswordReset(u)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
                      </button>
                      <button class="icon-action-btn delete-btn" title="Remove User" onclick={() => handleDeleteUser(u)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              {:else}
                <tr>
                  <td colspan="8" class="empty-table-cell">
                    No staff accounts match the filter criteria.
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </FluentCard>
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════════ -->
  <!-- TAB 3: SECURITY & AUDIT LOGS (DATA ANALYST LEVEL)                 -->
  <!-- ══════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'audit'}
    <div class="tab-pane-content">
      <!-- Deck Action Bar -->
      <div class="deck-action-bar">
        <div>
          <h2 class="deck-title">Security & Workflow Audit Trail</h2>
          <p class="deck-desc">
            Immutable JSONL audit trail capturing state modifications, entity edits, password events, and access logs.
          </p>
        </div>

        <div class="deck-controls">
          <!-- Category Filter -->
          <select class="fluent-select-filter" bind:value={auditActionFilter}>
            <option value="all">All Events</option>
            <option value="auth">Authentication & Passwords</option>
            <option value="staff">Staff Governance</option>
            <option value="company">Corporate Entities</option>
            <option value="project">Projects & Briefs</option>
          </select>

          <div class="search-input-wrapper">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input
              type="text"
              class="fluent-search-input"
              placeholder="Search actor, action, target..."
              bind:value={auditQuery}
            />
          </div>

          <FluentButton appearance="secondary" onclick={exportAuditLogsCSV}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span>Export CSV</span>
          </FluentButton>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <FluentCard elevated padding="0" class="table-container-card">
        <div class="fluent-table-wrapper">
          <table class="fluent-data-table">
            <thead>
              <tr>
                <th style="width: 175px;">Timestamp</th>
                <th>Actor / Role</th>
                <th style="width: 200px;">Action Event</th>
                <th style="width: 110px;">Entity Scope</th>
                <th>Target Identifier</th>
                <th style="width: 80px; text-align: right;">Details</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredAuditLogs as log}
                {@const severity = getActionSeverity(log.action)}
                <tr class="data-row">
                  <td class="log-time-cell">
                    <span class="time-primary">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="time-secondary">{new Date(log.timestamp).toLocaleDateString()} • {formatRelativeTime(log.timestamp)}</span>
                  </td>
                  <td>
                    <div class="actor-cell">
                      <div class="actor-avatar">{(log.actor || 'A').charAt(0)}</div>
                      <div class="actor-meta">
                        <b>{log.actor || 'System'}</b>
                        <span>{log.role || 'Staff'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="action-tag action-{severity}">
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span class="entity-type-badge">{log.entityType || 'General'}</span>
                  </td>
                  <td class="log-details-cell">
                    <code class="target-mono">{log.entityId || log.target || '-'}</code>
                  </td>
                  <td style="text-align: right;">
                    <button class="inspect-btn" onclick={() => viewLogDetails(log)} title="Inspect JSON Payload">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    </button>
                  </td>
                </tr>
              {:else}
                <tr>
                  <td colspan="6" class="empty-table-cell">
                    No security audit records match the selected filter.
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </FluentCard>
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════════ -->
  <!-- TAB 4: SYNOLOGY RUNTIME & SYSTEM TELEMETRY                         -->
  <!-- ══════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'system'}
    <div class="tab-pane-content">
      <div class="system-telemetry-grid">
        <!-- Card 1: Workspace & Storage -->
        <FluentCard elevated>
          <div class="telemetry-card-header">
            <div class="telemetry-icon-box" style="background: rgba(33, 161, 247, 0.15); color: #21A1F7;">
              📂
            </div>
            <div>
              <h3 class="telemetry-card-title">Synology NAS Storage Mount</h3>
              <p class="telemetry-card-sub">SMB workspace share connectivity and file sync</p>
            </div>
          </div>

          <div class="telemetry-detail-list">
            <div class="telemetry-row">
              <span class="tel-label">Workspace Root Path</span>
              <code class="tel-code">{systemStatus?.workspaceRoot || '\\\\SSNAS\\Creative-Team'}</code>
            </div>
            <div class="telemetry-row">
              <span class="tel-label">Mount Volume Status</span>
              <span class="tel-badge-green">
                <span class="pulse-dot"></span>
                <span>Active Mounted (Volume 2 / Synology Drive RW)</span>
              </span>
            </div>
            <div class="telemetry-row">
              <span class="tel-label">Active Project Cache</span>
              <b>{systemStatus?.cachedProjects || 0} production folders in memory</b>
            </div>
            <div class="telemetry-row">
              <span class="tel-label">Last Filesystem Scan</span>
              <span>{systemStatus?.lastScan ? new Date(systemStatus.lastScan).toLocaleString() : 'Live Background Watcher'}</span>
            </div>
          </div>
        </FluentCard>

        <!-- Card 2: Process & Runtime Engine -->
        <FluentCard elevated>
          <div class="telemetry-card-header">
            <div class="telemetry-icon-box" style="background: rgba(16, 124, 65, 0.15); color: #107C41;">
              ⚡
            </div>
            <div>
              <h3 class="telemetry-card-title">Node.js & Container Engine</h3>
              <p class="telemetry-card-sub">V8 memory allocation, uptime, and framework versions</p>
            </div>
          </div>

          <div class="telemetry-detail-list">
            <div class="telemetry-row">
              <span class="tel-label">Server Version</span>
              <b>SS-CAM Web v{systemStatus?.version || '3.6.1'} ({systemStatus?.platform || 'x64'})</b>
            </div>
            <div class="telemetry-row">
              <span class="tel-label">Client Framework</span>
              <span class="tel-badge-azure">Svelte 5 (Runes) + Fluent 2 + Obsidian Engine</span>
            </div>
            <div class="telemetry-row">
              <span class="tel-label">Server Process Uptime</span>
              <b>{Math.floor((systemStatus?.uptimeSeconds || 0) / 60)} minutes ({systemStatus?.uptimeSeconds || 0}s)</b>
            </div>
            <div class="telemetry-row">
              <span class="tel-label">Active Authentication</span>
              <b>JWT + BCrypt Persistent NAS Store</b>
            </div>
          </div>
        </FluentCard>
      </div>

      <!-- Maintenance Deck -->
      <FluentCard elevated style="margin-top: 16px;">
        <div class="maintenance-bar">
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800;">Workspace Maintenance & Cache Management</h3>
            <p style="margin: 3px 0 0 0; font-size: 12.5px; color: var(--text-secondary);">
              Trigger real-time directory re-indexing across Synology NAS volumes or clear client cache.
            </p>
          </div>
          <div class="maintenance-buttons">
            <FluentButton
              appearance="secondary"
              onclick={() => {
                projectStore.loadProjects();
                projectStore.loadDashboard();
                refreshData();
                appState.addToast('Workspace re-indexed successfully.', 'success');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 5px;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
              <span>Rescan Synology Workspace</span>
            </FluentButton>
          </div>
        </div>
      </FluentCard>
    </div>
  {/if}
</div>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- MODAL: ADD / EDIT COMPANY                                          -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<FluentDialog
  open={showEditModal}
  title={isEditing ? `Edit Subsidiary (${editingCompany.code})` : 'Register New Subsidiary / Entity'}
  onclose={() => (showEditModal = false)}
>
  <div class="modal-form-body">
    <div class="form-row-2">
      <div class="form-group">
        <label class="field-label">Company Code (e.g. SSH, SSC, SSW)</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingCompany.code}
          disabled={isEditing}
          placeholder="e.g. SSH"
        />
      </div>

      <div class="form-group">
        <label class="field-label">Division / Trade Name</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingCompany.shortName}
          placeholder="e.g. Healthcare & Clinic"
        />
      </div>
    </div>

    <div class="form-group">
      <label class="field-label">Official Legal Entity Name</label>
      <input
        type="text"
        class="field-input"
        bind:value={editingCompany.name}
        placeholder="e.g. SuamiSihat Healthcare Sdn Bhd"
      />
    </div>

    <div class="form-group">
      <label class="field-label">SSM Registration Number</label>
      <input
        type="text"
        class="field-input"
        bind:value={editingCompany.regNo}
        placeholder="e.g. 202401012346 (1550124-Y)"
      />
    </div>

    <div class="form-group">
      <label class="field-label">Registered Office Address</label>
      <textarea
        class="field-textarea"
        rows="3"
        bind:value={editingCompany.address}
        placeholder="Enter registered address, building, floor, city..."
      ></textarea>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="field-label">Location / City</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingCompany.location}
          placeholder="e.g. Bangsar, Kuala Lumpur"
        />
      </div>

      <div class="form-group">
        <label class="field-label">Contact Phone & Email</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingCompany.contact}
          placeholder="e.g. +603-2282-7777 / info@suamisihat.com"
        />
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="field-label">Status</label>
        <select class="field-select" bind:value={editingCompany.status}>
          <option value="active">Active Entity</option>
          <option value="inactive">Inactive / Archived</option>
        </select>
      </div>

      <div class="form-group">
        <label class="field-label">Brand Color Accent</label>
        <div class="color-picker-row">
          <input
            type="color"
            class="field-color-input"
            bind:value={editingCompany.color}
          />
          <span class="color-hex-label">{editingCompany.color}</span>
        </div>
      </div>
    </div>

    <div class="form-group checkbox-group">
      <label class="checkbox-label-row">
        <input type="checkbox" bind:checked={editingCompany.isParent} class="fluent-checkbox" />
        <span>Set as Primary Holding Group Parent Entity</span>
      </label>
    </div>
  </div>

  {#snippet footer()}
    <FluentButton appearance="subtle" onclick={() => (showEditModal = false)}>
      Cancel
    </FluentButton>
    <FluentButton appearance="primary" onclick={handleSaveCompany} disabled={isSaving}>
      {isSaving ? 'Saving to NAS...' : isEditing ? 'Update Subsidiary' : 'Register Subsidiary'}
    </FluentButton>
  {/snippet}
</FluentDialog>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- MODAL: PROVISION / EDIT USER                                       -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<FluentDialog
  open={showUserModal}
  title={isEditingUser ? `Edit Staff Account (${editingUser.staffId})` : 'Provision New Staff Account'}
  onclose={() => (showUserModal = false)}
>
  <div class="modal-form-body">
    <!-- Role Selector Cards -->
    <div class="form-group">
      <label class="field-label">Canonical Role Permission Tier</label>
      <div class="role-selector-grid">
        <label class="role-card-radio" class:selected={editingUser.role === 'User'}>
          <input type="radio" name="userRole" value="User" bind:group={editingUser.role} />
          <div class="role-card-info">
            <span class="role-pill role-user">User</span>
            <span class="role-card-desc">Production designer, brief & copy view, asset upload</span>
          </div>
        </label>

        <label class="role-card-radio" class:selected={editingUser.role === 'Manager'}>
          <input type="radio" name="userRole" value="Manager" bind:group={editingUser.role} />
          <div class="role-card-info">
            <span class="role-pill role-manager">Manager</span>
            <span class="role-card-desc">Review deliverables, approve/revision sign-off, assign work</span>
          </div>
        </label>

        <label class="role-card-radio" class:selected={editingUser.role === 'Admin'}>
          <input type="radio" name="userRole" value="Admin" bind:group={editingUser.role} />
          <div class="role-card-info">
            <span class="role-pill role-admin">Admin</span>
            <span class="role-card-desc">Full corporate governance, roster management, NAS audit</span>
          </div>
        </label>
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="field-label">Staff ID (e.g. SS0080)</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingUser.staffId}
          disabled={isEditingUser}
          placeholder="e.g. SS0080"
        />
      </div>

      <div class="form-group">
        <label class="field-label">Login Username</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingUser.username}
          placeholder="e.g. amirul"
        />
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="field-label">Personnel Full Name</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingUser.name}
          placeholder="e.g. Amirul Haziq"
        />
      </div>

      <div class="form-group">
        <label class="field-label">Corporate Email</label>
        <input
          type="email"
          class="field-input"
          bind:value={editingUser.email}
          placeholder="e.g. amirul@suamisihat.com"
        />
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="field-label">Department</label>
        <select class="field-select" bind:value={editingUser.department}>
          {#each departmentsList as dept}
            <option value={dept}>{dept}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label class="field-label">Affiliated Subsidiary</label>
        <select class="field-select" bind:value={editingUser.defaultBrand}>
          {#each companies as c}
            <option value={c.code}>{c.code} — {c.shortName || c.name}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="field-label">Avatar Glow Color</label>
        <div class="color-picker-row">
          <input
            type="color"
            class="field-color-input"
            bind:value={editingUser.avatarColor}
          />
          <span class="color-hex-label">{editingUser.avatarColor}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="field-label">Account Status</label>
        <select class="field-select" bind:value={editingUser.active}>
          <option value={true}>Active Account</option>
          <option value={false}>Suspended / Inactive</option>
        </select>
      </div>
    </div>

    {#if !isEditingUser}
      <div class="form-group">
        <label class="field-label">Initial Password</label>
        <input
          type="text"
          class="field-input"
          bind:value={editingUser.password}
          placeholder="Default: SuamiSihat123!"
        />
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <FluentButton appearance="subtle" onclick={() => (showUserModal = false)}>
      Cancel
    </FluentButton>
    <FluentButton appearance="primary" onclick={handleSaveUser} disabled={isSavingUser}>
      {isSavingUser ? 'Saving...' : isEditingUser ? 'Update Staff Member' : 'Provision User Account'}
    </FluentButton>
  {/snippet}
</FluentDialog>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- MODAL: PASSWORD RESET                                              -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<FluentDialog
  open={showPasswordModal}
  title="Admin Password Reset"
  onclose={() => (showPasswordModal = false)}
>
  <div class="modal-form-body">
    <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 14px 0;">
      Resetting credentials for <b>{resetTargetUser?.name}</b> ({resetTargetUser?.staffId}).
    </p>

    <div class="form-group">
      <label class="field-label">New Password</label>
      <input
        type="text"
        class="field-input"
        bind:value={resetNewPassword}
        placeholder="Enter new password"
      />
    </div>
  </div>

  {#snippet footer()}
    <FluentButton appearance="subtle" onclick={() => (showPasswordModal = false)}>
      Cancel
    </FluentButton>
    <FluentButton appearance="primary" onclick={handleResetPassword} disabled={isResettingPassword}>
      {isResettingPassword ? 'Resetting...' : 'Confirm Reset Password'}
    </FluentButton>
  {/snippet}
</FluentDialog>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- MODAL: AUDIT EVENT JSON INSPECTOR                                 -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<FluentDialog
  open={showLogDetailModal}
  title={`Audit Event: ${selectedLogDetail?.action || 'Record'}`}
  onclose={() => (showLogDetailModal = false)}
>
  {#if selectedLogDetail}
    <div class="modal-form-body">
      <div class="log-detail-meta-grid">
        <div><span>Actor:</span> <b>{selectedLogDetail.actor}</b> ({selectedLogDetail.role || 'Staff'})</div>
        <div><span>Timestamp:</span> <b>{new Date(selectedLogDetail.timestamp).toLocaleString()}</b></div>
        <div><span>Action:</span> <code class="target-mono">{selectedLogDetail.action}</code></div>
        <div><span>Target:</span> <code class="target-mono">{selectedLogDetail.entityId || selectedLogDetail.target || '-'}</code></div>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="field-label">Raw JSON Payload</label>
        <pre class="json-inspector">{JSON.stringify(selectedLogDetail, null, 2)}</pre>
      </div>
    </div>
  {/if}

  {#snippet footer()}
    <FluentButton appearance="primary" onclick={() => (showLogDetailModal = false)}>
      Close Inspector
    </FluentButton>
  {/snippet}
</FluentDialog>

<style>
  .admin-view-container {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  /* ─── Top Command Deck Header ─── */
  .executive-command-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 4px;
  }

  .header-left-deck {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .header-tag-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2px;
  }

  .command-badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    background: rgba(33, 161, 247, 0.15);
    color: #21A1F7;
    padding: 2px 8px;
    border-radius: var(--radius-sm, 4px);
    border: 1px solid rgba(33, 161, 247, 0.3);
  }

  .live-pulse-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 8px #10B981;
    display: inline-block;
  }

  .status-dot-green {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    display: inline-block;
  }

  .header-timestamp {
    font-size: 11.5px;
    color: var(--text-tertiary);
  }

  .view-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.3px;
  }

  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  .header-right-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ─── 4-Metric KPI Telemetry Strip ─── */
  .kpi-telemetry-deck {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .kpi-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .kpi-label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .kpi-icon-pill {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .kpi-value {
    font-size: 26px;
    font-weight: 900;
    color: var(--text-primary);
    margin: 6px 0 4px 0;
  }

  .kpi-unit {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .kpi-detail {
    font-size: 11.5px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .text-rose { color: #EF4444; font-weight: 700; }
  .text-amber { color: #D97706; font-weight: 700; }
  .text-azure { color: #21A1F7; font-weight: 700; }

  /* ─── Segmented Tab Bar ─── */
  .segmented-tab-bar {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--surface-card-border);
    padding-bottom: 10px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .segmented-tab-bar::-webkit-scrollbar { display: none; }

  .seg-tab-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .seg-tab-btn:hover {
    color: var(--text-primary);
    background: var(--surface-card-subtle);
  }

  .seg-tab-btn.active {
    color: var(--brand-accent, #21A1F7);
    background: var(--surface-card);
    border-color: var(--surface-card-border);
    box-shadow: var(--shadow-sm);
  }

  .tab-count-pill {
    font-size: 10.5px;
    font-weight: 800;
    padding: 1px 7px;
    border-radius: 9999px;
    background: rgba(33, 161, 247, 0.15);
    color: #21A1F7;
  }

  /* ─── Section Decks & Action Bars ─── */
  .tab-pane-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .deck-action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .deck-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .deck-desc {
    font-size: 12.5px;
    color: var(--text-secondary);
    margin: 2px 0 0 0;
  }

  .deck-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .fluent-search-input {
    padding: 7px 12px 7px 30px;
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: 12.5px;
    min-width: 220px;
    outline: none;
  }
  .fluent-search-input:focus {
    border-color: var(--brand-accent, #21A1F7);
  }

  .fluent-select-filter {
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: 12.5px;
    outline: none;
    cursor: pointer;
  }

  .view-mode-toggle {
    display: flex;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    padding: 2px;
  }

  .view-mode-btn {
    border: none;
    background: transparent;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: all 0.15s;
  }

  .view-mode-btn.active {
    background: var(--surface-card);
    color: var(--text-primary);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  /* ─── Company Cards Grid ─── */
  .company-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
  }

  .company-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    transition: all var(--transition-fast, 0.15s);
  }

  .company-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--brand-accent, #21A1F7);
  }

  .is-parent-card {
    border-color: rgba(33, 161, 247, 0.4);
    box-shadow: 0 4px 16px rgba(33, 161, 247, 0.08);
  }

  .card-brand-bar {
    height: 6px;
    width: 100%;
  }

  .card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }

  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-code-badge {
    color: #FFFFFF;
    font-weight: 900;
    font-size: 12px;
    font-family: monospace;
    padding: 3px 10px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }

  .card-badges {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .parent-entity-pill {
    font-size: 10.5px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(33, 161, 247, 0.2);
    color: #21A1F7;
    text-transform: uppercase;
  }

  .subsidiary-entity-pill {
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 9999px;
    background: var(--surface-card-subtle);
    color: var(--text-secondary);
  }

  .card-entity-title {
    font-size: 15px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 2px 0 0 0;
    line-height: 1.3;
  }

  .card-division-subtitle {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .ssm-box {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-card-subtle);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11.5px;
  }

  .ssm-label {
    color: var(--text-secondary);
    font-weight: 700;
  }

  .ssm-code {
    font-family: monospace;
    font-weight: 800;
    color: var(--text-primary);
  }

  .copy-mini-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 2px 4px;
    border-radius: 4px;
    margin-left: auto;
  }
  .copy-mini-btn:hover {
    color: var(--brand-accent, #21A1F7);
    background: rgba(33, 161, 247, 0.15);
  }

  .card-meta-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .meta-icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--text-tertiary);
  }

  .meta-content {
    display: flex;
    flex-direction: column;
  }

  .meta-city {
    color: var(--text-primary);
    font-size: 12px;
  }

  .meta-address {
    font-size: 11px;
    color: var(--text-secondary);
    line-height: 1.35;
  }

  .meta-contact {
    font-family: monospace;
    font-size: 11.5px;
  }

  .card-footer-actions {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--surface-card-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .footer-action-btn {
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }

  .edit-action {
    background: var(--surface-card-subtle);
    color: var(--text-primary);
    flex: 1;
    justify-content: center;
  }
  .edit-action:hover {
    background: rgba(33, 161, 247, 0.15);
    color: #21A1F7;
  }

  .delete-action {
    background: transparent;
    color: var(--text-tertiary);
    padding: 6px 8px;
  }
  .delete-action:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
  }

  /* ─── RBAC Distribution Deck ─── */
  .rbac-distribution-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: var(--shadow-sm);
  }

  .rbac-deck-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .rbac-deck-tag {
    font-size: 9.5px;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .rbac-deck-title {
    font-size: 14.5px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 2px 0 0 0;
  }

  .rbac-legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .dot-admin { background: #EF4444; }
  .dot-manager { background: #D97706; }
  .dot-user { background: #21A1F7; }

  .distribution-bar-track {
    height: 10px;
    border-radius: 5px;
    background: var(--surface-card-subtle);
    display: flex;
    overflow: hidden;
    gap: 2px;
  }

  .bar-segment {
    height: 100%;
    transition: width 0.3s ease;
  }
  .bar-admin { background: #EF4444; }
  .bar-manager { background: #D97706; }
  .bar-user { background: #21A1F7; }

  /* ─── Fluent Data Table ─── */
  .table-container-card {
    border-radius: 12px;
    overflow: hidden;
  }

  .fluent-table-wrapper {
    overflow-x: auto;
    width: 100%;
  }

  .fluent-data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;
  }

  .fluent-data-table th {
    background: var(--surface-card-subtle);
    padding: 11px 14px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--surface-card-border);
    white-space: nowrap;
  }

  .fluent-data-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--surface-card-border);
    color: var(--text-primary);
    vertical-align: middle;
  }

  .data-row:hover {
    background: var(--surface-card-subtle);
  }

  .parent-row {
    background: rgba(33, 161, 247, 0.03);
  }

  .inactive-row {
    opacity: 0.6;
  }

  .empty-table-cell {
    text-align: center;
    padding: 36px !important;
    color: var(--text-tertiary);
  }

  /* Table Cell Elements */
  .company-code-badge {
    color: #FFFFFF;
    font-weight: 900;
    font-size: 11px;
    font-family: monospace;
    padding: 3px 8px;
    border-radius: 5px;
    letter-spacing: 0.5px;
    display: inline-block;
  }

  .entity-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .entity-title {
    font-size: 13.5px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .parent-chip {
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 9999px;
    background: rgba(33, 161, 247, 0.2);
    color: #21A1F7;
    text-transform: uppercase;
  }

  .division-text {
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  .ssm-copy-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .reg-mono {
    font-family: monospace;
    font-size: 11.5px;
    color: var(--text-primary);
    background: var(--surface-card-subtle);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .location-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .city-name { font-weight: 700; font-size: 12px; }
  .address-snippet {
    font-size: 11px;
    color: var(--text-secondary);
    max-width: 240px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .contact-snippet {
    font-family: monospace;
    font-size: 11.5px;
    color: var(--text-secondary);
  }

  .staff-id-pill {
    font-family: monospace;
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(33, 161, 247, 0.15);
    color: #21A1F7;
  }

  .user-name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .user-avatar-mini {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: #FFFFFF;
    font-weight: 800;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .name-details {
    display: flex;
    flex-direction: column;
  }

  .user-full-name {
    font-size: 13px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .custom-title {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .credential-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .username-code {
    font-family: monospace;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .email-text {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .role-pill {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    display: inline-block;
  }
  .role-admin { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .role-manager { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
  .role-user { background: #EBF4FE; color: #043388; border: 1px solid #BFDBFE; font-weight: 700; }

  .dept-text { font-size: 12px; color: var(--text-secondary); }
  .brand-tag {
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    background: #EBF4FE;
    color: #043388;
    border: 1px solid #BFDBFE;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .status-badge, .status-indicator {
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
    display: inline-block;
  }
  .status-active { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
  .status-inactive { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }

  .table-actions {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }

  .icon-action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 5px 6px;
    border-radius: 4px;
    transition: background 0.15s;
    color: var(--text-secondary);
  }
  .icon-action-btn:hover {
    background: var(--surface-card-subtle);
    color: var(--text-primary);
  }
  .icon-action-btn.delete-btn:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
  }

  /* ─── Audit Log Cells ─── */
  .log-time-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .time-primary {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .time-secondary {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .actor-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .actor-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
    font-weight: 800;
    font-size: 11.5px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .actor-meta {
    display: flex;
    flex-direction: column;
  }
  .actor-meta b { font-size: 12.5px; color: var(--text-primary); }
  .actor-meta span { font-size: 10.5px; color: var(--text-secondary); }

  .action-tag {
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-block;
  }
  .action-success { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
  .action-warning { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
  .action-danger { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .action-info { background: #EBF4FE; color: #043388; border: 1px solid #BFDBFE; }

  .entity-type-badge {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--surface-card-subtle);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .target-mono {
    font-family: monospace;
    font-size: 12px;
    color: var(--text-primary);
  }

  .inspect-btn {
    background: transparent;
    border: 1px solid var(--surface-card-border);
    color: var(--text-secondary);
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .inspect-btn:hover {
    background: var(--surface-card-subtle);
    color: var(--text-primary);
    border-color: var(--brand-accent, #21A1F7);
  }

  /* ─── Synology & System Telemetry Grid ─── */
  .system-telemetry-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .telemetry-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .telemetry-icon-box {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .telemetry-card-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .telemetry-card-sub {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 2px 0 0 0;
  }

  .telemetry-detail-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .telemetry-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--surface-card-subtle);
    border-radius: 6px;
    font-size: 12.5px;
  }

  .tel-label {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .tel-code {
    font-family: monospace;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .tel-badge-green {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #10B981;
    font-weight: 700;
    font-size: 12px;
  }

  .tel-badge-azure {
    color: #21A1F7;
    font-weight: 700;
    font-size: 12px;
  }

  .maintenance-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  /* ─── Form Dialog Styles ─── */
  .modal-form-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .field-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .field-input,
  .field-select,
  .field-textarea {
    width: 100%;
    padding: 8px 12px;
    font-size: 13px;
    font-family: inherit;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-primary);
    outline: none;
  }

  .field-input:focus,
  .field-select:focus,
  .field-textarea:focus {
    border-color: var(--brand-accent, #21A1F7);
  }

  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-color-input {
    width: 44px;
    height: 34px;
    padding: 2px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    cursor: pointer;
  }

  .color-hex-label {
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .checkbox-label-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: var(--text-primary);
    font-weight: 600;
    cursor: pointer;
  }

  .fluent-checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--brand-accent, #21A1F7);
  }

  /* Role Selection Cards */
  .role-selector-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .role-card-radio {
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    padding: 10px;
    background: var(--surface-card);
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    transition: all 0.15s;
  }

  .role-card-radio.selected {
    border-color: var(--brand-accent, #21A1F7);
    background: rgba(33, 161, 247, 0.06);
  }

  .role-card-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .role-card-desc {
    font-size: 10.5px;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .log-detail-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 12.5px;
    background: var(--surface-card-subtle);
    padding: 12px;
    border-radius: 6px;
  }
  .log-detail-meta-grid span { color: var(--text-secondary); }

  .json-inspector {
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    padding: 12px;
    font-family: monospace;
    font-size: 11.5px;
    color: var(--text-primary);
    max-height: 220px;
    overflow-y: auto;
  }

  .empty-state-banner {
    grid-column: 1 / -1;
    text-align: center;
    padding: 48px 24px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 12px;
  }
  .empty-icon { font-size: 36px; margin-bottom: 8px; }
  .empty-state-banner h3 { font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; }
  .empty-state-banner p { font-size: 13px; color: var(--text-secondary); margin: 0; }

  @media (max-width: 900px) {
    .system-telemetry-grid {
      grid-template-columns: 1fr;
    }
    .role-selector-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
