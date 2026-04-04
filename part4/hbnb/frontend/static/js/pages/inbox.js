// ── INBOX PAGE ────────────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token, getQueryParam)

document.addEventListener('DOMContentLoaded', () => {

    const inboxList = document.getElementById('inbox-list');
    if (!inboxList) return;

    if (!token) { window.location.href = 'login.html'; return; }

    const composePanel        = document.getElementById('compose-panel');
    const composeForm         = document.getElementById('compose-form');
    const composeRecipientId  = document.getElementById('compose-recipient-id');
    const composeRecipientName = document.getElementById('compose-recipient-name');
    const composeBody         = document.getElementById('compose-body');
    const composeCancel       = document.getElementById('compose-cancel');

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    function openCompose(uid, name) {
        composeRecipientId.value   = uid;
        composeRecipientName.value = name;
        composeBody.value = '';
        if (composePanel) setVisibility(composePanel, true);
        composeBody.focus();
    }

    // Pre-fill compose if ?compose= param present
    const composeUid  = getQueryParam('compose');
    const composeName = getQueryParam('name');
    if (composeUid) openCompose(composeUid, decodeURIComponent(composeName || ''));

    if (composeCancel) {
        composeCancel.addEventListener('click', () => {
            if (composePanel) setVisibility(composePanel, false);
        });
    }

    if (composeForm) {
        composeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const recipientId = composeRecipientId.value;
            const body = composeBody.value.trim();
            if (!recipientId || !body) return;
            fetch(`${API_URL}/messages/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ recipient_id: recipientId, body })
            })
            .then(r => r.json().then(d => ({ ok: r.ok, d })))
            .then(({ ok, d }) => {
                if (!ok) throw new Error(d.Error || 'Failed to send');
                composeBody.value = '';
                if (composePanel) setVisibility(composePanel, false);
                loadInbox();
            })
            .catch(err => alert(err.message));
        });
    }

    function renderMessages(msgs, isSent) {
        inboxList.innerHTML = '';
        if (!msgs.length) {
            inboxList.innerHTML = '<p class="list-empty-message" role="status" aria-live="polite">No messages.</p>';
            return;
        }
        msgs.forEach(msg => {
            const other = isSent ? msg.recipient : msg.sender;
            const otherName = other ? `${other.first_name} ${other.last_name}` : 'Unknown';
            const avatarHtml = other && other.profile_picture
                ? `<img src="${BASE_URL}${escapeHtml(other.profile_picture)}" alt="${escapeHtml(otherName)}" class="review-avatar">`
                : `<div class="review-avatar review-avatar--empty"></div>`;
            const unreadClass = (!isSent && !msg.read) ? ' inbox-item--unread' : '';
            const item = document.createElement('div');
            item.className = `inbox-item${unreadClass}`;
            const bodyPreview = msg.body.substring(0, 100) + (msg.body.length > 100 ? '…' : '');
            item.innerHTML = `
                ${avatarHtml}
                <div class="inbox-item-body">
                    <div class="inbox-item-meta">
                        <strong>${escapeHtml(otherName)}</strong>
                        <span class="inbox-item-time">${escapeHtml(new Date(msg.created_at).toLocaleDateString())}</span>
                    </div>
                    <p class="inbox-item-preview">${escapeHtml(bodyPreview)}</p>
                </div>
                <div class="inbox-item-actions">
                    ${!isSent ? `<button class="details-button inbox-reply-btn" data-uid="${escapeHtml(other ? other.id : '')}" data-name="${escapeHtml(otherName)}">Reply</button>` : ''}
                    <button class="notif-del-btn inbox-del-btn" data-id="${escapeHtml(msg.id)}" title="Delete">✕</button>
                </div>
            `;
            if (!isSent && !msg.read) {
                fetch(`${API_URL}/messages/${msg.id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
            item.querySelector('.inbox-del-btn').addEventListener('click', () => {
                fetch(`${API_URL}/messages/${msg.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.ok ? item.remove() : null)
                .catch(() => {});
            });
            const replyBtn = item.querySelector('.inbox-reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', () => openCompose(replyBtn.dataset.uid, replyBtn.dataset.name));
            }
            inboxList.appendChild(item);
        });
    }

    function loadInbox() {
        fetch(`${API_URL}/messages/inbox`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(msgs => renderMessages(msgs, false))
            .catch(() => { inboxList.innerHTML = '<p class="form-feedback-error" role="alert">Failed to load inbox.</p>'; });
    }

    function loadSent() {
        fetch(`${API_URL}/messages/sent`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(msgs => renderMessages(msgs, true))
            .catch(() => { inboxList.innerHTML = '<p class="form-feedback-error" role="alert">Failed to load sent messages.</p>'; });
    }

    const tabInbox = document.getElementById('tab-inbox');
    const tabSent  = document.getElementById('tab-sent');
    if (tabInbox) {
        tabInbox.addEventListener('click', () => {
            tabInbox.classList.add('tab-btn--active');
            if (tabSent) tabSent.classList.remove('tab-btn--active');
            loadInbox();
        });
    }
    if (tabSent) {
        tabSent.addEventListener('click', () => {
            tabSent.classList.add('tab-btn--active');
            if (tabInbox) tabInbox.classList.remove('tab-btn--active');
            loadSent();
        });
    }

    loadInbox();

});
