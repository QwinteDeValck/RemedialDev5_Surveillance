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
                <select class="role-select" data-user-id="${user.id}" onchange="handleRoleChange('${user.id}', this.value)">
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
});
