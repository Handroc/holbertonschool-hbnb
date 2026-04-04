// ── USER PROFILE PAGE (public) ────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token, jwtPayload, getQueryParam)

document.addEventListener('DOMContentLoaded', () => {

    const userProfileSection = document.getElementById('user-profile-section');
    const profileLive = document.getElementById('user-profile-live');
    if (!userProfileSection) return;

    const announce = (message) => {
        if (!profileLive || !message) return;
        profileLive.textContent = '';
        window.requestAnimationFrame(() => {
            profileLive.textContent = message;
        });
    };

    const tokenIsExpired = !!(jwtPayload && typeof jwtPayload.exp === 'number' && (Date.now() / 1000) >= jwtPayload.exp);
    const hasValidSession = !!token && !!jwtPayload && !tokenIsExpired;

    const userId = getQueryParam('id');
    if (!userId) {
        userProfileSection.innerHTML = '<p class="form-feedback-error" role="alert">We could not find a host to display. <a href="index.html">Back to browse</a></p>';
        announce('Host profile not found.');
        return;
    }

    Promise.all([
        fetch(`${API_URL}/users/${userId}`).then(r => {
            if (!r.ok) throw new Error('Unable to load host details.');
            return r.json();
        }),
        fetch(`${API_URL}/users/${userId}/places`).then(r => {
            if (!r.ok) throw new Error('Unable to load host listings.');
            return r.json();
        })
    ])
    .then(([user, places]) => {
        if (user.Error) throw new Error(user.Error);
        const fullName   = `${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}`;
        const placeCount = Array.isArray(places) ? places.length : 0;
        const currentUserId = jwtPayload ? jwtPayload.sub : null;
        const isSelfView = !!(currentUserId && String(currentUserId) === String(userId));

        let contextLine = `Explore ${escapeHtml(user.first_name)}'s public hosting profile and current stays.`;
        if (isSelfView) {
            contextLine = 'This is your public profile as guests see it.';
        } else if (!hasValidSession) {
            contextLine = `Explore ${escapeHtml(user.first_name)}'s listings and sign in to send a message.`;
        }

        const avatarHtml = user.profile_picture
            ? `<img src="${BASE_URL}${escapeHtml(user.profile_picture)}" alt="${fullName}" class="avatar-preview">`
            : `<div class="avatar-placeholder">No Photo</div>`;

        const placeReviewCount = (place) => {
            if (place && place.review_counts && typeof place.review_counts === 'object') {
                return Object.values(place.review_counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
            }
            return Number(place && place.review_count) || 0;
        };

        const placeSignalScore = (place) => {
            const rating = Number(place && place.average_rating) || 0;
            const reviews = placeReviewCount(place);
            const recency = Date.parse((place && (place.updated_at || place.created_at)) || '') || 0;
            const price = Number(place && place.price) || 0;
            return (rating * 1000) + (reviews * 25) + (recency / 1e11) + (price / 1000);
        };

        const placeList = Array.isArray(places) ? places : [];
        const featuredPlaceId = placeList.length > 0
            ? String(placeList.reduce((best, candidate) => {
                return placeSignalScore(candidate) > placeSignalScore(best) ? candidate : best;
            }, placeList[0]).id)
            : null;

        let placesHtml = '';
        if (placeCount === 0) {
            placesHtml = `
                <div class="profile-empty-state" role="status">
                    <p class="text-muted">No stays are published yet.</p>
                    <a href="index.html" class="btn-secondary">Explore all stays</a>
                </div>
            `;
        } else {
            placesHtml = placeList.map(p => {
                const isFeatured = String(p.id) === featuredPlaceId;
                return `
                <article class="profile-place-card${isFeatured ? ' profile-place-card--featured' : ''}">
                    ${isFeatured ? '<p class="profile-place-badge">Featured stay</p>' : ''}
                    <h3 class="profile-place-title">${escapeHtml(p.title)}</h3>
                    <p class="profile-place-price">$${escapeHtml(String(p.price))} per night</p>
                    <a href="place.html?id=${escapeHtml(p.id)}" class="details-button profile-place-cta">View Details</a>
                </article>
            `;
            }).join('');
        }

        const msgBtnHtml = (hasValidSession && currentUserId && String(currentUserId) !== String(userId))
            ? `<button id="msg-user-btn" class="details-button profile-primary-action" data-uid="${escapeHtml(userId)}" data-name="${fullName}">Message this host</button>`
            : '';

        const actionHelper = msgBtnHtml
            ? '<p class="profile-helper-text">Questions about a stay? Send a direct message.</p>'
            : (!hasValidSession && !isSelfView)
                ? '<p class="profile-helper-text">Sign in to contact this host directly.</p>'
                : '<p class="profile-helper-text">Browse listings and open a stay to learn more.</p>';

        const secondaryCta = placeCount > 0
            ? `<a href="#user-places" class="btn-secondary profile-secondary-action">Jump to listings</a>`
            : `<a href="index.html" class="btn-secondary profile-secondary-action">Explore stays</a>`;

        const listingsLabel = `${placeCount} active listing${placeCount !== 1 ? 's' : ''}`;

        userProfileSection.innerHTML = `
            <section class="profile-hero" aria-label="Host profile summary">
                <div class="user-profile-header">
                    ${avatarHtml}
                    <div class="user-profile-copy">
                        <p class="profile-kicker">Host profile</p>
                        <h1>${fullName}</h1>
                        <p class="profile-context">${contextLine}</p>
                        <p class="user-profile-stat">${placeCount} place${placeCount !== 1 ? 's' : ''} listed</p>
                    </div>
                </div>
                <aside class="profile-actions" aria-label="Profile actions">
                    ${msgBtnHtml}
                    ${secondaryCta}
                    ${actionHelper}
                </aside>
            </section>

            <section id="user-places" class="profile-places-section" aria-label="Host listings">
                <div class="profile-section-head">
                    <h2 class="places-heading">Stays by ${escapeHtml(user.first_name)}</h2>
                    <span class="places-count-pill">${listingsLabel}</span>
                </div>
                <div class="places-grid">${placesHtml}</div>
            </section>
        `;
        const msgBtn = document.getElementById('msg-user-btn');
        if (msgBtn) {
            msgBtn.addEventListener('click', () => {
                announce(`Opening conversation with ${user.first_name}.`);
                window.location.href = `inbox.html?compose=${msgBtn.dataset.uid}&name=${encodeURIComponent(msgBtn.dataset.name)}`;
            });
        }

        const jumpLink = userProfileSection.querySelector('.profile-secondary-action[href="#user-places"]');
        const placesSection = document.getElementById('user-places');
        if (jumpLink && placesSection) {
            jumpLink.addEventListener('click', (e) => {
                e.preventDefault();
                placesSection.setAttribute('tabindex', '-1');
                placesSection.setAttribute('aria-label', `${placeCount} listing${placeCount !== 1 ? 's' : ''} for ${user.first_name}`);
                placesSection.focus({ preventScroll: true });
                placesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                announce(`Jumped to ${placeCount} listings for ${user.first_name}.`);
            });
        }

        announce(`${fullName} profile loaded. ${placeCount} listing${placeCount !== 1 ? 's' : ''} available.`);
    })
    .catch(err => {
        userProfileSection.innerHTML = `<p class="form-feedback-error" role="alert">We could not load this profile right now. <a href="index.html">Browse stays</a></p>`;
        announce(err.message || 'Profile could not be loaded.');
    });

});
