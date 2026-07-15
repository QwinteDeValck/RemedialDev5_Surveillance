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

  const togglePwBtn = document.getElementById('togglePwBtn');
  const passwordForm = document.getElementById('passwordForm');
  const pwSaveBtn = document.getElementById('pwSaveBtn');
  const pwLoading = document.getElementById('pwLoading');
  const pwFeedback = document.getElementById('pwFeedback');
  let passwordFormVisible = false;

  togglePwBtn.addEventListener('click', () => {
    passwordFormVisible = !passwordFormVisible;
    passwordForm.style.display = passwordFormVisible ? 'block' : 'none';
    togglePwBtn.textContent = passwordFormVisible ? 'Cancel' : 'Change Password';
    pwFeedback.className = 'feedback';
    pwFeedback.textContent = '';
    document.getElementById('pwCurrent').value = '';
    document.getElementById('pwNew').value = '';
    document.getElementById('pwConfirm').value = '';
  });

  pwSaveBtn.addEventListener('click', async () => {
    const currentPassword = document.getElementById('pwCurrent').value;
    const newPassword = document.getElementById('pwNew').value;
    const confirmPassword = document.getElementById('pwConfirm').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      pwFeedback.className = 'feedback error';
      pwFeedback.textContent = 'All fields are required.';
      return;
    }

    if (newPassword.length < 6) {
      pwFeedback.className = 'feedback error';
      pwFeedback.textContent = 'New password must be at least 6 characters.';
      return;
    }

    if (newPassword !== confirmPassword) {
      pwFeedback.className = 'feedback error';
      pwFeedback.textContent = 'Passwords do not match.';
      return;
    }

    pwSaveBtn.style.display = 'none';
    pwLoading.style.display = 'block';
    pwFeedback.className = 'feedback';
    pwFeedback.textContent = '';

    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        pwFeedback.className = 'feedback error';
        pwFeedback.textContent = data.error || 'Failed to update password.';
        pwSaveBtn.style.display = 'block';
        pwLoading.style.display = 'none';
        return;
      }

      pwFeedback.className = 'feedback success';
      pwFeedback.textContent = 'Password updated successfully.';
      pwSaveBtn.style.display = 'block';
      pwLoading.style.display = 'none';

      document.getElementById('pwCurrent').value = '';
      document.getElementById('pwNew').value = '';
      document.getElementById('pwConfirm').value = '';
    } catch {
      pwFeedback.className = 'feedback error';
      pwFeedback.textContent = 'Could not connect to server.';
      pwSaveBtn.style.display = 'block';
      pwLoading.style.display = 'none';
    }
  });
});
