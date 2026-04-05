// ── Auth avatar dropdown behavior ────────────────────────────────────────────
// Exposes: setupAuthAvatarDropdown(avatarBtn, navDropdown)

(function exposeAuthDropdownSetup(globalScope) {
    function setupAuthAvatarDropdown(avatarBtn, navDropdown) {
        if (!avatarBtn || !navDropdown) return;

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

        avatarBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleDropdown();
        });

        avatarBtn.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDropdown({ focusFirst: true });
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                openDropdown({ focusLast: true });
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown();
            }
        });

        navDropdown.addEventListener('keydown', (event) => {
            if (!isDropdownOpen()) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown();
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveMenuFocus(1);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveMenuFocus(-1);
                return;
            }

            if (event.key === 'Home') {
                event.preventDefault();
                focusMenuEdge('first');
                return;
            }

            if (event.key === 'End') {
                event.preventDefault();
                focusMenuEdge('last');
                return;
            }

            if (event.key !== 'Tab') return;

            const focusable = getFocusableMenuItems();
            if (!focusable.length) {
                event.preventDefault();
                avatarBtn.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        });

        document.addEventListener('click', () => {
            closeDropdown();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeDropdown();
        });

        navDropdown.addEventListener('click', (event) => event.stopPropagation());
    }

    globalScope.setupAuthAvatarDropdown = setupAuthAvatarDropdown;
})(window);
