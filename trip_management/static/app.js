const form = document.getElementById('trip-form');
const message = document.getElementById('message');
const tripList = document.getElementById('trip-list');

async function loadTrips() {
    const response = await fetch('/api/trips');
    const trips = await response.json();

    if (!trips.length) {
        tripList.innerHTML = '<p>Henüz oluşturulmuş sefer yok.</p>';
        return;
    }

    tripList.innerHTML = trips.map(trip => `
        <div class="trip-card">
            <strong>${trip.tripCode}</strong>
            <p><strong>Kalkış:</strong> ${trip.origin}</p>
            <p><strong>Varış:</strong> ${trip.destination}</p>
            <p><strong>Kalkış Tarihi:</strong> ${trip.departureTime || '---'}</p>
            <p><strong>Varış Tarihi:</strong> ${trip.arrivalTime || '---'}</p>
            <p><strong>Araç:</strong> ${trip.vehicle || '---'}</p>
            <p><strong>Şoför:</strong> ${trip.driver || '---'}</p>
            <p><strong>Yük:</strong> ${trip.cargo || '---'}</p>
            <p><strong>Notlar:</strong> ${trip.notes || '---'}</p>
        </div>
    `).join('');
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const trip = {};

    formData.forEach((value, key) => {
        trip[key] = value;
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
