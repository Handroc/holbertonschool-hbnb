// ── Constants ─────────────────────────────────────────────────────────────────
const API_URL  = 'http://127.0.0.1:5000/api/v1';
const BASE_URL = 'http://127.0.0.1:5000';

// ── Security helpers ──────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCookie(name) {
    const parts = `; ${document.cookie}`.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function decodeToken(tok) {
    try {
        return JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
        return null;
    }
}

// ── Auth state (synchronous — safe to read at script parse time) ──────────────
const token               = getCookie('token');
const jwtPayload          = token ? decodeToken(token) : null;
const isCurrentUserAdmin  = jwtPayload ? (jwtPayload.is_admin === true) : false;

// ── Amenity icon map ──────────────────────────────────────────────────────────

const AMENITY_ICONS = {
    'wifi':            '/static/images/icon_wifi.png',
    'bathroom':        '/static/images/icon_bath.png',
    'pool':            '/static/images/icon_pool.png',
    'airconditioner':  '/static/images/icon_air-conditioner.png',
};

function amenityIcon(name) {
    const key = name.toLowerCase().replace(/[\s\-]+/g, '');
    return AMENITY_ICONS[key] || null;
}
