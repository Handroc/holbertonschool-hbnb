// ── Nav initialization + badge polling ───────────────────────────────────────
// Depends on: utils.js (token, jwtPayload, isCurrentUserAdmin, API_URL)

document.addEventListener('DOMContentLoaded', () => {

    const tokenIsExpired = !!(jwtPayload && typeof jwtPayload.exp === 'number' && (Date.now() / 1000) >= jwtPayload.exp);
    const tokenInvalid = !!token && !jwtPayload;
    let isAuthenticated = !!token && !!jwtPayload && !tokenIsExpired;
    const initialSessionMessage = token && (tokenIsExpired || tokenInvalid)
        ? (tokenIsExpired
            ? 'Your session expired. Please sign in again.'
            : 'Your session token is no longer valid. Please sign in again.')
        : '';

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    const clearAuthCookie = () => {
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    };

    // Toggle login / logout links
    const loginLink  = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const logoutMenuLink = document.getElementById('logout-menu-link');
    const addPlaceLink = document.getElementById('add-place-link');
    const inboxLink    = document.getElementById('inbox-link');
    const notifNavLink = document.getElementById('notif-nav-link');
    const inboxMenuLink = document.getElementById('inbox-menu-link');
    const notifMenuLink = document.getElementById('notif-menu-link');
    const avatarWrap   = document.getElementById('nav-avatar-wrap');
    const avatarBtn    = document.getElementById('nav-avatar-btn');
    const navDropdown  = document.getElementById('nav-dropdown');
    const adminNavLink = document.getElementById('admin-nav-link');

    const syncFooterYear = () => {
        const year = new Date().getFullYear();
        document.querySelectorAll('footer p').forEach((node) => {
            if (/©\s*\d{4}\s+HBnB/i.test(node.textContent || '')) {
                node.textContent = `© ${year} HBnB. All rights reserved.`;
            }
        });
    };
    syncFooterYear();

    let sessionNoticeShown = false;
    const showSessionNotice = (message = 'Your session expired. Please sign in again.') => {
        if (sessionNoticeShown) return;
        sessionNoticeShown = true;

        const existing = document.getElementById('session-expired-notice');
        if (existing) return;

        const notice = document.createElement('div');
        notice.id = 'session-expired-notice';
        notice.className = 'session-notice';
        notice.setAttribute('role', 'alert');
        notice.innerHTML = `
            <p>${message}</p>
            <a href="login.html" class="session-notice-link">Sign in</a>
            <button type="button" class="session-notice-dismiss" aria-label="Dismiss session message">×</button>
        `;

        const header = document.querySelector('header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(notice, header.nextSibling);
        } else {
            document.body.prepend(notice);
        }

        const dismiss = notice.querySelector('.session-notice-dismiss');
        if (dismiss) {
            dismiss.addEventListener('click', () => {
                notice.remove();
            });
        }
    };

    setVisibility(loginLink, !isAuthenticated);
    setVisibility(logoutLink, isAuthenticated);
    setVisibility(logoutMenuLink, false);

    const handleLogout = (e) => {
        e.preventDefault();
        clearAuthCookie();
        window.location.href = 'index.html';
    };

    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    if (logoutMenuLink) {
        logoutMenuLink.addEventListener('click', handleLogout);
    }

    // Primary nav — shown when logged in
    const isCompactTarget = !!logoutMenuLink;
    let unreadInboxCount = 0;
    let unreadNotifCount = 0;
    let previousInboxCount = 0;
    let previousNotifCount = 0;
    let hasPolledInbox = false;
    let hasPolledNotif = false;
    let inboxPollInterval = null;
    let notifPollInterval = null;

    const navLive = document.createElement('p');
    navLive.id = 'nav-live-region';
    navLive.className = 'sr-only';
    navLive.setAttribute('role', 'status');
    navLive.setAttribute('aria-live', 'polite');
    document.body.appendChild(navLive);

    const announceNav = (message) => {
        if (!message) return;
        navLive.textContent = '';
        window.requestAnimationFrame(() => {
            navLive.textContent = message;
        });
    };

    const applyStaticDiscoverabilityHints = () => {
        if (!avatarBtn) return;
        if (isAuthenticated) {
            avatarBtn.setAttribute('title', 'Account menu (messages and notifications inside)');
            avatarBtn.setAttribute('aria-label', 'Account menu, messages and notifications inside');
        } else {
            avatarBtn.removeAttribute('title');
            avatarBtn.setAttribute('aria-label', 'Account menu');
        }
    };

    const refreshUnreadLabels = () => {
        if (inboxLink) {
            inboxLink.setAttribute('aria-label', unreadInboxCount > 0
                ? `Inbox, ${unreadInboxCount} unread messages`
                : 'Inbox');
        }
        if (inboxMenuLink) {
            inboxMenuLink.setAttribute('aria-label', unreadInboxCount > 0
                ? `Inbox, ${unreadInboxCount} unread messages`
                : 'Inbox');
        }
        if (notifNavLink) {
            notifNavLink.setAttribute('aria-label', unreadNotifCount > 0
                ? `Notifications, ${unreadNotifCount} unread`
                : 'Notifications');
        }
        if (notifMenuLink) {
            notifMenuLink.setAttribute('aria-label', unreadNotifCount > 0
                ? `Notifications, ${unreadNotifCount} unread`
                : 'Notifications');
        }

        applyStaticDiscoverabilityHints();
    };

    const syncAuthVisibility = () => {
        setVisibility(loginLink, !isAuthenticated);
        setVisibility(logoutLink, isAuthenticated);
        setVisibility(addPlaceLink, isAuthenticated);
        setVisibility(avatarWrap, isAuthenticated);
        setVisibility(adminNavLink, isAuthenticated && !!isCurrentUserAdmin);
        refreshUnreadLabels();
        applyResponsiveNavDensity();
    };

    const forceSessionExpired = ({
        noticeMessage = 'Your session expired. Please sign in again.',
        announceMessage = 'Session expired. Please sign in again.',
        clearCookie = true,
    } = {}) => {
        if (!isAuthenticated && sessionNoticeShown) return;
        if (clearCookie) clearAuthCookie();
        isAuthenticated = false;
        stopUnreadPolling();
        syncAuthVisibility();
        showSessionNotice(noticeMessage);
        announceNav(announceMessage);
    };

    const stopUnreadPolling = () => {
        if (inboxPollInterval) {
            clearInterval(inboxPollInterval);
            inboxPollInterval = null;
        }
        if (notifPollInterval) {
            clearInterval(notifPollInterval);
            notifPollInterval = null;
        }
        unreadInboxCount = 0;
        unreadNotifCount = 0;
        refreshUnreadLabels();
        applyResponsiveNavDensity();
    };

    const applyResponsiveNavDensity = () => {
        const shouldCompact = isAuthenticated && isCompactTarget && window.matchMedia('(max-width: 900px)').matches;

        if (inboxMenuLink) setVisibility(inboxMenuLink, isAuthenticated);
        if (notifMenuLink) setVisibility(notifMenuLink, isAuthenticated);
        if (logoutMenuLink) setVisibility(logoutMenuLink, isAuthenticated && shouldCompact);

        setVisibility(inboxLink, isAuthenticated && unreadInboxCount > 0);
        setVisibility(notifNavLink, isAuthenticated && unreadNotifCount > 0);

        if (logoutMenuLink) {
            setVisibility(logoutLink, isAuthenticated && !shouldCompact);
        } else {
            setVisibility(logoutLink, isAuthenticated);
        }
    };

    if (initialSessionMessage) {
        forceSessionExpired({
            noticeMessage: initialSessionMessage,
            announceMessage: 'Session expired. Please sign in again to continue.',
            clearCookie: true,
        });
    } else {
        syncAuthVisibility();
    }

    window.addEventListener('hbnb:session-expired', (event) => {
        const detail = event && event.detail ? event.detail : {};
        forceSessionExpired({
            noticeMessage: detail.noticeMessage || 'Your session has ended. Please sign in again.',
            announceMessage: detail.announceMessage || 'Session expired. Please sign in again.',
            clearCookie: detail.clearCookie !== false,
        });
    });

    if (isCompactTarget) {
        window.addEventListener('resize', applyResponsiveNavDensity);
    }

    // Avatar dropdown — visible only when logged in

    if (avatarBtn && navDropdown && typeof setupAuthAvatarDropdown === 'function') {
        setupAuthAvatarDropdown(avatarBtn, navDropdown);
    }

    // ── Inbox unread badge polling ────────────────────────────────────────────

    async function updateInboxBadge() {
        if (!isAuthenticated) return;
        try {
            const response = await fetch(`${API_URL}/messages/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                forceSessionExpired({
                    noticeMessage: 'Your session has ended. Sign in again to keep receiving unread message updates.',
                    announceMessage: 'Session expired. Please sign in again to check unread messages.',
                });
                return;
            }

            if (!response.ok) return;

            const data = await response.json();
            if (!data || typeof data.count !== 'number') return;

            const badge = document.getElementById('inbox-unread-badge');
            const menuCount = document.getElementById('inbox-menu-count');
            if (!badge && !menuCount) return;
            if (data.count > 0) {
                unreadInboxCount = data.count;
                if (badge) {
                    badge.textContent = data.count;
                    badge.classList.remove('hidden');
                    badge.setAttribute('aria-hidden', 'false');
                    badge.setAttribute('aria-label', `${data.count} unread messages`);
                }
                if (menuCount) {
                    menuCount.textContent = data.count;
                    menuCount.classList.remove('hidden');
                    menuCount.setAttribute('aria-hidden', 'false');
                }
            } else {
                unreadInboxCount = 0;
                if (badge) {
                    badge.classList.add('hidden');
                    badge.setAttribute('aria-hidden', 'true');
                    badge.removeAttribute('aria-label');
                }
                if (menuCount) {
                    menuCount.classList.add('hidden');
                    menuCount.setAttribute('aria-hidden', 'true');
                }
            }
            refreshUnreadLabels();
            if (hasPolledInbox && unreadInboxCount !== previousInboxCount) {
                if (unreadInboxCount > 0) {
                    announceNav(`Inbox updated. ${unreadInboxCount} unread message${unreadInboxCount !== 1 ? 's' : ''}.`);
                } else {
                    announceNav('Inbox is clear.');
                }
            }
            hasPolledInbox = true;
            previousInboxCount = unreadInboxCount;
            applyResponsiveNavDensity();
        } catch (err) {
            // Ignore transient badge polling errors; core inbox handles user-facing feedback.
        }
    }

    // ── Notification badge polling ────────────────────────────────────────────

    async function updateNotifBadge() {
        if (!isAuthenticated) return;
        try {
            const response = await fetch(`${API_URL}/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                forceSessionExpired({
                    noticeMessage: 'Your session has ended. Sign in again to keep receiving notification updates.',
                    announceMessage: 'Session expired. Please sign in again to check notifications.',
                });
                return;
            }

            if (!response.ok) return;

            const data = await response.json();
            if (!data || typeof data.count !== 'number') return;

            const badge = document.getElementById('notif-badge');
            const menuCount = document.getElementById('notif-menu-count');
            if (!badge && !menuCount) return;
            if (data.count > 0) {
                unreadNotifCount = data.count;
                if (badge) {
                    badge.textContent = data.count;
                    badge.classList.remove('hidden');
                    badge.setAttribute('aria-hidden', 'false');
                    badge.setAttribute('aria-label', `${data.count} unread notifications`);
                }
                if (menuCount) {
                    menuCount.textContent = data.count;
                    menuCount.classList.remove('hidden');
                    menuCount.setAttribute('aria-hidden', 'false');
                }
            } else {
                unreadNotifCount = 0;
                if (badge) {
                    badge.classList.add('hidden');
                    badge.setAttribute('aria-hidden', 'true');
                    badge.removeAttribute('aria-label');
                }
                if (menuCount) {
                    menuCount.classList.add('hidden');
                    menuCount.setAttribute('aria-hidden', 'true');
                }
            }
            refreshUnreadLabels();
            if (hasPolledNotif && unreadNotifCount !== previousNotifCount) {
                if (unreadNotifCount > 0) {
                    announceNav(`Notifications updated. ${unreadNotifCount} unread notification${unreadNotifCount !== 1 ? 's' : ''}.`);
                } else {
                    announceNav('Notifications are all read.');
                }
            }
            hasPolledNotif = true;
            previousNotifCount = unreadNotifCount;
            applyResponsiveNavDensity();
        } catch (err) {
            // Ignore transient badge polling errors; core notifications page handles user-facing feedback.
        }
    }

    if (isAuthenticated) {
        const bootstrapUnreadPolling = async () => {
            await updateInboxBadge();
            if (!isAuthenticated) return;

            await updateNotifBadge();
            if (!isAuthenticated) return;

            inboxPollInterval = setInterval(() => {
                void updateInboxBadge();
            }, 30000);

            notifPollInterval = setInterval(() => {
                void updateNotifBadge();
            }, 30000);
        };

        void bootstrapUnreadPolling();
    }

});
