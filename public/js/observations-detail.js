let currentObservationId = null;
let currentObservation = null;

function toggleRequestFields() {
  const type = document.getElementById('requestType').value;
  document.getElementById('proposedFields').style.display = type === 'EDIT' ? 'block' : 'none';
}

function showRequestForm() {
  document.getElementById('proposedCategory').value = currentObservation?.category || '';
  toggleRequestFields();
  document.getElementById('requestForm').style.display = 'block';
}

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

  currentObservationId = id;

  const feedback = document.getElementById('feedback');
  const loading = document.getElementById('loading');
  const card = document.getElementById('detailCard');
  const requestSection = document.getElementById('requestSection');

  try {
    const [obsRes, reqRes] = await Promise.all([
      fetch(`/api/observations/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
      fetch(`/api/observations/${id}/requests`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
    ]);

    if (!obsRes.ok) {
      const data = await obsRes.json();
      loading.style.display = 'none';
      feedback.className = 'feedback error';
      feedback.textContent = data.error || 'Failed to load observation.';
      return;
    }

    const obs = await obsRes.json();
    currentObservation = obs;
    const requests = await reqRes.json();
    const hasPendingRequest = requests.some(r => r.status === 'PENDING');

    loading.style.display = 'none';
    card.style.display = 'block';

    document.getElementById('detailTitle').textContent = obs.title;
    document.getElementById('detailCategory').textContent = obs.category.charAt(0).toUpperCase() + obs.category.slice(1);
    document.getElementById('detailStatus').textContent = obs.status;
    document.getElementById('detailAddress').textContent = obs.address;
    document.getElementById('detailDescription').textContent = obs.description || 'No description provided.';
    document.getElementById('detailCreated').textContent = new Date(obs.created_at).toLocaleString();

    const visibilityEl = document.getElementById('detailVisibility');
    visibilityEl.textContent = obs.is_public ? 'Public' : 'Private';
    visibilityEl.style.background = obs.is_public ? '#E3F2FD' : '#FFF3E0';
    visibilityEl.style.color = obs.is_public ? '#1565C0' : '#E65100';

    const actions = document.getElementById('detailActions');

    if (!obs.is_public) {
      actions.innerHTML = `
        <a href="/observations/edit.html?id=${obs.id}" class="btn btn-cta">Edit</a>
        <button onclick="deleteObservation()" class="btn" style="background:#D32F2F;color:#fff">Delete</button>
        <a href="/observations/" class="btn" style="background:#eee;color:#1E1E1E">Back to overview</a>
      `;
    } else {
      if (hasPendingRequest) {
        requestSection.innerHTML = '<p style="color:#666;font-style:italic;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #eee">A change request has already been submitted for this observation.</p>';
      }
      requestSection.style.display = 'block';
      actions.innerHTML = `
        <button onclick="showRequestForm()" class="btn btn-cta">Request Change</button>
        <a href="/observations/" class="btn" style="background:#eee;color:#1E1E1E">Back to overview</a>
      `;

      if (params.get('request') === '1' && !hasPendingRequest) {
        showRequestForm();
      }
    }
  } catch {
    loading.style.display = 'none';
    feedback.className = 'feedback error';
    feedback.textContent = 'Could not connect to server.';
  }
});

async function deleteObservation() {
  if (!confirm('Are you sure you want to delete this observation? This cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`/api/observations/${currentObservationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (res.ok) {
      window.location.href = '/observations/';
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete.');
    }
  } catch {
    alert('Could not connect to server.');
  }
}

async function submitRequest() {
  const type = document.getElementById('requestType').value;
  const reason = document.getElementById('requestReason').value.trim();
  const btn = document.getElementById('submitRequestBtn');
  const feedback = document.getElementById('feedback');

  const body = { type, reason: reason || undefined };

  if (type === 'EDIT') {
    const title = document.getElementById('proposedTitle').value.trim();
    const category = document.getElementById('proposedCategory').value;
    const description = document.getElementById('proposedDescription').value.trim();
    const address = document.getElementById('proposedAddress').value.trim();

    if (!title && !category && !description && !address) {
      feedback.className = 'feedback error';
      feedback.textContent = 'Please fill in at least one proposed field.';
      return;
    }

    if (title) body.proposed_title = title;
    if (category) body.proposed_category = category;
    if (description) body.proposed_description = description;
    if (address) body.proposed_address = address;
  }

  feedback.className = 'feedback';
  feedback.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch(`/api/observations/${currentObservationId}/request`, {
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
      feedback.textContent = 'Request submitted!';
      const section = document.getElementById('requestSection');
      section.innerHTML = '<p style="color:#666;font-style:italic">A change request has already been submitted for this observation.</p>';
    } else {
      feedback.className = 'feedback error';
      feedback.textContent = data.error || 'Failed to submit request.';
    }
  } catch {
    feedback.className = 'feedback error';
    feedback.textContent = 'Could not connect to server.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  }
}
