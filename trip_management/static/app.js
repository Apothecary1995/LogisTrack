const form = document.getElementById('trip-form');
const message = document.getElementById('message');
const tripList = document.getElementById('trip-list');
const archivedTripList = document.getElementById('archived-trip-list');

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

async function loadTrips() {
    const response = await fetch('/api/trips');
    const trips = await response.json();

    const activeTrips = trips.filter(trip => !trip.archived);
    const archivedTrips = trips.filter(trip => trip.archived);

    renderTrips(activeTrips, tripList, false);
    renderTrips(archivedTrips, archivedTripList, true);

    const archiveButtons = document.querySelectorAll('.archive-button');
    archiveButtons.forEach(button => button.addEventListener('click', async () => {
        const id = Number(button.dataset.id);
        const archived = button.dataset.archived === 'true';
        await toggleArchive(id, !archived);
    }));
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
    loadTrips();
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
    loadTrips();
});

loadTrips();
