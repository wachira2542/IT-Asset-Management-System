/*
   IT Asset & Rental Management System - Express Backend Server
   Designed by Senior Systems Analyst & Full-Stack Developer
*/

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const ldap = require('ldapjs');
const db = require('./db');
const mailer = require('./mailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// SSE Clients List
let sseClients = [];

function broadcastEvent(eventName = 'update', dataObj = null) {
    if (dataObj) {
        sseClients.forEach(c => {
            c.res.write(`event: ${eventName}\n`);
            c.res.write(`data: ${JSON.stringify(dataObj)}\n\n`);
        });
    } else {
        sseClients.forEach(c => c.res.write(`data: ${eventName}\n\n`));
    }
}

const LDAP_CONFIG = {
    url: 'ldap://ahdomain.aapico.com:389',
    baseDN: 'DC=aapico,DC=com',
    adminDN: 'CN=msa.mcp,OU=IT,OU=AH,DC=aapico,DC=com',
    adminPassword: 'it@apico4U',
    userFilter: '(&(objectClass=user)(sAMAccountName={{username}}))'
};

const LOCAL_ADMIN = {
    username: process.env.LOCAL_ADMIN_USERNAME || 'admin',
    password: process.env.LOCAL_ADMIN_PASSWORD || 'it@apico4U',
    fullName: process.env.LOCAL_ADMIN_FULL_NAME || 'Local Administrator',
    email: process.env.LOCAL_ADMIN_EMAIL || 'localadmin@localhost',
    role: 'admin'
};

function createLdapClient() {
    return ldap.createClient({
        url: LDAP_CONFIG.url,
        timeout: 10000,
        connectTimeout: 10000,
        reconnect: false
    });
}

function bindLdapClient(client, dn, password, bindLabel = 'ldap') {
    return new Promise((resolve, reject) => {
        client.bind(dn, password, err => {
            if (err) {
                const errMsg = err.message || String(err);
                return reject(new Error(`LDAP ${bindLabel} bind failed: ${errMsg}`));
            }
            resolve();
        });
    });
}

function escapeLdapFilter(value) {
    return value.replace(/[\\*()\\]/g, '\\$&');
}

function buildSearchFilters(username) {
    let effectiveUsername = username;
    if (username.includes('\\')) {
        effectiveUsername = username.split('\\').pop();
    }

    const filters = [];
    const mainFilter = LDAP_CONFIG.userFilter.replace('{{username}}', escapeLdapFilter(effectiveUsername));
    filters.push(mainFilter);

    if (username.includes('@')) {
        if (!mainFilter.includes('userPrincipalName')) {
            filters.push(`(&(objectClass=user)(userPrincipalName=${escapeLdapFilter(username)}))`);
        }
        if (!mainFilter.includes('mail')) {
            filters.push(`(&(objectClass=user)(mail=${escapeLdapFilter(username)}))`);
        }
    }

    if (!mainFilter.includes('sAMAccountName')) {
        filters.push(`(&(objectClass=user)(sAMAccountName=${escapeLdapFilter(effectiveUsername)}))`);
    }

    return Array.from(new Set(filters));
}

function searchLdapUser(client, username) {
    return new Promise((resolve, reject) => {
        // Exact match filters
        const exactFilters = [
            `(description=${username})`,
            `(sAMAccountName=${username})`,
            `(cn=${username})`,
            `(userPrincipalName=${username}@aapico.com)`
        ];

        let userEntry = null;
        let currentFilterIndex = 0;

        function tryExactFilters() {
            if (currentFilterIndex >= exactFilters.length) {
                return tryWildcardFilters();
            }

            const filter = exactFilters[currentFilterIndex++];
            console.log('📝 Trying filter:', filter);

            const options = {
                filter,
                scope: 'sub',
                attributes: ['dn', 'cn', 'displayName', 'mail', 'sAMAccountName', 'userPrincipalName', 'description', 'department', 'title', 'company']
            };

            userEntry = null;
            client.search(LDAP_CONFIG.baseDN, options, (err, res) => {
                if (err) return reject(err);

                res.on('searchEntry', entry => {
                    const obj = {};
                    entry.attributes.forEach(attr => {
                        obj[attr.type] = attr.values[0];
                    });
                    obj.dn = entry.dn.toString();
                    userEntry = obj;
                });

                res.on('error', reject);
                res.on('end', result => {
                    if (result.status !== 0) {
                        return reject(new Error('LDAP search failed with status ' + result.status));
                    }
                    if (userEntry) {
                        return resolve(userEntry);
                    }
                    tryExactFilters();
                });
            });
        }

        // Wildcard filters (fallback)
        const wildcardFilters = [
            `(description=*${username}*)`,
            `(sAMAccountName=*${username}*)`,
            `(cn=*${username}*)`,
            `(displayName=*${username}*)`
        ];
        let wildcardIndex = 0;

        function tryWildcardFilters() {
            if (wildcardIndex >= wildcardFilters.length) {
                return reject(new Error('User not found in AD'));
            }

            const filter = wildcardFilters[wildcardIndex++];
            console.log('📝 Trying wildcard:', filter);

            const options = {
                filter,
                scope: 'sub',
                attributes: ['dn', 'cn', 'displayName', 'mail', 'sAMAccountName', 'userPrincipalName', 'description', 'department', 'title', 'company']
            };

            userEntry = null;
            client.search(LDAP_CONFIG.baseDN, options, (err, res) => {
                if (err) return reject(err);

                res.on('searchEntry', entry => {
                    if (!userEntry) {
                        const obj = {};
                        entry.attributes.forEach(attr => {
                            obj[attr.type] = attr.values[0];
                        });
                        obj.dn = entry.dn.toString();
                        userEntry = obj;
                    }
                });

                res.on('error', reject);
                res.on('end', result => {
                    if (result.status !== 0) {
                        return reject(new Error('LDAP search failed with status ' + result.status));
                    }
                    if (userEntry) {
                        return resolve(userEntry);
                    }
                    tryWildcardFilters();
                });
            });
        }

        tryExactFilters();
    });
}

async function authenticateLdapUser(username, password) {
    const adminClient = createLdapClient();
    let userEntry;
    try {
        await bindLdapClient(adminClient, LDAP_CONFIG.adminDN, LDAP_CONFIG.adminPassword, 'admin');
        userEntry = await searchLdapUser(adminClient, username);
    } finally {
        adminClient.unbind(() => { });
    }

    // Use a fresh client instance to verify the user's password credentials
    const userClient = createLdapClient();
    try {
        await bindLdapClient(userClient, userEntry.dn, password, 'user');
    } finally {
        userClient.unbind(() => { });
    }

    return userEntry;
}

function normalizeRole(role) {
    return String(role || 'user').trim().toLowerCase();
}

function authenticateLocalAdmin(username, password) {
    if (username !== LOCAL_ADMIN.username) {
        return null;
    }
    if (password !== LOCAL_ADMIN.password) {
        return null;
    }
    return {
        id: 'local-admin',
        username: LOCAL_ADMIN.username,
        full_name: LOCAL_ADMIN.fullName,
        email: LOCAL_ADMIN.email,
        role: normalizeRole(LOCAL_ADMIN.role),
        is_local_admin: true
    };
}

async function syncLdapUserToDb(ldapUser) {
    const username = ldapUser.sAMAccountName || ldapUser.cn || ldapUser.dn;
    const email = ldapUser.mail || '';
    const fullName = ldapUser.displayName || ldapUser.cn || username;

    const existingUser = await db.query.get('SELECT * FROM users WHERE username = ?', [username]);
    const role = normalizeRole(existingUser ? existingUser.role : 'user');

    if (existingUser) {
        await db.query.run(
            'UPDATE users SET full_name = ?, email = ?, role = ?, is_active = 1 WHERE id = ?',
            [fullName, email, role, existingUser.id]
        );
        return { id: existingUser.id, username, full_name: fullName, email, role };
    }

    const userId = 'u_' + Date.now();
    await db.query.run(
        'INSERT INTO users (id, username, full_name, email, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [userId, username, fullName, email, role]
    );

    return { id: userId, username, full_name: fullName, email, role };
}

function requireAuth(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        req.session.user.role = normalizeRole(req.session.user.role);
        if (allowedRoles.length && !allowedRoles.includes(req.session.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
}

// ================= MIDDLEWARES =================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'replace_this_with_a_strong_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 60 * 60 * 1000
    }
}));

// Redirect root to login page so users must authenticate first
app.get(['/', '/login'], (req, res) => {
    res.redirect('/login.html');
});

// Serve frontend static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Authentication API
app.post('/api/login', async (req, res) => {
    const rawUsername = req.body.username;
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const ldapUser = await authenticateLdapUser(username, password);
        const appUser = await syncLdapUserToDb(ldapUser);
        req.session.user = appUser;
        return res.json({ user: appUser });
    } catch (err) {
        console.error('LDAP login error:', err.message || err);
        const localUser = authenticateLocalAdmin(username, password);
        if (localUser) {
            const existing = await db.query.get('SELECT * FROM users WHERE id = ?', [localUser.id]);
            if (!existing) {
                await db.query.run(
                    'INSERT INTO users (id, username, full_name, email, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
                    [localUser.id, localUser.username, localUser.full_name, localUser.email, localUser.role]
                );
            }
            req.session.user = localUser;
            return res.json({ user: localUser });
        }

        const errMessage = (err.message || '').toLowerCase();
        let message;

        if (errMessage.includes('ldap admin bind failed')) {
            message = 'ไม่สามารถเชื่อมต่อ AD เพื่อค้นหาผู้ใช้ กรุณาตรวจสอบการตั้งค่า LDAP ของระบบ';
        } else if (errMessage.includes('invalid credentials')) {
            message = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        } else if (errMessage.includes('user not found')) {
            message = 'ไม่พบผู้ใช้ใน AD กรุณาตรวจสอบชื่อผู้ใช้';
        } else {
            message = 'ไม่สามารถตรวจสอบผู้ใช้ได้ กรุณาตรวจสอบการเชื่อมต่อ AD';
        }

        res.status(401).json({ error: message });
    }
});

app.get('/api/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(req.session.user);
});

app.post('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ error: 'Failed to logout' });
            }
            res.clearCookie('connect.sid'); // Clear the session cookie
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

// AD User Search Endpoint for filling borrower form
app.get('/api/ad-user', requireAuth(['admin', 'user']), async (req, res) => {
    const { q } = req.query; // Search by employee_id (description) or username
    if (!q) return res.status(400).json({ error: 'Missing query parameter' });
    
    try {
        const adminClient = createLdapClient();
        await bindLdapClient(adminClient, LDAP_CONFIG.adminDN, LDAP_CONFIG.adminPassword, 'admin');
        
        // Exact match on employee_id (description) or wildcard on sAMAccountName/cn
        const filter = `(|(description=${escapeLdapFilter(q)})(sAMAccountName=*${escapeLdapFilter(q)}*)(cn=*${escapeLdapFilter(q)}*))`;
        
        const options = {
            filter,
            scope: 'sub',
            attributes: ['dn', 'cn', 'displayName', 'mail', 'sAMAccountName', 'userPrincipalName', 'description', 'department', 'title', 'company'],
            sizeLimit: 10
        };

        const users = [];
        await new Promise((resolve, reject) => {
            adminClient.search(LDAP_CONFIG.baseDN, options, (err, searchRes) => {
                if (err) return reject(err);
                
                searchRes.on('searchEntry', entry => {
                    const obj = {};
                    entry.attributes.forEach(attr => {
                        obj[attr.type] = attr.values[0];
                    });
                    users.push(obj);
                });
                
                searchRes.on('error', reject);
                searchRes.on('end', () => resolve());
            });
        });
        
        adminClient.unbind(() => {});
        res.json(users);
    } catch (err) {
        console.error('AD Search Error:', err);
        res.status(500).json({ error: 'Failed to search AD' });
    }
});

// AD Search - Unique Departments
app.get('/api/ad-departments', requireAuth(['admin', 'user']), async (req, res) => {
    try {
        const adminClient = createLdapClient();
        await bindLdapClient(adminClient, LDAP_CONFIG.adminDN, LDAP_CONFIG.adminPassword, 'admin');
        
        const filter = '(department=*)';
        const options = {
            filter,
            scope: 'sub',
            attributes: ['department'],
            sizeLimit: 10000
        };

        const depts = new Set();
        await new Promise((resolve, reject) => {
            adminClient.search(LDAP_CONFIG.baseDN, options, (err, searchRes) => {
                if (err) return reject(err);
                
                searchRes.on('searchEntry', entry => {
                    entry.attributes.forEach(attr => {
                        if (attr.type === 'department' && attr.values.length > 0) {
                            depts.add(attr.values[0].trim());
                        }
                    });
                });
                
                searchRes.on('error', reject);
                searchRes.on('end', () => resolve());
            });
        });
        
        adminClient.unbind(() => {});
        const sortedDepts = Array.from(depts).sort((a, b) => a.localeCompare(b));
        res.json(sortedDepts);
    } catch (err) {
        console.error('AD Departments Error:', err);
        res.status(500).json({ error: 'Failed to fetch departments from AD' });
    }
});

// ================= REST API ENDPOINTS =================

// SSE Endpoint for real-time updates
app.get('/api/events', requireAuth(['admin', 'user']), (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    req.on('close', () => {
        sseClients = sseClients.filter(c => c.id !== clientId);
    });
});

// 1. GET ALL ASSETS (Supports live SQL-based searching and filtering)
app.get('/api/assets', requireAuth(['admin', 'user']), async (req, res) => {
    try {
        const { search, usage_type, status, tech_group } = req.query;
        
        // --- 1. Fetch from GLPI MySQL ---
        const connection = await mysql.createConnection({
            host: process.env.GLPI_DB_HOST || '127.0.0.1',
            user: process.env.GLPI_DB_USER || 'root',
            password: process.env.GLPI_DB_PASSWORD || '',
            database: process.env.GLPI_DB_NAME || 'glpi'
        });

        const [glpiRows] = await connection.execute(`
            SELECT b.id, b.name, b.serial, 
                   g1.completename AS tech_group,
                   l.completename AS location,
                   m.name AS computermodel,
                   t.name AS computertype,
                   mf.name AS manufacturer
            FROM glpi.glpi_computers b
            LEFT JOIN glpi.glpi_groups g1 ON b.groups_id_tech = g1.id
            LEFT JOIN glpi.glpi_locations l ON b.locations_id = l.id
            LEFT JOIN glpi.glpi_computermodels m ON b.computermodels_id = m.id
            LEFT JOIN glpi.glpi_computertypes t ON b.computertypes_id = t.id
            LEFT JOIN glpi.glpi_manufacturers mf ON b.manufacturers_id = mf.id
            LEFT JOIN glpi.glpi_states s ON b.states_id = s.id
            WHERE s.completename = 'spare' AND b.is_deleted = 0
        `);
        await connection.end();

        // --- 2. Fetch from Local DB ---
        // Auto-reset Rejected assets older than 10 minutes
        await db.query.run(`
            UPDATE assets
            SET status = 'Available'
            WHERE status = 'Rejected' AND id NOT IN (
                SELECT asset_id FROM borrow_requests
                WHERE status = 'Rejected' AND datetime(rejected_at) > datetime('now', '-10 minutes')
            )
        `);
        // Also clean up old rejected requests to Expired
        await db.query.run(`
            UPDATE borrow_requests
            SET status = 'Expired'
            WHERE status = 'Rejected' AND datetime(rejected_at) <= datetime('now', '-10 minutes')
        `);

        // Fetch assets with latest reject_reason if applicable
        // Use correlated subquery to ensure reject_reason/rejected_at come from the SAME row as MAX(created_at)
        const localAssets = await db.query.all(`
            SELECT a.*,
                (SELECT br2.reject_reason FROM borrow_requests br2
                 WHERE br2.asset_id = a.id AND br2.status = 'Rejected'
                 ORDER BY br2.rejected_at DESC LIMIT 1) AS reject_reason,
                (SELECT br2.rejected_at FROM borrow_requests br2
                 WHERE br2.asset_id = a.id AND br2.status = 'Rejected'
                 ORDER BY br2.rejected_at DESC LIMIT 1) AS rejected_at
            FROM assets a
        `);
        const localAssetsMap = {};
        localAssets.forEach(a => localAssetsMap[a.id] = a);

        // --- 3. Merge, Sync and Filter ---
        const mergedAssets = [];
        for (const comp of glpiRows) {
            const localId = `glpi_${comp.id}`;
            let localAsset = localAssetsMap[localId];
            
            // Auto-sync if missing
            if (!localAsset) {
                const modelName = `${comp.manufacturer || ''} ${comp.computermodel || ''}`.trim();
                await db.query.run(`
                    INSERT INTO assets (id, asset_tag, serial_number, model_name, category, usage_type, status)
                    VALUES (?, ?, ?, ?, ?, 'Rental', 'Available')
                `, [localId, comp.name || localId, comp.serial || 'N/A', modelName || 'Unknown', comp.computertype || 'Computer']);
                
                localAsset = {
                    id: localId,
                    asset_tag: comp.name || localId,
                    serial_number: comp.serial || 'N/A',
                    model_name: modelName || 'Unknown',
                    category: comp.computertype || 'Computer',
                    usage_type: 'Rental',
                    status: 'Available'
                };
            }

            // Apply Filters
            if (tech_group && tech_group !== 'all' && comp.tech_group !== tech_group) continue;
            if (usage_type && usage_type !== 'all' && localAsset.usage_type !== usage_type) continue;
            if (status && status !== 'all' && localAsset.status !== status) continue;
            
            if (search) {
                const s = search.toLowerCase();
                const combinedString = `${comp.name} ${comp.serial} ${comp.computermodel} ${comp.manufacturer} ${comp.location} ${comp.tech_group}`.toLowerCase();
                if (!combinedString.includes(s)) {
                    continue;
                }
            }

            mergedAssets.push({
                ...localAsset,
                glpi_id: comp.id,
                computer_name: comp.name,
                location: comp.location,
                tech_group: comp.tech_group,
                manufacturer: comp.manufacturer,
                computertype: comp.computertype,
                computermodel: comp.computermodel
            });
        }
        res.json(mergedAssets);
    } catch (err) {
        console.error('Error fetching assets:', err);
        res.status(500).json({ error: 'Failed to retrieve assets from database.' });
    }
});

app.get('/api/glpi/tech_groups', requireAuth(['admin', 'user']), async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.GLPI_DB_HOST || '127.0.0.1',
            user: process.env.GLPI_DB_USER || 'root',
            password: process.env.GLPI_DB_PASSWORD || '',
            database: process.env.GLPI_DB_NAME || 'glpi'
        });

        const [rows] = await connection.execute(`
            SELECT DISTINCT g1.completename AS tech_group
            FROM glpi.glpi_computers b
            JOIN glpi.glpi_states s ON b.states_id = s.id
            JOIN glpi.glpi_groups g1 ON b.groups_id_tech = g1.id
            WHERE s.completename = 'spare' AND g1.completename IS NOT NULL AND b.is_deleted = 0
            ORDER BY g1.completename
        `);
        await connection.end();

        res.json(rows.map(r => r.tech_group));
    } catch (err) {
        console.error('Error fetching tech groups:', err);
        res.status(500).json({ error: 'Failed to fetch tech groups' });
    }
});

// 2. GET SPECIFIC ASSET (Includes full transaction history log timeline)
app.get('/api/assets/:id', requireAuth(['admin', 'user']), async (req, res) => {
    try {
        const assetId = req.params.id;

        // Fetch asset info
        const asset = await db.query.get('SELECT * FROM assets WHERE id = ?', [assetId]);
        if (!asset) {
            return res.status(404).json({ error: 'Computer asset not found.' });
        }

        // Fetch transaction logs with JOIN to get borrower and IT staff names
        const transactions = await db.query.all(`
            SELECT
                t.*,
                b.full_name as borrower_name,
                b.department as borrower_dept,
                b.title as borrower_title,
                b.company as borrower_company,
                b.employee_id,
                b.contact_number,
                u_borrow.full_name as borrow_by_staff_name,
                u_return.full_name as return_by_staff_name
            FROM transactions t
            LEFT JOIN borrowers b ON t.borrower_id = b.id
            LEFT JOIN users u_borrow ON t.borrow_by_staff_id = u_borrow.id
            LEFT JOIN users u_return ON t.return_by_staff_id = u_return.id
            WHERE t.asset_id = ?
            ORDER BY t.borrow_date DESC
        `, [assetId]);

        res.json({
            asset,
            timeline: transactions
        });
    } catch (err) {
        console.error('Error fetching asset details:', err);
        res.status(500).json({ error: 'Failed to retrieve asset details.' });
    }
});

// 3. GET IT STAFF USERS
app.get('/api/users', requireAuth(['admin']), async (req, res) => {
    try {
        const users = await db.query.all(
            'SELECT id, username, full_name, email, role, is_active FROM users WHERE is_active = 1 AND LOWER(role) = ? ORDER BY full_name ASC',
            ['admin']
        );
        res.json(users);
    } catch (err) {
        console.error('Error fetching IT staff users:', err);
        res.status(500).json({ error: 'Failed to retrieve IT staff users from database.' });
    }
});

// 4. POST NEW ASSET (Registers fresh hardware in SQL)
app.post('/api/assets', requireAuth(['admin']), async (req, res) => {
    try {
        const { id, asset_tag, serial_number, model_name, category, usage_type, status, borrower } = req.body;

        if (!asset_tag || !serial_number || !model_name || !category || !usage_type || !status) {
            return res.status(400).json({ error: 'Required parameter fields are missing.' });
        }

        if (id) {
            const existingAsset = await db.query.get('SELECT * FROM assets WHERE id = ?', [id]);
            if (!existingAsset) {
                return res.status(404).json({ error: 'Asset not found for update.' });
            }

            const duplicate = await db.query.get(
                'SELECT id FROM assets WHERE (asset_tag = ? OR serial_number = ?) AND id != ?',
                [asset_tag.trim(), serial_number.trim(), id]
            );

            if (duplicate) {
                return res.status(409).json({ error: 'Asset Tag or Serial Number already exists.' });
            }

            await db.query.run(`
                UPDATE assets
                SET asset_tag = ?, serial_number = ?, model_name = ?, category = ?, usage_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [asset_tag.trim(), serial_number.trim(), model_name.trim(), category, usage_type, status, id]);

            if (borrower && typeof borrower === 'object') {
                const activeTx = await db.query.get(
                    'SELECT * FROM transactions WHERE asset_id = ? AND return_date IS NULL',
                    [id]
                );
                if (activeTx) {
                    const borrowerRecord = await db.query.get('SELECT * FROM borrowers WHERE id = ?', [activeTx.borrower_id]);
                    if (borrowerRecord) {
                        await db.query.run(`
                            UPDATE borrowers
                            SET employee_id = ?, full_name = ?, department = ?, title = ?, company = ?, contact_number = ?
                            WHERE id = ?
                        `, [borrower.employee_id.trim(), borrower.full_name.trim(), borrower.department, borrower.title || '', borrower.company || '', borrower.contact_number.trim(), borrowerRecord.id]);
                    } else {
                        const borrowerId = 'b_' + Date.now();
                        await db.query.run(`
                            INSERT INTO borrowers (id, employee_id, full_name, department, title, company, contact_number)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [borrowerId, borrower.employee_id.trim(), borrower.full_name.trim(), borrower.department, borrower.title || '', borrower.company || '', borrower.contact_number.trim()]);
                        await db.query.run('UPDATE transactions SET borrower_id = ? WHERE id = ?', [borrowerId, activeTx.id]);
                    }
                }
            }

            const updatedAsset = await db.query.get('SELECT * FROM assets WHERE id = ?', [id]);
            broadcastEvent('update');
            return res.status(200).json(updatedAsset);
        }

        // Create new asset record
        const duplicate = await db.query.get(
            'SELECT id FROM assets WHERE asset_tag = ? OR serial_number = ?',
            [asset_tag.trim(), serial_number.trim()]
        );

        if (duplicate) {
            return res.status(409).json({ error: 'Asset Tag or Serial Number already exists.' });
        }

        const newId = 'a_' + Date.now();
        const nowString = new Date().toISOString();

        await db.query.run(`
            INSERT INTO assets (id, asset_tag, serial_number, model_name, category, usage_type, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [newId, asset_tag.trim(), serial_number.trim(), model_name.trim(), category, usage_type, status, nowString, nowString]);

        const createdAsset = await db.query.get('SELECT * FROM assets WHERE id = ?', [newId]);
        broadcastEvent('update');
        res.status(201).json(createdAsset);
    } catch (err) {
        console.error('Error adding new asset:', err);
        res.status(500).json({ error: 'Failed to insert asset into database.' });
    }
});

// 4. DELETE ASSET RECORD
app.delete('/api/assets/:id', requireAuth(['admin']), async (req, res) => {
    try {
        const assetId = req.params.id;
        const asset = await db.query.get('SELECT * FROM assets WHERE id = ?', [assetId]);
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found.' });
        }

        await db.query.run('DELETE FROM assets WHERE id = ?', [assetId]);
        broadcastEvent('update');
        res.status(200).json({ success: true, message: 'Asset deleted successfully.' });
    } catch (err) {
        console.error('Error deleting asset:', err);
        res.status(500).json({ error: 'Failed to delete asset.' });
    }
});

// 4.5 GET ASSETS FOR USER PAGE (SQLite-only, no GLPI dependency)
// Returns all Rental assets with reject_reason/rejected_at from borrow_requests
app.get('/api/user/assets', requireAuth(['admin', 'user']), async (req, res) => {
    try {
        // Auto-reset Rejected assets that are older than 10 minutes
        await db.query.run(`
            UPDATE assets
            SET status = 'Available'
            WHERE status = 'Rejected' AND id NOT IN (
                SELECT asset_id FROM borrow_requests
                WHERE status = 'Rejected' AND datetime(rejected_at) > datetime('now', '-10 minutes')
            )
        `);
        // Also reset the borrow_requests status for those auto-reset assets
        await db.query.run(`
            UPDATE borrow_requests
            SET status = 'Expired'
            WHERE status = 'Rejected' AND datetime(rejected_at) <= datetime('now', '-10 minutes')
        `);

        // Fetch all Rental assets with their latest reject info
        const assets = await db.query.all(`
            SELECT a.*,
                (SELECT br2.reject_reason FROM borrow_requests br2
                 WHERE br2.asset_id = a.id AND br2.status = 'Rejected'
                 ORDER BY br2.rejected_at DESC LIMIT 1) AS reject_reason,
                (SELECT br2.rejected_at FROM borrow_requests br2
                 WHERE br2.asset_id = a.id AND br2.status = 'Rejected'
                 ORDER BY br2.rejected_at DESC LIMIT 1) AS rejected_at
            FROM assets a
            WHERE a.usage_type = 'Rental'
            ORDER BY a.created_at DESC
        `);

        res.json(assets);
    } catch (err) {
        console.error('Error fetching user assets:', err);
        res.status(500).json({ error: 'Failed to retrieve assets.' });
    }
});

// 5. POST BORROW REQUEST (Pending Approval)
app.post('/api/borrow-request', requireAuth(['admin', 'user']), async (req, res) => {
    const { asset_id, employee_id, full_name, department, title, company, contact_number, borrow_date, expected_return_date, borrow_purpose } = req.body;

    if (!asset_id || !employee_id || !full_name || !department || !borrow_date || !expected_return_date || !borrow_purpose) {
        return res.status(400).json({ error: 'Missing necessary borrow parameters.' });
    }

    try {
        await db.query.exec('BEGIN TRANSACTION;');

        const asset = await db.query.get('SELECT * FROM assets WHERE id = ?', [asset_id]);
        if (!asset) {
            await db.query.exec('ROLLBACK;');
            return res.status(404).json({ error: 'Asset not found.' });
        }
        if (asset.status !== 'Available') {
            await db.query.exec('ROLLBACK;');
            return res.status(400).json({ error: 'Asset is not available for borrowing.' });
        }

        const requestId = 'req_' + Date.now();
        await db.query.run(`
            INSERT INTO borrow_requests (id, asset_id, employee_id, full_name, department, title, company, contact_number, borrow_date, expected_return_date, borrow_purpose, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `, [requestId, asset_id, employee_id.trim(), full_name.trim(), department, title || '', company || '', contact_number || '', borrow_date, expected_return_date, borrow_purpose]);

        await db.query.run('UPDATE assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Pending', asset_id]);

        await db.query.exec('COMMIT;');

        const newRequest = await db.query.get('SELECT * FROM borrow_requests WHERE id = ?', [requestId]);
        
        broadcastEvent('new_borrow_request', newRequest);
        broadcastEvent('update');
        
        res.status(201).json({ success: true, message: 'Borrow request submitted successfully.', request: newRequest });
    } catch (err) {
        await db.query.exec('ROLLBACK;');
        console.error('Error submitting borrow request:', err);
        res.status(500).json({ error: 'Failed to process borrow request.' });
    }
});

// GET PENDING BORROW REQUESTS
app.get('/api/borrow-requests/pending', requireAuth(['admin']), async (req, res) => {
    try {
        const requests = await db.query.all(`
            SELECT br.*, a.asset_tag, a.model_name, a.serial_number 
            FROM borrow_requests br
            JOIN assets a ON br.asset_id = a.id
            WHERE br.status = 'Pending'
            ORDER BY br.created_at DESC
        `);
        res.json(requests);
    } catch (err) {
        console.error('Error fetching pending requests:', err);
        res.status(500).json({ error: 'Failed to fetch pending borrow requests.' });
    }
});

// APPROVE BORROW REQUEST
app.post('/api/borrow-requests/:id/approve', requireAuth(['admin']), async (req, res) => {
    try {
        const requestId = req.params.id;
        const request = await db.query.get('SELECT * FROM borrow_requests WHERE id = ?', [requestId]);
        
        if (!request || request.status !== 'Pending') {
            return res.status(400).json({ error: 'Request not found or not in Pending status.' });
        }

        await db.query.exec('BEGIN TRANSACTION;');

        // Set request status to Approved
        await db.query.run('UPDATE borrow_requests SET status = ? WHERE id = ?', ['Approved', requestId]);

        // Temporarily set asset back to Available so normal borrow logic allows it
        await db.query.run('UPDATE assets SET status = ? WHERE id = ?', ['Available', request.asset_id]);

        // Setup Email Sending Variables
        let borrowerEmail = null;
        let assetInfo = await db.query.get('SELECT * FROM assets WHERE id = ?', [request.asset_id]);
        
        // Find user email from AD
        try {
            const adminClient = createLdapClient();
            await bindLdapClient(adminClient, LDAP_CONFIG.adminDN, LDAP_CONFIG.adminPassword, 'admin');
            const ldapUser = await searchLdapUser(adminClient, request.employee_id);
            if (ldapUser && ldapUser.mail) {
                borrowerEmail = ldapUser.mail;
            }
            adminClient.unbind(() => {});
        } catch (ldapErr) {
            console.error('Could not fetch email from AD for borrower:', ldapErr.message);
        }

        // Try getting it from DB users if AD failed or not present
        if (!borrowerEmail) {
            const dbUser = await db.query.get('SELECT email FROM users WHERE username = ? OR id = ?', [request.employee_id, request.employee_id]);
            if (dbUser && dbUser.email) borrowerEmail = dbUser.email;
        }

        await db.query.exec('COMMIT;');

        // Simulate internal request to /api/borrow
        const borrowReq = {
            body: {
                asset_id: request.asset_id,
                employee_id: request.employee_id,
                full_name: request.full_name,
                department: request.department,
                title: request.title,
                company: request.company,
                contact_number: request.contact_number,
                borrow_date: request.borrow_date,
                expected_return_date: request.expected_return_date,
                borrow_purpose: request.borrow_purpose,
                borrow_by_staff_id: req.session.user.id
            },
            session: req.session
        };

        const borrowRes = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                if (this.statusCode >= 400) {
                    res.status(this.statusCode).json(data);
                } else {
                    broadcastEvent('update');
                    res.status(200).json({ success: true, message: 'Request approved.', data });
                }
            }
        };

        // We can't easily call app.post handlers directly, so we just run the borrow logic here.
        // Let's duplicate the relevant logic to avoid tight coupling or we can fetch.
        // But doing it inline is safer and clearer.
        // Actually, we can just do the insert here:
        
        await db.query.exec('BEGIN TRANSACTION;');
        
        let borrower = await db.query.get('SELECT * FROM borrowers WHERE employee_id = ?', [request.employee_id.trim()]);
        let borrowerId;
        if (!borrower) {
            borrowerId = 'b_' + Date.now();
            await db.query.run('INSERT INTO borrowers (id, employee_id, full_name, department, title, company, contact_number) VALUES (?, ?, ?, ?, ?, ?, ?)', [borrowerId, request.employee_id, request.full_name, request.department, request.title, request.company, request.contact_number]);
        } else {
            borrowerId = borrower.id;
            await db.query.run('UPDATE borrowers SET full_name = ?, department = ?, title = ?, company = ?, contact_number = ? WHERE id = ?', [request.full_name, request.department, request.title, request.company, request.contact_number, borrowerId]);
        }

        const transactionId = 'tx_' + Date.now();
        await db.query.run('INSERT INTO transactions (id, asset_id, borrower_id, borrow_date, expected_return_date, borrow_purpose, borrow_by_staff_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [transactionId, request.asset_id, borrowerId, request.borrow_date, request.expected_return_date, request.borrow_purpose, req.session.user.id]);

        await db.query.run('UPDATE assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Rented', request.asset_id]);

        // Hybrid logic: If asset is from GLPI, create ticket
        let glpiTicketId = null;
        if (request.asset_id.startsWith('glpi_')) {
            const asset = await db.query.get('SELECT * FROM assets WHERE id = ?', [request.asset_id]);
            const computerId = request.asset_id.replace('glpi_', '');
            let staffName = req.session && req.session.user ? (req.session.user.full_name || req.session.user.fullname || req.session.user.username) : 'IT Staff';
            try {
                const sessionToken = await getGlpiSession();
                const ticketRes = await axios.post(`${process.env.GLPI_API_URL.replace(/\/$/, "")}/Ticket/`, {
                    input: {
                        name: `[IT Asset Hub] Borrow Request: ${asset ? asset.model_name : 'Unknown Device'}`,
                        content: `**Borrower:** ${request.full_name.trim()} (${request.employee_id.trim()})\n**Department:** ${request.department}\n**Dates:** ${request.borrow_date} to ${request.expected_return_date}\n**Purpose:** ${request.borrow_purpose}\n**Issued By:** ${staffName}`,
                        type: 2,
                        status: 2
                    }
                }, {
                    headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
                });
                
                glpiTicketId = ticketRes.data.id;
                
                await axios.post(`${process.env.GLPI_API_URL.replace(/\/$/, "")}/Ticket/${glpiTicketId}/Item_Ticket/`, {
                    input: {
                        tickets_id: glpiTicketId,
                        itemtype: "Computer",
                        items_id: computerId
                    }
                }, {
                    headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
                });

                // Insert into ticket_glpi
                await db.query.run(`
                    INSERT INTO ticket_glpi (id, transaction_id, glpi_ticket_id, status)
                    VALUES (?, ?, ?, 'Open')
                `, ['glpi_' + Date.now(), transactionId, glpiTicketId]);

            } catch (err) {
                console.error("GLPI ticket creation failed during approval, but local transaction proceeds.", err.message);
            }
        }

        await db.query.exec('COMMIT;');
        
        // Send notification email asynchronously (don't block the response)
        if (assetInfo) {
            mailer.sendApprovalEmail(request, assetInfo, borrowerEmail).catch(err => {
                console.error("Failed to send approval email:", err);
            });
        }
        
        broadcastEvent('update');
        res.status(200).json({ success: true, message: 'Request approved successfully.', glpiTicketId });
    } catch (err) {
        await db.query.exec('ROLLBACK;');
        console.error('Error approving request:', err);
        res.status(500).json({ error: 'Failed to approve request.' });
    }
});

// REJECT BORROW REQUEST
app.post('/api/borrow-requests/:id/reject', requireAuth(['admin']), async (req, res) => {
    try {
        const requestId = req.params.id;
        const { reject_reason } = req.body;

        const request = await db.query.get('SELECT * FROM borrow_requests WHERE id = ?', [requestId]);
        
        if (!request || request.status !== 'Pending') {
            return res.status(400).json({ error: 'Request not found or not in Pending status.' });
        }

        await db.query.exec('BEGIN TRANSACTION;');

        const nowString = new Date().toISOString();
        await db.query.run('UPDATE borrow_requests SET status = ?, reject_reason = ?, rejected_at = ? WHERE id = ?', ['Rejected', reject_reason, nowString, requestId]);
        await db.query.run('UPDATE assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Rejected', request.asset_id]);

        await db.query.exec('COMMIT;');
        
        // Setup Email Sending Variables
        let borrowerEmail = null;
        let assetInfo = await db.query.get('SELECT * FROM assets WHERE id = ?', [request.asset_id]);
        
        // Find user email from AD
        try {
            const adminClient = createLdapClient();
            await bindLdapClient(adminClient, LDAP_CONFIG.adminDN, LDAP_CONFIG.adminPassword, 'admin');
            const ldapUser = await searchLdapUser(adminClient, request.employee_id);
            if (ldapUser && ldapUser.mail) {
                borrowerEmail = ldapUser.mail;
            }
            adminClient.unbind(() => {});
        } catch (ldapErr) {
            console.error('Could not fetch email from AD for borrower:', ldapErr.message);
        }

        // Try getting it from DB users if AD failed or not present
        if (!borrowerEmail) {
            const dbUser = await db.query.get('SELECT email FROM users WHERE username = ? OR id = ?', [request.employee_id, request.employee_id]);
            if (dbUser && dbUser.email) borrowerEmail = dbUser.email;
        }

        // Add the rejected reason to request data for the email template
        request.reject_reason = reject_reason;

        // Send notification email asynchronously (don't block the response)
        if (assetInfo) {
            mailer.sendRejectionEmail(request, assetInfo, borrowerEmail).catch(err => {
                console.error("Failed to send rejection email:", err);
            });
        }

        broadcastEvent('update');
        res.status(200).json({ success: true, message: 'Request rejected successfully.' });
    } catch (err) {
        await db.query.exec('ROLLBACK;');
        console.error('Error rejecting request:', err);
        res.status(500).json({ error: 'Failed to reject request.' });
    }
});

// 6. POST BORROW TRANSACTION (Transactional Asset allocation to borrower)
app.post('/api/borrow', requireAuth(['admin', 'user']), async (req, res) => {
    const { asset_id, employee_id, full_name, department, title, company, contact_number, borrow_date, expected_return_date, borrow_purpose, borrow_by_staff_id } = req.body;

    if (!asset_id || !employee_id || !full_name || !department || !borrow_date || !expected_return_date || !borrow_purpose) {
        return res.status(400).json({ error: 'Missing necessary borrow parameters.' });
    }

    const staffId = borrow_by_staff_id || (req.session && req.session.user ? req.session.user.id : 'staff-admin');
    let staffName = req.session && req.session.user ? (req.session.user.full_name || req.session.user.fullname || req.session.user.username) : 'IT Staff';

    try {
        if (borrow_by_staff_id) {
            const staffUser = await db.query.get('SELECT full_name FROM users WHERE id = ?', [borrow_by_staff_id]);
            if (staffUser) staffName = staffUser.full_name;
        }

        await db.query.exec('BEGIN TRANSACTION;');

        const asset = await db.query.get('SELECT * FROM assets WHERE id = ?', [asset_id]);
        if (!asset) {
            await db.query.exec('ROLLBACK;');
            return res.status(404).json({ error: 'Asset not found.' });
        }
        if (asset.status !== 'Available') {
            await db.query.exec('ROLLBACK;');
            return res.status(400).json({ error: 'Asset is not available for borrowing.' });
        }

        let borrower = await db.query.get('SELECT * FROM borrowers WHERE employee_id = ?', [employee_id.trim()]);
        let borrowerId;
        if (!borrower) {
            borrowerId = 'b_' + Date.now();
            await db.query.run(`
                INSERT INTO borrowers (id, employee_id, full_name, department, title, company, contact_number)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [borrowerId, employee_id.trim(), full_name.trim(), department, title || '', company || '', contact_number || '']);
        } else {
            borrowerId = borrower.id;
            await db.query.run(`
                UPDATE borrowers
                SET full_name = ?, department = ?, title = ?, company = ?, contact_number = ?
                WHERE id = ?
            `, [full_name.trim(), department, title || '', company || '', contact_number || '', borrowerId]);
        }

        const transactionId = 't_' + Date.now();
        await db.query.run(`
            INSERT INTO transactions (
                id, asset_id, borrower_id, borrow_by_staff_id,
                borrow_date, expected_return_date, borrow_purpose
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            transactionId, asset_id, borrowerId, staffId,
            new Date(borrow_date).toISOString(), expected_return_date, borrow_purpose.trim()
        ]);

        await db.query.run(`
            UPDATE assets
            SET status = 'Rented', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [asset_id]);

        // Hybrid logic: If asset is from GLPI, create ticket
        let glpiTicketId = null;
        if (asset_id.startsWith('glpi_')) {
            const computerId = asset_id.replace('glpi_', '');
            try {
                const sessionToken = await getGlpiSession();
                const ticketRes = await axios.post(`${process.env.GLPI_API_URL.replace(/\/$/, "")}/Ticket/`, {
                    input: {
                        name: `[IT Asset Hub] Borrow Request: ${asset.model_name}`,
                        content: `**Borrower:** ${full_name.trim()} (${employee_id.trim()})\n**Department:** ${department}\n**Dates:** ${borrow_date} to ${expected_return_date}\n**Purpose:** ${borrow_purpose}\n**Issued By:** ${staffName}`,
                        type: 2,
                        status: 2
                    }
                }, {
                    headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
                });
                
                glpiTicketId = ticketRes.data.id;
                
                await axios.post(`${process.env.GLPI_API_URL.replace(/\/$/, "")}/Ticket/${glpiTicketId}/Item_Ticket/`, {
                    input: {
                        tickets_id: glpiTicketId,
                        itemtype: "Computer",
                        items_id: computerId
                    }
                }, {
                    headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
                });

                // Insert into ticket_glpi
                await db.query.run(`
                    INSERT INTO ticket_glpi (id, transaction_id, glpi_ticket_id, status)
                    VALUES (?, ?, ?, 'Open')
                `, ['glpi_' + Date.now(), transactionId, glpiTicketId]);

            } catch (err) {
                console.error("GLPI ticket creation failed, but local transaction proceeds.", err.message);
                // We don't rollback local transaction because GLPI might be down, but local should work
            }
        }

        await db.query.exec('COMMIT;');

        // --- Send Email Notification ---
        let borrowerEmail = null;
        try {
            const adminClient = createLdapClient();
            await bindLdapClient(adminClient, LDAP_CONFIG.adminDN, LDAP_CONFIG.adminPassword, 'admin');
            const ldapUser = await searchLdapUser(adminClient, employee_id.trim());
            if (ldapUser && ldapUser.mail) {
                borrowerEmail = ldapUser.mail;
            }
            adminClient.unbind(() => {});
        } catch (ldapErr) {
            console.error('Could not fetch email from AD for borrower:', ldapErr.message);
        }

        if (!borrowerEmail) {
            const dbUser = await db.query.get('SELECT email FROM users WHERE username = ? OR id = ?', [employee_id.trim(), employee_id.trim()]);
            if (dbUser && dbUser.email) borrowerEmail = dbUser.email;
        }

        const requestData = {
            full_name: full_name.trim(),
            employee_id: employee_id.trim(),
            department: department,
            borrow_date: borrow_date,
            expected_return_date: expected_return_date,
            borrow_purpose: borrow_purpose.trim()
        };

        if (asset) {
            mailer.sendApprovalEmail(requestData, asset, borrowerEmail).catch(err => {
                console.error("Failed to send approval email:", err);
            });
        }
        // -------------------------------

        broadcastEvent('update');
        broadcastEvent('borrow_notification', {
            asset_id: asset_id,
            asset_tag: asset.asset_tag,
            model_name: asset.model_name,
            borrower_name: full_name.trim(),
            department: department,
            purpose: borrow_purpose.trim(),
            glpi_ticket_id: glpiTicketId
        });
        res.status(200).json({ success: true, message: 'Borrow transaction logged successfully.', glpiTicketId });

    } catch (err) {
        await db.query.exec('ROLLBACK;');
        console.error('Error during borrow transaction:', err);
        res.status(500).json({ error: 'Borrow operation failed due to internal database error.' });
    }
});

// 5. POST RETURN TRANSACTION (Returning hardware to inventory)
app.post('/api/return', async (req, res) => {
    const { asset_id, asset_condition, remarks, return_by_staff_id } = req.body;

    if (!asset_id || !asset_condition) {
        return res.status(400).json({ error: 'Missing necessary return parameters.' });
    }

    const staffId = return_by_staff_id || (req.session && req.session.user ? req.session.user.id : 'staff-admin');
    let staffName = req.session && req.session.user ? (req.session.user.full_name || req.session.user.fullname || req.session.user.username) : 'IT Staff';

    try {
        if (return_by_staff_id) {
            const staffUser = await db.query.get('SELECT full_name FROM users WHERE id = ?', [return_by_staff_id]);
            if (staffUser) staffName = staffUser.full_name;
        }

        await db.query.exec('BEGIN TRANSACTION;');

        const asset = await db.query.get('SELECT * FROM assets WHERE id = ?', [asset_id]);
        if (!asset) {
            await db.query.exec('ROLLBACK;');
            return res.status(404).json({ error: 'Asset not found.' });
        }
        if (asset.status !== 'Rented') {
            await db.query.exec('ROLLBACK;');
            return res.status(400).json({ error: 'Asset is not in rented status.' });
        }

        const activeTx = await db.query.get(
            'SELECT id FROM transactions WHERE asset_id = ? AND return_date IS NULL',
            [asset_id]
        );
        if (!activeTx) {
            await db.query.exec('ROLLBACK;');
            return res.status(400).json({ error: 'No active borrow transaction found for this asset.' });
        }

        const nowIsoString = new Date().toISOString();

        await db.query.run(`
            UPDATE transactions
            SET return_by_staff_id = ?, return_date = ?, asset_condition_after = ?, remarks = ?
            WHERE id = ?
        `, [staffId, nowIsoString, asset_condition, remarks || '', activeTx.id]);

        const nextStatus = asset_condition === 'Damaged' ? 'Maintenance' : 'Available';
        await db.query.run(`
            UPDATE assets
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [nextStatus, asset_id]);

        // Hybrid logic: If asset is from GLPI, close ticket
        if (asset_id.startsWith('glpi_')) {
            try {
                // Find ticket ID linked to this transaction
                const glpiTicketLog = await db.query.get('SELECT glpi_ticket_id FROM ticket_glpi WHERE transaction_id = ?', [activeTx.id]);
                if (glpiTicketLog) {
                    const sessionToken = await getGlpiSession();
                    
                    // Add ITIL Solution to solve the ticket
                    await axios.post(`${process.env.GLPI_API_URL.replace(/\/$/, "")}/ITILSolution/`, {
                        input: {
                            itemtype: 'Ticket',
                            items_id: glpiTicketLog.glpi_ticket_id,
                            content: `**ฮาร์ดแวร์ถูกส่งคืนแล้ว**\n**รับคืนโดย:** ${staffName}\n**สภาพเครื่อง:** ${asset_condition}\n**หมายเหตุ:** ${remarks || '-'}`
                        }
                    }, {
                        headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
                    });

                    // Change ticket status to Closed (Status 6 = Closed in GLPI)
                    await axios.put(`${process.env.GLPI_API_URL.replace(/\/$/, "")}/Ticket/${glpiTicketLog.glpi_ticket_id}`, {
                        input: {
                            id: glpiTicketLog.glpi_ticket_id,
                            status: 6 // 6 = Closed
                        }
                    }, {
                        headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
                    });

                    // Update local ticket_glpi
                    await db.query.run(`
                        UPDATE ticket_glpi SET status = 'Closed' WHERE transaction_id = ?
                    `, [activeTx.id]);
                }
            } catch (err) {
                const errorDetail = err.response ? JSON.stringify(err.response.data) : err.message;
                console.error("GLPI ticket closure failed.", errorDetail);
            }
        }

        await db.query.exec('COMMIT;');
        broadcastEvent('update');
        res.status(200).json({ success: true, nextStatus });

    } catch (err) {
        await db.query.exec('ROLLBACK;');
        console.error('Error during return transaction:', err);
        res.status(500).json({ error: 'Return operation failed due to internal database error.' });
    }
});

// 6. GET ALL TRANSACTIONS LOGS (Consolidated JOIN history)
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await db.query.all(`
            SELECT
                t.*,
                a.asset_tag, a.model_name, a.serial_number,
                b.full_name as borrower_name, b.department as borrower_dept, b.title as borrower_title, b.company as borrower_company, b.employee_id, b.contact_number,
                u_borrow.full_name as borrow_by_staff_name,
                u_return.full_name as return_by_staff_name,
                tg.glpi_ticket_id
            FROM transactions t
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN borrowers b ON t.borrower_id = b.id
            LEFT JOIN users u_borrow ON t.borrow_by_staff_id = u_borrow.id
            LEFT JOIN users u_return ON t.return_by_staff_id = u_return.id
            LEFT JOIN ticket_glpi tg ON tg.transaction_id = t.id
            ORDER BY t.borrow_date DESC
        `);
        res.json(transactions);
    } catch (err) {
        console.error('Error fetching transactions logs:', err);
        res.status(500).json({ error: 'Failed to retrieve transactions logs.' });
    }
});


// ================= GLPI INTEGRATION =================
const axios = require('axios');
const mysql = require('mysql2/promise');

let glpiSessionToken = null;

async function getGlpiSession() {
    if (glpiSessionToken) return glpiSessionToken;
    try {
        const baseUrl = process.env.GLPI_API_URL.replace(/\/$/, ""); // Remove trailing slash
        const response = await axios.get(`${baseUrl}/initSession`, {
            headers: {
                'App-Token': process.env.GLPI_APP_TOKEN,
                'Authorization': `user_token ${process.env.GLPI_USER_TOKEN}`
            }
        });
        glpiSessionToken = response.data.session_token;
        return glpiSessionToken;
    } catch (err) {
        const errorDetail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error('GLPI Session Error Details:', errorDetail);
        throw new Error('Could not init GLPI session: ' + errorDetail);
    }
}

app.get('/api/glpi/computers/spare', requireAuth(['admin', 'user']), async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.GLPI_DB_HOST || '127.0.0.1',
            user: process.env.GLPI_DB_USER || 'root',
            password: process.env.GLPI_DB_PASSWORD || '',
            database: process.env.GLPI_DB_NAME || 'glpi'
        });

        const [rows] = await connection.execute(`
            SELECT b.comment, b.contact, b.contact_num,
                   b.date_creation, b.date_mod, b.entities_id, b.id, b.is_deleted, b.is_dynamic,
                   b.is_recursive, b.is_template, b.last_boot, b.last_inventory_update, b.name,
                   b.networks_id, b.otherserial, b.serial, b.template_name, b.ticket_tco,
                   b.users_id, b.users_id_tech, b.uuid,
                   g1.completename AS tech_group,
                   g2.completename AS user_group,
                   a.name AS autoupdate,
                   l.completename AS location,
                   m.name AS computermodel,
                   t.name AS computertype,
                   mf.name AS manufacturer,
                   s.completename AS assetstatus
            FROM glpi.glpi_computers b
            LEFT JOIN glpi.glpi_groups g1 ON b.groups_id_tech = g1.id
            LEFT JOIN glpi.glpi_groups g2 ON b.groups_id = g2.id
            LEFT JOIN glpi.glpi_autoupdatesystems a ON b.autoupdatesystems_id = a.id
            LEFT JOIN glpi.glpi_locations l ON b.locations_id = l.id
            LEFT JOIN glpi.glpi_computermodels m ON b.computermodels_id = m.id
            LEFT JOIN glpi.glpi_computertypes t ON b.computertypes_id = t.id
            LEFT JOIN glpi.glpi_manufacturers mf ON b.manufacturers_id = mf.id
            LEFT JOIN glpi.glpi_states s ON b.states_id = s.id
            WHERE s.completename = 'spare'
        `);

        const computers = rows.map(comp => ({
            id: comp.id,
            name: comp.name,
            serial_number: comp.serial,
            model: comp.computermodel,
            location: comp.location,
            status: comp.assetstatus,
            raw: comp
        }));
        
        res.json(computers);
    } catch (err) {
        console.error('GLPI MySQL Spare Computers Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch computers from GLPI database' });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/glpi/borrow', requireAuth(['admin', 'user']), async (req, res) => {
    const { computerId, userId, department, borrowDate, expectedReturnDate, borrowPurpose } = req.body;
    if (!computerId || !userId || !borrowPurpose) {
        return res.status(400).json({ error: 'Missing necessary parameters.' });
    }

    try {
        const sessionToken = await getGlpiSession();
        
        // 1. Create Ticket
        const ticketRes = await axios.post(`${process.env.GLPI_API_URL}/Ticket/`, {
            input: {
                name: `Borrow Request: Computer ID ${computerId}`,
                content: `Borrower: ${userId}\nDepartment: ${department}\nDates: ${borrowDate} to ${expectedReturnDate}\nPurpose: ${borrowPurpose}`,
                type: 2, // Request
                status: 2 // New / Assign
            }
        }, {
            headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
        });
        
        const ticketId = ticketRes.data.id;
        
        // 2. Link Computer to Ticket
        await axios.post(`${process.env.GLPI_API_URL}/Ticket/${ticketId}/Item_Ticket/`, {
            input: {
                tickets_id: ticketId,
                itemtype: "Computer",
                items_id: computerId
            }
        }, {
            headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
        });

        // 3. Fake SQLite Transaction Log (Mock logic, adapting to existing schema)
        const transactionId = 't_glpi_' + Date.now();
        try {
            // Attempt to insert, but may fail due to FK constraint if transaction isn't in `transactions`
            await db.query.run(`
                INSERT INTO ticket_glpi (id, transaction_id, glpi_ticket_id, status)
                VALUES (?, ?, ?, 'Open')
            `, ['glpi_' + Date.now(), transactionId, ticketId]);
        } catch (dbErr) {
            console.warn('Skipped local DB insert due to constraint:', dbErr.message);
        }

        res.status(200).json({ success: true, ticketId, transactionId });
    } catch (err) {
        if (err.response && err.response.status === 401) glpiSessionToken = null;
        
        const errorDetail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error('GLPI Borrow Error Details:', errorDetail);
        
        res.status(500).json({ 
            error: 'Failed to create borrow ticket in GLPI',
            details: errorDetail
        });
    }
});

app.post('/api/glpi/return', requireAuth(['admin', 'user']), async (req, res) => {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ error: 'Missing ticket ID.' });

    try {
        const sessionToken = await getGlpiSession();
        
        // Update Ticket Status to Closed (6)
        await axios.put(`${process.env.GLPI_API_URL}/Ticket/${ticketId}`, {
            input: {
                status: 6
            }
        }, {
            headers: { 'App-Token': process.env.GLPI_APP_TOKEN, 'Session-Token': sessionToken }
        });

        // Update local DB
        await db.query.run(`
            UPDATE ticket_glpi SET status = 'Closed' WHERE glpi_ticket_id = ?
        `, [ticketId]);

        res.status(200).json({ success: true, message: 'Ticket closed' });
    } catch (err) {
        if (err.response && err.response.status === 401) glpiSessionToken = null;
        console.error('GLPI Return Error:', err.message);
        res.status(500).json({ error: 'Failed to close ticket in GLPI' });
    }
});


// ================= START SERVER =================
// Active Auto-Reset for Rejected Assets
setInterval(async () => {
    try {
        const toReset = await db.query.all(`
            SELECT id FROM assets
            WHERE status = 'Rejected' AND id IN (
                SELECT asset_id FROM borrow_requests
                WHERE status = 'Rejected' AND datetime(rejected_at) <= datetime('now', '-10 minutes')
            )
        `);
        
        if (toReset && toReset.length > 0) {
            await db.query.run(`
                UPDATE assets
                SET status = 'Available'
                WHERE status = 'Rejected' AND id IN (
                    SELECT asset_id FROM borrow_requests
                    WHERE status = 'Rejected' AND datetime(rejected_at) <= datetime('now', '-10 minutes')
                )
            `);
            console.log(`Active Auto-reset: ${toReset.length} rejected asset(s) returned to Available.`);
            broadcastEvent('update');
        }
    } catch (err) {
        console.error('Error in Active Auto-reset:', err);
    }
}, 10000);

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`IT Asset & Rental System is running!`);
    console.log(`Live Frontend URL: http://localhost:${PORT}`);
    console.log(`SQLite database file loaded: ./data/database.sqlite`);
    console.log(`====================================================`);
});
