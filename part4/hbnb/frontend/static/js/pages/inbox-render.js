// ── Inbox page message list rendering ────────────────────────────────────────
// Exposes: renderInboxMessages(options)

(function exposeInboxRenderHelpers(globalScope) {
    function renderInboxMessages({
        msgs,
        isSent,
        inboxList,
        apiUrl,
        token,
        baseUrl,
        updateActivationHint,
        updateTriageRow,
        renderEmptyListState,
        getOtherUserName,
        formatMessageDate,
        openCompose,
        parseJsonResponse,
        renderAuthRequiredState,
        showFeedback,
        clearFeedback,
        onMessageCountChange,
    }) {
        inboxList.innerHTML = '';

        if (!Array.isArray(msgs) || !msgs.length) {
            renderEmptyListState(isSent);
            return;
        }

        updateActivationHint({ visible: false });
        updateTriageRow(isSent ? 'sent' : 'inbox', msgs.length);

        msgs.forEach((msg) => {
            const other = isSent ? msg.recipient : msg.sender;
            const otherName = getOtherUserName(other);
            const messageId = (msg && (typeof msg.id === 'string' || typeof msg.id === 'number'))
                ? String(msg.id)
                : '';
            const avatarHtml = other && other.profile_picture
                ? `<img src="${baseUrl}${escapeHtml(other.profile_picture)}" alt="${escapeHtml(otherName)}" class="review-avatar">`
                : '<div class="review-avatar review-avatar--empty"></div>';
            const unreadClass = (!isSent && !msg.read) ? ' inbox-item--unread' : '';
            const item = document.createElement('div');
            item.className = `inbox-item${unreadClass}`;
            const bodyText = typeof msg.body === 'string' ? msg.body : String(msg.body || '');
            const bodyPreview = bodyText.substring(0, 100) + (bodyText.length > 100 ? '…' : '');
            const messageDate = formatMessageDate(msg.created_at);

            item.innerHTML = `
                ${avatarHtml}
                <div class="inbox-item-body">
                    <div class="inbox-item-meta">
                        <strong>${escapeHtml(otherName)}</strong>
                        <span class="inbox-item-time">${escapeHtml(messageDate)}</span>
                    </div>
                    <p class="inbox-item-preview">${escapeHtml(bodyPreview)}</p>
                </div>
                <div class="inbox-item-actions">
                    ${!isSent ? `<button class="details-button inbox-reply-btn" data-uid="${escapeHtml(other ? other.id : '')}" data-name="${escapeHtml(otherName)}">Reply</button>` : ''}
                    <button class="notif-del-btn inbox-del-btn" data-id="${escapeHtml(messageId)}" title="Delete" ${messageId ? '' : 'disabled aria-disabled="true"'}>✕</button>
                </div>
            `;

            if (!isSent && !msg.read && messageId) {
                fetch(`${apiUrl}/messages/${messageId}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }

            const deleteButton = item.querySelector('.inbox-del-btn');
            deleteButton.addEventListener('click', () => {
                if (!messageId) {
                    showFeedback({
                        tone: 'warning',
                        message: 'This message is missing details and cannot be deleted right now.',
                    });
                    return;
                }
                if (deleteButton.disabled) return;
                deleteButton.disabled = true;
                deleteButton.setAttribute('aria-busy', 'true');

                fetch(`${apiUrl}/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(parseJsonResponse)
                .then(({ ok, status, data }) => {
                    if (status === 401) {
                        renderAuthRequiredState('Your session ended while deleting a message. Sign in again to continue.');
                        return;
                    }
                    if (!ok) {
                        throw new Error((data && data.Error) || 'Could not delete this message.');
                    }
                    item.remove();
                    if (typeof onMessageCountChange === 'function') {
                        onMessageCountChange(isSent);
                    }
                    showFeedback({
                        tone: 'success',
                        message: 'Message removed from this tab.',
                    });
                })
                .catch(() => {
                    deleteButton.disabled = false;
                    showFeedback({
                        tone: 'error',
                        message: 'We could not remove that message. Please try again.',
                    });
                })
                .finally(() => {
                    deleteButton.removeAttribute('aria-busy');
                    if (item.isConnected) deleteButton.disabled = false;
                });
            });

            const replyBtn = item.querySelector('.inbox-reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', () => openCompose(replyBtn.dataset.uid, replyBtn.dataset.name));
            }

            inboxList.appendChild(item);
        });

        clearFeedback();
    }

    globalScope.renderInboxMessages = renderInboxMessages;
})(window);
