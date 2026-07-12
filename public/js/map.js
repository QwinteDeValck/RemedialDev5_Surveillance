(function () {
  const mapElement = document.getElementById('map');

  if (!mapElement) return;

  if (typeof L === 'undefined') {
    mapElement.innerHTML = '<div class="map-error"><h2>Map failed to load</h2><p>The map library could not be loaded. Please try again later.</p></div>';
    return;
  }

  const map = L.map('map').setView([50.69, 4.04], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

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

  async function loadMarkers() {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch('/api/observations/public', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const observations = await res.json();
      let added = 0;

      observations.forEach((obs) => {
        const lat = parseFloat(obs.latitude);
        const lng = parseFloat(obs.longitude);
        if (!lat || !lng) return;

        const date = new Date(obs.created_at).toLocaleString();
        const desc = obs.description ? `<br>${obs.description}` : '';
        L.marker([lat, lng], { icon: redIcon })
          .addTo(map)
          .bindPopup(`
            <strong>${obs.title}</strong>${desc}<br>
            <em>${obs.category}</em><br>
            ${date}
          `);
        added++;
      });

      if (added === 0) {
        mapElement.innerHTML = '<div class="map-error"><h2>No observations</h2><p>No public observations available in this area.</p></div>';
      }
    } catch {
      mapElement.innerHTML = '<div class="map-error"><h2>Failed to load observations</h2><p>Could not fetch observation data. Please try again later.</p></div>';
    }
  }

  loadMarkers();
})();
