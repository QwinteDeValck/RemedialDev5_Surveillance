const COLORS = ['#D32F2F', '#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#00796B', '#5D4037', '#C2185B'];

function avatarStyle(username) {
  const initial = username.charAt(0).toUpperCase();
  const color = COLORS[initial.charCodeAt(0) % COLORS.length];
  return { initial, color };
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = '/auth/login.html';
    return;
  }

  const currentUser = getUser();
  const currentRoleLevel = ROLE_LEVELS[currentUser.role_name] || 0;
  if (currentRoleLevel < ROLE_LEVELS.MODERATOR) {
    window.location.href = '/';
    return;
  }

  const loading = document.getElementById('loading');
  const content = document.getElementById('dashboardContent');
  const cards = document.getElementById('dashboardCards');
  const error = document.getElementById('error');

  try {
    const res = await fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) throw new Error('Failed to load dashboard');

    const data = await res.json();

    const items = [
      { label: 'Total Users', value: data.total_users },
      { label: 'Active Users', value: data.active_users },
      { label: 'Deleted Users', value: data.deleted_users },
      { label: 'Moderators & Above', value: data.moderator_plus },
      { label: 'Total Observations', value: data.total_observations },
      { label: 'Public Observations', value: data.public_observations },
      { label: 'Pending Requests', value: data.pending_requests },
    ];

    cards.innerHTML = items.map(item => `
      <div class="feature-card" style="text-align:center">
        <h3 style="font-size:2rem;margin-bottom:0.5rem;color:#1E1E1E">${item.value}</h3>
        <p style="color:#666;font-size:0.9rem">${item.label}</p>
      </div>
    `).join('');

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch {
    loading.style.display = 'none';
    error.style.display = 'block';
    error.textContent = 'Could not load dashboard data.';
  }

  // ----- Users -----
  const usersLoading = document.getElementById('usersLoading');
  const usersContent = document.getElementById('usersContent');
  const usersError = document.getElementById('usersError');
  const usersBody = document.getElementById('usersBody');
  const searchInput = document.getElementById('searchInput');
  const roleFilter = document.getElementById('roleFilter');
  const statusFilter = document.getElementById('statusFilter');

  let debounceTimer;

  async function loadUsers() {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (roleFilter.value) params.set('role', roleFilter.value);
    if (statusFilter.value) params.set('status', statusFilter.value);

    usersLoading.style.display = 'block';
    usersContent.style.display = 'none';
    usersError.style.display = 'none';

    try {
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error('Failed to load users');

      const users = await res.json();

      usersBody.innerHTML = users.map(user => {
        const avatar = avatarStyle(user.username);
        const isActive = !user.deleted_at;
        const isSelf = user.id === currentUser.id;
        const isOwner = user.role_name === 'OWNER';
        const canChangeRole = currentRoleLevel >= ROLE_LEVELS.ADMIN && !isOwner && !isSelf;
        const canToggleStatus = currentRoleLevel >= ROLE_LEVELS.MODERATOR && !isOwner && !isSelf;

        const availableRoles = currentUser.role_name === 'OWNER'
          ? ['USER', 'MODERATOR', 'ADMIN']
          : ['USER', 'MODERATOR'];
        const roleOptions = availableRoles.filter(r => currentRoleLevel >= ROLE_LEVELS.ADMIN || r === user.role_name);

        return `
          <tr>
            <td>
              <div class="user-cell">
                <span class="user-avatar-sm" style="background:${avatar.color}">${avatar.initial}</span>
                ${user.username}
              </div>
            </td>
            <td style="color:#666">${user.email}</td>
            <td>
              ${canChangeRole ? `
                <select class="role-select" onchange="handleRoleChange('${user.id}', this.value)">
                  ${roleOptions.map(r => `<option value="${r}" ${r === user.role_name ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              ` : `<span class="badge badge-role">${user.role_name}</span>`}
            </td>
            <td>
              <span class="badge ${isActive ? 'badge-active' : 'badge-deleted'}">${isActive ? 'Active' : 'Deleted'}</span>
            </td>
            <td>
              ${canToggleStatus ? `
                <button class="action-btn" style="background:${isActive ? '#FFEBEE' : '#E8F5E9'};color:${isActive ? '#D32F2F' : '#388E3C'}" onclick="handleStatusToggle('${user.id}', '${isActive ? 'deactivate' : 'activate'}')">
                  ${isActive ? 'Deactivate' : 'Activate'}
                </button>
              ` : '<span style="color:#999;font-size:0.8rem">—</span>'}
            </td>
          </tr>
        `;
      }).join('');

      usersLoading.style.display = 'none';
      usersContent.style.display = 'block';
    } catch {
      usersLoading.style.display = 'none';
      usersError.style.display = 'block';
      usersError.textContent = 'Failed to load users.';
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadUsers, 300);
  });

  roleFilter.addEventListener('change', loadUsers);
  statusFilter.addEventListener('change', loadUsers);

  await loadUsers();

  window.handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role_name: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to update role.');
      } else {
        await loadUsers();
      }
    } catch {
      alert('Could not connect to server.');
    }
  };

  window.handleStatusToggle = async (userId, action) => {
    const confirmMsg = action === 'deactivate' ? 'Deactivate this user?' : 'Activate this user?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to update status.');
      } else {
        await loadUsers();
      }
    } catch {
      alert('Could not connect to server.');
    }
  };

  // ----- Observations -----
  const obsLoading = document.getElementById('obsLoading');
  const obsContent = document.getElementById('obsContent');
  const obsError = document.getElementById('obsError');
  const obsBody = document.getElementById('obsBody');
  const obsSearch = document.getElementById('obsSearch');
  const obsCategory = document.getElementById('obsCategory');
  const obsStatus = document.getElementById('obsStatus');

  let obsDebounce;

  async function loadObservations() {
    const params = new URLSearchParams();
    if (obsSearch.value.trim()) params.set('search', obsSearch.value.trim());
    if (obsCategory.value.trim()) params.set('category', obsCategory.value.trim());
    if (obsStatus.value) params.set('status', obsStatus.value);

    obsLoading.style.display = 'block';
    obsContent.style.display = 'none';
    obsError.style.display = 'none';

    try {
      const res = await fetch(`/api/admin/observations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error('Failed to load observations');

      const observations = await res.json();

      obsBody.innerHTML = observations.map(obs => `
        <tr>
          <td><span class="cell-truncate">${obs.title}</span></td>
          <td><span class="badge badge-role">${obs.category}</span></td>
          <td>${obs.creator_username}</td>
          <td><span class="badge ${obs.is_public ? 'badge-active' : 'badge-deleted'}">${obs.is_public ? 'Public' : 'Private'}</span></td>
          <td><span class="badge badge-open">${obs.obs_status}</span></td>
          <td style="color:#999;font-size:0.8rem">${new Date(obs.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');

      obsLoading.style.display = 'none';
      obsContent.style.display = 'block';
    } catch {
      obsLoading.style.display = 'none';
      obsError.style.display = 'block';
      obsError.textContent = 'Failed to load observations.';
    }
  }

  obsSearch.addEventListener('input', () => {
    clearTimeout(obsDebounce);
    obsDebounce = setTimeout(loadObservations, 300);
  });

  obsCategory.addEventListener('input', () => {
    clearTimeout(obsDebounce);
    obsDebounce = setTimeout(loadObservations, 300);
  });

  obsStatus.addEventListener('change', loadObservations);

  await loadObservations();

  // ----- Requests -----
  const reqLoading = document.getElementById('reqLoading');
  const reqContent = document.getElementById('reqContent');
  const reqError = document.getElementById('reqError');
  const reqBody = document.getElementById('reqBody');
  const reqStatus = document.getElementById('reqStatus');
  const reqType = document.getElementById('reqType');

  async function loadRequests() {
    const params = new URLSearchParams();
    if (reqStatus.value) params.set('status', reqStatus.value);
    if (reqType.value) params.set('type', reqType.value);

    reqLoading.style.display = 'block';
    reqContent.style.display = 'none';
    reqError.style.display = 'none';

    try {
      const res = await fetch(`/api/admin/requests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error('Failed to load requests');

      const requests = await res.json();
      pendingRequestsData = requests;

      reqBody.innerHTML = requests.map(req => {
        const isPending = req.req_status === 'PENDING';
        const changes = [];
        if (req.proposed_title) changes.push(`Title: "${req.proposed_title}"`);
        if (req.proposed_category) changes.push(`Category: "${req.proposed_category}"`);
        if (req.proposed_description) changes.push(`Description: "${req.proposed_description}"`);
        if (req.proposed_address) changes.push(`Address: "${req.proposed_address}"`);
        const proposedHtml = changes.length > 0
          ? `<div style="font-size:0.75rem;line-height:1.4;color:#1976D2">${changes.join('<br>')}</div>`
          : '<span style="color:#999">—</span>';
        const reviewBtn = isPending && req.type === 'EDIT'
          ? `<button class="action-btn" style="background:#E3F2FD;color:#1976D2;margin:0.25rem 0.5rem 0.25rem 0" onclick="openReviewModal('${req.id}')">Review</button>`
          : '';
        return `
          <tr>
            <td><span class="cell-truncate">${req.observation_title}</span></td>
            <td><span class="badge ${req.type === 'EDIT' ? 'badge-role' : 'badge-deleted'}">${req.type}</span></td>
            <td>${req.requester_username}</td>
            <td style="max-width:220px">${proposedHtml}</td>
            <td><span class="badge badge-${req.req_status === 'PENDING' ? 'pending' : req.req_status === 'APPROVED' ? 'approved' : 'rejected'}">${req.req_status}</span></td>
            <td style="color:#999;font-size:0.8rem">${new Date(req.created_at).toLocaleDateString()}</td>
            <td>
              ${isPending ? `
                ${reviewBtn}
                <button class="action-btn" style="background:#E8F5E9;color:#388E3C;margin:0.25rem 0.5rem 0.25rem 0" onclick="handleApprove('${req.id}')">Approve</button>
                <button class="action-btn" style="background:#FFEBEE;color:#D32F2F;margin:0.25rem 0" onclick="handleReject('${req.id}')">Reject</button>
              ` : '<span style="color:#999;font-size:0.8rem">—</span>'}
            </td>
          </tr>
        `;
      }).join('');

      reqLoading.style.display = 'none';
      reqContent.style.display = 'block';
    } catch {
      reqLoading.style.display = 'none';
      reqError.style.display = 'block';
      reqError.textContent = 'Failed to load requests.';
    }
  }

  let pendingRequestsData = [];

  reqStatus.addEventListener('change', loadRequests);
  reqType.addEventListener('change', loadRequests);

  await loadRequests();

  window.handleApprove = async (requestId) => {
    if (!confirm('Approve this request?')) return;
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed.'); return; }
      await loadRequests();
      await loadObservations();
    } catch {
      alert('Could not connect to server.');
    }
  };

  window.handleReject = async (requestId) => {
    if (!confirm('Reject this request?')) return;
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed.'); return; }
      await loadRequests();
    } catch {
      alert('Could not connect to server.');
    }
  };

  window.openReviewModal = (requestId) => {
    const req = pendingRequestsData.find(r => r.id === requestId);
    if (!req) return;

    const body = document.getElementById('reviewBody');
    const actions = document.getElementById('reviewActions');

    if (req.type === 'EDIT') {
      const fields = [
        { label: 'Title', original: req.observation_title, proposed: req.proposed_title },
        { label: 'Category', original: req.observation_category, proposed: req.proposed_category },
        { label: 'Description', original: req.observation_description || '-', proposed: req.proposed_description || '-' },
        { label: 'Address', original: req.observation_address, proposed: req.proposed_address },
      ];

      const hasChanges = fields.some(f => f.proposed && f.proposed !== '-');
      const rows = fields.map(f => {
        const changed = f.proposed && f.proposed !== '-' && f.proposed !== f.original;
        return `
          <tr>
            <th>${f.label}</th>
            <td class="${changed ? 'diff-removed' : ''}"><span class="compare-original">${f.original || '-'}</span></td>
            <td class="compare-arrow">&rarr;</td>
            <td class="${changed ? 'diff-added' : ''}">${changed ? `<span class="compare-proposed">${f.proposed}</span>` : `<span class="compare-original">${f.proposed || '-'}</span>`}</td>
          </tr>
        `;
      }).join('');

      body.innerHTML = `
        <p style="color:#666;margin-bottom:1rem;font-size:0.9rem">
          <strong>Observation:</strong> ${req.observation_title} &middot;
          <strong>Requester:</strong> ${req.requester_username} &middot;
          <strong>Reason:</strong> ${req.reason || 'No reason provided'}
        </p>
        ${hasChanges ? `
          <table class="compare-table">
            <thead>
              <tr><th></th><th style="color:#666">Original</th><th></th><th style="color:#1976D2">Proposed</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        ` : '<p style="color:#F57C00;font-style:italic">No changes proposed.</p>'}
      `;

      actions.innerHTML = `
        <button class="btn" onclick="closeReviewModal()">Cancel</button>
        <button class="btn" style="background:#E8F5E9;color:#388E3C;font-weight:600" onclick="handleApprove('${req.id}'); closeReviewModal();">Approve Changes</button>
        <button class="btn" style="background:#FFEBEE;color:#D32F2F" onclick="handleReject('${req.id}'); closeReviewModal();">Reject</button>
      `;
    } else if (req.type === 'DELETE') {
      body.innerHTML = `
        <p><strong>Reason:</strong> ${req.reason || 'No reason provided'}</p>
        <p><strong>Observation:</strong> ${req.observation_title}</p>
        <p><strong>Requester:</strong> ${req.requester_username}</p>
        <p style="color:#D32F2F;font-weight:600;margin-top:1rem">Approval will archive this observation (set to private).</p>
      `;
      actions.innerHTML = `
        <button class="btn" onclick="closeReviewModal()">Cancel</button>
        <button class="btn" style="background:#D32F2F;color:#fff" onclick="handleApprove('${req.id}'); closeReviewModal();">Approve Removal</button>
        <button class="action-btn" style="background:#FFEBEE;color:#D32F2F" onclick="handleReject('${req.id}'); closeReviewModal();">Reject</button>
      `;
    }

    document.getElementById('reviewModal').style.display = 'flex';
  };

  window.closeReviewModal = () => {
    document.getElementById('reviewModal').style.display = 'none';
  };

  // ----- Audit Log -----
  const isAdmin = currentRoleLevel >= ROLE_LEVELS.ADMIN;
  const tabAdmin = document.getElementById('tabAdministration');
  if (isAdmin) {
    tabAdmin.style.display = 'inline-block';
  }

  let auditScope = 'observations';

  window.switchAuditTab = (scope) => {
    auditScope = scope;
    document.querySelectorAll('.audit-tab').forEach(t => t.classList.remove('audit-tab-active'));
    document.getElementById(scope === 'observations' ? 'tabObservations' : 'tabAdministration').classList.add('audit-tab-active');
    loadAuditLog();
  };

  const auditBody = document.getElementById('auditBody');
  const auditLoading = document.getElementById('auditLoading');
  const auditContent = document.getElementById('auditContent');
  const auditError = document.getElementById('auditError');
  const auditAction = document.getElementById('auditAction');
  const auditUser = document.getElementById('auditUser');

  let auditDebounce;

  async function loadAuditLog() {
    const params = new URLSearchParams();
    params.set('scope', auditScope);
    if (auditAction.value) params.set('action', auditAction.value);
    if (auditUser.value.trim()) params.set('user_id', auditUser.value.trim());

    auditLoading.style.display = 'block';
    auditContent.style.display = 'none';
    auditError.style.display = 'none';

    try {
      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error('Failed to load audit log');

      const data = await res.json();

      const actionLabels = {
        REQUEST_APPROVE: 'Request Approved',
        REQUEST_REJECT: 'Request Rejected',
        ROLE_PROMOTION: 'Role Promoted',
        ROLE_DEMOTION: 'Role Demoted',
        USER_ACTIVATE: 'User Activated',
        USER_DEACTIVATE: 'User Deactivated',
      };

      auditBody.innerHTML = data.entries.map(entry => {
        const details = entry.details || {};
        let detailText = '';
        if (entry.action === 'REQUEST_APPROVE' || entry.action === 'REQUEST_REJECT') {
          detailText = `${details.request_type || ''} — ${details.observation_id ? 'Obs: ' + details.observation_id.substring(0, 8) + '...' : ''}`;
        } else if (entry.action === 'ROLE_PROMOTION' || entry.action === 'ROLE_DEMOTION') {
          detailText = `${details.old_role} → ${details.new_role}`;
        }
        const actionClass = entry.action.includes('APPROVE') || entry.action.includes('ACTIVATE') || entry.action === 'ROLE_PROMOTION'
          ? 'badge badge-approved' : entry.action.includes('REJECT') || entry.action.includes('DEACTIVATE') || entry.action === 'ROLE_DEMOTION'
          ? 'badge badge-rejected' : 'badge badge-role';
        return `
          <tr>
            <td><span class="${actionClass}">${actionLabels[entry.action] || entry.action}</span></td>
            <td style="color:#666;font-size:0.8rem">${entry.entity_type || '-'}<br>${entry.entity_id ? entry.entity_id.substring(0, 8) + '...' : ''}</td>
            <td style="color:#666;font-size:0.8rem">${detailText || '-'}</td>
            <td>${entry.performed_by_username}</td>
            <td style="color:#999;font-size:0.8rem">${new Date(entry.created_at).toLocaleString()}</td>
          </tr>
        `;
      }).join('');

      auditLoading.style.display = 'none';
      auditContent.style.display = 'block';
    } catch {
      auditLoading.style.display = 'none';
      auditError.style.display = 'block';
      auditError.textContent = 'Failed to load audit log.';
    }
  }

  auditAction.addEventListener('change', loadAuditLog);
  auditUser.addEventListener('input', () => {
    clearTimeout(auditDebounce);
    auditDebounce = setTimeout(loadAuditLog, 300);
  });

  loadAuditLog();
});
