import {
    database, ref, get, set, push, remove,
    auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
    OWNER_EMAILS, DEFAULT_ADMIN_EMAILS, DEFAULT_STAFF_EMAILS
} from './firebase-config.js';

const loginPanel = document.getElementById('loginPanel');
const managementPanel = document.getElementById('managementPanel');
const accessStatus = document.getElementById('accessStatus');
const ownerEmailDisplay = document.getElementById('ownerEmailDisplay');
const seedNotice = document.getElementById('seedNotice');
const adminList = document.getElementById('adminList');
const staffList = document.getElementById('staffList');

function showStatus(message, type) {
    accessStatus.textContent = message;
    accessStatus.className = type;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadAndRenderUsers() {
    const snapshot = await get(ref(database, 'authorizedUsers'));

    if (!snapshot.exists()) {
        seedNotice.style.display = 'block';
        adminList.innerHTML = '<div class="empty-list-note">No admins yet.</div>';
        staffList.innerHTML = '<div class="empty-list-note">No staff yet.</div>';
        return;
    }

    seedNotice.style.display = 'none';
    const entries = snapshot.val();
    const admins = [];
    const staff = [];

    Object.entries(entries).forEach(([key, entry]) => {
        if (!entry || !entry.email) return;
        const row = { key, email: entry.email };
        if (entry.role === 'admin') admins.push(row);
        else if (entry.role === 'staff') staff.push(row);
    });

    const renderList = (list) => {
        if (list.length === 0) return '<div class="empty-list-note">None yet.</div>';
        return list.map(row => `
            <div class="user-row">
                <span class="user-email">${escapeHtml(row.email)}</span>
                <button class="btn-remove" data-key="${row.key}"><i class="fas fa-trash"></i> Remove</button>
            </div>
        `).join('');
    };

    adminList.innerHTML = renderList(admins);
    staffList.innerHTML = renderList(staff);

    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
            const key = btn.getAttribute('data-key');
            if (!confirm('Remove this email from access?')) return;
            try {
                await remove(ref(database, `authorizedUsers/${key}`));
                await loadAndRenderUsers();
            } catch (error) {
                alert('Failed to remove: ' + error.message);
            }
        });
    });
}

async function seedFromDefaults() {
    try {
        const writes = [];
        DEFAULT_ADMIN_EMAILS.forEach(email => {
            const newRef = push(ref(database, 'authorizedUsers'));
            writes.push(set(newRef, { email, role: 'admin', addedAt: new Date().toISOString() }));
        });
        DEFAULT_STAFF_EMAILS.forEach(email => {
            const newRef = push(ref(database, 'authorizedUsers'));
            writes.push(set(newRef, { email, role: 'staff', addedAt: new Date().toISOString() }));
        });
        await Promise.all(writes);
        await loadAndRenderUsers();
    } catch (error) {
        alert('Failed to import list: ' + error.message);
    }
}

async function addUser() {
    const emailInput = document.getElementById('newUserEmail');
    const roleSelect = document.getElementById('newUserRole');
    const email = emailInput.value.trim().toLowerCase();
    const role = roleSelect.value;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    try {
        const snapshot = await get(ref(database, 'authorizedUsers'));
        if (snapshot.exists()) {
            const existing = Object.values(snapshot.val()).some(entry => entry && entry.email && entry.email.toLowerCase() === email);
            if (existing) {
                alert('This email is already in the access list.');
                return;
            }
        }

        const newRef = push(ref(database, 'authorizedUsers'));
        await set(newRef, { email, role, addedAt: new Date().toISOString(), addedBy: auth.currentUser?.email || '' });
        emailInput.value = '';
        await loadAndRenderUsers();
    } catch (error) {
        alert('Failed to add email: ' + error.message);
    }
}

document.getElementById('accessSignInBtn').addEventListener('click', async () => {
    try {
        showStatus('Signing in...', '');
        accessStatus.style.display = 'block';
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        showStatus('Sign-in failed: ' + error.message, 'error');
    }
});

document.getElementById('accessSignOutBtn').addEventListener('click', async () => {
    await signOut(auth);
});

document.getElementById('addUserBtn').addEventListener('click', addUser);
document.getElementById('seedBtn').addEventListener('click', seedFromDefaults);

onAuthStateChanged(auth, async (user) => {
    if (user && OWNER_EMAILS.includes(user.email)) {
        loginPanel.style.display = 'none';
        managementPanel.style.display = 'block';
        ownerEmailDisplay.textContent = user.email;
        await loadAndRenderUsers();
    } else if (user) {
        // Signed in, but not an owner
        loginPanel.style.display = 'block';
        managementPanel.style.display = 'none';
        showStatus('❌ This account is not authorized to manage access. Sign in with an owner account.', 'error');
        await signOut(auth);
    } else {
        loginPanel.style.display = 'block';
        managementPanel.style.display = 'none';
        accessStatus.style.display = 'none';
    }
});
