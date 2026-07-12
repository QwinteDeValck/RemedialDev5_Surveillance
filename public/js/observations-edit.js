document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = '/auth/login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = '/observations/';
    return;
  }

  const feedback = document.getElementById('feedback');
  const loading = document.getElementById('loading');
  const form = document.getElementById('editForm');

  try {
    const res = await fetch(`/api/observations/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      const data = await res.json();
      loading.style.display = 'none';
      feedback.className = 'feedback error';
      feedback.textContent = data.error || 'Cannot edit this observation.';
      return;
    }

    const obs = await res.json();

    if (obs.is_public) {
      loading.style.display = 'none';
      feedback.className = 'feedback error';
      feedback.textContent = 'Cannot edit a public observation.';
      return;
    }

    loading.style.display = 'none';
    form.style.display = 'block';

    document.getElementById('title').value = obs.title;
    document.getElementById('category').value = obs.category;
    document.getElementById('description').value = obs.description || '';
    document.getElementById('address').value = obs.address;
    document.getElementById('is_public').checked = obs.is_public;
  } catch {
    loading.style.display = 'none';
    feedback.className = 'feedback error';
    feedback.textContent = 'Could not connect to server.';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.className = 'feedback';
    feedback.textContent = '';

    const body = {
      title: document.getElementById('title').value.trim(),
      category: document.getElementById('category').value,
      description: document.getElementById('description').value.trim() || undefined,
      address: document.getElementById('address').value.trim(),
      is_public: document.getElementById('is_public').checked,
    };

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const res = await fetch(`/api/observations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        feedback.className = 'feedback success';
        feedback.textContent = 'Observation updated!';
        setTimeout(() => { window.location.href = `/observations/detail.html?id=${id}`; }, 1000);
      } else {
        feedback.className = 'feedback error';
        feedback.textContent = data.error || 'Failed to update.';
      }
    } catch {
      feedback.className = 'feedback error';
      feedback.textContent = 'Could not connect to server.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
});
