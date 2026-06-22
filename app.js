/* 
   IT Asset & Rental Management System - JavaScript Application Engine
   Designed by Senior Systems Analyst & Full-Stack Developer
*/

// ================= 1. MOCK DATABASE (LOCAL STORAGE PERSISTENCE) =================
const MockDB = {
    // Keys for LocalStorage
    KEYS: {
        ASSETS: 'it_asset_hub_assets',
        TRANSACTIONS: 'it_asset_hub_transactions',
        BORROWERS: 'it_asset_hub_borrowers',
        USERS: 'it_asset_hub_users'
    },

    // Initial Seed Data to simulate real-world IT department
    SEED_DATA: {
        ASSETS: [
            { id: '1', asset_tag: 'IT-ASSET-0001', serial_number: 'C02FX1HAQ05D', model_name: 'MacBook Pro 16" M3 Max (64GB / 1TB SSD)', category: 'Laptop', usage_type: 'Rental', status: 'Available', created_at: '2026-01-10T08:00:00Z' },
            { id: '2', asset_tag: 'IT-ASSET-0002', serial_number: 'C02FX2HAQ05D', model_name: 'MacBook Pro 14" M3 Pro (18GB / 512GB SSD)', category: 'Laptop', usage_type: 'Rental', status: 'Rented', created_at: '2026-01-12T09:30:00Z' },
            { id: '3', asset_tag: 'IT-ASSET-0003', serial_number: 'C02FX3HAQ05D', model_name: 'MacBook Air 13" M3 (16GB / 512GB SSD)', category: 'Laptop', usage_type: 'Deployment', status: 'Available', created_at: '2026-01-15T10:00:00Z' },
            { id: '4', asset_tag: 'IT-ASSET-0004', serial_number: 'C02FX4HAQ05D', model_name: 'MacBook Air 13" M3 (16GB / 512GB SSD)', category: 'Laptop', usage_type: 'Deployment', status: 'Assigned', created_at: '2026-01-15T10:15:00Z' },
            { id: '5', asset_tag: 'IT-ASSET-0024', serial_number: 'DM2931089A', model_name: 'Lenovo ThinkPad X1 Carbon Gen 10 (Intel i7, 16GB / 512GB)', category: 'Laptop', usage_type: 'Rental', status: 'Rented', created_at: '2026-02-05T08:20:00Z' },
            { id: '6', asset_tag: 'IT-ASSET-0045', serial_number: 'DM2931090A', model_name: 'Lenovo ThinkPad L14 Gen 4 (AMD R5, 16GB / 512GB)', category: 'Laptop', usage_type: 'Rental', status: 'Available', created_at: '2026-02-10T11:40:00Z' },
            { id: '7', asset_tag: 'IT-ASSET-0078', serial_number: 'DX39823901A', model_name: 'Dell Latitude 5430 (Intel i5, 8GB / 256GB SSD)', category: 'Laptop', usage_type: 'Rental', status: 'Rented', created_at: '2026-02-12T14:15:00Z' },
            { id: '8', asset_tag: 'IT-ASSET-0089', serial_number: 'DESK-PC-9812A', model_name: 'HP ProDesk 400 G9 SFF (Intel i5, 16GB / 512GB)', category: 'Desktop', usage_type: 'Deployment', status: 'Available', created_at: '2026-03-01T09:00:00Z' },
            { id: '9', asset_tag: 'IT-ASSET-0090', serial_number: 'DESK-PC-9813A', model_name: 'HP ProDesk 400 G9 SFF (Intel i5, 16GB / 512GB)', category: 'Desktop', usage_type: 'Deployment', status: 'Available', created_at: '2026-03-01T09:10:00Z' },
            { id: '10', asset_tag: 'IT-ASSET-0105', serial_number: 'WS-883901X', model_name: 'Dell Precision 3660 Workstation (Intel i9, 64GB / 2TB / RTX 4070)', category: 'Workstation', usage_type: 'Rental', status: 'Rented', created_at: '2026-04-18T10:00:00Z' },
            { id: '11', asset_tag: 'IT-ASSET-0120', serial_number: 'C02FX5HAQ05D', model_name: 'iPad Pro 11" M2 (8GB / 256GB WiFi)', category: 'Laptop', usage_type: 'Rental', status: 'Maintenance', created_at: '2026-05-01T15:20:00Z' }
        ],
        BORROWERS: [
            { id: 'b1', employee_id: 'EM-0192', full_name: 'สมชาย รักเรียน', department: 'Marketing', contact_number: '081-234-5678' },
            { id: 'b2', employee_id: 'EM-0231', full_name: 'วิภา เพียรดี', department: 'Human Resources', contact_number: '089-876-5432' },
            { id: 'b3', employee_id: 'EM-0455', full_name: 'ณัฐพล ว่องไว', department: 'Software Engineer', contact_number: '086-555-1234' },
            { id: 'b4', employee_id: 'EM-0899', full_name: 'วรรณิศา ตั้งใจ', department: 'Sales', contact_number: '082-999-8888' }
        ],
        TRANSACTIONS: [
            {
                id: 't1',
                asset_id: '1',
                borrower_id: 'b4',
                borrow_by_staff_id: 'staff-admin',
                borrow_date: '2026-05-15T09:00:00Z',
                expected_return_date: '2026-05-18',
                borrow_purpose: 'นำคอมพิวเตอร์ออกไปเสนอโครงการให้กับลูกค้าที่นิคมอมตะนคร',
                return_by_staff_id: 'staff-admin',
                return_date: '2026-05-18T16:30:00Z',
                asset_condition_after: 'Normal',
                remarks: 'รับคืนปกติ อุปกรณ์ทุกชิ้นอยู่ในสภาพดีเยี่ยม'
            },
            {
                id: 't2',
                asset_id: '2',
                borrower_id: 'b4',
                borrow_by_staff_id: 'staff-admin',
                borrow_date: '2026-05-27T10:30:00Z',
                expected_return_date: '2026-06-03',
                borrow_purpose: 'ใช้สำหรับทดสอบโปรแกรมสาธิตให้กับลูกค้าบูธนิทรรศการประจำปี',
                return_by_staff_id: null,
                return_date: null,
                asset_condition_after: null,
                remarks: null
            },
            {
                id: 't3',
                asset_id: '5',
                borrower_id: 'b1',
                borrow_by_staff_id: 'staff-admin',
                borrow_date: '2026-05-28T10:00:00Z',
                expected_return_date: '2026-06-05',
                borrow_purpose: 'ขอยืมคอมพิวเตอร์สำรองเนื่องจากเครื่องประจำชำรุดรอซ่อมบอร์ด',
                return_by_staff_id: null,
                return_date: null,
                asset_condition_after: null,
                remarks: null
            },
            {
                id: 't4',
                asset_id: '7',
                borrower_id: 'b2',
                borrow_by_staff_id: 'staff-admin',
                borrow_date: '2026-05-30T14:15:00Z',
                expected_return_date: '2026-06-02',
                borrow_purpose: 'ยืมทำสื่ออบรมพนักงานใหม่ของแผนกทรัพยากรบุคคล',
                return_by_staff_id: null,
                return_date: null,
                asset_condition_after: null,
                remarks: null
            },
            {
                id: 't5',
                asset_id: '10',
                borrower_id: 'b3',
                borrow_by_staff_id: 'staff-admin',
                borrow_date: '2026-06-01T09:00:00Z',
                expected_return_date: '2026-06-03',
                borrow_purpose: 'ใช้เครื่อง Workstation รันงานประมวลผลวิดีโอ 3D ขนาดใหญ่ชั่วคราว',
                return_by_staff_id: null,
                return_date: null,
                asset_condition_after: null,
                remarks: null
            }
        ]
    },

    // Initialize database
    init() {
        if (!localStorage.getItem(this.KEYS.ASSETS)) {
            localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(this.SEED_DATA.ASSETS));
            localStorage.setItem(this.KEYS.BORROWERS, JSON.stringify(this.SEED_DATA.BORROWERS));
            localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(this.SEED_DATA.TRANSACTIONS));
        }
    },

    // Asset Queries
    getAssets() {
        return JSON.parse(localStorage.getItem(this.KEYS.ASSETS)) || [];
    },

    getAssetById(id) {
        return this.getAssets().find(asset => asset.id === id);
    },

    getAssetByTag(tag) {
        return this.getAssets().find(asset => asset.asset_tag.toLowerCase() === tag.trim().toLowerCase());
    },

    saveAsset(asset) {
        const assets = this.getAssets();
        const index = assets.findIndex(a => a.id === asset.id);

        if (index > -1) {
            assets[index] = asset; // Update existing
        } else {
            assets.push(asset); // Create new
        }
        localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(assets));
        return asset;
    },
    // Delete an asset and any related transactions
    deleteAsset(id) {
        const assets = this.getAssets().filter(a => a.id !== id);
        localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(assets));

        // Remove related transactions
        const transactions = this.getTransactions().filter(t => t.asset_id !== id);
        localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
    },

    // Transaction Queries
    getTransactions() {
        return JSON.parse(localStorage.getItem(this.KEYS.TRANSACTIONS)) || [];
    },

    getTransactionsByAsset(assetId) {
        return this.getTransactions()
            .filter(t => t.asset_id === assetId)
            .sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));
    },

    saveTransaction(transaction) {
        const transactions = this.getTransactions();
        const index = transactions.findIndex(t => t.id === transaction.id);

        if (index > -1) {
            transactions[index] = transaction; // Update
        } else {
            transactions.push(transaction); // Add
        }
        localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
        return transaction;
    },

    // Borrower Queries
    getBorrowers() {
        return JSON.parse(localStorage.getItem(this.KEYS.BORROWERS)) || [];
    },

    saveBorrower(borrower) {
        const borrowers = this.getBorrowers();
        const index = borrowers.findIndex(b => b.employee_id === borrower.employee_id);

        if (index > -1) {
            borrowers[index] = { ...borrowers[index], ...borrower }; // Update
            localStorage.setItem(this.KEYS.BORROWERS, JSON.stringify(borrowers));
            return borrowers[index];
        } else {
            borrower.id = 'b_' + Date.now();
            borrowers.push(borrower); // Add new
            localStorage.setItem(this.KEYS.BORROWERS, JSON.stringify(borrowers));
            return borrower;
        }
    },

    getBorrowerById(id) {
        return this.getBorrowers().find(b => b.id === id);
    }
};

// Initialize Mock DB immediately
MockDB.init();


// ================= 2. STATE MANAGER & CONFIG =================
const AppState = {
    currentTab: 'dashboard',
    activeFilters: {
        usageType: 'all',
        status: 'all',
        searchQuery: ''
    },
    qrCodeInstance: null,
    html5QrcodeScanner: null
};


// ================= 3. DOM & UI ELEMENT REFERENCES =================
const UI = {
    // Navigation & Tabs
    navItems: document.querySelectorAll('.nav-menu .nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    globalSearch: document.getElementById('global-search'),

    // Dashboard KPI Cards
    kpiDeploymentReady: document.getElementById('kpi-deployment-ready'),
    kpiRentalAvailable: document.getElementById('kpi-rental-available'),
    kpiRentalRented: document.getElementById('kpi-rental-rented'),
    activeRentalsCount: document.getElementById('active-rentals-count'),
    activeRentalsTableBody: document.getElementById('active-rentals-tbody'),

    // Assets List Table
    assetsTableBody: document.getElementById('assets-tbody'),
    filterUsageType: document.getElementById('filter-usage-type'),
    filterStatus: document.getElementById('filter-status'),

    // Scanner Tab & Simulator
    startCameraBtn: document.getElementById('start-camera-btn'),
    stopCameraBtn: document.getElementById('stop-camera-btn'),
    simAssetSelect: document.getElementById('sim-asset-select'),
    simScanBtn: document.getElementById('sim-scan-btn'),
    cameraScanResult: document.getElementById('camera-scan-result'),

    // Transactions
    transactionsTableBody: document.getElementById('transactions-tbody'),

    // Header Buttons
    headerAddAssetBtn: document.getElementById('header-add-asset-btn'),
    quickScanBtn: document.getElementById('quick-scan-btn'),

    // Modals
    addAssetModal: document.getElementById('add-asset-modal'),
    assetDetailModal: document.getElementById('asset-detail-modal'),
    borrowFormModal: document.getElementById('borrow-form-modal'),
    returnFormModal: document.getElementById('return-form-modal'),

    // Forms
    addAssetForm: document.getElementById('add-asset-form'),
    borrowAssetForm: document.getElementById('borrow-asset-form-element'),
    returnAssetForm: document.getElementById('return-asset-form-element'),

    // Toast Container
    toastContainer: document.getElementById('toast-container'),

    // Detail Modal specific elements
    qrcodeContainer: document.getElementById('qrcode-container'),
    detailQrTag: document.getElementById('detail-qr-tag'),
    detailModelName: document.getElementById('detail-model-name'),
    detailStatusBadge: document.getElementById('detail-status-badge'),
    detailTypeBadge: document.getElementById('detail-type-badge'),
    detailAssetTag: document.getElementById('detail-asset-tag'),
    detailSn: document.getElementById('detail-sn'),
    detailCategory: document.getElementById('detail-category'),
    detailRegisteredDate: document.getElementById('detail-registered-date'),
    detailActionButtons: document.getElementById('detail-action-buttons'),
    assetTimelineUl: document.getElementById('asset-timeline-ul'),
    printQrBtn: document.getElementById('print-qr-btn')
};


// ================= 4. CORE APP FUNCTIONS & RENDERERS =================

// Dynamic Toast Notifications Helper
function showToast(message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-check';
    if (type === 'warning') iconClass = 'fa-circle-exclamation';
    if (type === 'danger') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div class="toast-message">${message}</div>
    `;

    UI.toastContainer.appendChild(toast);

    // Auto-remove toast after timeout
    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duration);
}

// Format Datetime utility
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) + ' น.';
}

function formatDateOnly(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// 4.1 DASHBOARD RENDERER
function renderDashboard() {
    const assets = MockDB.getAssets();
    const transactions = MockDB.getTransactions();
    const borrowers = MockDB.getBorrowers();

    // Compute KPIs
    const deploymentReady = assets.filter(a => a.usage_type === 'Deployment' && a.status === 'Available').length;
    const rentalAvailable = assets.filter(a => a.usage_type === 'Rental' && a.status === 'Available').length;
    const rentalRented = assets.filter(a => a.usage_type === 'Rental' && a.status === 'Rented').length;

    UI.kpiDeploymentReady.textContent = deploymentReady;
    UI.kpiRentalAvailable.textContent = rentalAvailable;
    UI.kpiRentalRented.textContent = rentalRented;

    // Render Active Rentals Table
    const activeRentals = transactions.filter(t => t.return_date === null);
    UI.activeRentalsCount.textContent = `${activeRentals.length} เครื่อง`;
    UI.activeRentalsTableBody.innerHTML = '';

    if (activeRentals.length === 0) {
        UI.activeRentalsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted" style="padding: 30px;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                    ไม่มีคอมพิวเตอร์ที่กำลังถูกยืมใช้งานอยู่ในขณะนี้
                </td>
            </tr>
        `;
        return;
    }

    activeRentals.forEach(tx => {
        const asset = assets.find(a => a.id === tx.asset_id) || {};
        const borrower = borrowers.find(b => b.id === tx.borrower_id) || { full_name: 'ไม่พบชื่อผู้ยืม', department: '-' };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="font-semibold text-primary clickable-tag" data-id="${asset.id}">${asset.asset_tag}</span></td>
            <td>
                <div class="font-semibold">${asset.model_name || 'ไม่พบคอมพิวเตอร์'}</div>
                <div class="text-muted" style="font-size: 0.75rem;">S/N: ${asset.serial_number || '-'}</div>
            </td>
            <td>
                <div class="font-semibold">${borrower.full_name}</div>
                <div class="text-muted" style="font-size: 0.75rem;">แผนก: ${borrower.department}</div>
            </td>
            <td>${formatDateTime(tx.borrow_date)}</td>
            <td><span class="badge badge-warning">${formatDateOnly(tx.expected_return_date)}</span></td><br>
            <td style="white-space: nowrap; text-align: center;">
                <button class="btn btn-secondary btn-small return-quick-btn" data-asset-id="${asset.id}">
                    <i class="fa-solid fa-arrows-spin"></i> รับคืน
                </button>
            </td>
        `;

        UI.activeRentalsTableBody.appendChild(tr);
    });

    // Bind click events on interactive tags inside dashboard
    bindInteractiveTags();
}

// 4.2 ASSETS LIST RENDERER
function renderAssetsList() {
    const assets = MockDB.getAssets();
    const query = AppState.activeFilters.searchQuery.toLowerCase();

    UI.assetsTableBody.innerHTML = '';

    // Filter logic
    const filteredAssets = assets.filter(asset => {
        const matchesSearch =
            asset.asset_tag.toLowerCase().includes(query) ||
            asset.serial_number.toLowerCase().includes(query) ||
            asset.model_name.toLowerCase().includes(query);

        const matchesUsage =
            AppState.activeFilters.usageType === 'all' ||
            asset.usage_type === AppState.activeFilters.usageType;

        const matchesStatus =
            AppState.activeFilters.status === 'all' ||
            asset.status === AppState.activeFilters.status;

        return matchesSearch && matchesUsage && matchesStatus;
    });

    if (filteredAssets.length === 0) {
        UI.assetsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted" style="padding: 40px;">
                    <i class="fa-solid fa-circle-question" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                    ไม่พบรายการอุปกรณ์ตามเงื่อนไขการค้นหาที่เลือก
                </td>
            </tr>
        `;
        return;
    }

    filteredAssets.forEach(asset => {
        const tr = document.createElement('tr');

        // Match appropriate badges classes
        const statusClass = `status-${asset.status.toLowerCase()}`;
        const statusTextMap = {
            Available: 'ว่าง (Available)',
            Rented: 'ถูกยืม (Rented)',
            Assigned: 'จ่ายถาวร (Assigned)',
            Maintenance: 'ส่งซ่อม (Maintenance)'
        };
        const statusText = statusTextMap[asset.status] || asset.status;

        const typeClass = `type-${asset.usage_type.toLowerCase()}`;
        const typeText = asset.usage_type === 'Rental' ? 'ยืมชั่วคราว' : 'จ่ายถาวร';

        tr.innerHTML = `
            <td><span class="font-semibold text-primary clickable-tag" data-id="${asset.id}">${asset.asset_tag}</span></td>
            <td><span class="text-muted">${asset.serial_number}</span></td>
            <td>
                <div class="font-semibold">${asset.model_name}</div>
            </td>
            <td>${asset.category}</td>
                <td><span class="type-badge ${typeClass}">${typeText}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="text-center">
                    <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                        <button class="btn btn-secondary btn-small view-asset-btn" data-id="${asset.id}" title="รายละเอียด / QR">
                            <i class="fa-solid fa-qrcode"></i>
                        </button>
                        <button class="btn btn-accent btn-small edit-asset-btn" data-id="${asset.id}" title="แก้ไขข้อมูล">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-danger btn-small delete-asset-btn" data-id="${asset.id}" title="ลบข้อมูล">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
        `;

        UI.assetsTableBody.appendChild(tr);
    });

    bindInteractiveTags();
}

// 4.3 TRANSACTIONS LOG RENDERER
function renderTransactionsLog() {
    const transactions = MockDB.getTransactions();
    const assets = MockDB.getAssets();
    const borrowers = MockDB.getBorrowers();

    // Sort transactions by date descending
    const sortedTx = [...transactions].sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));

    UI.transactionsTableBody.innerHTML = '';

    if (sortedTx.length === 0) {
        UI.transactionsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted" style="padding: 40px;">
                    ไม่มีบันทึกประวัติการยืม-คืนเครื่องคอมพิวเตอร์ในระบบ
                </td>
            </tr>
        `;
        return;
    }

    sortedTx.forEach(tx => {
        const asset = assets.find(a => a.id === tx.asset_id) || { asset_tag: 'ไม่พบเครื่อง', model_name: '-' };
        const borrower = borrowers.find(b => b.id === tx.borrower_id) || { full_name: '-', department: '-' };

        const tr = document.createElement('tr');

        // Return details
        const returnDateText = tx.return_date ? formatDateTime(tx.return_date) : '<span class="text-warning font-semibold">ยังไม่คืน ⚠️</span>';
        const returnStaffText = tx.return_by_staff_id ? 'Wachira Y.' : '-';

        let conditionBadge = '-';
        if (tx.asset_condition_after === 'Normal') {
            conditionBadge = '<span class="status-badge status-available">ปกติ (Normal)</span>';
        } else if (tx.asset_condition_after === 'Damaged') {
            conditionBadge = '<span class="status-badge status-maintenance">ชำรุด (Damaged)</span>';
        }

        tr.innerHTML = `
            <td>${formatDateTime(tx.borrow_date)}</td>
            <td>
                <div class="font-semibold text-primary clickable-tag" data-id="${tx.asset_id}">${asset.asset_tag}</div>
                <div class="text-muted" style="font-size: 0.72rem;">${asset.model_name}</div>
            </td>
            <td>
                <div class="font-semibold">${borrower.full_name}</div>
                <div class="text-muted" style="font-size: 0.72rem;">แผนก: ${borrower.department}</div>
            </td>
            <td>Wachira Y.</td>
            <td><span class="text-muted">${formatDateOnly(tx.expected_return_date)}</span></td>
            <td>${returnDateText}</td>
            <td>${returnStaffText}</td>
            <td>${conditionBadge}</td>
        `;

        UI.transactionsTableBody.appendChild(tr);
    });

    bindInteractiveTags();
}

// Populate the select option inside Scanner Simulator
function renderScannerSimulatorDropdown() {
    const assets = MockDB.getAssets();
    UI.simAssetSelect.innerHTML = '<option value="" disabled selected>-- เลือกอุปกรณ์คอมพิวเตอร์ --</option>';

    assets.forEach(asset => {
        const statusMap = {
            Available: 'ว่าง',
            Rented: 'ถูกยืม ⚠️',
            Assigned: 'จ่ายถาวร',
            Maintenance: 'ส่งซ่อม'
        };
        const text = `${asset.asset_tag} - ${asset.model_name} [${statusMap[asset.status] || asset.status}]`;
        const option = document.createElement('option');
        option.value = asset.asset_tag;
        option.textContent = text;
        UI.simAssetSelect.appendChild(option);
    });
}

// Dynamic Timeline Renderer in Details Modal
function renderAssetTimeline(assetId) {
    const transactions = MockDB.getTransactionsByAsset(assetId);
    const asset = MockDB.getAssetById(assetId);
    const borrowers = MockDB.getBorrowers();

    UI.assetTimelineUl.innerHTML = '';

    // Always add standard "registration" event at the bottom
    const regDateStr = asset.created_at ? formatDateTime(asset.created_at) : 'เริ่มต้นระบบ';
    const regItem = document.createElement('li');
    regItem.className = 'timeline-item timeline-create';
    regItem.innerHTML = `
        <div class="timeline-time">${regDateStr}</div>
        <div class="timeline-title">เพิ่มเครื่องเข้าระบบคอมพิวเตอร์แผนก IT</div>
        <div class="timeline-desc">ลงทะเบียนสำเร็จในระบบคลังอุปกรณ์ IT Asset Hub</div>
    `;

    if (transactions.length === 0) {
        UI.assetTimelineUl.appendChild(regItem);
        return;
    }

    transactions.forEach(tx => {
        const borrower = borrowers.find(b => b.id === tx.borrower_id) || { full_name: 'พนักงานทั่วไป' };

        // Return timeline event (if returned)
        if (tx.return_date) {
            const returnItem = document.createElement('li');
            returnItem.className = 'timeline-item timeline-return';
            const conditionStr = tx.asset_condition_after === 'Normal' ? 'ปกติ' : 'ชำรุดเสียหาย';
            returnItem.innerHTML = `
                <div class="timeline-time">${formatDateTime(tx.return_date)}</div>
                <div class="timeline-title">รับคืนเครื่องคอมพิวเตอร์เรียบร้อย</div>
                <div class="timeline-desc">
                    ผู้ตรวจรับคืน: Wachira Y. | สภาพเครื่อง: <strong>${conditionStr}</strong><br>
                    หมายเหตุ: ${tx.remarks || '-'}
                </div>
            `;
            UI.assetTimelineUl.appendChild(returnItem);
        }

        // Borrow timeline event
        const borrowItem = document.createElement('li');
        borrowItem.className = 'timeline-item timeline-borrow';
        borrowItem.innerHTML = `
            <div class="timeline-time">${formatDateTime(tx.borrow_date)}</div>
            <div class="timeline-title">ปล่อยกู้ยืมเครื่องคอมพิวเตอร์</div>
            <div class="timeline-desc">
                ผู้ยืม: <strong>${borrower.full_name} (แผนก ${borrower.department})</strong><br>
                วัตถุประสงค์: ${tx.borrow_purpose}<br>
                กำหนดคืนส่งมอบ: ${formatDateOnly(tx.expected_return_date)}
            </div>
        `;
        UI.assetTimelineUl.appendChild(borrowItem);
    });

    // Add registration event at the end
    UI.assetTimelineUl.appendChild(regItem);
}


// ================= 5. INTERACTIVE EVENTS & ROUTING =================

// Tab Navigation routing logic
function switchTab(tabId) {
    // 1. Manage Sidebar visual state
    UI.navItems.forEach(btn => {
        if (btn.getAttribute('data-target') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. Manage Window visibility
    UI.tabContents.forEach(tab => {
        if (tab.id === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // 3. Trigger specific renderers upon load
    AppState.currentTab = tabId;
    if (tabId === 'dashboard') {
        renderDashboard();
    } else if (tabId === 'assets') {
        renderAssetsList();
    } else if (tabId === 'transactions') {
        renderTransactionsLog();
    } else if (tabId === 'scanner') {
        renderScannerSimulatorDropdown();
        // Automatically stop active webcam if we leave scanner tab
    }

    // Stop scanner camera if we navigate away from scanner tab
    if (tabId !== 'scanner' && AppState.html5QrcodeScanner) {
        stopWebcamScanner();
    }
}

// Modal open/close actions helper
function openModal(modalElement) {
    modalElement.classList.add('active');
}

function closeModal(modalElement) {
    modalElement.classList.remove('active');

    // Clean up forms when closing
    const form = modalElement.querySelector('form');
    if (form) form.reset();
}

// Bind details click onto asset tag links across all tables
function bindInteractiveTags() {
    document.querySelectorAll('.clickable-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            const assetId = e.target.getAttribute('data-id');
            showAssetDetail(assetId);
        });
    });

    // Dashboard Return Buttons
    document.querySelectorAll('.return-quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const assetId = btn.getAttribute('data-asset-id');
            showReturnForm(assetId);
        });
    });

    // Table Details Buttons
    document.querySelectorAll('.view-asset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const assetId = btn.getAttribute('data-id');
            showAssetDetail(assetId);
        });
    });

    // Edit Buttons - open Add Asset modal pre-filled for editing
    document.querySelectorAll('.edit-asset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const assetId = btn.getAttribute('data-id');
            const asset = MockDB.getAssetById(assetId);
            if (!asset) {
                showToast('ไม่พบข้อมูลที่จะทำการแก้ไข', 'danger');
                return;
            }

            // Populate Add Asset Form with existing values for editing
            document.getElementById('asset-id').value = asset.id;
            document.getElementById('asset-tag').value = asset.asset_tag;
            document.getElementById('serial-number').value = asset.serial_number;
            document.getElementById('model-name').value = asset.model_name;
            document.getElementById('category').value = asset.category;
            document.getElementById('usage-type').value = asset.usage_type;
            document.getElementById('initial-status').value = asset.status;

            // Open modal for editing
            openModal(UI.addAssetModal);
        });
    });

    // Delete Buttons - remove asset after confirmation
    document.querySelectorAll('.delete-asset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const assetId = btn.getAttribute('data-id');
            const asset = MockDB.getAssetById(assetId);
            if (!asset) {
                showToast('ไม่พบข้อมูลที่จะลบ', 'danger');
                return;
            }

            if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${asset.asset_tag} ออกจากระบบคลัง? การลบนี้ไม่สามารถกู้คืนได้`)) return;

            // Perform deletion
            MockDB.deleteAsset(assetId);
            showToast(`ลบ ${asset.asset_tag} เรียบร้อยแล้ว`, 'success');

            // Refresh current view
            if (AppState.currentTab === 'assets') renderAssetsList();
            if (AppState.currentTab === 'dashboard') renderDashboard();
        });
    });
}


// ================= 6. BUSINESS WORKFLOW HANDLERS (BORROW & RETURN) =================

// 6.1 WORKFLOW: SHOW ASSET DETAILED CARD & DYNAMIC GENERATED QR
function showAssetDetail(assetId) {
    const asset = MockDB.getAssetById(assetId);
    if (!asset) {
        showToast('ไม่พบข้อมูลคอมพิวเตอร์เครื่องนี้ในคลังระบบ', 'danger');
        return;
    }

    // Populate simple specs details
    UI.detailModelName.textContent = asset.model_name;
    UI.detailQrTag.textContent = asset.asset_tag;
    UI.detailAssetTag.textContent = asset.asset_tag;
    UI.detailSn.textContent = asset.serial_number;
    UI.detailCategory.textContent = asset.category;
    UI.detailRegisteredDate.textContent = asset.created_at ? formatDateOnly(asset.created_at) : 'เริ่มต้นระบบ';

    // Allocate statuses badges styles
    UI.detailStatusBadge.className = `status-badge status-${asset.status.toLowerCase()}`;
    const statusMap = { Available: 'ว่างพร้อมใช้งาน', Rented: 'กำลังถูกยืมใช้งาน', Assigned: 'แจกจ่ายถาวรแล้ว', Maintenance: 'อยู่ระหว่างส่งซ่อมบำรุง' };
    UI.detailStatusBadge.textContent = statusMap[asset.status] || asset.status;

    UI.detailTypeBadge.className = `type-badge type-${asset.usage_type.toLowerCase()}`;
    UI.detailTypeBadge.textContent = asset.usage_type === 'Rental' ? 'เครื่องสำหรับยืมชั่วคราว (Rental)' : 'เครื่องว่างพร้อมจ่ายถาวร (Deployment)';

    // Dynamic Action Buttons relative to status
    UI.detailActionButtons.innerHTML = '';
    if (asset.usage_type === 'Rental') {
        if (asset.status === 'Available') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-success btn-full';
            btn.innerHTML = '<i class="fa-solid fa-file-signature"></i> ทำรายการยืมเครื่องนี้';
            btn.onclick = () => {
                closeModal(UI.assetDetailModal);
                showBorrowForm(asset.id);
            };
            UI.detailActionButtons.appendChild(btn);
        } else if (asset.status === 'Rented') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-full';
            btn.innerHTML = '<i class="fa-solid fa-arrows-spin"></i> ทำรายการรับคืนเครื่องนี้';
            btn.onclick = () => {
                closeModal(UI.assetDetailModal);
                showReturnForm(asset.id);
            };
            UI.detailActionButtons.appendChild(btn);
        }
    } else if (asset.usage_type === 'Deployment' && asset.status === 'Available') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-accent btn-full';
        btn.innerHTML = '<i class="fa-solid fa-person-circle-plus"></i> จ่ายเครื่องถาวรให้พนักงาน';
        btn.onclick = () => {
            // Quick simulation of Assigning
            if (confirm(`คุณต้องการเปลี่ยนสถานะเครื่อง ${asset.asset_tag} เป็น "ส่งมอบถาวร (Assigned)" ใช่หรือไม่?`)) {
                asset.status = 'Assigned';
                MockDB.saveAsset(asset);
                showToast(`ส่งมอบเครื่อง ${asset.asset_tag} เรียบร้อยแล้ว`, 'success');
                closeModal(UI.assetDetailModal);
                switchTab('assets');
            }
        };
        UI.detailActionButtons.appendChild(btn);
    }

    // Create Timeline items
    renderAssetTimeline(asset.id);

    // Clean up older QR code and generate new one beautifully using QRCodeJS from CDN
    UI.qrcodeContainer.innerHTML = '';

    // Delay creation slightly to ensure container is fully sized and ready
    setTimeout(() => {
        try {
            // Generating absolute URL for QR scan
            const domain = window.location.origin + window.location.pathname;
            const qrText = `${domain}?scan=${asset.asset_tag}`;

            new QRCode(UI.qrcodeContainer, {
                text: qrText,
                width: 160,
                height: 160,
                colorDark: '#0f172a', // Clean Slate Dark
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (e) {
            console.error('Error rendering QR Code library:', e);
            UI.qrcodeContainer.innerHTML = '<p class="text-danger" style="font-size:0.75rem;">ไม่สามารถสร้าง QR Code ได้</p>';
        }
    }, 150);

    // Config print button
    UI.printQrBtn.onclick = () => {
        const printWindow = window.open('', '_blank');
        const qrImage = UI.qrcodeContainer.querySelector('img').src;
        printWindow.document.write(`
            <html>
            <head>
                <title>Print QR - ${asset.asset_tag}</title>
                <style>
                    body { font-family: 'Outfit', sans-serif; text-align: center; padding: 40px; }
                    .container { border: 2px dashed #000; display: inline-block; padding: 20px; border-radius: 10px; }
                    h2 { margin: 10px 0 5px 0; font-size: 1.5rem; }
                    p { margin: 0; color: #555; font-size: 0.9rem; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="container">
                    <img src="${qrImage}" width="220" />
                    <h2>${asset.asset_tag}</h2>
                    <p>${asset.model_name}</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    openModal(UI.assetDetailModal);
}

// 6.2 WORKFLOW: BORROW SUBMISSION FORM
function showBorrowForm(assetId) {
    const asset = MockDB.getAssetById(assetId);
    if (!asset || asset.status !== 'Available') {
        showToast('ไม่สามารถยืมเครื่องคอมพิวเตอร์เครื่องนี้ได้เนื่องจากไม่ว่าง หรือส่งซ่อมอยู่', 'danger');
        return;
    }

    // Pre-populate summary cards
    document.getElementById('borrow-form-asset-id').value = asset.id;
    UI.borrowAssetForm.reset();

    document.getElementById('borrow-summary-model').textContent = asset.model_name;
    document.getElementById('borrow-summary-tag').textContent = asset.asset_tag;
    document.getElementById('borrow-summary-sn').textContent = asset.serial_number;

    // Default Borrow Date: Current local timezone
    const now = new Date();
    // Adjust ISO timezone for direct datetime-local input parsing
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    document.getElementById('borrow-date').value = localISOTime;

    // Default Expected Return: 3 Days from now
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    const dateFormatted = threeDaysLater.toISOString().split('T')[0];
    document.getElementById('expected-return-date').value = dateFormatted;

    openModal(UI.borrowFormModal);
}

// Handling Borrows Submit Handler
UI.borrowAssetForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const assetId = document.getElementById('borrow-form-asset-id').value;
    const asset = MockDB.getAssetById(assetId);

    if (!asset || asset.status !== 'Available') {
        showToast('เกิดข้อผิดพลาดในการยืม สินค้าไม่พร้อมใช้งาน', 'danger');
        closeModal(UI.borrowFormModal);
        return;
    }

    const empName = document.getElementById('borrower-name').value.trim();
    const empId = document.getElementById('borrower-id').value.trim();
    const empDept = document.getElementById('borrower-dept').value;
    const empPhone = document.getElementById('borrower-phone').value.trim();
    const borrowDate = document.getElementById('borrow-date').value;
    const returnDate = document.getElementById('expected-return-date').value;
    const purpose = document.getElementById('borrow-purpose').value.trim();

    // 1. Save or Update Borrower details in Database
    const borrower = MockDB.saveBorrower({
        employee_id: empId,
        full_name: empName,
        department: empDept,
        contact_number: empPhone
    });

    // 2. Insert new transaction record
    const newTransaction = {
        id: 't_' + Date.now(),
        asset_id: asset.id,
        borrower_id: borrower.id,
        borrow_by_staff_id: 'staff-admin', // Simulated current login staff
        borrow_date: new Date(borrowDate).toISOString(),
        expected_return_date: returnDate,
        borrow_purpose: purpose,
        return_by_staff_id: null,
        return_date: null,
        asset_condition_after: null,
        remarks: null
    };
    MockDB.saveTransaction(newTransaction);

    // 3. Update Asset status to 'Rented'
    asset.status = 'Rented';
    asset.updated_at = new Date().toISOString();
    MockDB.saveAsset(asset);

    // 4. Finished & notify
    closeModal(UI.borrowFormModal);
    showToast(`ทำรายการยืมเครื่อง ${asset.asset_tag} เรียบร้อยแล้ว`, 'success');

    // Reload state
    if (AppState.currentTab === 'dashboard') {
        renderDashboard();
    } else if (AppState.currentTab === 'assets') {
        renderAssetsList();
    }
});

// 6.3 WORKFLOW: RETURN SUBMISSION FORM
function showReturnForm(assetId) {
    const asset = MockDB.getAssetById(assetId);
    if (!asset || asset.status !== 'Rented') {
        showToast('อุปกรณ์เครื่องนี้อยู่ในคลัง หรือไม่ได้อยู่ในสถานะที่กำลังถูกยืมอยู่', 'warning');
        return;
    }

    // Retrieve the active transaction (return_date is null)
    const activeTx = MockDB.getTransactions()
        .find(t => t.asset_id === asset.id && t.return_date === null);

    if (!activeTx) {
        showToast('ไม่พบรายการประวัติการยืมแบบเปิดของอุปกรณ์เครื่องนี้', 'danger');
        return;
    }

    const borrower = MockDB.getBorrowerById(activeTx.borrower_id) || { full_name: 'ไม่ทราบชื่อ', department: '-' };

    // Pre-populate Return Modal Elements
    document.getElementById('return-form-asset-id').value = asset.id;
    UI.returnAssetForm.reset();

    document.getElementById('return-summary-model').textContent = asset.model_name;
    document.getElementById('return-summary-tag').textContent = asset.asset_tag;
    document.getElementById('return-summary-sn').textContent = asset.serial_number;

    document.getElementById('return-borrower-name').textContent = borrower.full_name;
    document.getElementById('return-borrower-dept').textContent = borrower.department;
    document.getElementById('return-borrow-date').textContent = formatDateTime(activeTx.borrow_date);
    document.getElementById('return-expected-date').textContent = formatDateOnly(activeTx.expected_return_date);
    document.getElementById('return-borrow-purpose').textContent = activeTx.borrow_purpose;

    openModal(UI.returnFormModal);
}

// Handling Return Submit Handler
UI.returnAssetForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const assetId = document.getElementById('return-form-asset-id').value;
    const asset = MockDB.getAssetById(assetId);

    const activeTx = MockDB.getTransactions()
        .find(t => t.asset_id === asset.id && t.return_date === null);

    if (!asset || !activeTx) {
        showToast('เกิดข้อผิดพลาดในการทำรายการรับคืนเครื่องคอมพิวเตอร์', 'danger');
        closeModal(UI.returnFormModal);
        return;
    }

    const condition = document.querySelector('input[name="asset-condition"]:checked').value;
    const remarks = document.getElementById('return-remarks').value.trim();

    // 1. Update Transaction record
    activeTx.return_date = new Date().toISOString();
    activeTx.return_by_staff_id = 'staff-admin';
    activeTx.asset_condition_after = condition;
    activeTx.remarks = remarks;
    MockDB.saveTransaction(activeTx);

    // 2. Update Asset status (Available or Maintenance depending on condition)
    asset.status = condition === 'Damaged' ? 'Maintenance' : 'Available';
    asset.updated_at = new Date().toISOString();
    MockDB.saveAsset(asset);

    // 3. Finished & update UI
    closeModal(UI.returnFormModal);

    if (condition === 'Damaged') {
        showToast(`รับคืนเครื่อง ${asset.asset_tag} เรียบร้อยแล้ว แต่ถูกย้ายไป "ส่งซ่อม (Maintenance)"`, 'warning', 5000);
    } else {
        showToast(`รับคืนเครื่อง ${asset.asset_tag} เข้าสู่คลังปกติเรียบร้อยแล้ว`, 'success');
    }

    // Reload state
    if (AppState.currentTab === 'dashboard') {
        renderDashboard();
    } else if (AppState.currentTab === 'assets') {
        renderAssetsList();
    }
});


// ================= 7. DYNAMIC QR CODE SCANNING SYSTEM =================

// Process Scanned tag and forward directly to the correct workflow forms
function processScanResult(assetTag) {
    const asset = MockDB.getAssetByTag(assetTag);
    if (!asset) {
        showToast(`ตรวจสแกนพบ Tag: "${assetTag}" แต่ไม่พบข้อมูลทรัพย์สินเครื่องนี้ในระบบคลัง`, 'danger', 5000);
        return;
    }

    showToast(`สแกนสำเร็จ: พบเครื่อง ${asset.asset_tag}`, 'success');

    // Check asset status and automatically trigger workflows
    if (asset.usage_type === 'Rental') {
        if (asset.status === 'Available') {
            // Open Borrow Form
            setTimeout(() => {
                showBorrowForm(asset.id);
            }, 300);
        } else if (asset.status === 'Rented') {
            // Open Return Form
            setTimeout(() => {
                showReturnForm(asset.id);
            }, 300);
        } else {
            // Maintenance, Assigned or other -> Show spec details card
            setTimeout(() => {
                showAssetDetail(asset.id);
            }, 300);
        }
    } else {
        // Deployment asset -> show detail card
        setTimeout(() => {
            showAssetDetail(asset.id);
        }, 300);
    }
}

// Real Webcam Camera scanner using Html5Qrcode
function startWebcamScanner() {
    UI.cameraScanResult.textContent = '';
    UI.startCameraBtn.classList.add('hidden');
    UI.stopCameraBtn.classList.remove('hidden');

    const qrReaderDiv = document.getElementById('qr-reader');
    qrReaderDiv.style.display = 'block';

    AppState.html5QrcodeScanner = new Html5Qrcode("qr-reader");

    const config = { fps: 15, qrbox: { width: 230, height: 230 } };

    AppState.html5QrcodeScanner.start(
        { facingMode: "environment" }, // Back camera for mobiles
        config,
        (decodedText) => {
            // QR Scanned Successfully callback
            stopWebcamScanner();

            // Analyze the scanned text. Support both raw tags (e.g. IT-ASSET-0001) 
            // and URLs (e.g. https://asset-it.corp.com/scan/IT-ASSET-0001)
            let finalAssetTag = decodedText.trim();
            if (decodedText.includes('?scan=')) {
                finalAssetTag = decodedText.split('?scan=')[1];
            } else if (decodedText.includes('/scan/')) {
                finalAssetTag = decodedText.split('/scan/')[1];
            }

            processScanResult(finalAssetTag);
        },
        (errorMessage) => {
            // Silent logging of ongoing search frames errors
        }
    ).catch(err => {
        console.error("Camera access error:", err);
        showToast("ไม่สามารถเข้าถึงกล้องวีดีโอของคุณได้ กรุณาอนุมัติสิทธิ์กล้อง", "danger");
        stopWebcamScanner();
    });
}

function stopWebcamScanner() {
    UI.startCameraBtn.classList.remove('hidden');
    UI.stopCameraBtn.classList.add('hidden');

    if (AppState.html5QrcodeScanner) {
        AppState.html5QrcodeScanner.stop().then(() => {
            AppState.html5QrcodeScanner = null;
            document.getElementById('qr-reader').style.display = 'none';
        }).catch(err => {
            console.error("Error stopping camera scanner:", err);
        });
    }
}


// ================= 8. FORM SUBMISSIONS & SEARCH/FILTER BINDINGS =================

// Search & Filter event triggers
UI.globalSearch.addEventListener('input', (e) => {
    AppState.activeFilters.searchQuery = e.target.value.trim();

    // Route search queries depending on current active tab
    if (AppState.currentTab === 'assets') {
        renderAssetsList();
    } else if (AppState.currentTab === 'dashboard') {
        // Filter dashboard table dynamically
        renderDashboardFiltered(AppState.activeFilters.searchQuery);
    }
});

function renderDashboardFiltered(query) {
    renderDashboard();

    if (query === '') return;

    const rows = UI.activeRentalsTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

UI.filterUsageType.addEventListener('change', (e) => {
    AppState.activeFilters.usageType = e.target.value;
    renderAssetsList();
});

UI.filterStatus.addEventListener('change', (e) => {
    AppState.activeFilters.status = e.target.value;
    renderAssetsList();
});

// Sidebar items clicking routes
UI.navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        switchTab(target);
    });
});

// Quick Scans in headers trigger tab switch
UI.quickScanBtn.addEventListener('click', () => {
    switchTab('scanner');
});

// Open Add Asset Modal
UI.headerAddAssetBtn.addEventListener('click', () => {
    // Ensure form is cleared and editing id is reset when opening for a new asset
    document.getElementById('asset-id').value = '';
    UI.addAssetForm.reset();
    openModal(UI.addAssetModal);
});

// Close buttons for modals
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetModalId = btn.getAttribute('data-close');
        const modal = document.getElementById(targetModalId);
        if (modal) closeModal(modal);
    });
});

// Click outside overlay to close modal
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal(overlay);
        }
    });
});

// Add new asset form submission
UI.addAssetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editingId = document.getElementById('asset-id').value.trim();
    const tag = document.getElementById('asset-tag').value.trim();
    const sn = document.getElementById('serial-number').value.trim();
    const model = document.getElementById('model-name').value.trim();
    const cat = document.getElementById('category').value;
    const type = document.getElementById('usage-type').value;
    const status = document.getElementById('initial-status').value;

    // If we're editing an existing asset
    if (editingId) {
        const existing = MockDB.getAssetById(editingId);
        if (!existing) {
            showToast('ไม่พบข้อมูลที่จะทำการแก้ไข', 'danger');
            return;
        }

        // Ensure asset_tag uniqueness except for the current editing asset
        const tagOwner = MockDB.getAssetByTag(tag);
        if (tagOwner && tagOwner.id !== editingId) {
            showToast(`รหัสทรัพย์สิน (Asset Tag) "${tag}" ถูกใช้งานโดยอุปกรณ์อื่นแล้ว`, 'danger');
            return;
        }

        existing.asset_tag = tag;
        existing.serial_number = sn;
        existing.model_name = model;
        existing.category = cat;
        existing.usage_type = type;
        existing.status = status;
        existing.updated_at = new Date().toISOString();

        MockDB.saveAsset(existing);
        closeModal(UI.addAssetModal);
        document.getElementById('asset-id').value = '';
        showToast(`แก้ไขข้อมูล ${tag} เรียบร้อยแล้ว`, 'success');
    } else {
        // Create new asset
        // Check if tag already exists in Mock Database
        const existingTag = MockDB.getAssetByTag(tag);
        if (existingTag) {
            showToast(`รหัสทรัพย์สิน (Asset Tag) "${tag}" มีอยู่แล้วในระบบคลัง`, 'danger');
            return;
        }

        const newAsset = {
            id: 'a_' + Date.now(),
            asset_tag: tag,
            serial_number: sn,
            model_name: model,
            category: cat,
            usage_type: type,
            status: status,
            created_at: new Date().toISOString()
        };

        MockDB.saveAsset(newAsset);
        closeModal(UI.addAssetModal);
        showToast(`เพิ่มเครื่อง ${tag} เข้าระบบคลังเรียบร้อยแล้ว`, 'success');
    }

    // Refresh display
    if (AppState.currentTab === 'assets') {
        renderAssetsList();
    } else if (AppState.currentTab === 'dashboard') {
        renderDashboard();
    }
});

// Config real QR Camera clicks
UI.startCameraBtn.addEventListener('click', startWebcamScanner);
UI.stopCameraBtn.addEventListener('click', stopWebcamScanner);

// Config simulated scans clicking
UI.simScanBtn.addEventListener('click', () => {
    const selectedTag = UI.simAssetSelect.value;
    if (!selectedTag) {
        showToast('กรุณาเลือกอุปกรณ์ที่จะทำการจำลองการสแกนในรายการ', 'warning');
        return;
    }

    processScanResult(selectedTag);
});

// Check if scanned tags are passed in the URL (QR Scan integration simulation)
function checkURLQueryParameters() {
    const params = new URLSearchParams(window.location.search);
    const scannedTag = params.get('scan');
    if (scannedTag) {
        switchTab('assets');

        // Find asset
        const asset = MockDB.getAssetByTag(scannedTag);
        if (asset) {
            setTimeout(() => {
                showAssetDetail(asset.id);
                // Clean browser URL address bar beautifully
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 600);
        } else {
            showToast(`ไม่พบอุปกรณ์ตาม Asset Tag "${scannedTag}" ที่สแกนผ่านลิงก์`, 'danger', 5000);
        }
    }
}


// ================= 9. INITIAL SYSTEM BOOTSTRAP =================
window.addEventListener('DOMContentLoaded', () => {
    // 1. Populate default landing page
    renderDashboard();

    // 2. Pre-fill Scanner Simulator lists
    renderScannerSimulatorDropdown();

    // 3. Scan URL params for direct link simulation
    checkURLQueryParameters();

    showToast('เข้าสู่ระบบคลัง IT Asset Hub เรียบร้อยแล้ว (Real-time Active)', 'success', 2000);
});
