function getDateRange(dateFilter) {
  const now = new Date();
  switch (dateFilter) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function filterObservations(observations, filters) {
  return observations.filter((obs) => {
    if (filters.category !== 'all' && obs.category !== filters.category) {
      return false;
    }

    const obsDate = new Date(obs.created_at);

    if (filters.date !== 'all') {
      const rangeStart = getDateRange(filters.date);
      if (rangeStart && obsDate < rangeStart) {
        return false;
      }
    }

    return true;
  });
}

function renderFilterControls(containerId, categories, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const categoriesHtml = categories
    .map((c) => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`)
    .join('');

  container.innerHTML = `
    <div class="filter-bar">
      <div class="filter-group">
        <label>Category</label>
        <select id="filterCategory">
          <option value="all">All categories</option>
          ${categoriesHtml}
        </select>
      </div>
      <div class="filter-group">
        <label>Date</label>
        <select id="filterDate">
          <option value="all">All time</option>
          <option value="24h">Last 24 hours</option>
          <option value="week">Last week</option>
          <option value="month">Last month</option>
        </select>
      </div>
    </div>
  `;

  ['filterCategory', 'filterDate'].forEach((id) => {
    document.getElementById(id).addEventListener('change', onChange);
  });
}

function getActiveFilters() {
  return {
    category: document.getElementById('filterCategory')?.value || 'all',
    date: document.getElementById('filterDate')?.value || 'all',
  };
}
