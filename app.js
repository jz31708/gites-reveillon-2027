// Gîtes Dashboard App - TOP 30 D'ÉLITE AVEC VUE PAR DÉFAUT TOP 10
let allGites = [];
let filteredGites = [];
let showFullTop30 = false; // Default: show TOP 10 only!

let map;
let markersLayer;

// Custom Icons
const greenIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:#10b981; width:24px; height:24px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;">♨️</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const blueIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:#0284c7; width:22px; height:22px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px;">👤</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const orangeIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:#f97316; width:24px; height:24px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;">⭐</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadData();
  setupEventListeners();
});

function initMap() {
  map = L.map('map').setView([44.5, 3.5], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

async function loadData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    allGites = await res.json();
  } catch (err) {
    console.error('Error loading data.json:', err);
    allGites = [];
  }

  updateStats();
  applyFiltersAndSort();
}

function updateStats() {
  const statTotal = document.getElementById('stat-total');
  const statSpa = document.getElementById('stat-spa');
  const statDirect = document.getElementById('stat-direct');
  const statComplet = document.getElementById('stat-complet');

  const verified = allGites.filter(g => g.avail_type === 'VERIFIED_ONLINE');
  if (statTotal) statTotal.textContent = verified.length;
  if (statSpa) statSpa.textContent = verified.filter(g => g.has_spa).length;
  if (statDirect) statDirect.textContent = allGites.filter(g => g.avail_type === 'DIRECT_INQUIRY').length;
  if (statComplet) statComplet.textContent = allGites.filter(g => g.avail_type === 'UNAVAILABLE').length;
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    applyFiltersAndSort();
  });

  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFiltersAndSort();
    });
  });

  const sortSelect = document.getElementById('sort-select');
  sortSelect.addEventListener('change', () => {
    applyFiltersAndSort();
  });

  // Toggle Top 6 / Top 30
  const toggleBtn = document.getElementById('toggle-top30-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      showFullTop30 = !showFullTop30;
      updateToggleUI();
      renderGrid();
    });
  }
}

function updateToggleUI() {
  const toggleBtn = document.getElementById('toggle-top30-btn');
  const toggleIcon = document.getElementById('toggle-icon');
  const toggleText = document.getElementById('toggle-text');
  const modeText = document.getElementById('mode-text');
  const counter = document.getElementById('results-count');

  if (showFullTop30) {
    toggleBtn.classList.add('expanded');
    if (toggleIcon) toggleIcon.textContent = '▲';
    if (toggleText) toggleText.textContent = 'Réduire à la sélection d\'élite (Afficher le TOP 10)';
    if (modeText) modeText.textContent = 'TOP 30 Complet';
    if (counter) counter.textContent = filteredGites.length;
  } else {
    toggleBtn.classList.remove('expanded');
    if (toggleIcon) toggleIcon.textContent = '👀';
    if (toggleText) toggleText.textContent = 'Afficher les 20 autres gîtes du TOP 30 (Voir les 30)';
    if (modeText) modeText.textContent = 'TOP 10 d\'Élite';
    if (counter) counter.textContent = Math.min(10, filteredGites.length);
  }
}

function applyFiltersAndSort() {
  const activeChip = document.querySelector('.filter-chip.active');
  const filterType = activeChip ? activeChip.getAttribute('data-filter') : 'all';
  const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
  const sortMode = document.getElementById('sort-select').value;

  filteredGites = allGites.filter(g => {
    if (searchTerm) {
      const matchName = g.name && g.name.toLowerCase().includes(searchTerm);
      const matchAddress = g.address && g.address.toLowerCase().includes(searchTerm);
      const matchDept = g.department && g.department.toLowerCase().includes(searchTerm);
      if (!matchName && !matchAddress && !matchDept) return false;
    }

    if (filterType === 'spa' && !g.has_spa) return false;
    if (filterType === 'direct' && !g.is_direct_owner) return false;
    if (filterType === 'cap12_14' && (g.capacity < 10 || g.capacity > 13)) return false;
    if (filterType === 'cap15_plus' && g.capacity < 14) return false;
    if (filterType === 'fete' && g.party_policy === 'fêtes_interdites') return false;

    return true;
  });

  filteredGites.sort((a, b) => {
    if (sortMode === 'score_desc') return a.rank - b.rank;
    if (sortMode === 'price_asc') return (a.price || 999999) - (b.price || 999999);
    if (sortMode === 'price_desc') return (b.price || 0) - (a.price || 0);
    if (sortMode === 'cap_desc') return b.capacity - a.capacity;
    if (sortMode === 'beds_desc') return b.bedrooms - a.bedrooms;
    if (sortMode === 'name_asc') return a.name.localeCompare(b.name);
    return 0;
  });

  updateToggleUI();
  updateMapMarkers();
  renderGrid();
}

function updateMapMarkers() {
  markersLayer.clearLayers();

  // Highlight Top 6 on map, but plot all filtered on map
  filteredGites.forEach(g => {
    if (!g.lat || !g.lon) return;

    let icon = blueIcon;
    if (g.name.includes("Bergerie")) icon = orangeIcon;
    else if (g.has_spa) icon = greenIcon;

    const marker = L.marker([g.lat, g.lon], { icon }).addTo(markersLayer);

    const priceHtml = g.price ? `<strong>${g.price.toLocaleString('fr-FR')} €</strong> (Total 4 nuits • ~${g.price_per_person_10p} €/pers à 10)` : `<em>Tarif direct propriétaire</em>`;
    const phoneHtml = g.phone ? `<p style="margin:4px 0;">📞 <a href="tel:${g.phone}">${g.phone}</a></p>` : '';
    const spaTag = g.has_spa ? `<span style="background:#10b981; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">♨️ ${g.spa_type}</span>` : `<span style="background:#64748b; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px;">Maison de charme</span>`;

    const popupContent = `
      <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:210px;">
        <div style="font-size:11px; font-weight:800; color:#0284c7; text-transform:uppercase;">Rang #${g.rank}</div>
        <h4 style="margin:2px 0 4px 0; font-size:14px; font-weight:bold;">${escapeHtml(g.name)}</h4>
        <p style="margin:0 0 6px 0; font-size:12px; color:#64748b;">📍 ${escapeHtml(g.address)}</p>
        <p style="margin:0 0 6px 0; font-size:12px;">👥 <strong>${g.capacity} pers.</strong> • 🛏️ <strong>${g.bedrooms} ch.</strong></p>
        <div style="margin-bottom:6px;">${spaTag}</div>
        <p style="margin:0 0 6px 0; font-size:12px;">💰 ${priceHtml}</p>
        ${phoneHtml}
        <div style="margin-top:8px;">
          <a href="${g.listing_url}" target="_blank" style="display:inline-block; background:#0f172a; color:#fff; padding:5px 12px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold;">Voir l'annonce officielle →</a>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
  });
}

function renderGrid() {
  const grid = document.getElementById('gites-grid');
  const noResults = document.getElementById('no-results');
  const loadMoreBtn = document.getElementById('load-more-btn');

  grid.innerHTML = '';

  if (filteredGites.length === 0) {
    noResults.style.display = 'block';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  } else {
    noResults.style.display = 'none';
  }

  if (loadMoreBtn) loadMoreBtn.style.display = 'none';

  // Render Top 10 by default, or all if toggled
  const listToRender = showFullTop30 ? filteredGites : filteredGites.slice(0, 10);

  listToRender.forEach(g => {
    const card = document.createElement('div');
    card.className = 'gite-card';
    card.id = `card-${g.id}`;

    let badgesHtml = `<span class="badge badge-rank">#${g.rank}</span>`;
    if (g.avail_type === 'VERIFIED_ONLINE') {
      badgesHtml += `<span class="badge badge-avail-verified">🟢 Disponible 29/12 → 02/01</span>`;
    } else if (g.avail_type === 'DIRECT_INQUIRY') {
      badgesHtml += `<span class="badge badge-avail-direct">📞 Réservation Directe</span>`;
    } else if (g.avail_type === 'UNAVAILABLE') {
      badgesHtml += `<span class="badge badge-avail-complet">❌ Complet sur ces dates</span>`;
    } else {
      badgesHtml += `<span class="badge badge-avail-unverified">⚪ Non revérifié</span>`;
    }

    if (g.name.includes("Bergerie")) {
      badgesHtml += `<span class="badge badge-benchmark">⭐ Référence Sans Spa</span>`;
    } else if (g.has_spa) {
      badgesHtml += `<span class="badge badge-spa">♨️ ${escapeHtml(g.spa_type)}</span>`;
    }
    if (g.is_direct_owner) {
      badgesHtml += `<span class="badge badge-direct">👤 Direct Propriétaire</span>`;
    } else {
      badgesHtml += `<span class="badge badge-platform">🏠 ${escapeHtml(g.platform)}</span>`;
    }

    const coverUrl = g.photo_cover || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';

    let priceHtml = '';
    if (g.price) {
      priceHtml = `
        <div class="price-val">
          ${g.price.toLocaleString('fr-FR')} € 
          <span class="badge-price-tag">Total 4 nuits</span>
        </div>
        <div class="price-unit">
          🎆 Réveillon • <strong>~${g.price_per_person_10p} €/pers</strong> à 10 (${Math.round(g.price_per_person_10p / 4)} €/nuit/pers)
        </div>
      `;
    } else {
      priceHtml = `
        <div class="price-val" style="font-size:1.1rem; color:#0284c7;">Tarif direct propriétaire</div>
        <div class="price-unit">0% de commission d'agence</div>
      `;
    }

    let actionsHtml = '';
    if (g.phone) {
      actionsHtml += `<a href="tel:${g.phone}" class="btn-cta btn-phone">📞 Appeler (${escapeHtml(g.phone)})</a>`;
    }
    if (g.website && g.website !== g.listing_url) {
      actionsHtml += `<a href="${g.website}" target="_blank" class="btn-cta btn-site">🌐 Site officiel</a>`;
    }
    const availUi = {
      VERIFIED_ONLINE: { note: 'verified', icon: '✅', book: 'Réserver en direct (Airbnb) →' },
      DIRECT_INQUIRY: { note: 'inquiry', icon: 'ℹ️', book: 'Voir l\'annonce officielle →' },
      UNAVAILABLE: { note: 'complet', icon: '❌', book: 'Voir l\'annonce (complète) →' },
      UNVERIFIED: { note: 'unverified', icon: '⚪', book: 'Vérifier les dates sur la plateforme →' }
    };
    const ui = availUi[g.avail_type] || availUi.UNVERIFIED;
    actionsHtml += `<a href="${g.listing_url}" target="_blank" class="btn-cta btn-book">${ui.book}</a>`;

    const availNoteHtml = g.avail_details ? `
      <div class="avail-note ${ui.note}">
        ${ui.icon} ${escapeHtml(g.avail_details)}
      </div>
    ` : '';

    card.innerHTML = `
      <div class="card-media">
        <img class="card-img" src="${coverUrl}" alt="${escapeHtml(g.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80'">
        <div class="card-badges">
          ${badgesHtml}
        </div>
      </div>
      <div class="card-body">
        <div class="card-location">📍 ${escapeHtml(g.address)}</div>
        <h3 class="card-title">${escapeHtml(g.name)}</h3>
        <div class="card-specs">
          <span class="spec-item">👥 <strong>${g.capacity} pers.</strong></span>
          <span class="spec-item">🛏️ <strong>${g.bedrooms} chambres</strong></span>
          <span class="spec-item">⭐ <strong>${g.score} pts</strong></span>
        </div>
        ${availNoteHtml}
        <div class="card-desc">${escapeHtml(g.description)}</div>
        <div class="card-footer">
          <div class="price-row">
            ${priceHtml}
          </div>
          <div class="actions-row">
            ${actionsHtml}
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
