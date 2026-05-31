const form = document.getElementById('trip-form');
const waybillForm = document.getElementById('waybill-form');
const filterForm = document.getElementById('trip-filter-form');
const clearFilterButton = document.getElementById('clear-filter');
const message = document.getElementById('message');
const tripList = document.getElementById('trip-list');
const archivedTripList = document.getElementById('archived-trip-list');
const waybillList = document.getElementById('waybill-list');
const waybillTripSelect = document.getElementById('waybill-trip');
let allTrips = [];

function renderTrips(trips, container, archived) {
    if (!trips.length) {
        container.innerHTML = `<p>Henüz ${archived ? 'arşivlenmiş' : 'oluşturulmuş'} sefer yok.</p>`;
        return;
    }

    container.innerHTML = trips.map(trip => `
        <div class="trip-card${archived ? ' archived' : ''}">
            <strong>${trip.tripCode}</strong>
            <p><strong>Kalkış:</strong> ${trip.origin}</p>
            <p><strong>Varış:</strong> ${trip.destination}</p>
            <p><strong>Kalkış Tarihi:</strong> ${trip.departureTime || '---'}</p>
            <p><strong>Varış Tarihi:</strong> ${trip.arrivalTime || '---'}</p>
            <p><strong>Araç:</strong> ${trip.vehicle || '---'}</p>
            <p><strong>Şoför:</strong> ${trip.driver || '---'}</p>
            <p><strong>Yük:</strong> ${trip.cargo || '---'}</p>
            ${typeof trip.distanceKM !== 'undefined' && trip.distanceKM !== 0 ? `<p><strong>Mesafe:</strong> ${trip.distanceKM.toFixed(2)} km</p>` : ''}
            <p><strong>Notlar:</strong> ${trip.notes || '---'}</p>
            ${archived ? `<p class="archived-label">Arşivlendi: ${new Date(trip.archivedAt).toLocaleString('tr-TR')}</p>` : ''}
            <button class="archive-button" data-id="${trip.id}" data-archived="${archived}">
                ${archived ? 'Arşivi Kaldır' : 'Arşivle'}
            </button>
        </div>
    `).join('');
}

function renderWaybills(waybills) {
    if (!waybills.length) {
        waybillList.innerHTML = '<p>Henüz oluşturulmuş waybill yok.</p>';
        return;
    }

    waybillList.innerHTML = waybills.map(waybill => `
        <div class="waybill-card">
            <strong>${waybill.waybillNumber}</strong>
            <p><strong>Sefer:</strong> ${waybill.tripCode || '—'} ${waybill.tripId ? `(ID:${waybill.tripId})` : ''}</p>
            <p><strong>Gönderen:</strong> ${waybill.sender || '---'}</p>
            <p><strong>Alıcı:</strong> ${waybill.receiver || '---'}</p>
            <p><strong>Yük:</strong> ${waybill.cargo || '---'}</p>
            <p><strong>Ağırlık:</strong> ${waybill.weight || '---'}</p>
            <p><strong>Hacim:</strong> ${waybill.volume || '---'}</p>
            <p><strong>Alım Yeri:</strong> ${waybill.pickup || '---'}</p>
            <p><strong>Teslim Yeri:</strong> ${waybill.delivery || '---'}</p>
            <p><strong>Durum:</strong> ${waybill.status || 'Beklemede'}</p>
        </div>
    `).join('');
}

async function loadTrips() {
    const response = await fetch('/api/trips');
    const trips = await response.json();
    allTrips = trips;
    applyTripFilter();
    populateWaybillTripSelect(trips.filter(trip => !trip.archived));
}

function applyTripFilter() {
    const formData = new FormData(filterForm);
    const code = formData.get('searchCode').toString().trim().toLowerCase();
    const origin = formData.get('searchOrigin').toString().trim().toLowerCase();
    const destination = formData.get('searchDestination').toString().trim().toLowerCase();

    const filtered = allTrips.filter(trip => {
        const matchesCode = !code || trip.tripCode.toLowerCase().includes(code);
        const matchesOrigin = !origin || trip.origin.toLowerCase().includes(origin);
        const matchesDestination = !destination || trip.destination.toLowerCase().includes(destination);
        return matchesCode && matchesOrigin && matchesDestination;
    });

    const activeTrips = filtered.filter(trip => !trip.archived);
    const archivedTrips = filtered.filter(trip => trip.archived);

    renderTrips(activeTrips, tripList, false);
    renderTrips(archivedTrips, archivedTripList, true);

    const archiveButtons = document.querySelectorAll('.archive-button');
    archiveButtons.forEach(button => button.addEventListener('click', async () => {
        const id = Number(button.dataset.id);
        const archived = button.dataset.archived === 'true';
        await toggleArchive(id, !archived);
    }));
}

function populateWaybillTripSelect(trips) {
    waybillTripSelect.innerHTML = '<option value="">Sefer seçin (opsiyonel)</option>';
    trips.forEach(trip => {
        const option = document.createElement('option');
        option.value = trip.id;
        option.textContent = `${trip.tripCode} — ${trip.origin} → ${trip.destination}`;
        waybillTripSelect.appendChild(option);
    });
}

async function loadWaybills() {
    const response = await fetch('/api/waybills');
    const waybills = await response.json();
    renderWaybills(waybills);
}

async function toggleArchive(id, archived) {
    const response = await fetch('/api/trips/archive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, archived }),
    });

    if (!response.ok) {
        const text = await response.text();
        message.textContent = `Hata: ${text}`;
        message.className = 'message error';
        return;
    }

    message.textContent = archived ? 'Sefer arşivlendi.' : 'Sefer arşivi kaldırıldı.';
    message.className = 'message success';
    await loadTrips();
    await loadWaybills();
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const trip = {};

    formData.forEach((value, key) => {
        if (key === 'originLat' || key === 'originLng' || key === 'destLat' || key === 'destLng') {
            const n = parseFloat(value);
            if (!Number.isNaN(n)) trip[key] = n;
        } else {
            trip[key] = value;
        }
    });

    const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trip),
    });

    if (!response.ok) {
        const text = await response.text();
        message.textContent = `Hata: ${text}`;
        message.className = 'message error';
        return;
    }

    message.textContent = 'Sefer başarıyla oluşturuldu.';
    message.className = 'message success';
    form.reset();
    await loadTrips();
    await loadWaybills();
});

filterForm.addEventListener('submit', event => {
    event.preventDefault();
    applyTripFilter();
});

clearFilterButton.addEventListener('click', () => {
    filterForm.reset();
    applyTripFilter();
});

waybillForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(waybillForm);
    const waybill = {};

    formData.forEach((value, key) => {
        if (key === 'tripId') {
            const n = parseInt(value, 10);
            if (!Number.isNaN(n)) {
                waybill[key] = n;
            }
        } else {
            waybill[key] = value;
        }
    });

    const response = await fetch('/api/waybills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waybill),
    });

    if (!response.ok) {
        const text = await response.text();
        message.textContent = `Hata: ${text}`;
        message.className = 'message error';
        return;
    }

    message.textContent = 'Waybill başarıyla oluşturuldu.';
    message.className = 'message success';
    waybillForm.reset();
    await loadWaybills();
});

async function init() {
    await loadTrips();
    await loadWaybills();
}

init();
