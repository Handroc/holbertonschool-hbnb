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

    const emptyMsg = document.getElementById('notif-empty');
    const notifToolbar = document.getElementById('notif-toolbar');
    const summaryText = document.getElementById('notif-summary-text');
    const actionsDiv = document.getElementById('notif-actions');
    const markAllBtn = document.getElementById('mark-all-read-btn');
    const refreshBtn = document.getElementById('notif-refresh-btn');
    const notifFeedback = document.getElementById('notif-feedback');
    const DISMISS_UNDO_MS = 5000;
    const pendingDismissals = new Map();
    let isLoadingNotifications = false;
    let loadSeq = 0;
    let hasLoadError = false;

    const showFeedback = (message, tone = 'success', actionLabel = '', onAction = null) => {
        if (!notifFeedback) return;
        notifFeedback.innerHTML = '';
        notifFeedback.classList.remove('hidden', 'form-feedback-success', 'form-feedback-error');
        notifFeedback.classList.add(tone === 'error' ? 'form-feedback-error' : 'form-feedback-success');
        notifFeedback.setAttribute('aria-hidden', 'false');
        notifFeedback.setAttribute('role', tone === 'error' ? 'alert' : 'status');
        notifFeedback.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');

        const feedbackMessage = document.createElement('p');
        feedbackMessage.className = 'notif-feedback-message';
        feedbackMessage.textContent = message;
        notifFeedback.appendChild(feedbackMessage);

        if (actionLabel && typeof onAction === 'function') {
            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            actionBtn.className = 'btn--secondary notif-feedback-action';
            actionBtn.textContent = actionLabel;
            actionBtn.addEventListener('click', onAction);
            notifFeedback.appendChild(actionBtn);
        }
    };

    const clearFeedback = () => {
        if (!notifFeedback) return;
        notifFeedback.textContent = '';
        notifFeedback.classList.add('hidden');
        notifFeedback.classList.remove('form-feedback-success', 'form-feedback-error');
        notifFeedback.setAttribute('aria-hidden', 'true');
        notifFeedback.setAttribute('role', 'status');
        notifFeedback.setAttribute('aria-live', 'polite');
    };

    const setRefreshBusy = (isBusy) => {
        if (!refreshBtn) return;
        refreshBtn.disabled = isBusy;
        refreshBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    };

    const setMarkAllBusy = (isBusy) => {
        if (!markAllBtn) return;
        markAllBtn.disabled = isBusy;
        markAllBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    };

    const updateToolbarSummary = () => {
        if (hasLoadError) {
            setVisibility(notifToolbar, false);
            setVisibility(actionsDiv, false);
            setVisibility(emptyMsg, false);
            return;
        }

        const total = notifList.querySelectorAll('.notif-item').length;
        const unread = notifList.querySelectorAll('.notif-item--unread').length;
        const hasItems = total > 0;
        const hasUnread = unread > 0;

        setVisibility(notifToolbar, hasItems);
        setVisibility(actionsDiv, hasItems && hasUnread);
        setVisibility(emptyMsg, !hasItems);

        if (summaryText && hasItems) {
            summaryText.innerHTML = unread > 0
                ? `<span class="notif-summary-value">${unread}</span> unread <span class="notif-summary-divider">·</span> <span class="notif-summary-value">${total}</span> total`
                : 'All caught up';
        }

        if (markAllBtn) {
            markAllBtn.disabled = isLoadingNotifications || !hasUnread;
            markAllBtn.setAttribute('aria-busy', 'false');
        }
    };

    const showLoadingState = () => {
        hasLoadError = false;
        notifList.innerHTML = '<p class="list-empty-message notif-loading-state" role="status" aria-live="polite">Loading notifications...</p>';
        setVisibility(emptyMsg, false);
        setVisibility(notifToolbar, false);
        setVisibility(actionsDiv, false);
    };

    const renderAuthRequiredState = () => {
        hasLoadError = true;
        notifList.innerHTML = '';
        setVisibility(emptyMsg, false);
        setVisibility(notifToolbar, false);
        setVisibility(actionsDiv, false);
        showFeedback('Your session expired. Please sign in again to view notifications.', 'error');
    };

    const renderLoadErrorState = () => {
        hasLoadError = true;
        notifList.innerHTML = '';
        setVisibility(emptyMsg, false);
        setVisibility(notifToolbar, false);
        setVisibility(actionsDiv, false);
        showFeedback('Could not load notifications. Use Refresh to try again.', 'error');
    };

    const parseJsonResponse = async (response) => {
        let data = null;
        try {
            data = await response.json();
        } catch (err) {
            data = null;
        }
        return { ok: response.ok, status: response.status, data };
    };

    const resolveNotificationTarget = async (notification) => {
        if (!notification || typeof notification !== 'object') return null;
        if (notification.type !== 'booking' && notification.type !== 'review') return null;

        const placeTitle = typeof extractPlaceTitleFromNotificationMessage === 'function'
            ? extractPlaceTitleFromNotificationMessage(notification.message)
            : '';
        if (!placeTitle) return 'my_places.html';

        const response = await fetch(`${API_URL}/places/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const { ok, status, data } = await parseJsonResponse(response);

        if (status === 401) {
            renderAuthRequiredState();
            throw new Error('Session expired.');
        }
        if (!ok || !Array.isArray(data)) return 'my_places.html';

        const matchingPlace = data.find((place) => {
            if (!place || typeof place.title !== 'string') return false;
            return place.title.trim().toLowerCase() === placeTitle.toLowerCase();
        });

        if (!matchingPlace || !matchingPlace.id) return 'my_places.html';
        return `place.html?id=${encodeURIComponent(matchingPlace.id)}`;
    };

    const markNotificationAsRead = async (id, itemNode) => {
        const response = await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            renderAuthRequiredState();
            throw new Error('Session expired.');
        }
        if (!response.ok) throw new Error('Failed to mark notification as read.');

        itemNode.classList.remove('notif-item--unread');
        const readBtn = itemNode.querySelector('.notif-read-btn');
        if (readBtn) readBtn.remove();

        const statusPill = itemNode.querySelector('.notif-pill');
        if (statusPill) {
            statusPill.classList.remove('notif-pill--unread');
            statusPill.textContent = 'Read';
        }

        itemNode.setAttribute('aria-label', 'Read notification');
        updateToolbarSummary();
    };

    const dismissNotification = async (id) => {
        const response = await fetch(`${API_URL}/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            renderAuthRequiredState();
            throw new Error('Session expired.');
        }
        if (!response.ok) throw new Error('Failed to dismiss notification.');
    };

    const queueDismissNotification = (id, itemNode) => {
        if (!id || !itemNode || pendingDismissals.has(id)) return;

        const parent = itemNode.parentNode;
        if (!parent) return;
        const nextSibling = itemNode.nextSibling;

        const restore = () => {
            if (itemNode.isConnected) return;
            if (nextSibling && nextSibling.parentNode === parent) {
                parent.insertBefore(itemNode, nextSibling);
            } else {
                parent.appendChild(itemNode);
            }
            updateToolbarSummary();
        };

        itemNode.remove();
        updateToolbarSummary();

        const commitTimer = window.setTimeout(async () => {
            const pending = pendingDismissals.get(id);
            if (!pending) return;

            pendingDismissals.delete(id);
            try {
                await dismissNotification(id);
                showFeedback('Notification dismissed from your feed.');
            } catch (err) {
                pending.restore();
                if (err.message !== 'Session expired.') {
                    showFeedback('Could not dismiss this notification. Please try again.', 'error');
                }
            }
        }, DISMISS_UNDO_MS);

        pendingDismissals.set(id, { commitTimer, restore });
        showFeedback('Notification removed from your feed. Undo is available for 5 seconds.', 'success', 'Undo', () => {
            const pending = pendingDismissals.get(id);
            if (!pending) return;
            window.clearTimeout(pending.commitTimer);
            pendingDismissals.delete(id);
            pending.restore();
            showFeedback('Dismiss canceled. Notification restored to your feed.');
        });
    };

    function renderNotifications(notifs) {
        if (typeof renderNotificationsFeed === 'function') {
            renderNotificationsFeed({
                notifs,
                notifList,
                pendingDismissals,
                setHasLoadError: (value) => {
                    hasLoadError = !!value;
                },
                clearFeedback,
                updateToolbarSummary,
                resolveNotificationTarget,
                markNotificationAsRead,
                queueDismissNotification,
                showFeedback,
            });
            return;
        }

        hasLoadError = false;
        clearFeedback();
        notifList.innerHTML = '';
        updateToolbarSummary();
    }

    const loadNotifications = async ({ showLoading = true } = {}) => {
        const requestSeq = ++loadSeq;
        isLoadingNotifications = true;
        setRefreshBusy(true);
        setMarkAllBusy(true);
        clearFeedback();
        if (showLoading) showLoadingState();

        try {
            const response = await fetch(`${API_URL}/notifications/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { ok, status, data } = await parseJsonResponse(response);

            if (requestSeq !== loadSeq) return;

            if (status === 401) {
                renderAuthRequiredState();
                return;
            }
            if (!ok) throw new Error('Failed to load notifications.');

            renderNotifications(data);
        } catch (err) {
            if (requestSeq !== loadSeq) return;
            renderLoadErrorState();
        } finally {
            if (requestSeq !== loadSeq) return;
            isLoadingNotifications = false;
            setRefreshBusy(false);
            updateToolbarSummary();
        }
    };

    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            if (isLoadingNotifications) return;
            const unreadItems = Array.from(notifList.querySelectorAll('.notif-item--unread'));
            if (!unreadItems.length) {
                showFeedback('All notifications are already read.');
                return;
            }

            setMarkAllBusy(true);
            try {
                await Promise.all(unreadItems.map((item) => markNotificationAsRead(item.dataset.id, item)));
                showFeedback('All unread notifications marked as read. Nothing was removed from your feed.');
            } catch (err) {
                if (err.message !== 'Session expired.') {
                    showFeedback('Could not mark all notifications as read. Please try again.', 'error');
                }
            } finally {
                setMarkAllBusy(false);
                updateToolbarSummary();
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (isLoadingNotifications) return;
            void loadNotifications({ showLoading: true });
        });
    }

    void loadNotifications({ showLoading: true });

});
