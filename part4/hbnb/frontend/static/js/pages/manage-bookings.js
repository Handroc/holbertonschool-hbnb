// ── MANAGE BOOKINGS PAGE ──────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token, getQueryParam)

document.addEventListener('DOMContentLoaded', () => {

    const manageBookingsContainer = document.getElementById('manage-bookings-container');
    if (!manageBookingsContainer) return;

    if (!token) { window.location.href = 'login.html'; return; }
    const placeId = getQueryParam('id');
    if (!placeId) { window.location.href = 'my_places.html'; return; }

    const manageBookingsTitle = document.getElementById('manage-bookings-title');

    fetch(`${API_URL}/places/${placeId}`)
        .then(r => r.json())
        .then(place => {
            if (manageBookingsTitle && place.title) {
                manageBookingsTitle.textContent = `Bookings for "${place.title}"`;
            }
        })
        .catch(() => {});

    function loadManageBookings() {
        fetch(`${API_URL}/places/${placeId}/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Failed to load bookings');
            manageBookingsContainer.innerHTML = '';
            if (!data.length) {
                manageBookingsContainer.innerHTML = '<p class="text-muted">No bookings for this place yet.</p>';
                return;
            }
            const table = document.createElement('table');
            table.className = 'bookings-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Guest</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            data.forEach(booking => {
                const user = booking.user || {};
                const tr = document.createElement('tr');
                const isPending   = booking.status === 'pending';
                const isConfirmed = booking.status === 'confirmed';
                tr.innerHTML = `
                    <td data-label="Guest">${escapeHtml(user.first_name || '')} ${escapeHtml(user.last_name || '')}</td>
                    <td data-label="Check-in">${escapeHtml(booking.check_in)}</td>
                    <td data-label="Check-out">${escapeHtml(booking.check_out)}</td>
                    <td data-label="Status"><span class="booking-status booking-status--${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span></td>
                    <td data-label="Actions" class="booking-actions">
                        ${isPending
                            ? `<button class="action-btn confirm-btn" data-id="${escapeHtml(booking.id)}">Confirm</button>
                               <button class="action-btn danger reject-btn" data-id="${escapeHtml(booking.id)}">Reject</button>`
                            : isConfirmed
                                ? `<button class="action-btn danger reject-btn" data-id="${escapeHtml(booking.id)}">Cancel</button>`
                                : '<span class="text-muted">—</span>'
                        }
                    </td>
                `;
                const confirmBtn = tr.querySelector('.confirm-btn');
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', (e) => {
                        const btn = e.currentTarget;
                        btn.disabled = true;
                        fetch(`${API_URL}/bookings/${booking.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ status: 'confirmed' })
                        })
                        .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
                        .then(({ ok, data }) => {
                            if (!ok) throw new Error(data.Error || 'Failed to confirm');
                            loadManageBookings();
                        })
                        .catch(err => { btn.disabled = false; alert(err.message); });
                    });
                }
                const rejectBtn = tr.querySelector('.reject-btn');
                if (rejectBtn) {
                    rejectBtn.addEventListener('click', (e) => {
                        const btn = e.currentTarget;
                        if (!confirm('Cancel this booking?')) return;
                        btn.disabled = true;
                        fetch(`${API_URL}/bookings/${booking.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ status: 'cancelled' })
                        })
                        .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
                        .then(({ ok, data }) => {
                            if (!ok) throw new Error(data.Error || 'Failed to cancel');
                            loadManageBookings();
                        })
                        .catch(err => { btn.disabled = false; alert(err.message); });
                    });
                }
                tbody.appendChild(tr);
            });
            manageBookingsContainer.appendChild(table);
        })
        .catch(err => {
            manageBookingsContainer.innerHTML = `<p class="form-feedback-error" role="alert">${escapeHtml(err.message)}</p>`;
        });
    }

    loadManageBookings();

});
