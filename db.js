/* 
   IT Asset & Rental Management System - SQLite Database Controller
   Designed by Senior Systems Analyst & Full-Stack Developer
*/

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'data', 'database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbExists = fs.existsSync(dbPath);

// 1. Connect to SQLite database file
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to SQLite database:', err.message);
    } else {
        console.log(`Connected to SQLite database at: ${dbPath}`);
        // Enable Foreign Keys support
        db.run('PRAGMA foreign_keys = ON;');
    }
});

// 2. Wrap standard SQLite methods in Promises for clean async/await syntax in server.js
const dbQuery = {
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },
    
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    },

    exec(sql) {
        return new Promise((resolve, reject) => {
            db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
};

// 3. Database Schema Initialization (DDL)
async function initializeSchema() {
    try {
        console.log('Initializing database schema tables...');
        
        // 1. Assets Table
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                asset_tag TEXT UNIQUE NOT NULL,
                serial_number TEXT UNIQUE NOT NULL,
                model_name TEXT NOT NULL,
                category TEXT NOT NULL,
                usage_type TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Users Table (IT Staff)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT NOT NULL,
                is_active INTEGER DEFAULT 1
            );
        `);

        // 3. Borrowers Table (General Staff)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS borrowers (
                id TEXT PRIMARY KEY,
                employee_id TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                department TEXT NOT NULL,
                title TEXT,
                company TEXT,
                contact_number TEXT
            );
        `);

        // Migration for existing database (Add columns if they don't exist)
        try {
            await dbQuery.run("ALTER TABLE borrowers ADD COLUMN title TEXT;");
        } catch (e) { /* ignore if already exists */ }
        try {
            await dbQuery.run("ALTER TABLE borrowers ADD COLUMN company TEXT;");
        } catch (e) { /* ignore if already exists */ }

        // 4. Transactions Table (Borrow / Return Log)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                asset_id TEXT NOT NULL,
                borrower_id TEXT NOT NULL,
                borrow_by_staff_id TEXT NOT NULL,
                borrow_date TEXT NOT NULL,
                expected_return_date TEXT NOT NULL,
                borrow_purpose TEXT NOT NULL,
                return_by_staff_id TEXT,
                return_date TEXT,
                asset_condition_after TEXT,
                remarks TEXT,
                FOREIGN KEY (asset_id) REFERENCES assets(id),
                FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
                FOREIGN KEY (borrow_by_staff_id) REFERENCES users(id),
                FOREIGN KEY (return_by_staff_id) REFERENCES users(id)
            );
        `);

        // 5. GLPI Tickets Table
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS ticket_glpi (
                id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                glpi_ticket_id INTEGER NOT NULL,
                status TEXT DEFAULT 'Open',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id)
            );
        `);

        // 6. Borrow Requests Table (Pending Approvals)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS borrow_requests (
                id TEXT PRIMARY KEY,
                asset_id TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                full_name TEXT NOT NULL,
                department TEXT NOT NULL,
                title TEXT,
                company TEXT,
                contact_number TEXT,
                borrow_date TEXT,
                expected_return_date TEXT,
                borrow_purpose TEXT,
                status TEXT DEFAULT 'Pending',
                reject_reason TEXT,
                rejected_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asset_id) REFERENCES assets(id)
            );
        `);
        
        // 7. Accessories Table (Inventory)
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS accessories (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                total_stock INTEGER DEFAULT 0,
                available_stock INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 8. Accessory Requests Table
        await dbQuery.run(`
            CREATE TABLE IF NOT EXISTS accessory_requests (
                id TEXT PRIMARY KEY,
                accessory_id TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                full_name TEXT NOT NULL,
                department TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                borrow_purpose TEXT NOT NULL,
                status TEXT DEFAULT 'Pending',
                reject_reason TEXT,
                rejected_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (accessory_id) REFERENCES accessories(id)
            );
        `);

        console.log('Database tables created successfully.');
        
        // 4. Auto-seeding check
       // await seedDefaultData();
        
    } catch (err) {
        console.error('Error during database schema setup:', err);
    }
}

// 5. Populate Seed Data if DB is empty
/*async function seedDefaultData() {
    try {
        const assetsCount = await dbQuery.get('SELECT COUNT(*) as count FROM assets');
        
        if (assetsCount.count === 0) {
            console.log('Assets table is empty. Injecting production seed data...');
            
            // Seed Users (IT Staff)
            await dbQuery.run(`
                INSERT INTO users (id, username, full_name, email, role, is_active)
                VALUES ('staff-admin', 'wachira.y', 'Wachira Y.', 'wachira.y@company.com', 'Admin', 1);
            `);

            // Seed Assets
            const seedAssets = [
               ['1', 'IT-ASSET-0001', 'C02FX1HAQ05D', 'MacBook Pro 16" M3 Max (64GB / 1TB SSD)', 'Laptop', 'Rental', 'Available', '2026-01-10T08:00:00Z'],
                ['2', 'IT-ASSET-0002', 'C02FX2HAQ05D', 'MacBook Pro 14" M3 Pro (18GB / 512GB SSD)', 'Laptop', 'Rental', 'Rented', '2026-01-12T09:30:00Z'],
                ['3', 'IT-ASSET-0003', 'C02FX3HAQ05D', 'MacBook Air 13" M3 (16GB / 512GB SSD)', 'Laptop', 'Deployment', 'Available', '2026-01-15T10:00:00Z'],
                ['4', 'IT-ASSET-0004', 'C02FX4HAQ05D', 'MacBook Air 13" M3 (16GB / 512GB SSD)', 'Laptop', 'Deployment', 'Assigned', '2026-01-15T10:15:00Z'],
                ['5', 'IT-ASSET-0024', 'DM2931089A', 'Lenovo ThinkPad X1 Carbon Gen 10 (Intel i7, 16GB / 512GB)', 'Laptop', 'Rental', 'Rented', '2026-02-05T08:20:00Z'],
                ['6', 'IT-ASSET-0045', 'DM2931090A', 'Lenovo ThinkPad L14 Gen 4 (AMD R5, 16GB / 512GB)', 'Laptop', 'Rental', 'Available', '2026-02-10T11:40:00Z'],
                ['7', 'IT-ASSET-0078', 'DX39823901A', 'Dell Latitude 5430 (Intel i5, 8GB / 256GB SSD)', 'Laptop', 'Rental', 'Rented', '2026-02-12T14:15:00Z'],
                ['8', 'IT-ASSET-0089', 'DESK-PC-9812A', 'HP ProDesk 400 G9 SFF (Intel i5, 16GB / 512GB)', 'Desktop', 'Deployment', 'Available', '2026-03-01T09:00:00Z'],
                ['9', 'IT-ASSET-0090', 'DESK-PC-9813A', 'HP ProDesk 400 G9 SFF (Intel i5, 16GB / 512GB)', 'Desktop', 'Deployment', 'Available', '2026-03-01T09:10:00Z'],
                ['10', 'IT-ASSET-0105', 'WS-883901X', 'Dell Precision 3660 Workstation (Intel i9, 64GB / 2TB / RTX 4070)', 'Workstation', 'Rental', 'Rented', '2026-04-18T10:00:00Z'],
                ['11', 'IT-ASSET-0120', 'C02FX5HAQ05D', 'iPad Pro 11" M2 (8GB / 256GB WiFi)', 'Laptop', 'Rental', 'Maintenance', '2026-05-01T15:20:00Z']
            ];

            for (const asset of seedAssets) {
                await dbQuery.run(`
                    INSERT INTO assets (id, asset_tag, serial_number, model_name, category, usage_type, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                `, asset);
            }

            // Seed Borrowers
            const seedBorrowers = [
                ['b1', 'EM-0192', 'สมชาย รักเรียน', 'Marketing', '081-234-5678'],
                ['b2', 'EM-0231', 'วิภา เพียรดี', 'Human Resources', '089-876-5432'],
                ['b3', 'EM-0455', 'ณัฐพล ว่องไว', 'Software Engineer', '086-555-1234'],
                ['b4', 'EM-0899', 'วรรณิศา ตั้งใจ', 'Sales', '082-999-8888']
            ];

            for (const borrower of seedBorrowers) {
                await dbQuery.run(`
                    INSERT INTO borrowers (id, employee_id, full_name, department, contact_number)
                    VALUES (?, ?, ?, ?, ?);
                `, borrower);
            }

            // Seed Historic Transactions
            const seedTransactions = [
                [
                    't1', '1', 'b4', 'staff-admin', 
                    '2026-05-15T09:00:00Z', '2026-05-18', 
                    'นำคอมพิวเตอร์ออกไปเสนอโครงการให้กับลูกค้าที่นิคมอมตะนคร', 
                    'staff-admin', '2026-05-18T16:30:00Z', 
                    'Normal', 'รับคืนปกติ อุปกรณ์ทุกชิ้นอยู่ในสภาพดีเยี่ยม'
                ],
                [
                    't2', '2', 'b4', 'staff-admin', 
                    '2026-05-27T10:30:00Z', '2026-06-03', 
                    'ใช้สำหรับทดสอบโปรแกรมสาธิตให้กับลูกค้าบูธนิทรรศการประจำปี', 
                    null, null, null, null
                ],
                [
                    't3', '5', 'b1', 'staff-admin', 
                    '2026-05-28T10:00:00Z', '2026-06-05', 
                    'ขอยืมคอมพิวเตอร์สำรองเนื่องจากเครื่องประจำชำรุดรอซ่อมบอร์ด', 
                    null, null, null, null
                ],
                [
                    't4', '7', 'b2', 'staff-admin', 
                    '2026-05-30T14:15:00Z', '2026-06-02', 
                    'ยืมทำสื่ออบรมพนักงานใหม่ของแผนกทรัพยากรบุคคล', 
                    null, null, null, null
                ],
                [
                    't5', '10', 'b3', 'staff-admin', 
                    '2026-06-01T09:00:00Z', '2026-06-03', 
                    'ใช้เครื่อง Workstation รันงานประมวลผลวิดีโอ 3D ขนาดใหญ่ชั่วคราว', 
                    null, null, null, null
                ]
            ];

            for (const tx of seedTransactions) {
                await dbQuery.run(`
                    INSERT INTO transactions (
                        id, asset_id, borrower_id, borrow_by_staff_id, 
                        borrow_date, expected_return_date, borrow_purpose, 
                        return_by_staff_id, return_date, asset_condition_after, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                `, tx);
            }
            console.log('Successfully injected all seed data!');
        } else {
            console.log('Database already populated. Skipping seeding...');
        }
    } catch (err) {
        console.error('Error seeding data:', err);
    }
}*/

// 6. Run schema initialization on load
initializeSchema();

// Export the database query wrapped handlers
module.exports = {
    db,
    query: dbQuery
};
