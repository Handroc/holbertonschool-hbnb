// ── NOTIFICATIONS PAGE ────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token)

document.addEventListener('DOMContentLoaded', () => {

    const notifList = document.getElementById('notif-list');
    if (!notifList) return;

    if (!token) { window.location.href = 'login.html'; return; }

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    function renderNotifications(notifs) {
        notifList.innerHTML = '';
        const emptyMsg   = document.getElementById('notif-empty');
        const actionsDiv = document.getElementById('notif-actions');
        if (!notifs.length) {
            if (emptyMsg) setVisibility(emptyMsg, true);
            if (actionsDiv) setVisibility(actionsDiv, false);
            return;
        }
        if (emptyMsg) setVisibility(emptyMsg, false);
        if (actionsDiv) setVisibility(actionsDiv, true);
        notifs.forEach(n => {
            const item = document.createElement('div');
            item.className = 'notif-item' + (n.read ? '' : ' notif-item--unread');
            item.dataset.id = n.id;
            const typeIcon = n.type === 'booking' ? '📅' : n.type === 'review' ? '⭐' : '🔔';
            item.innerHTML = `
                <span class="notif-icon">${typeIcon}</span>
                <span class="notif-message">${escapeHtml(n.message)}</span>
                <span class="notif-time">${escapeHtml(new Date(n.created_at).toLocaleDateString())}</span>
                <button class="notif-del-btn" data-id="${escapeHtml(n.id)}" title="Dismiss">✕</button>
            `;
            if (!n.read) {
                item.addEventListener('click', (e) => {
                    if (e.target.classList.contains('notif-del-btn')) return;
                    fetch(`${API_URL}/notifications/${n.id}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(r => r.ok ? item.classList.remove('notif-item--unread') : null)
                    .catch(() => {});
                });
            }
            item.querySelector('.notif-del-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                fetch(`${API_URL}/notifications/${n.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.ok ? item.remove() : null)
                .catch(() => {});
            });
            notifList.appendChild(item);
        });
    }

    fetch(`${API_URL}/notifications/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(renderNotifications)
    .catch(() => { notifList.innerHTML = '<p class="form-feedback-error" role="alert">Failed to load notifications.</p>'; });

    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', () => {
            notifList.querySelectorAll('.notif-item--unread').forEach(item => {
                fetch(`${API_URL}/notifications/${item.dataset.id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.ok ? item.classList.remove('notif-item--unread') : null)
                .catch(() => {});
            });
        });
    }

});
