// ── Index page rendering helpers ─────────────────────────────────────────────
// Exposes:
// - renderIndexSkeleton(placesContainer, count)
// - renderIndexPlaces(options)

(function exposeIndexRenderHelpers(globalScope) {
    function renderIndexSkeleton(placesContainer, count = 6) {
        placesContainer.innerHTML = '';
        for (let i = 0; i < count; i += 1) {
            placesContainer.innerHTML += `
                <div class="place-card-skeleton">
                    <div class="skeleton-line skeleton-img"></div>
                    <div class="skeleton-body">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-price"></div>
                        <div class="skeleton-line skeleton-desc"></div>
                        <div class="skeleton-line skeleton-desc2"></div>
                    </div>
                </div>`;
        }
    }

    function renderIndexPlaces({
        placesContainer,
        places,
        wishlistIds,
        toggleWishlist,
        onClearFilters,
    }) {
        placesContainer.innerHTML = '';

        if (!places.length) {
            placesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                            <path d="M8 11h6"></path>
                        </svg>
                    </div>
                    <h3>0 Results Found</h3>
                    <p>We couldn't find any places matching your current filters. Try adjusting them or clearing your search.</p>
                    <button class="empty-clear-btn" id="empty-state-clear-btn">Clear all filters</button>
                </div>
            `;

            const emptyStateBtn = placesContainer.querySelector('#empty-state-clear-btn');
            if (emptyStateBtn && typeof onClearFilters === 'function') {
                emptyStateBtn.addEventListener('click', () => onClearFilters());
            }
            return;
        }

        places.forEach((place) => {
            const card = document.createElement('div');
            card.className = 'place-card';

            const counts = place.review_counts || {};
            const totalReviews = Object.values(counts).reduce((sum, count) => sum + count, 0);
            const avgRating = place.average_rating;

            let ratingHtml;
            if (totalReviews === 0) {
                ratingHtml = '<p class="no-reviews">No reviews yet</p>';
            } else {
                ratingHtml = `<div class="avg-rating-row"><span class="avg-star">★</span><span class="avg-val">${avgRating}</span><span class="avg-total">· ${totalReviews} review${totalReviews === 1 ? '' : 's'}</span></div>`;
            }

            const picHtml = place.picture
                ? `<div class="place-card-img"><img src="${BASE_URL}${escapeHtml(place.picture)}" alt="${escapeHtml(place.title)}" loading="lazy"></div>`
                : '<div class="place-card-img place-card-img--empty" role="img" aria-label="No photo available"></div>';

            const descHtml = place.description
                ? `<p class="place-card-desc">${escapeHtml(place.description)}</p>`
                : '';

            const owner = place.owner;
            const ownerName = owner ? `${escapeHtml(owner.first_name)} ${escapeHtml(owner.last_name)}` : '';
            const ownerAvatarHtml = owner
                ? (owner.profile_picture
                    ? `<img src="${BASE_URL}${escapeHtml(owner.profile_picture)}" alt="${ownerName}" class="place-owner-avatar" data-tooltip="${ownerName}" loading="lazy">`
                    : `<div class="place-owner-avatar place-owner-avatar--empty" data-tooltip="${ownerName}"></div>`)
                : '';
            const ownerLinkHtml = owner
                ? `<a href="user_profile.html?id=${escapeHtml(owner.id)}" class="place-owner-link" data-tooltip="${ownerName}">${ownerAvatarHtml}</a>`
                : '';

            const isWished = wishlistIds.has(place.id);
            card.innerHTML = `
                ${picHtml}
                <div class="place-card-body">
                    <h2>${escapeHtml(place.title)}</h2>
                    <p>$${escapeHtml(String(place.price))} per night</p>
                    ${descHtml}
                    ${ratingHtml}
                    <div class="place-card-footer">
                        ${ownerLinkHtml}
                        <button class="wish-btn ${isWished ? 'active' : 'inactive'}" data-place-id="${escapeHtml(place.id)}" title="${isWished ? 'Remove from saved' : 'Save'}">${isWished ? '♥' : '♡'}</button>
                        <a href="place.html?id=${escapeHtml(place.id)}" class="details-button">View Details</a>
                    </div>
                </div>
            `;

            const wishBtn = card.querySelector('.wish-btn');
            if (wishBtn) {
                wishBtn.addEventListener('click', (event) => {
                    toggleWishlist(place.id, event.currentTarget);
                });
            }

            placesContainer.appendChild(card);
        });
    }

    globalScope.renderIndexSkeleton = renderIndexSkeleton;
    globalScope.renderIndexPlaces = renderIndexPlaces;
})(window);
