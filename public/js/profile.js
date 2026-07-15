document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = '/auth/login.html';
    return;
  }

  const loading = document.getElementById('loading');
  const content = document.getElementById('profileContent');
  const error = document.getElementById('error');

  try {
    const res = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) throw new Error('Failed to load profile');

    const profile = await res.json();

    const colors = ['#D32F2F', '#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#00796B', '#5D4037', '#C2185B'];
    const initial = profile.username.charAt(0).toUpperCase();
    const color = colors[initial.charCodeAt(0) % colors.length];

    document.getElementById('profileAvatar').style.background = color;
    document.getElementById('profileAvatar').textContent = initial;
    document.getElementById('profileUsername').textContent = profile.username;
    document.getElementById('profileRole').textContent = profile.role_name;
    document.getElementById('profileEmail').textContent = profile.email;
    document.getElementById('profileId').textContent = profile.id;
    document.getElementById('profileCreated').textContent = new Date(profile.created_at).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch {
    loading.style.display = 'none';
    error.style.display = 'block';
    error.textContent = 'Could not load profile. Please try again later.';
  }
});
