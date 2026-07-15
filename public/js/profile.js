document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = '/auth/login.html';
    return;
  }

  const loading = document.getElementById('loading');
  const content = document.getElementById('profileContent');
  const error = document.getElementById('error');
  let currentProfile = null;

  async function loadProfile() {
    try {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error('Failed to load profile');

      const profile = await res.json();
      currentProfile = profile;

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

      document.getElementById('editUsername').value = profile.username;
      document.getElementById('editEmail').value = profile.email;

      loading.style.display = 'none';
      content.style.display = 'block';
    } catch {
      loading.style.display = 'none';
      error.style.display = 'block';
      error.textContent = 'Could not load profile. Please try again later.';
    }
  }

  await loadProfile();

  const toggleBtn = document.getElementById('toggleEditBtn');
  const editForm = document.getElementById('editForm');
  const saveBtn = document.getElementById('saveBtn');
  const editLoading = document.getElementById('editLoading');
  const editFeedback = document.getElementById('editFeedback');

  toggleBtn.addEventListener('click', () => {
    const isHidden = editForm.style.display === 'none' || !editForm.style.display;
    editForm.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? 'Cancel' : 'Edit Profile';
    editFeedback.className = 'feedback';
    editFeedback.textContent = '';
  });

  saveBtn.addEventListener('click', async () => {
    const username = document.getElementById('editUsername').value.trim();
    const email = document.getElementById('editEmail').value.trim();

    if (!username || !email) {
      editFeedback.className = 'feedback error';
      editFeedback.textContent = 'All fields are required.';
      return;
    }

    saveBtn.style.display = 'none';
    editLoading.style.display = 'block';
    editFeedback.className = 'feedback';
    editFeedback.textContent = '';

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ username, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        editFeedback.className = 'feedback error';
        editFeedback.textContent = data.error || 'Failed to update.';
        saveBtn.style.display = 'block';
        editLoading.style.display = 'none';
        return;
      }

      editFeedback.className = 'feedback success';
      editFeedback.textContent = 'Profile updated successfully.';
      saveBtn.style.display = 'block';
      editLoading.style.display = 'none';

      await loadProfile();

      const user = getUser();
      user.username = data.username;
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      editFeedback.className = 'feedback error';
      editFeedback.textContent = 'Could not connect to server.';
      saveBtn.style.display = 'block';
      editLoading.style.display = 'none';
    }
  });
});
