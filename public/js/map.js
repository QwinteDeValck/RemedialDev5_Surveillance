(function () {
  const mapElement = document.getElementById('map');
  const overlay = document.getElementById('mapOverlay');
  let allObservations = [];
  let markers = [];
  let clusterGroup;
  let heatLayer;
  let map;
  let currentMode = 'clusters';

  if (!mapElement) return;

  function showOverlay(html) {
    if (overlay) {
      overlay.innerHTML = `<div class="map-overlay-content">${html}</div>`;
      overlay.classList.remove('hidden');
    }
  }

  function hideOverlay() {
    if (overlay) overlay.classList.add('hidden');
  }

  if (typeof L === 'undefined') {
    showOverlay('<h2>Map failed to load</h2><p>The map library could not be loaded. Please try again later.</p>');
    return;
  }

  map = L.map('map').setView([50.8503, 4.3517], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  clusterGroup = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    animate: false,
    chunkedLoading: true,
  });
  map.addLayer(clusterGroup);

  const redIcon = L.divIcon({
    className: '',
    html: `<svg width="25" height="41" viewBox="0 0 25 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41C12.5 41 25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#D32F2F"/>
      <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  function clearAllLayers() {
    clusterGroup.clearLayers();
    markers.forEach((m) => map.removeLayer(m));
    markers = [];
    if (heatLayer) map.removeLayer(heatLayer);
    heatLayer = null;
  }

  function createIndividualMarkers(observations) {
    const result = [];
    observations.forEach((obs) => {
      const lat = parseFloat(obs.latitude);
      const lng = parseFloat(obs.longitude);
      if (!lat || !lng) return;

      const date = new Date(obs.created_at).toLocaleString();
      const desc = obs.description ? `<br>${obs.description}` : '';
      const marker = L.marker([lat, lng], { icon: redIcon })
        .bindPopup(`
          <strong>${obs.title}</strong>${desc}<br>
          <em>${obs.category}</em><br>
          ${date}
        `);
      result.push(marker);
    });
    return result;
  }

  function renderMode(observations) {
    clearAllLayers();
    renderSidebar(observations);

    const filtered = observations.filter((obs) => {
      const lat = parseFloat(obs.latitude);
      const lng = parseFloat(obs.longitude);
      return lat && lng;
    });

    if (filtered.length === 0 && allObservations.length > 0) {
      showOverlay('<h2>No observations</h2><p>No observations match the current filters.</p>');
      return;
    }

    hideOverlay();

    if (currentMode === 'heatmap') {
      const points = filtered.map((obs) => [parseFloat(obs.latitude), parseFloat(obs.longitude), 0.8]);
      heatLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 }).addTo(map);
      return;
    }

    const individual = createIndividualMarkers(filtered);

    if (currentMode === 'markers') {
      individual.forEach((m) => {
        m.addTo(map);
        markers.push(m);
      });
    } else {
      individual.forEach((m) => {
        clusterGroup.addLayer(m);
        markers.push(m);
      });
    }
  }

  function setMode(mode) {
    currentMode = mode;
    const filtered = getFilteredObservations();
    renderMode(filtered);
  }

  function getFilteredObservations() {
    const catSelect = document.getElementById('filterCategory');
    const dateSelect = document.getElementById('filterDate');
    const filters = {
      category: catSelect ? catSelect.value : 'all',
      date: dateSelect ? dateSelect.value : 'all',
    };
    return filterObservations(allObservations, filters);
  }

  function renderSidebar(observations) {
    const listEl = document.getElementById('sidebarList');
    const countEl = document.getElementById('sidebarCount');
    if (!listEl) return;

    countEl.textContent = observations.length;

    if (observations.length === 0) {
      listEl.innerHTML = '<div class="sidebar-empty">No observations match the current filters.</div>';
      return;
    }

    listEl.innerHTML = observations.map((obs) => {
      const date = new Date(obs.created_at).toLocaleString();
      const desc = obs.description
        ? obs.description.length > 80
          ? obs.description.substring(0, 80) + '…'
          : obs.description
        : '';
      return `
        <div class="sidebar-item" data-id="${obs.id}">
          <div class="item-title">${obs.title}</div>
          <div class="item-meta">
            <span class="item-category">${obs.category}</span>
            <span>${date}</span>
          </div>
          ${desc ? `<div class="item-desc">${desc}</div>` : ''}
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.sidebar-item').forEach((el) => {
      el.addEventListener('click', () => {
        listEl.querySelectorAll('.sidebar-item').forEach((i) => i.classList.remove('active'));
        el.classList.add('active');
      });
    });
  }

  function setupSidebarToggle() {
    const hamburger = document.getElementById('hamburgerBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    if (!hamburger || !closeBtn || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add('open');
      hamburger.classList.add('hidden');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      hamburger.classList.remove('hidden');
    }

    hamburger.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
  }

  function setupModeSwitcher() {
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        setMode(btn.dataset.mode);
      });
    });
  }

  function setupFilters() {
    const catSelect = document.getElementById('filterCategory');
    const dateSelect = document.getElementById('filterDate');

    const categories = [...new Set(allObservations.map((o) => o.category))].sort();
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
      catSelect.appendChild(opt);
    });

    function apply() {
      const filtered = getFilteredObservations();
      renderMode(filtered);
    }

    catSelect.addEventListener('change', apply);
    dateSelect.addEventListener('change', apply);
  }

  async function loadData() {
    const token = getToken();
    if (!token) {
      showOverlay('<h2>Login required</h2><p><a href="/auth/login.html" style="color:#D32F2F;">Log in</a> to view the map.</p>');
      return;
    }

    try {
      const res = await fetch('/api/observations/public', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        showOverlay('<h2>Failed to load observations</h2><p>The server returned an error. Please try again later.</p>');
        return;
      }

      allObservations = await res.json();

      if (allObservations.length === 0) {
        showOverlay('<h2>No observations</h2><p>No public observations available.</p>');
        return;
      }

      setupSidebarToggle();
      setupFilters();
      setupModeSwitcher();
      renderMode(allObservations);
    } catch {
      showOverlay('<h2>Connection error</h2><p>Could not connect to the server. Please check your connection and try again.</p>');
    }
  }

  loadData();
})();
