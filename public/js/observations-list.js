document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = '/auth/login.html';
    return;
  }

  const feedback = document.getElementById('feedback');
  const loading = document.getElementById('loading');
  const table = document.getElementById('observationsTable');
  const tbody = document.getElementById('observationsBody');
  const empty = document.getElementById('emptyState');

  try {
    const res = await fetch('/api/observations', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      throw new Error('Failed to load observations');
    }

    const observations = await res.json();
    loading.style.display = 'none';

    if (observations.length === 0) {
      empty.style.display = 'block';
      return;
    }

    table.style.display = 'table';

    observations.forEach(obs => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #eee';

      const visibility = obs.is_public ? 'Public' : 'Private';
      const date = new Date(obs.created_at).toLocaleDateString();

      let actions = `<a href="/observations/detail.html?id=${obs.id}" class="btn" style="padding:0.35rem 0.75rem;font-size:0.8rem;background:#eee;color:#1E1E1E;margin-right:0.25rem">View</a>`;

      if (!obs.is_public) {
        actions += `<a href="/observations/edit.html?id=${obs.id}" class="btn" style="padding:0.35rem 0.75rem;font-size:0.8rem;background:#FFC107;color:#000;margin-right:0.25rem">Edit</a>`;
        actions += `<button onclick="deleteObservation('${obs.id}')" class="btn" style="padding:0.35rem 0.75rem;font-size:0.8rem;background:#D32F2F;color:#fff">Delete</button>`;
      } else {
        actions += `<button onclick="showRequestForm('${obs.id}')" class="btn" style="padding:0.35rem 0.75rem;font-size:0.8rem;background:#eee;color:#1E1E1E">Request Change</button>`;
      }

      row.innerHTML = `
        <td style="padding:0.75rem;font-weight:600">${obs.title}</td>
        <td style="padding:0.75rem;text-transform:capitalize">${obs.category}</td>
        <td style="padding:0.75rem">${visibility}</td>
        <td style="padding:0.75rem">${obs.status}</td>
        <td style="padding:0.75rem">${date}</td>
        <td style="padding:0.75rem">${actions}</td>
      `;
      tbody.appendChild(row);
    });
  } catch {
    loading.style.display = 'none';
    feedback.className = 'feedback error';
    feedback.textContent = 'Failed to load observations.';
  }
});

async function deleteObservation(id) {
  if (!confirm('Are you sure you want to delete this observation? This cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`/api/observations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete.');
    }
  } catch {
    alert('Could not connect to server.');
  }
}

async function showRequestForm(id) {
  window.location.href = `/observations/detail.html?id=${id}`;
}
