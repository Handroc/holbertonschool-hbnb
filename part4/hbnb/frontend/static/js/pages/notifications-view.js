// ── Notifications page rendering helpers ─────────────────────────────────────
// Exposes:
// - extractPlaceTitleFromNotificationMessage(message)
// - formatNotificationDate(rawDate)
// - shouldIgnoreNotificationItemNavigation(targetNode)
// - renderNotificationsFeed(options)

(function exposeNotificationsViewHelpers(globalScope) {
    function extractPlaceTitleFromNotificationMessage(message) {
        if (typeof message !== 'string') return '';

        const singleQuoteMatch = message.match(/'([^']+)'/);
        if (singleQuoteMatch && singleQuoteMatch[1]) return singleQuoteMatch[1].trim();

        const doubleQuoteMatch = message.match(/"([^"]+)"/);
        if (doubleQuoteMatch && doubleQuoteMatch[1]) return doubleQuoteMatch[1].trim();

        return '';
    }

    function formatNotificationDate(rawDate) {
        const parsed = new Date(rawDate);
        if (Number.isNaN(parsed.getTime())) return 'Unknown date';
        return parsed.toLocaleDateString();
    }

    function shouldIgnoreNotificationItemNavigation(targetNode) {
        if (!(targetNode instanceof Element)) return false;
        return !!targetNode.closest('button, a, .notif-item-actions');
    }

    function renderNotificationsFeed({
        notifs,
        notifList,
        pendingDismissals,
        setHasLoadError,
        clearFeedback,
        updateToolbarSummary,
        resolveNotificationTarget,
        markNotificationAsRead,
        queueDismissNotification,
        showFeedback,
    }) {
        setHasLoadError(false);
        clearFeedback();
        notifList.innerHTML = '';

        if (!Array.isArray(notifs) || !notifs.length) {
            updateToolbarSummary();
            return;
        }

        notifs.forEach((notification) => {
            const isUnread = !notification.read;
            const notifType = (typeof notification.type === 'string' ? notification.type : '').toLowerCase();
            const item = document.createElement('div');
            const isSubjectNavigable = notification.type === 'booking' || notification.type === 'review';

            item.className = `notif-item notif-item--${escapeHtml(notifType || 'general')}${isUnread ? ' notif-item--unread' : ''}${isSubjectNavigable ? ' notif-item--clickable' : ''}`;
            item.dataset.id = notification.id;
            item.setAttribute('aria-label', `${isUnread ? 'Unread' : 'Read'} notification`);
            if (isSubjectNavigable) {
                item.setAttribute('role', 'link');
                item.setAttribute('tabindex', '0');
            }

            const typeIcon = notification.type === 'booking' ? '📅' : notification.type === 'review' ? '⭐' : '🔔';
            const typeIconClass = notification.type === 'booking'
                ? 'notif-icon--booking'
                : (notification.type === 'review' ? 'notif-icon--review' : 'notif-icon--general');
            const statusText = isUnread ? 'Unread' : 'Read';
            const safeMessage = typeof notification.message === 'string' ? notification.message : 'Notification update';

            item.innerHTML = `
                <span class="notif-icon ${typeIconClass}">${typeIcon}</span>
                <div class="notif-item-content">
                    <p class="notif-message">${escapeHtml(safeMessage)}</p>
                    <div class="notif-meta">
                        <span class="notif-time">${escapeHtml(formatNotificationDate(notification.created_at))}</span>
                        <span class="notif-pill ${isUnread ? 'notif-pill--unread' : ''}">${statusText}</span>
                    </div>
                </div>
                <div class="notif-item-actions">
                    ${isUnread ? '<button class="btn-outline notif-read-btn" type="button">Mark as read</button>' : ''}
                    <button class="notif-del-btn" data-id="${escapeHtml(notification.id)}" type="button" title="Dismiss from feed" aria-label="Dismiss from feed">✕</button>
                </div>
            `;

            const readBtn = item.querySelector('.notif-read-btn');
            if (readBtn) {
                readBtn.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    if (readBtn.disabled) return;
                    readBtn.disabled = true;
                    readBtn.setAttribute('aria-busy', 'true');
                    try {
                        await markNotificationAsRead(notification.id, item);
                        showFeedback('Notification marked as read. It remains in your feed.');
                    } catch (error) {
                        if (item.isConnected) readBtn.disabled = false;
                        if (error.message !== 'Session expired.') {
                            showFeedback('Could not mark this notification as read. Please try again.', 'error');
                        }
                    } finally {
                        readBtn.removeAttribute('aria-busy');
                    }
                });
            }

            const dismissBtn = item.querySelector('.notif-del-btn');
            dismissBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                queueDismissNotification(notification.id, item);
            });

            const openSubject = async () => {
                if (!isSubjectNavigable || pendingDismissals.has(notification.id)) return;
                item.setAttribute('aria-busy', 'true');
                try {
                    const targetUrl = await resolveNotificationTarget(notification);
                    if (targetUrl) {
                        window.location.href = targetUrl;
                        return;
                    }
                    window.location.href = 'my_places.html';
                } catch (error) {
                    if (error.message !== 'Session expired.') {
                        showFeedback('Could not open this notification yet. Please try again.', 'error', 'My Places', () => {
                            window.location.href = 'my_places.html';
                        });
                    }
                } finally {
                    item.removeAttribute('aria-busy');
                }
            };

            item.addEventListener('click', (event) => {
                if (shouldIgnoreNotificationItemNavigation(event.target)) return;
                void openSubject();
            });

            item.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                void openSubject();
            });

            notifList.appendChild(item);
        });

        updateToolbarSummary();
    }

    globalScope.extractPlaceTitleFromNotificationMessage = extractPlaceTitleFromNotificationMessage;
    globalScope.formatNotificationDate = formatNotificationDate;
    globalScope.shouldIgnoreNotificationItemNavigation = shouldIgnoreNotificationItemNavigation;
    globalScope.renderNotificationsFeed = renderNotificationsFeed;
})(window);
