document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = '/auth/login.html';
    return;
  }

  const user = getUser();
  const roleLevel = ROLE_LEVELS[user.role_name] || 0;
  if (roleLevel < ROLE_LEVELS.MODERATOR) {
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
});
