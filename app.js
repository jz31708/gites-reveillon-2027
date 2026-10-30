// Gîtes Dashboard App
let allGites = [];
let filteredGites = [];
let currentPage = 1;
const pageSize = 24;

let map;
let markersLayer;

// Custom Icons
const greenIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:#10b981; width:22px; height:22px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px;">♨️</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const blueIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:#0284c7; width:20px; height:20px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px;">👤</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const orangeIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="background:#f97316; width:18px; height:18px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; font-size:9px;">🏠</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadData();
  setupEventListeners();
});

function initMap() {
  // Center on Massif Central / Cévennes (Southern France)
  map = L.map('map').setView([44.5, 3.5], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

async function loadData() {
  try {
    const res = await fetch('data.json');
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

  if (statTotal) statTotal.textContent = allGites.length.toLocaleString('fr-FR');
  if (statSpa) statSpa.textContent = allGites.filter(g => g.has_spa).length.toLocaleString('fr-FR');
  if (statDirect) statDirect.textContent = allGites.filter(g => g.is_direct_owner).length.toLocaleString('fr-FR');
}

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    applyFiltersAndSort();
  });

  // Filter chips
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPage = 1;
      applyFiltersAndSort();
    });
  });

  // Sort selector
  const sortSelect = document.getElementById('sort-select');
  sortSelect.addEventListener('change', () => {
    applyFiltersAndSort();
  });

  // Load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    renderGrid(true);
  });
}

function applyFiltersAndSort() {
  const activeChip = document.querySelector('.filter-chip.active');
  const filterType = activeChip ? activeChip.getAttribute('data-filter') : 'all';
  const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
  const sortMode = document.getElementById('sort-select').value;

  filteredGites = allGites.filter(g => {
    // Search match
    if (searchTerm) {
      const matchName = g.name && g.name.toLowerCase().includes(searchTerm);
      const matchAddress = g.address && g.address.toLowerCase().includes(searchTerm);
      const matchDept = g.department && g.department.toLowerCase().includes(searchTerm);
      const matchDesc = g.description && g.description.toLowerCase().includes(searchTerm);
      if (!matchName && !matchAddress && !matchDept && !matchDesc) {
        return false;
      }
    }

    // Category filter
    if (filterType === 'spa' && !g.has_spa) return false;
    if (filterType === 'direct' && !g.is_direct_owner) return false;
    if (filterType === 'cap12_14' && (g.capacity < 12 || g.capacity > 14)) return false;
    if (filterType === 'cap15_plus' && g.capacity < 15) return false;
    if (filterType === 'fete' && g.party_policy === 'fêtes_interdites') return false;

    return true;
  });

  // Sort
  filteredGites.sort((a, b) => {
    if (sortMode === 'score_desc') return b.score - a.score;
    if (sortMode === 'cap_desc') return b.capacity - a.capacity;
    if (sortMode === 'beds_desc') return b.bedrooms - a.bedrooms;
    if (sortMode === 'name_asc') return a.name.localeCompare(b.name);
    return 0;
  });

  // Update UI count
  document.getElementById('results-count').textContent = filteredGites.length.toLocaleString('fr-FR');

  updateMapMarkers();
  renderGrid(false);
}

function updateMapMarkers() {
  markersLayer.clearLayers();

  // Plot first 300 to keep map performant
  const toPlot = filteredGites.slice(0, 300);
  toPlot.forEach(g => {
    if (!g.lat || !g.lon) return;

    let icon = blueIcon;
    if (g.has_spa) icon = greenIcon;
    else if (!g.is_direct_owner) icon = orangeIcon;

    const marker = L.marker([g.lat, g.lon], { icon }).addTo(markersLayer);

    const priceHtml = g.price ? `<strong>${g.price.toLocaleString('fr-FR')} €</strong> (4 nuits)` : `<em>Tarif direct sur devis</em>`;
    const phoneHtml = g.phone ? `<p style="margin:4px 0;">📞 <a href="tel:${g.phone}">${g.phone}</a></p>` : '';
    const spaTag = g.has_spa ? `<span style="background:#10b981; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">♨️ ${g.spa_type}</span>` : '';

    const popupContent = `
      <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:200px;">
        <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:bold;">${escapeHtml(g.name)}</h4>
        <p style="margin:0 0 6px 0; font-size:12px; color:#64748b;">📍 ${escapeHtml(g.address)}</p>
        <p style="margin:0 0 6px 0; font-size:12px;">👥 <strong>${g.capacity} pers.</strong> • 🛏️ <strong>${g.bedrooms} ch.</strong></p>
        <div style="margin-bottom:6px;">${spaTag}</div>
        <p style="margin:0 0 6px 0; font-size:12px;">💰 ${priceHtml}</p>
        ${phoneHtml}
        <div style="margin-top:8px;">
          <a href="${g.listing_url}" target="_blank" style="display:inline-block; background:#0f172a; color:#fff; padding:4px 10px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold;">Voir la fiche complète →</a>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
  });
}

function renderGrid(append = false) {
  const grid = document.getElementById('gites-grid');
  const noResults = document.getElementById('no-results');
  const loadMoreBtn = document.getElementById('load-more-btn');

  if (!append) {
    grid.innerHTML = '';
  }

  if (filteredGites.length === 0) {
    noResults.style.display = 'block';
    loadMoreBtn.style.display = 'none';
    return;
  } else {
    noResults.style.display = 'none';
  }

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = currentPage * pageSize;
  const slice = filteredGites.slice(startIdx, endIdx);

  slice.forEach((g, idx) => {
    const card = document.createElement('div');
    card.className = 'gite-card';
    card.id = `card-${g.id}`;

    // Badges
    let badgesHtml = '';
    if (g.has_spa) {
      badgesHtml += `<span class="badge badge-spa">♨️ ${escapeHtml(g.spa_type)}</span>`;
    }
    if (g.is_direct_owner) {
      badgesHtml += `<span class="badge badge-direct">👤 Direct Propriétaire</span>`;
    } else {
      badgesHtml += `<span class="badge badge-platform">🏠 ${escapeHtml(g.platform)}</span>`;
    }

    // Cover Image fallback
    const coverUrl = g.photo_cover || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';

    // Pricing
    let priceHtml = '';
    if (g.price) {
      priceHtml = `
        <div class="price-val">${g.price.toLocaleString('fr-FR')} €</div>
        <div class="price-unit">4 nuits • ~${g.price_per_person} €/pers</div>
      `;
    } else {
      priceHtml = `
        <div class="price-val" style="font-size:1rem; color:#0284c7;">Tarif direct propriétaire</div>
        <div class="price-unit">Zéro commission de plateforme</div>
      `;
    }

    // Actions CTA
    let actionsHtml = '';
    if (g.phone) {
      actionsHtml += `<a href="tel:${g.phone}" class="btn-cta btn-phone">📞 ${escapeHtml(g.phone)}</a>`;
    }
    if (g.website) {
      actionsHtml += `<a href="${g.website}" target="_blank" class="btn-cta btn-site">🌐 Site web</a>`;
    }
    actionsHtml += `<a href="${g.listing_url}" target="_blank" class="btn-cta btn-book">Détails →</a>`;

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
          <span class="spec-item">⭐ <strong>${g.score}/100</strong></span>
        </div>
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

  if (endIdx >= filteredGites.length) {
    loadMoreBtn.style.display = 'none';
  } else {
    loadMoreBtn.style.display = 'inline-block';
  }
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
