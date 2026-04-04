// ── Nav initialization + badge polling ───────────────────────────────────────
// Depends on: utils.js (token, jwtPayload, isCurrentUserAdmin, API_URL)

document.addEventListener('DOMContentLoaded', () => {

    const tokenIsExpired = !!(jwtPayload && typeof jwtPayload.exp === 'number' && (Date.now() / 1000) >= jwtPayload.exp);
    const tokenInvalid = !!token && !jwtPayload;
    let isAuthenticated = !!token && !!jwtPayload && !tokenIsExpired;

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
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

    if (token && (tokenIsExpired || tokenInvalid)) {
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        isAuthenticated = false;
        showSessionNotice(tokenIsExpired
            ? 'Your session expired. Please sign in again.'
            : 'Your session token is no longer valid. Please sign in again.');
    }

    setVisibility(loginLink, !isAuthenticated);
    setVisibility(logoutLink, isAuthenticated);
    setVisibility(logoutMenuLink, false);

    const handleLogout = (e) => {
        e.preventDefault();
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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

    syncAuthVisibility();
    if (isCompactTarget) {
        window.addEventListener('resize', applyResponsiveNavDensity);
    }

    // Avatar dropdown — visible only when logged in

    if (avatarBtn && navDropdown) {
        avatarBtn.setAttribute('aria-haspopup', 'menu');
        avatarBtn.setAttribute('aria-expanded', 'false');
        navDropdown.setAttribute('role', 'menu');
        navDropdown.setAttribute('aria-hidden', 'true');

        let lastFocusedElement = null;

        const getFocusableMenuItems = () => {
            return Array.from(navDropdown.querySelectorAll('a[href], button:not([disabled])'))
                .filter((element) => !element.classList.contains('hidden') && element.getAttribute('aria-hidden') !== 'true');
        };

        const focusMenuEdge = (edge = 'first') => {
            const focusable = getFocusableMenuItems();
            if (!focusable.length) return;
            if (edge === 'last') {
                focusable[focusable.length - 1].focus();
                return;
            }
            focusable[0].focus();
        };

        const moveMenuFocus = (direction = 1) => {
            const focusable = getFocusableMenuItems();
            if (!focusable.length) return;

            const active = document.activeElement;
            const currentIndex = focusable.indexOf(active);
            const baseIndex = currentIndex === -1 ? (direction > 0 ? -1 : 0) : currentIndex;
            const nextIndex = (baseIndex + direction + focusable.length) % focusable.length;
            focusable[nextIndex].focus();
        };

        const isDropdownOpen = () => navDropdown.classList.contains('open');

        const closeDropdown = () => {
            if (!isDropdownOpen()) return;
            navDropdown.classList.remove('open');
            avatarBtn.setAttribute('aria-expanded', 'false');
            navDropdown.setAttribute('aria-hidden', 'true');
            if (lastFocusedElement === avatarBtn || !lastFocusedElement) {
                avatarBtn.focus();
            }
            lastFocusedElement = null;
        };

        const openDropdown = ({ focusFirst = false, focusLast = false } = {}) => {
            if (isDropdownOpen()) return;
            lastFocusedElement = document.activeElement;
            navDropdown.classList.add('open');
            avatarBtn.setAttribute('aria-expanded', 'true');
            navDropdown.setAttribute('aria-hidden', 'false');
            if (focusLast) {
                focusMenuEdge('last');
                return;
            }
            if (focusFirst) {
                focusMenuEdge('first');
            }
        };

        const toggleDropdown = ({ focusFirst = false } = {}) => {
            if (isDropdownOpen()) {
                closeDropdown();
            } else {
                openDropdown({ focusFirst });
            }
        };

        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        avatarBtn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDropdown({ focusFirst: true });
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                openDropdown({ focusLast: true });
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDropdown();
            }
        });

        navDropdown.addEventListener('keydown', (e) => {
            if (!isDropdownOpen()) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                closeDropdown();
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveMenuFocus(1);
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveMenuFocus(-1);
                return;
            }

            if (e.key === 'Home') {
                e.preventDefault();
                focusMenuEdge('first');
                return;
            }

            if (e.key === 'End') {
                e.preventDefault();
                focusMenuEdge('last');
                return;
            }

            if (e.key !== 'Tab') return;

            const focusable = getFocusableMenuItems();
            if (!focusable.length) {
                e.preventDefault();
                avatarBtn.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        });

        document.addEventListener('click', () => {
            closeDropdown();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDropdown();
        });
        navDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // ── Inbox unread badge polling ────────────────────────────────────────────

    function updateInboxBadge() {
        if (!isAuthenticated) return;
        fetch(`${API_URL}/messages/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => {
            if (r.status === 401) return { count: 0, unauthorized: true };
            return r.ok ? r.json() : null;
        })
        .then(data => {
            if (!data) return;
            if (data.unauthorized) {
                isAuthenticated = false;
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                stopUnreadPolling();
                syncAuthVisibility();
                showSessionNotice('Your session has ended. Sign in again to keep receiving unread message updates.');
                announceNav('Session expired. Please sign in again to check unread messages.');
                return;
            }
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
        })
        .catch(() => {});
    }

    // ── Notification badge polling ────────────────────────────────────────────

    function updateNotifBadge() {
        if (!isAuthenticated) return;
        fetch(`${API_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => {
            if (r.status === 401) return { count: 0, unauthorized: true };
            return r.ok ? r.json() : null;
        })
        .then(data => {
            if (!data) return;
            if (data.unauthorized) {
                isAuthenticated = false;
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                stopUnreadPolling();
                syncAuthVisibility();
                showSessionNotice('Your session has ended. Sign in again to keep receiving notification updates.');
                announceNav('Session expired. Please sign in again to check notifications.');
                return;
            }
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
        })
        .catch(() => {});
    }

    if (isAuthenticated) {
        updateInboxBadge();
        inboxPollInterval = setInterval(updateInboxBadge, 30000);
        updateNotifBadge();
        notifPollInterval = setInterval(updateNotifBadge, 30000);
    }

});
