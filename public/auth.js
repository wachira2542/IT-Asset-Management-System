const AuthConfig = {
    storageKey: 'itAssetAuthUser'
};

function normalizeRole(role) {
    return String(role || 'user').trim().toLowerCase();
}

function getAuthUser() {
    try {
        const raw = localStorage.getItem(AuthConfig.storageKey);
        const user = raw ? JSON.parse(raw) : null;
        if (user && user.role) {
            user.role = normalizeRole(user.role);
        }
        return user;
    } catch (err) {
        console.error('Auth parse error:', err);
        return null;
    }
}

function setAuthUser(user) {
    if (user && user.role) {
        user.role = normalizeRole(user.role);
    }
    localStorage.setItem(AuthConfig.storageKey, JSON.stringify(user));
}

function clearAuthUser() {
    localStorage.removeItem(AuthConfig.storageKey);
}

async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/me', {
            credentials: 'include'
        });
        if (!response.ok) {
            clearAuthUser();
            return null;
        }
        const user = await response.json();
        if (user && user.role) {
            user.role = normalizeRole(user.role);
        }
        setAuthUser(user);
        return user;
    } catch (err) {
        console.error('Fetch current user error:', err);
        clearAuthUser();
        return null;
    }
}

async function serverLogin(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'ไม่สามารถเข้าสู่ระบบได้');
    }

    setAuthUser(data.user);
    return data.user;
}

function redirectByRole(role) {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'admin') {
        window.location.href = '/index.html';
    } else {
        window.location.href = '/user.html';
    }
}

function requireAuth(allowedRoles = ['admin', 'user']) {
    const currentUser = getAuthUser();
    if (!currentUser) {
        window.location.href = '/login.html';
        return null;
    }

    currentUser.role = normalizeRole(currentUser.role);

    if (!allowedRoles.includes(currentUser.role)) {
        if (currentUser.role === 'user') {
            window.location.href = '/user.html';
        } else if (currentUser.role === 'admin') {
            window.location.href = '/index.html';
        } else {
            window.location.href = '/login.html';
        }
        return null;
    }

    return currentUser;
}

function renderAuthInfo(user) {
    if (!user) return;
    const nameEl = document.querySelector('.user-name');
    if (nameEl) {
        nameEl.textContent = user.full_name;
    }

    const roleEl = document.querySelector('.user-role');
    if (roleEl) {
        roleEl.textContent = user.role === 'admin' ? 'เจ้าหน้าที่ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป';
    }

    const badgeText = user.role === 'admin' ? 'เจ้าหน้าที่ผู้ดูแลระบบ' : 'สำหรับพนักงานทั่วไป';
    const badgeEl = document.querySelector('.user-role-badge span');
    if (badgeEl) {
        badgeEl.textContent = badgeText;
    }
}

function initLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout error:', err);
        }
        clearAuthUser();
        window.location.href = '/login.html';
    });
}

function renderLoginForm() {
    const loginForm = document.getElementById('login-form');
    const errorBox = document.getElementById('login-error');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const user = await serverLogin(username, password);
            redirectByRole(user.role);
        } catch (err) {
            if (errorBox) {
                errorBox.textContent = err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง โปรดลองใหม่อีกครั้ง';
            }
        }
    });
}

async function initAuthPage(allowedRoles = ['admin', 'user']) {
    const currentUser = getAuthUser();
    const serverUser = await fetchCurrentUser();

    const user = serverUser || currentUser;
    if (!user) return;

    user.role = normalizeRole(user.role);

    if (!allowedRoles.includes(user.role)) {
        if (user.role === 'user') {
            window.location.href = '/user.html';
        } else if (user.role === 'admin') {
            window.location.href = '/index.html';
        } else {
            window.location.href = '/login.html';
        }
        return;
    }

    renderAuthInfo(user);
    initLogoutButton();
}

async function initLoginPage() {
    if (localStorage.getItem('force_logout_on_next_online')) {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {}
        localStorage.removeItem('force_logout_on_next_online');
    }

    const currentUser = await fetchCurrentUser();
    if (currentUser) {
        redirectByRole(currentUser.role);
        return;
    }
    renderLoginForm();
}

window.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.endsWith('/login.html')) {
        await initLoginPage();
        return;
    }

    const allowedRoles = window.location.pathname.endsWith('/index.html')
        ? ['admin']
        : ['user', 'admin'];

    await initAuthPage(allowedRoles);
});

window.addEventListener('offline', () => {
    if (!window.location.pathname.endsWith('/login.html')) {
        // Try to logout server if possible
        fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        // Flag to clear server session when next online
        localStorage.setItem('force_logout_on_next_online', 'true');
        clearAuthUser();
        alert('การเชื่อมต่ออินเตอร์เน็ตขัดข้อง ระบบจะนำคุณเข้าสู่หน้าจอ Login ใหม่อีกครั้งเพื่อความปลอดภัย');
        window.location.href = '/login.html';
    }
});

