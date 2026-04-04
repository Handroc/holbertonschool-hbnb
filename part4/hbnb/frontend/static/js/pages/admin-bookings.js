// ── ADMIN BOOKINGS PAGE ───────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token, isCurrentUserAdmin)

document.addEventListener('DOMContentLoaded', () => {

    const adminBookingsTbody = document.getElementById('bookings-admin-tbody');
    const statusMessage = document.getElementById('admin-bookings-status');
    const statusText = statusMessage?.querySelector('.admin-inline-status__text');
    const statusDismissBtn = statusMessage?.querySelector('.admin-inline-status__dismiss');
    if (!adminBookingsTbody) return;

    if (!token || !isCurrentUserAdmin) {
        window.location.href = token ? 'index.html' : 'login.html';
        return;
    }

    const hideAdminStatus = () => {
        if (!statusMessage) return;
        statusMessage.classList.add('hidden');
        statusMessage.setAttribute('aria-hidden', 'true');
    };

    const showAdminStatus = (message, tone = 'warning') => {
        if (!statusMessage) return;
        if (statusText) {
            statusText.textContent = message;
        } else {
            statusMessage.textContent = message;
        }
        statusMessage.classList.remove('hidden', 'is-success', 'is-warning', 'is-error');
        statusMessage.classList.add(`is-${tone}`);
        statusMessage.setAttribute('aria-hidden', 'false');
    };

    if (statusDismissBtn) {
        statusDismissBtn.addEventListener('click', hideAdminStatus);
    }

    const resetDeleteButton = (button) => {
        if (!button) return;
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.classList.remove('action-btn--confirm');
        button.dataset.armed = 'false';
        button.textContent = button.dataset.defaultLabel || 'Delete';
    };

    const requireDeleteConfirmation = (button) => {
        if (!button) return false;
        if (button.dataset.armed === 'true') return true;
        button.dataset.defaultLabel = button.textContent.trim() || 'Delete';
        button.dataset.armed = 'true';
        button.textContent = 'Confirm Delete';
        button.classList.add('action-btn--confirm');
        showAdminStatus('Deleting is permanent. Press again within 4 seconds to confirm.', 'warning');
        window.setTimeout(() => {
            if (button.dataset.armed === 'true' && !button.disabled) {
                resetDeleteButton(button);
            }
        }, 4000);
        return false;
    };

    function loadAdminBookings() {
        fetch(`${API_URL}/bookings/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Failed to load bookings');
            adminBookingsTbody.innerHTML = '';
            if (!data.length) {
                adminBookingsTbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">No bookings yet. New reservations will appear here automatically.</td></tr>';
                return;
            }
            data.forEach(booking => {
                const place = booking.place || {};
                const user  = booking.user  || {};
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Place"><a href="place.html?id=${escapeHtml(place.id)}" class="host-link">${escapeHtml(place.title || '—')}</a></td>
                    <td data-label="Guest">${escapeHtml(user.first_name || '')} ${escapeHtml(user.last_name || '')}</td>
                    <td data-label="Check-in">${escapeHtml(booking.check_in)}</td>
                    <td data-label="Check-out">${escapeHtml(booking.check_out)}</td>
                    <td data-label="Status"><span class="booking-status booking-status--${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span></td>
                    <td data-label="Actions">
                        <div class="admin-actions">
                            <button class="action-btn danger delete-booking-btn" data-id="${escapeHtml(booking.id)}">Delete</button>
                        </div>
                    </td>
                `;
                const deleteBtn = tr.querySelector('.delete-booking-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                    const btn = e.currentTarget;
                    const bookingId = btn.dataset.id;
                    const bookingLabel = place.title ? `Booking for ${place.title}` : 'Booking';
                    if (!requireDeleteConfirmation(btn)) return;
                    btn.disabled = true;
                    btn.setAttribute('aria-busy', 'true');
                    btn.textContent = 'Deleting...';
                    fetch(`${API_URL}/bookings/${bookingId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
                    .then(({ ok, data }) => {
                        if (!ok) throw new Error(data.Error || 'Delete failed');
                        showAdminStatus(`${bookingLabel} was deleted.`, 'success');
                        loadAdminBookings();
                    })
                    .catch(err => {
                        showAdminStatus(err.message, 'error');
                        resetDeleteButton(btn);
                    });
                    });
                }
                adminBookingsTbody.appendChild(tr);
            });
        })
        .catch(err => {
            showAdminStatus(err.message, 'error');
            adminBookingsTbody.innerHTML = `<tr><td colspan="6" class="admin-table-error">${escapeHtml(err.message)} Please refresh and try again.</td></tr>`;
        });
    }

    loadAdminBookings();

});
