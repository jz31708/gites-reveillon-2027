// Gîtes Dashboard App - TOP 10 D'ÉLITE REVÉRIFIÉ
let allGites = [];
let filteredGites = [];
let showFullCatalogue = false;

let map;
let markersLayer;

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadData();
  setupEventListeners();
});

function initMap() {
  map = L.map('map').setView([44.8, 2.5], 7);

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

  const verified = allGites.filter(g => g.avail_type === 'VERIFIED_ONLINE' && g.budget_ok !== false);
  if (statTotal) statTotal.textContent = verified.length;
  if (statSpa) statSpa.textContent = verified.filter(g => g.has_spa).length;
  if (statDirect) statDirect.textContent = allGites.filter(g => g.avail_type === 'DIRECT_INQUIRY').length;
  if (statComplet) statComplet.textContent = allGites.filter(g => g.avail_type === 'UNAVAILABLE' || g.avail_type === 'NOT_ISOLATED').length;
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

  // Toggle Top 10 / Full Catalogue
  const toggleBtn = document.getElementById('toggle-top30-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      showFullCatalogue = !showFullCatalogue;
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

  if (showFullCatalogue) {
    toggleBtn.classList.add('expanded');
    if (toggleIcon) toggleIcon.textContent = '▲';
    if (toggleText) toggleText.textContent = 'Réduire au TOP 10 d\'Élite';
    if (modeText) modeText.textContent = 'Catalogue Complet (' + filteredGites.length + ' gîtes)';
    if (counter) counter.textContent = filteredGites.length;
  } else {
    toggleBtn.classList.remove('expanded');
    if (toggleIcon) toggleIcon.textContent = '👀';
    if (toggleText) toggleText.textContent = 'Afficher tous les autres gîtes audités (' + filteredGites.length + ' au total)';
    if (modeText) modeText.textContent = 'TOP 10 d\'Élite (29/12 → 02/01)';
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
    if (filterType === 'cap12_14' && (g.capacity < 12 || g.capacity > 14)) return false;
    if (filterType === 'cap15_plus' && g.capacity < 15) return false;
    if (filterType === 'fete' && g.party_policy === 'fêtes_interdites') return false;

    return true;
  });

  filteredGites.sort((a, b) => {
    if (sortMode === 'score_desc') return (a.rank || 999) - (b.rank || 999);
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

// AFFICHE UNIQUEMENT LE TOP 10 SUR LA CARTE
function updateMapMarkers() {
  markersLayer.clearLayers();

  // Ne tracer que le TOP 10 sur la carte pour une lisibilité parfaite
  const top10ToMap = allGites.filter(g => g.rank && g.rank <= 10);
  const bounds = [];

  top10ToMap.forEach(g => {
    if (!g.lat || !g.lon) return;

    let pinBg = '#0284c7';
    let pinEmoji = `#${g.rank}`;
    if (g.name.includes("Bergerie")) {
      pinBg = '#f59e0b';
      pinEmoji = `⭐ #${g.rank}`;
    } else if (g.has_spa) {
      pinBg = '#10b981';
      pinEmoji = `♨️ #${g.rank}`;
    } else if (g.rank <= 3) {
      pinBg = '#4f46e5';
    }

    const rankIcon = L.divIcon({
      className: 'custom-rank-pin',
      html: `<div style="
        background: ${pinBg};
        color: #ffffff;
        min-width: 34px;
        height: 32px;
        padding: 0 6px;
        border-radius: 16px;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 11px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        white-space: nowrap;
        cursor: pointer;
      ">${pinEmoji}</div>`,
      iconSize: [36, 32],
      iconAnchor: [18, 16],
      popupAnchor: [0, -16]
    });

    const marker = L.marker([g.lat, g.lon], { icon: rankIcon }).addTo(markersLayer);
    bounds.push([g.lat, g.lon]);

    const priceHtml = g.price ? `<strong>${g.price.toLocaleString('fr-FR')} €</strong> (${Math.round(g.price / (g.capacity || 12))} €/pers)` : `<em>Tarif direct</em>`;
    const spaTag = g.has_spa ? `<span style="background:#10b981; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">♨️ ${escapeHtml(g.spa_type)}</span>` : `<span style="background:#0284c7; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">🟢 100% Isolé</span>`;

    const popupContent = `
      <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:230px;">
        <div style="font-size:11px; font-weight:800; color:#0284c7; text-transform:uppercase;">Rang #${g.rank} sur 10</div>
        <h4 style="margin:3px 0 4px 0; font-size:14px; font-weight:bold;">${escapeHtml(g.name)}</h4>
        <p style="margin:0 0 6px 0; font-size:12px; color:#64748b;">📍 ${escapeHtml(g.address)}</p>
        <p style="margin:0 0 6px 0; font-size:12px;">👥 <strong>${g.capacity} pers.</strong> • 🛏️ <strong>${g.bedrooms} ch.</strong> • 🚿 <strong>${g.bathrooms || 2} sdb</strong></p>
        <div style="margin-bottom:6px;">${spaTag}</div>
        <p style="margin:0 0 6px 0; font-size:13px; color:#0f172a;">💰 ${priceHtml}</p>
        <div style="margin-top:8px; display:flex; gap:6px;">
          <a href="#card-${g.id}" onclick="document.getElementById('card-${g.id}')?.scrollIntoView({behavior:'smooth'});" style="display:inline-block; background:#0284c7; color:#fff; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold;">Voir la fiche ↓</a>
          <a href="${g.listing_url}" target="_blank" style="display:inline-block; background:#0f172a; color:#fff; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:bold;">Airbnb →</a>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
  });

  if (bounds.length > 0 && map) {
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 8 });
  }
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

  // Render Top 10 by default, or full catalogue if toggled
  const listToRender = showFullCatalogue ? filteredGites : filteredGites.slice(0, 10);

  listToRender.forEach(g => {
    const card = document.createElement('div');
    card.className = 'gite-card';
    card.id = `card-${g.id}`;

    const ppm = g.price ? Math.round(g.price / (g.capacity || 12)) : null;
    const ppn = g.price ? Math.round(g.price / 4 / (g.capacity || 12)) : null;
    let badgesHtml = `<span class="badge badge-rank">#${g.rank}</span>`;
    if (g.avail_type === 'VERIFIED_ONLINE') {
      badgesHtml += `<span class="badge badge-avail-verified">🟢 Dispo 29/12 → 02/01</span>`;
    } else if (g.avail_type === 'DIRECT_INQUIRY') {
      badgesHtml += `<span class="badge badge-avail-direct">📞 Direct Propriétaire</span>`;
    } else if (g.avail_type === 'NOT_ISOLATED') {
      badgesHtml += `<span class="badge badge-avail-complet">❌ Écarté : non isolé</span>`;
    } else if (g.avail_type === 'UNAVAILABLE') {
      badgesHtml += `<span class="badge badge-avail-complet">❌ Complet</span>`;
    } else {
      badgesHtml += `<span class="badge badge-avail-unverified">⚪ Non revérifié</span>`;
    }

    if (g.budget_ok === false) {
      badgesHtml += `<span class="badge badge-over-budget">💸 Hors budget</span>`;
    } else if (g.price && g.budget_ok) {
      badgesHtml += `<span class="badge badge-in-budget">💰 ≤ 1 802 €</span>`;
    }
    if (g.score) {
      badgesHtml += `<span class="badge badge-score">🏅 ${g.score}/100</span>`;
    }

    if (g.name.includes("Bergerie")) {
      badgesHtml += `<span class="badge badge-benchmark">⭐ Coup de Cœur Témoin</span>`;
    } else if (g.has_spa) {
      badgesHtml += `<span class="badge badge-spa">♨️ ${escapeHtml(g.spa_type)}</span>`;
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
          🎆 Réveillon • <strong>~${ppm} €/pers</strong> à ${g.capacity || 12} (${ppn} €/nuit/pers)
        </div>
      `;
    } else {
      priceHtml = `
        <div class="price-val" style="font-size:1.1rem; color:#0284c7;">Tarif direct propriétaire</div>
        <div class="price-unit">0% de commission d'agence</div>
      `;
    }

    let actionsHtml = '';
    if (g.satellite) {
      actionsHtml += `<a href="${g.satellite}" target="_blank" class="btn-cta btn-sat">🛰️ Vue satellite HD</a>`;
    }
    actionsHtml += `<a href="${g.listing_url}" target="_blank" class="btn-cta btn-book">Voir l'annonce Airbnb →</a>`;

    const availNoteHtml = g.avail_details ? `
      <div class="avail-note verified">
        ✅ ${escapeHtml(g.avail_details)}
      </div>
    ` : '';

    const chipsHtml = (g.amenities && g.amenities.length) ? `
      <div class="amenity-chips">
        ${g.amenities.map(a => `<span class="chip">${escapeHtml(a)}</span>`).join('')}
      </div>
    ` : '';

    const isoKey = { 'ISOLÉ': 'isole', 'CALME': 'calme', 'NON ISOLÉ': 'non-isole', 'NON DOCUMENTÉ': 'inconnu' }[g.isolation] || 'inconnu';
    const isoIcon = { isole: '🟢', calme: '🟡', 'non-isole': '🔴', inconnu: '⚪' }[isoKey];
    const isoHtml = g.isolation ? `
      <div class="iso-line iso-${isoKey}">
        <span class="iso-badge">${isoIcon} ${escapeHtml(g.isolation)}</span>
        ${g.isolation_note ? `<span class="iso-note">${escapeHtml(g.isolation_note)}</span>` : ''}
      </div>
    ` : '';

    const surfaceTxt = g.surface_m2 ? `Surface ${g.surface_m2} m²` : 'Surface non précisée';
    const surfaceHtml = `<div class="surface-line">📐 ${escapeHtml(surfaceTxt)}${g.reviews ? ` · ⭐ ${g.rating || 4.8}/5 (${g.reviews} avis)` : ''}</div>`;

    // BLOC POINTS FORTS & POINTS D'ATTENTION
    let prosConsHtml = '';
    if ((g.pros && g.pros.length) || (g.cons && g.cons.length)) {
      prosConsHtml = `
        <div class="pros-cons-box">
          ${g.pros && g.pros.length ? `
            <div class="pros-block">
              <div class="pros-heading">✅ Points forts</div>
              <ul class="pros-list">
                ${g.pros.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${g.cons && g.cons.length ? `
            <div class="cons-block">
              <div class="cons-heading">⚠️ Points d'attention / Vigilances</div>
              <ul class="cons-list">
                ${g.cons.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    }

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
          <span class="spec-item">🚿 <strong>${g.bathrooms || 2} sdb</strong></span>
          <span class="spec-item">🏅 <strong>${g.score} pts</strong></span>
        </div>
        ${availNoteHtml}
        ${chipsHtml}
        ${surfaceHtml}
        ${isoHtml}
        <div class="card-desc">${escapeHtml(g.description)}</div>
        ${prosConsHtml}
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
