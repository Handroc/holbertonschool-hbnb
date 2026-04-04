// ── MY BOOKINGS PAGE ──────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token)

document.addEventListener('DOMContentLoaded', () => {

    const myBookingsContainer = document.getElementById('my-bookings-container');
    if (!myBookingsContainer) return;

    if (!token) { window.location.href = 'login.html'; return; }

    fetch(`${API_URL}/bookings/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) throw new Error(data.Error || 'Failed to load bookings');
        if (!data.length) {
            myBookingsContainer.innerHTML = `
                <div class="empty-state" role="status" aria-live="polite">
                    <div class="empty-state-icon" aria-hidden="true">📅</div>
                    <h3>No bookings yet</h3>
                    <p>Your booked stays will appear here once you reserve a place.</p>
                    <a href="index.html" class="btn--primary">Browse places</a>
                </div>
            `;
            return;
        }
        data.forEach(booking => {
            const place = booking.place || {};
            const statusClass = `booking-status--${booking.status}`;
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.innerHTML = `
                <div class="booking-card-header">
                    <h3><a href="place.html?id=${escapeHtml(place.id)}" class="host-link">${escapeHtml(place.title || 'Unknown place')}</a></h3>
                    <span class="booking-status ${escapeHtml(statusClass)}">${escapeHtml(booking.status)}</span>
                </div>
                <p><strong>Check-in:</strong> ${escapeHtml(booking.check_in)}</p>
                <p><strong>Check-out:</strong> ${escapeHtml(booking.check_out)}</p>
                ${booking.status !== 'cancelled'
                    ? `<button class="action-btn danger cancel-booking-btn" data-id="${escapeHtml(booking.id)}">Cancel</button>`
                    : ''}
            `;
            const cancelBtn = card.querySelector('.cancel-booking-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (!confirm('Cancel this booking?')) return;
                    fetch(`${API_URL}/bookings/${booking.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ status: 'cancelled' })
                    })
                    .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
                    .then(({ ok, data }) => {
                        if (!ok) throw new Error(data.Error || 'Failed to cancel');
                        window.location.reload();
                    })
                    .catch(err => alert(err.message));
                });
            }
            myBookingsContainer.appendChild(card);
        });
    })
    .catch(err => {
        myBookingsContainer.innerHTML = `<p class="form-feedback-error" role="alert">${err.message}</p>`;
    });

});
