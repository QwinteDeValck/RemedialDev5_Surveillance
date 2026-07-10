document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = '/auth/login.html';
    return;
  }

  document.getElementById('observationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('feedback');
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
    submitBtn.textContent = 'Submitting...';

    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        feedback.className = 'feedback success';
        feedback.textContent = 'Observation submitted!';
        document.getElementById('observationForm').reset();
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        feedback.className = 'feedback error';
        feedback.textContent = data.error || 'Failed to submit observation.';
      }
    } catch {
      feedback.className = 'feedback error';
      feedback.textContent = 'Could not connect to server.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Observation';
    }
  });
});
