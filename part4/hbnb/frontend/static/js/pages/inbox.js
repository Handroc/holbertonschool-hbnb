// ── INBOX PAGE ────────────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token, getQueryParam)

document.addEventListener('DOMContentLoaded', () => {

    const inboxList = document.getElementById('inbox-list');
    if (!inboxList) return;

    const tabsWrap = document.getElementById('inbox-tabs');
    const tabInbox = document.getElementById('tab-inbox');
    const tabSent  = document.getElementById('tab-sent');
    const inboxTriage = document.getElementById('inbox-triage');
    const inboxTriageSummary = document.getElementById('inbox-triage-summary');
    const inboxTriageSwitch = document.getElementById('inbox-triage-switch');
    const inboxActivationHint = document.getElementById('inbox-activation-hint');
    const inboxFeedback = document.getElementById('inbox-feedback');
    const inboxNewMessageLink = document.getElementById('inbox-new-message-link');
    const inboxHeadNote = document.getElementById('inbox-head-note');

    if (!token) { window.location.href = 'login.html'; return; }

    const tokenIsExpired = !!(jwtPayload && typeof jwtPayload.exp === 'number' && (Date.now() / 1000) >= jwtPayload.exp);
    const tokenInvalid = !!token && !jwtPayload;

    const composePanel        = document.getElementById('compose-panel');
    const composeForm         = document.getElementById('compose-form');
    const composeRecipientId  = document.getElementById('compose-recipient-id');
    const composeRecipientName = document.getElementById('compose-recipient-name');
    const composeBody         = document.getElementById('compose-body');
    const composeCancel       = document.getElementById('compose-cancel');
    const composeTitle        = document.getElementById('compose-title');
    const composeSubmit       = composeForm ? composeForm.querySelector('button[type="submit"]') : null;
    let isSendingMessage = false;
    let hasBroadcastSessionExpired = false;
    let activeFolder = '';
    let inboxLoadSeq = 0;
    let sentLoadSeq = 0;

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    const setTabsEnabled = (isEnabled) => {
        if (!tabsWrap) return;
        setVisibility(tabsWrap, isEnabled);
        if (inboxTriage) setVisibility(inboxTriage, isEnabled);
        if (inboxActivationHint) setVisibility(inboxActivationHint, isEnabled);
        if (tabInbox) tabInbox.disabled = !isEnabled;
        if (tabSent) tabSent.disabled = !isEnabled;
        if (inboxTriageSwitch) inboxTriageSwitch.disabled = !isEnabled;
    };

    const updateActivationHint = ({ visible = false, isSent = false } = {}) => {
        if (!inboxActivationHint) return;
        setVisibility(inboxActivationHint, visible);
        if (!visible) return;

        const activeFolder = isSent ? 'sent' : 'inbox';
        inboxActivationHint.textContent = FOLDER_CONFIG[activeFolder].hintText;
    };

    const FOLDER_CONFIG = {
        inbox: {
            summaryLabel: 'received',
            loadingMessage: 'Loading received messages...',
            emptyTitle: 'No replies yet',
            emptyMessage: 'Replies appear here after you send your first message.',
            steps: [
                'Open a host profile from the places page.',
                'Send your first message to start the conversation.',
            ],
            switchLabel: 'View sent messages',
            switchTarget: 'sent',
            hintText: 'Quick start: open any place card, select the host profile, then choose Message.',
            headNote: 'Conversations start from a host profile. Open a place and select Message to begin.',
        },
        sent: {
            summaryLabel: 'sent',
            loadingMessage: 'Loading sent messages...',
            emptyTitle: 'No messages sent yet',
            emptyMessage: 'Messages you send appear here right away.',
            steps: [
                'Open a host profile from any place.',
                'Send a message with dates and key questions.',
            ],
            switchLabel: 'View received messages',
            switchTarget: 'inbox',
            hintText: 'Tip: sent messages appear here after you use Message on any host profile.',
            headNote: 'Sent messages appear here so you can track what hosts received.',
        }
    };

    const getFolderKey = (tabName) => (tabName === 'sent' ? 'sent' : 'inbox');

    const updateHeadNote = (tabName) => {
        if (!inboxHeadNote) return;
        const folderKey = getFolderKey(tabName);
        inboxHeadNote.textContent = FOLDER_CONFIG[folderKey].headNote;
    };

    const setActiveTab = (tabName) => {
        const showInbox = tabName === 'inbox';
        if (tabInbox) {
            tabInbox.classList.toggle('tab-btn--active', showInbox);
            tabInbox.setAttribute('aria-selected', showInbox ? 'true' : 'false');
            tabInbox.setAttribute('tabindex', showInbox ? '0' : '-1');
        }
        if (tabSent) {
            tabSent.classList.toggle('tab-btn--active', !showInbox);
            tabSent.setAttribute('aria-selected', showInbox ? 'false' : 'true');
            tabSent.setAttribute('tabindex', showInbox ? '-1' : '0');
        }
        updateHeadNote(tabName);
    };

    const updateTriageRow = (tabName, count) => {
        if (!inboxTriageSummary || !inboxTriageSwitch) return;
        const safeCount = Number.isFinite(count) ? count : 0;
        const activeFolder = getFolderKey(tabName);
        const config = FOLDER_CONFIG[activeFolder];
        inboxTriageSummary.textContent = `Showing ${config.summaryLabel}: ${safeCount}`;

        inboxTriageSwitch.textContent = config.switchLabel;
        inboxTriageSwitch.setAttribute('aria-label', `${config.switchLabel}. Currently showing ${config.summaryLabel}.`);
        inboxTriageSwitch.onclick = () => {
            activateFolder(config.switchTarget);
        };
    };

    const setComposeControlsDisabled = (isDisabled) => {
        if (composeSubmit) {
            composeSubmit.disabled = isDisabled;
            composeSubmit.setAttribute('aria-busy', isDisabled ? 'true' : 'false');
        }
        if (composeCancel) composeCancel.disabled = isDisabled;
        if (composeBody) composeBody.readOnly = isDisabled;
    };

    const getOtherUserName = (user) => {
        if (!user || typeof user !== 'object') return 'Unknown user';
        const firstName = typeof user.first_name === 'string' ? user.first_name.trim() : '';
        const lastName = typeof user.last_name === 'string' ? user.last_name.trim() : '';
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName || 'Unknown user';
    };

    const formatMessageDate = (createdAt) => {
        const parsed = new Date(createdAt);
        if (Number.isNaN(parsed.getTime())) return 'Unknown date';
        return parsed.toLocaleDateString();
    };

    const clearFeedback = () => {
        if (!inboxFeedback) return;
        inboxFeedback.innerHTML = '';
        inboxFeedback.classList.add('hidden');
        inboxFeedback.classList.remove('is-success', 'is-warning', 'is-error');
        inboxFeedback.setAttribute('aria-hidden', 'true');
    };

    const showFeedback = ({
        tone = 'success',
        message,
        actionLabel,
        onAction,
    }) => {
        if (!inboxFeedback) return;

        const toneClass = tone === 'error'
            ? 'is-error'
            : (tone === 'warning' ? 'is-warning' : 'is-success');

        inboxFeedback.innerHTML = '';
        inboxFeedback.classList.remove('hidden', 'is-success', 'is-warning', 'is-error');
        inboxFeedback.classList.add(toneClass);
        inboxFeedback.setAttribute('aria-hidden', 'false');

        const text = document.createElement('p');
        text.textContent = message;
        inboxFeedback.appendChild(text);

        if (actionLabel && typeof onAction === 'function') {
            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            actionBtn.className = 'btn-outline inbox-feedback__action';
            actionBtn.textContent = actionLabel;
            actionBtn.addEventListener('click', onAction);
            inboxFeedback.appendChild(actionBtn);
        }
    };

    const renderInlineState = ({
        tone = 'status',
        title,
        message,
        actionLabel,
        actionHref,
        onAction,
        showTabs = true,
    }) => {
        clearFeedback();
        setTabsEnabled(showTabs);
        updateActivationHint({ visible: false });
        inboxList.innerHTML = '';

        const stateWrap = document.createElement('div');
        stateWrap.className = `empty-state ${tone === 'error' ? 'form-feedback-error' : ''}`;
        stateWrap.setAttribute('role', tone === 'error' ? 'alert' : 'status');
        stateWrap.setAttribute('aria-live', 'polite');

        if (title) {
            const titleNode = document.createElement('h3');
            titleNode.textContent = title;
            stateWrap.appendChild(titleNode);
        }

        const messageNode = document.createElement('p');
        messageNode.textContent = message;
        stateWrap.appendChild(messageNode);

        if (actionLabel) {
            if (actionHref) {
                const actionLink = document.createElement('a');
                actionLink.href = actionHref;
                actionLink.className = 'btn--primary';
                actionLink.textContent = actionLabel;
                stateWrap.appendChild(actionLink);
            } else if (typeof onAction === 'function') {
                const actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = 'btn--primary';
                actionBtn.textContent = actionLabel;
                actionBtn.addEventListener('click', onAction);
                stateWrap.appendChild(actionBtn);
            }
        }

        inboxList.appendChild(stateWrap);
    };

    const renderAuthRequiredState = (message = 'Your session ended. Sign in again to view messages.') => {
        if (inboxNewMessageLink) {
            inboxNewMessageLink.href = 'login.html';
            inboxNewMessageLink.textContent = 'Sign in to message hosts';
        }
        broadcastSessionExpired(message);
        resetComposeDraft();
        if (composePanel) setVisibility(composePanel, false);
        renderInlineState({
            tone: 'error',
            title: 'Session expired',
            message,
            actionLabel: 'Sign in',
            actionHref: 'login.html',
            showTabs: false,
        });
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

    const resetComposeDraft = () => {
        if (composeRecipientId) composeRecipientId.value = '';
        if (composeRecipientName) composeRecipientName.value = '';
        if (composeBody) composeBody.value = '';
        if (composeTitle) composeTitle.textContent = 'New Message';
    };

    const closeComposePanel = ({ clearUrl = false } = {}) => {
        if (isSendingMessage) return;
        resetComposeDraft();
        if (composePanel) setVisibility(composePanel, false);
        if (clearUrl) clearComposeParamsInUrl();
    };

    const broadcastSessionExpired = (noticeMessage) => {
        if (hasBroadcastSessionExpired) return;
        hasBroadcastSessionExpired = true;
        window.dispatchEvent(new CustomEvent('hbnb:session-expired', {
            detail: {
                noticeMessage,
                announceMessage: 'Session expired. Please sign in again to continue messaging.',
            }
        }));
    };

    const renderEmptyListState = (isSent) => {
        clearFeedback();
        setTabsEnabled(true);
        updateTriageRow(isSent ? 'sent' : 'inbox', 0);
        updateActivationHint({ visible: true, isSent });
        inboxList.innerHTML = '';

        const activeFolder = isSent ? 'sent' : 'inbox';
        const config = FOLDER_CONFIG[activeFolder];

        const stateWrap = document.createElement('section');
        stateWrap.className = 'empty-state inbox-onboarding-state';
        stateWrap.setAttribute('role', 'status');
        stateWrap.setAttribute('aria-live', 'polite');

        const titleNode = document.createElement('h3');
        titleNode.textContent = config.emptyTitle;
        stateWrap.appendChild(titleNode);

        const messageNode = document.createElement('p');
        messageNode.textContent = config.emptyMessage;
        stateWrap.appendChild(messageNode);

        const steps = document.createElement('ol');
        steps.className = 'inbox-onboarding-steps';
        config.steps.forEach((stepText) => {
            const step = document.createElement('li');
            step.textContent = stepText;
            steps.appendChild(step);
        });
        stateWrap.appendChild(steps);

        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'inbox-onboarding-actions';

        const browseAction = document.createElement('a');
        browseAction.href = 'index.html';
        browseAction.className = 'btn--primary';
        browseAction.textContent = 'Browse places';
        actionsWrap.appendChild(browseAction);

        const switchAction = document.createElement('button');
        switchAction.type = 'button';
        switchAction.className = 'btn-outline inbox-onboarding-secondary inbox-secondary-action';
        switchAction.textContent = config.switchLabel;
        switchAction.addEventListener('click', () => {
            activateFolder(config.switchTarget);
        });
        actionsWrap.appendChild(switchAction);

        stateWrap.appendChild(actionsWrap);
        inboxList.appendChild(stateWrap);
    };

    const renderLoadingListState = (tabName) => {
        clearFeedback();
        setTabsEnabled(true);
        updateActivationHint({ visible: false });
        updateTriageRow(tabName, 0);
        inboxList.innerHTML = '';

        const activeFolder = getFolderKey(tabName);
        const config = FOLDER_CONFIG[activeFolder];

        const stateWrap = document.createElement('p');
        stateWrap.className = 'list-empty-message inbox-loading-state';
        stateWrap.setAttribute('role', 'status');
        stateWrap.setAttribute('aria-live', 'polite');
        stateWrap.textContent = config.loadingMessage;
        inboxList.appendChild(stateWrap);
    };

    const getInitialFolder = () => {
        const folder = (getQueryParam('folder') || '').toLowerCase();
        return folder === 'sent' ? 'sent' : 'inbox';
    };

    const syncFolderInUrl = (tabName) => {
        const current = new URL(window.location.href);
        if (tabName === 'sent') {
            current.searchParams.set('folder', 'sent');
        } else {
            current.searchParams.delete('folder');
        }

        const nextQuery = current.searchParams.toString();
        const nextPath = `${current.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
        const existingQuery = window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search;
        const existingPath = `${window.location.pathname}${existingQuery ? `?${existingQuery}` : ''}`;
        if (nextPath === existingPath) return;
        window.history.pushState({}, '', nextPath);
    };

    const clearComposeParamsInUrl = () => {
        const current = new URL(window.location.href);
        const hadComposeParams = current.searchParams.has('compose') || current.searchParams.has('name');
        if (!hadComposeParams) return;

        current.searchParams.delete('compose');
        current.searchParams.delete('name');

        const nextQuery = current.searchParams.toString();
        const nextPath = `${current.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
        window.history.replaceState({}, '', nextPath);
    };

    const activateFolder = (tabName, { syncUrl = true, forceReload = false } = {}) => {
        const nextFolder = getFolderKey(tabName);
        const isSameFolder = nextFolder === activeFolder;
        activeFolder = nextFolder;

        if (syncUrl) syncFolderInUrl(nextFolder);
        if (isSameFolder && !forceReload) return;

        clearFeedback();
        setActiveTab(nextFolder);
        if (nextFolder === 'sent') {
            loadSent();
            return;
        }
        loadInbox();
    };

    function openCompose(uid, name) {
        if (!uid) {
            showFeedback({
                tone: 'warning',
                message: 'Choose a host or guest before opening a draft.',
            });
            return;
        }
        clearFeedback();
        composeRecipientId.value   = uid;
        composeRecipientName.value = name || 'Selected user';
        if (composeTitle) {
            composeTitle.textContent = name ? `Message ${name}` : 'New Message';
        }
        composeBody.value = '';
        if (composePanel) setVisibility(composePanel, true);
        composeBody.focus();
    }

    // Pre-fill compose if ?compose= param present
    const composeUid  = getQueryParam('compose');
    const composeName = getQueryParam('name');
    if (composeUid) {
        openCompose(composeUid, composeName || '');
        clearComposeParamsInUrl();
    }

    if (composeCancel) {
        composeCancel.addEventListener('click', () => {
            closeComposePanel({ clearUrl: true });
        });
    }

    if (composePanel) {
        composePanel.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeComposePanel({ clearUrl: true });
        });
    }

    if (composeForm) {
        composeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (isSendingMessage) return;
            const recipientId = composeRecipientId.value;
            const body = composeBody.value.trim();
            if (!recipientId || !body) {
                showFeedback({
                    tone: 'warning',
                    message: 'Write your message before sending.',
                });
                return;
            }

            isSendingMessage = true;
            setComposeControlsDisabled(true);
            fetch(`${API_URL}/messages/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ recipient_id: recipientId, body })
            })
            .then(parseJsonResponse)
            .then(({ ok, status, data }) => {
                if (status === 401) {
                    renderAuthRequiredState('Your session ended while sending a message. Sign in again to continue.');
                    return;
                }
                if (!ok) {
                    throw new Error((data && data.Error) || 'Message not sent.');
                }
                const recipientLabel = (composeRecipientName && composeRecipientName.value)
                    ? composeRecipientName.value
                    : 'your contact';
                const isSentFolderActive = activeFolder === 'sent';
                closeComposePanel({ clearUrl: true });
                showFeedback({
                    tone: 'success',
                    message: isSentFolderActive
                        ? `Message sent to ${recipientLabel}. Sent messages are up to date.`
                        : `Message sent to ${recipientLabel}. Open Sent messages to review it.`,
                    actionLabel: isSentFolderActive ? undefined : 'Open Sent',
                    onAction: isSentFolderActive
                        ? undefined
                        : () => {
                            activateFolder('sent');
                        },
                });

                if (isSentFolderActive) {
                    loadSent();
                    return;
                }
                loadInbox();
            })
            .catch(() => {
                showFeedback({
                    tone: 'error',
                    message: 'We could not send your message. Check your connection, then try again.',
                    actionLabel: 'Try again',
                    onAction: () => {
                        if (composePanel) setVisibility(composePanel, true);
                        composeBody.focus();
                    },
                });
            })
            .finally(() => {
                isSendingMessage = false;
                setComposeControlsDisabled(false);
            });
        });
    }

    const onMessageCountChange = (isSent) => {
        const remaining = inboxList.querySelectorAll('.inbox-item').length;
        if (!remaining) {
            renderEmptyListState(isSent);
            return;
        }
        updateTriageRow(isSent ? 'sent' : 'inbox', remaining);
    };

    function renderMessages(msgs, isSent) {
        if (typeof renderInboxMessages === 'function') {
            renderInboxMessages({
                msgs,
                isSent,
                inboxList,
                apiUrl: API_URL,
                token,
                baseUrl: BASE_URL,
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
            });
            return;
        }

        inboxList.innerHTML = '';
        renderEmptyListState(isSent);
    }

    async function loadInbox() {
        const requestSeq = ++inboxLoadSeq;
        renderLoadingListState('inbox');
        try {
            const response = await fetch(`${API_URL}/messages/inbox`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { ok, status, data } = await parseJsonResponse(response);

            if (status === 401) {
                renderAuthRequiredState();
                return;
            }
            if (requestSeq !== inboxLoadSeq || activeFolder !== 'inbox') return;
            if (!ok) {
                throw new Error((data && data.Error) || 'Failed to load inbox.');
            }

            setTabsEnabled(true);
            renderMessages(Array.isArray(data) ? data : [], false);
        } catch (err) {
            if (requestSeq !== inboxLoadSeq || activeFolder !== 'inbox') return;
            renderInlineState({
                tone: 'error',
                title: 'Could not load received messages',
                message: 'Check your connection, then retry. If it continues, sign in again and refresh this page.',
                actionLabel: 'Retry received',
                onAction: () => {
                    activateFolder('inbox', { forceReload: true });
                },
                showTabs: true,
            });
        }
    }

    async function loadSent() {
        const requestSeq = ++sentLoadSeq;
        renderLoadingListState('sent');
        try {
            const response = await fetch(`${API_URL}/messages/sent`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const { ok, status, data } = await parseJsonResponse(response);

            if (status === 401) {
                renderAuthRequiredState();
                return;
            }
            if (requestSeq !== sentLoadSeq || activeFolder !== 'sent') return;
            if (!ok) {
                throw new Error((data && data.Error) || 'Failed to load sent messages.');
            }

            setTabsEnabled(true);
            renderMessages(Array.isArray(data) ? data : [], true);
        } catch (err) {
            if (requestSeq !== sentLoadSeq || activeFolder !== 'sent') return;
            renderInlineState({
                tone: 'error',
                title: 'Could not load sent messages',
                message: 'Check your connection, then retry. If it continues, sign in again and refresh this page.',
                actionLabel: 'Retry sent',
                onAction: () => {
                    activateFolder('sent', { forceReload: true });
                },
                showTabs: true,
            });
        }
    }

    if (tabInbox) {
        tabInbox.addEventListener('click', () => {
            activateFolder('inbox');
        });
    }
    if (tabSent) {
        tabSent.addEventListener('click', () => {
            activateFolder('sent');
        });
    }

    if (tabsWrap) {
        tabsWrap.addEventListener('keydown', (event) => {
            const key = event.key;
            if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
            event.preventDefault();

            const activeIsInbox = tabInbox && tabInbox.getAttribute('aria-selected') === 'true';
            if (key === 'Home') {
                if (tabInbox) tabInbox.focus();
                activateFolder('inbox');
                return;
            }
            if (key === 'End') {
                if (tabSent) tabSent.focus();
                activateFolder('sent');
                return;
            }

            if (activeIsInbox) {
                if (tabSent) tabSent.focus();
                activateFolder('sent');
                return;
            }

            if (tabInbox) tabInbox.focus();
            activateFolder('inbox');
        });
    }

    window.addEventListener('popstate', () => {
        activateFolder(getInitialFolder(), { syncUrl: false, forceReload: true });
    });

    const initialFolder = getInitialFolder();
    setActiveTab(initialFolder);
    updateTriageRow(initialFolder, 0);

    if (tokenInvalid || tokenIsExpired) {
        renderAuthRequiredState();
        return;
    }

    setComposeControlsDisabled(false);
    activateFolder(initialFolder, { syncUrl: false });

});
