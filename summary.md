# สรุปภาพรวมการทำงานของระบบ IT Asset Rental System

ระบบ **IT Asset & Rental Management System (IT Asset Hub)** เป็นระบบเว็บแอปพลิเคชันแบบ Full-Stack ที่พัฒนาขึ้นเพื่ออำนวยความสะดวกในการบริหารจัดการอุปกรณ์ไอทีและจัดทำรายการยืม-คืนเครื่องคอมพิวเตอร์ภายในองค์กร โดยบูรณาการความปลอดภัยร่วมกับระบบสิทธิ์พนักงานผ่าน **Active Directory (AD)**

---

## 1. ฟังก์ชันการทำงานหลักของระบบ (Core Features)

### 🔑 ระบบเข้าสู่ระบบ (Authentication & Authorization)
- **การยืนยันตัวตนระดับองค์กร (SSO):** ผู้ใช้ล็อกอินผ่านโปรโตคอล LDAP เชื่อมเข้ากับ Active Directory (AD) ขององค์กร
- **ระบบสำรอง (Local Admin Fallback):** หากเชื่อมต่อกับ Active Directory ไม่ได้ หรือกรณีใช้งานแบบ Local จะมีบัญชี Local Administrator (`admin`) สำรองให้ใช้งาน
- **การนำทางตามสิทธิ์ (Role-Based Redirection):**
  - **Admin (เจ้าหน้าที่ไอที):** จะถูกส่งไปยังหน้า `index.html` เพื่อจัดการระบบทั้งหมด
  - **User (พนักงานทั่วไป):** จะถูกส่งไปยังหน้า `user.html` เพื่อทำรายการขอยืมเครื่องที่ว่าง

---

### 💻 หน้าผู้ดูแลระบบ (Admin Dashboard - `index.html`)
- **สรุปข้อมูล (KPI Metrics):** แสดงจำนวนเครื่องคอมพิวเตอร์พร้อมจ่ายถาวร เครื่องว่างสำหรับยืม และเครื่องที่กำลังถูกยืมใช้งานแบบเรียลไทม์
- **จัดการคลังอุปกรณ์ (Asset Inventory Management):** เพิ่ม แก้ไข ลบ และค้นหาข้อมูลรหัสทรัพย์สิน (Asset Tag), Serial Number, รุ่นเครื่อง และสถานะอุปกรณ์
- **สแกนและพิมพ์รหัส QR Code:** ระบบสามารถสร้าง QR Code สำหรับอุปกรณ์แต่ละชิ้นโดยเฉพาะ เพื่อการสแกนด้วยเครื่องสแกนปืนหรือกล้องเว็บแคมเพื่อตรวจสอบสถานะ
- **บันทึกประวัติยืม-คืนทั้งหมด (Transactions Log):** แสดงข้อมูลวันที่ยืม-คืน ชื่อผู้ยืม และที่สำคัญคือบันทึกชื่อผู้เขียนประวัติรายการ (ผู้บันทึกยืม/ผู้รับคืน) แบบอัตโนมัติ

---

### 📱 หน้าผู้ใช้งานทั่วไป (Employee Portal - `user.html`)
- **รายการเครื่องพร้อมยืม:** พนักงานสามารถค้นหาและตรวจสอบเครื่องคอมพิวเตอร์ (สถานะ Available และประเภทการใช้งานแบบ Rental) ที่ว่างอยู่ได้ด้วยตัวเอง
- **กรอกฟอร์มขอยืมสะดวกรวดเร็ว:** หน้าจอแสดงข้อมูลอุปกรณ์ที่ถูกเลือกอย่างชัดเจน พนักงานระบุข้อมูลส่วนตัว วันที่ขอยืม กำหนดส่งคืน และวัตถุประสงค์
- **บันทึกชื่อผู้ทำรายการยืมโดยตรง:** เมื่อทำรายการขอยืมเครื่องสำเร็จ ระบบจะนำ ID ของผู้ใช้ที่ล็อกอิน ณ ขณะนั้นไปบันทึกเป็นผู้บันทึกยืมลงในประวัติของหน้าผู้ดูแลระบบทันที

---

## 2. แผนภาพสถาปัตยกรรมระบบ (Architecture Diagram)

แผนภาพนี้แสดงโครงสร้างและความเชื่อมโยงของระบบคอมโพเนนต์ต่าง ๆ ตั้งแต่หน้าบ้าน (Frontend) ไปจนถึงเซิร์ฟเวอร์หลังบ้าน (Backend Server), ฐานข้อมูล (SQLite), และเซิร์ฟเวอร์ยืนยันตัวตน (Active Directory)

```mermaid
graph TD
    Client["💻 Client / Web Browser<br>(HTML5, CSS3, JavaScript)"]
    
    subgraph Backend_Server ["⚙️ Express Backend Server (Node.js)"]
        Server["🖥️ Server Logic<br>(server.js)"]
        AuthSystem["🔒 Session & Auth Manager<br>(express-session)"]
        DBQuery["💾 Database Handler<br>(db.js)"]
    end
    
    DB[("📁 SQLite Database<br>(database.sqlite)")]
    AD["🌐 Active Directory Server<br>(ahdomain.aapico.com)"]

    Client -->|HTTP REST APIs / JSON| Server
    Server --> AuthSystem
    Server --> DBQuery
    DBQuery -->|SQL Queries| DB
    AuthSystem -->|LDAP Protocol / Port 389| AD
```

---

## 3. แผนภาพลำดับการทำงานของระบบ (System Flowchart)

แผนภาพแสดงขั้นตอนการทำงานของแอปพลิเคชัน ตั้งแต่การล็อกอินเข้าสู่ระบบ การตรวจสอบสิทธิ์ (Role) และแยกการทำงานตามสิทธิ์ของผู้ใช้งาน

```mermaid
flowchart TD
    Start([🏁 เริ่มต้น]) --> Login["🔑 หน้าล็อกอิน (login.html)"]
    Login --> Input["✍️ กรอก Username & Password"]
    Input --> AuthCheck{"🔒 ตรวจสอบสิทธิ์ผู้ใช้"}
    
    AuthCheck -->|ไม่ถูกต้อง| ShowError["❌ แสดงข้อความแจ้งเตือนข้อผิดพลาด"] --> Input
    AuthCheck -->|ถูกต้อง| CreateSession["💾 สร้าง Session ของผู้ใช้"]
    
    CreateSession --> CheckRole{"👥 ตรวจสอบสิทธิ์ (Role)"}
    
    CheckRole -->|Admin / เจ้าหน้าที่ไอที| GoToAdmin["📂 ไปที่หน้าจัดการหลัก (index.html)"]
    CheckRole -->|User / พนักงานทั่วไป| GoToUser["📂 ไปที่หน้าจองยืมเครื่อง (user.html)"]
    
    GoToAdmin --> AdminActions["🛠️ การทำงานของ Admin<br>- ลงทะเบียน/แก้ไขข้อมูลเครื่องคอมพิวเตอร์<br>- ทำรายการยืม-คืนเครื่องให้พนักงาน<br>- สแกน / พิมพ์ QR Code ของเครื่อง<br>- ดูประวัติการทำรายการยืม-คืนทั้งหมด"]
    GoToUser --> UserActions["📝 การทำงานของ User<br>- ค้นหา/เลือกเครื่องคอมพิวเตอร์ที่ว่างในระบบ<br>- กรอกฟอร์มและบันทึกขอยืมเครื่องด้วยตนเอง<br>- ดูสถานะการยืมอุปกรณ์สำเร็จ"]
    
    AdminActions --> End([🏁 จบการทำงาน])
    UserActions --> End
```

---

## 4. แผนภาพแสดงลำดับเหตุการณ์การยืมอุปกรณ์ (Sequence Diagram)

ลำดับขั้นตอนและกระบวนการส่งข้อมูลเมื่อพนักงานทั่วไปทำรายการ "ขอยืมเครื่องคอมพิวเตอร์ชั่วคราว" ผ่านหน้าเว็บแอปพลิเคชัน

```mermaid
sequenceDiagram
    autonumber
    actor User as ผู้ใช้งานทั่วไป (Employee)
    participant Client as Frontend (user.html)
    participant Server as Backend (server.js)
    participant DB as SQLite DB (database.sqlite)

    User->>Client: ค้นหาและเลือกเครื่องที่ต้องการยืม (Available)
    Client->>User: แสดงฟอร์มการยืม (วันที่ส่งคืน, วัตถุประสงค์)
    User->>Client: กรอกข้อมูลครบถ้วนและกด "ยืนยันการขอยืมเครื่อง"
    
    Client->>Server: HTTP POST /api/borrow (ข้อมูลฟอร์มยืม)
    Note over Server: ตรวจสอบความถูกต้องและสิทธิ์ผู้ใช้งานจาก Session<br>(ดึง User ID ที่ล็อกอินปัจจุบันมาบันทึก)
    
    Server->>DB: เริ่มต้นรายการธุรกรรม (BEGIN TRANSACTION)
    
    Server->>DB: ตรวจสอบ/สร้างข้อมูลผู้ยืม (borrowers)
    DB-->>Server: ส่งรหัสผู้ยืมกลับมา
    
    Server->>DB: บันทึกข้อมูลการยืมลงประวัติ (transactions)
    Note over Server: บันทึกข้อมูลอุปกรณ์, ผู้ยืม และ ID ผู้ใช้งานปัจจุบัน (borrow_by_staff_id)
    
    Server->>DB: อัปเดตสถานะเครื่องในคลังเป็น 'Rented' (assets)
    
    Server->>DB: สิ้นสุดรายการธุรกรรมสำเร็จ (COMMIT)
    DB-->>Server: ยืนยันการบันทึกข้อมูลเรียบร้อย
    
    Server-->>Client: HTTP Status 200 (บันทึกข้อมูลสำเร็จ)
    Client->>User: แสดงผลสรุปรายการทำรายการยืมสำเร็จ
```

---

## 5. โครงสร้างฐานข้อมูล (Database Schema)

ระบบใช้งานฐานข้อมูลแบบเชิงสัมพันธ์ (Relational Database) ด้วย SQLite3 ประกอบด้วยตารางข้อมูลสำคัญ 4 ตารางดังนี้:

### 1️⃣ ตารางอุปกรณ์คลัง (assets)
เก็บข้อมูลรายละเอียดของเครื่องคอมพิวเตอร์และอุปกรณ์ไอทีทั้งหมดในระบบ
- `id` (TEXT, Primary Key): รหัสเฉพาะของอุปกรณ์ไอที
- `asset_tag` (TEXT, Unique): รหัสทรัพย์สินไอที (เช่น IT-ASSET-0001)
- `serial_number` (TEXT, Unique): หมายเลขซีเรียลนัมเบอร์ของอุปกรณ์
- `model_name` (TEXT): รุ่นและรายละเอียดของคอมพิวเตอร์
- `category` (TEXT): ประเภทของอุปกรณ์ เช่น Laptop, Desktop
- `usage_type` (TEXT): รูปแบบการใช้งาน เช่น Rental (ยืมชั่วคราว), Deployment (จ่ายถาวร)
- `status` (TEXT): สถานะปัจจุบัน เช่น Available, Rented, Assigned, Maintenance

### 2️⃣ ตารางผู้ใช้งานระบบ (users)
เก็บข้อมูลเจ้าหน้าที่ไอทีหรือพนักงานที่ล็อกอินเข้าสู่ระบบ (ทั้งจาก AD และ Local)
- `id` (TEXT, Primary Key): รหัสผู้ใช้งานระบบ
- `username` (TEXT, Unique): ชื่อผู้ใช้สำหรับล็อกอิน
- `full_name` (TEXT): ชื่อ-นามสกุลจริง
- `email` (TEXT): ที่อยู่อีเมล
- `role` (TEXT): สิทธิ์การเข้าใช้งานระบบ เช่น Admin, User
- `is_active` (INTEGER): สถานะการเปิดใช้งานบัญชี (1 = ใช้งานปกติ)

### 3️⃣ ตารางพนักงานผู้ขอยืม (borrowers)
เก็บข้อมูลส่วนบุคคลของพนักงานทั่วไปที่มีการทำรายการยืมอุปกรณ์ไอที
- `id` (TEXT, Primary Key): รหัสผู้ยืม
- `employee_id` (TEXT, Unique): รหัสพนักงานขององค์กร
- `full_name` (TEXT): ชื่อ-นามสกุลจริงของพนักงาน
- `department` (TEXT): แผนก/ฝ่ายสังกัด
- `contact_number` (TEXT): เบอร์โทรศัพท์ติดต่อ

### 4️⃣ ตารางประวัติการทำรายการยืม-คืน (transactions)
เก็บข้อมูลประวัติการทำรายการทุกประเภท เชื่อมโยงอุปกรณ์ ผู้ยืม และเจ้าหน้าที่บันทึกข้อมูล
- `id` (TEXT, Primary Key): รหัสประวัติรายการ
- `asset_id` (TEXT, Foreign Key): เชื่อมโยงไปยังตาราง `assets`
- `borrower_id` (TEXT, Foreign Key): เชื่อมโยงไปยังตาราง `borrowers`
- `borrow_by_staff_id` (TEXT, Foreign Key): เชื่อมโยงไปยังตาราง `users` เพื่อระบุผู้บันทึกการจ่ายยืมเครื่อง
- `borrow_date` (TEXT): วันเวลาที่มีการจ่ายยืมเครื่อง
- `expected_return_date` (TEXT): กำหนดวันที่พนักงานต้องนำเครื่องมาส่งคืน
- `borrow_purpose` (TEXT): เหตุผลและวัตถุประสงค์ในการยืมเครื่องคอมพิวเตอร์
- `return_by_staff_id` (TEXT, Foreign Key): เชื่อมโยงไปยังตาราง `users` เพื่อระบุผู้ตรวจรับคืนเครื่อง
- `return_date` (TEXT): วันเวลาที่มีการทำรายการส่งคืนอุปกรณ์กลับคลัง
- `asset_condition_after` (TEXT): สภาพเครื่องขณะส่งคืน เช่น Normal (ปกติ), Damaged (ชำรุดส่งซ่อม)
- `remarks` (TEXT): หมายเหตุและรายละเอียดเพิ่มเติมในการรับคืน

---

## 6. เปรียบเทียบ Workflow: ระบบเดิม vs. IT Asset Hub

ส่วนนี้แสดงการเปรียบเทียบขั้นตอนการร้องขอยืมอุปกรณ์ IT ชั่วคราวระหว่าง **ระบบเดิม** ที่ใช้ Microsoft Form + SharePoint กับ **ระบบใหม่ IT Asset Hub** ที่พัฒนาขึ้น

---

### 🔴 ระบบเดิม — Microsoft Form + SharePoint + Email

ผู้ใช้งานต้องผ่านขั้นตอนหลายทอดโดยอาศัยเครื่องมือภายนอกหลายตัว และการแจ้งเตือนเป็นแบบ Manual ผ่านอีเมล

```mermaid
flowchart TD
    A([👤 พนักงานต้องการยืมอุปกรณ์ IT]) --> B["📧 ได้รับลิงก์ Microsoft Form\nจากเจ้าหน้าที่ IT หรือช่องทางสื่อสาร"]
    B --> C["📝 กรอกข้อมูลใน Microsoft Form\n- ชื่อ-นามสกุล\n- แผนก / รหัสพนักงาน\n- ประเภทอุปกรณ์ที่ต้องการ\n- วันที่ต้องการ / วัตถุประสงค์"]
    C --> D["☁️ ข้อมูลถูกบันทึกลง SharePoint List\nโดยอัตโนมัติ"]
    D --> E["⚙️ Power Automate / Logic Flow\nดึงข้อมูล GET จาก SharePoint"]
    E --> F["📨 ส่งอีเมลแจ้งเตือนไปยัง\nกล่องจดหมายแผนก IT\nระบุชื่อผู้ร้องขอ + รายละเอียด"]
    F --> G{"📬 เจ้าหน้าที่ IT อ่านอีเมล\nและตรวจสอบคำร้อง"}
    G -->|"✅ อนุมัติ"| H["📞 ติดต่อพนักงานผ่านช่องทางอื่น\n(โทร / แชท / อีเมลตอบกลับ)"]
    G -->|"❌ ปฏิเสธ / ข้อมูลไม่ครบ"| I["📞 ติดต่อพนักงานเพื่อขอข้อมูลเพิ่มเติม"]
    H --> J["🖊️ เจ้าหน้าที่บันทึกข้อมูลการยืม\nในระบบ / Excel ด้วยตนเอง"]
    J --> K([✅ จ่ายอุปกรณ์ให้พนักงาน])

    style A fill:#c0392b,color:#fff,stroke:#922b21
    style B fill:#e74c3c,color:#fff,stroke:#c0392b
    style C fill:#e74c3c,color:#fff,stroke:#c0392b
    style D fill:#e67e22,color:#fff,stroke:#ca6f1e
    style E fill:#e67e22,color:#fff,stroke:#ca6f1e
    style F fill:#e67e22,color:#fff,stroke:#ca6f1e
    style G fill:#f39c12,color:#fff,stroke:#d68910
    style H fill:#f39c12,color:#fff,stroke:#d68910
    style I fill:#f39c12,color:#fff,stroke:#d68910
    style J fill:#e74c3c,color:#fff,stroke:#c0392b
    style K fill:#922b21,color:#fff,stroke:#7b241c
```

> **ปัญหาของระบบเดิม:**
> - ❌ ไม่มีการตรวจสอบว่าอุปกรณ์ว่างจริงหรือไม่ก่อนกรอกฟอร์ม
> - ❌ กระบวนการใช้หลายเครื่องมือ (Form → SharePoint → Email) ทำให้ข้อมูลกระจัดกระจาย
> - ❌ เจ้าหน้าที่ต้องบันทึกข้อมูลซ้ำด้วยมือในระบบแยกต่างหาก
> - ❌ ไม่มีประวัติการยืม-คืนแบบรวมศูนย์ที่ติดตามได้แบบเรียลไทม์
> - ❌ ความล่าช้าจากการสื่อสารหลายทอด (อีเมล → โทรหา → บันทึก)

---

### 🟢 ระบบใหม่ — IT Asset Hub (Web Application)

ผู้ใช้งานทุกบทบาทเข้าใช้งานผ่านเว็บแอปพลิเคชันเดียว มีระบบสิทธิ์ ข้อมูลถูกบันทึกทันที และมีประวัติรวมศูนย์

```mermaid
flowchart TD
    A([👤 พนักงานต้องการยืมอุปกรณ์ IT]) --> B["🌐 เข้าสู่ระบบ IT Asset Hub\nผ่าน Web Browser\n(ล็อกอินด้วย AD Account)"]
    B --> C["🔍 ค้นหาและเลือกอุปกรณ์\nที่พร้อมให้ยืม (สถานะ Available)\nจากรายการในระบบแบบเรียลไทม์"]
    C --> D["📝 กรอกฟอร์มขอยืมในระบบ\n- วันที่ต้องการ / กำหนดคืน\n- วัตถุประสงค์การยืม\n(ข้อมูลผู้ยืมดึงจาก AD อัตโนมัติ)"]
    D --> E["🖱️ กดยืนยันการขอยืมเครื่อง"]
    E --> F["⚡ ระบบประมวลผลทันที\n- ตรวจสอบสิทธิ์จาก Session\n- บันทึก Transaction ลง SQLite DB\n- อัปเดตสถานะอุปกรณ์เป็น Rented"]
    F --> G["📊 ประวัติรายการปรากฏใน\nAdmin Dashboard ทันที\n(มองเห็นได้แบบเรียลไทม์)"]
    G --> H{"🖥️ เจ้าหน้าที่ IT ตรวจสอบ\nผ่าน Admin Dashboard"}
    H -->|"✅ รายการสมบูรณ์"| I["📦 จ่ายอุปกรณ์ให้พนักงาน\nพร้อมสแกน QR Code ยืนยัน"]
    H -->|"🔄 ต้องการข้อมูลเพิ่ม"| J["💬 ติดต่อพนักงานโดยตรง"]
    I --> K["📋 บันทึกประวัติการยืม-คืน\nในระบบโดยอัตโนมัติ\n(ชื่อผู้ยืม, เจ้าหน้าที่ผู้จ่าย, วันที่)"]
    K --> L([✅ จ่ายอุปกรณ์เสร็จสิ้น\nมีประวัติครบถ้วนในระบบ])

    style A fill:#1a5276,color:#fff,stroke:#154360
    style B fill:#1f618d,color:#fff,stroke:#1a5276
    style C fill:#2874a6,color:#fff,stroke:#1f618d
    style D fill:#2e86c1,color:#fff,stroke:#2874a6
    style E fill:#2e86c1,color:#fff,stroke:#2874a6
    style F fill:#27ae60,color:#fff,stroke:#1e8449
    style G fill:#27ae60,color:#fff,stroke:#1e8449
    style H fill:#229954,color:#fff,stroke:#1e8449
    style I fill:#1e8449,color:#fff,stroke:#196f3d
    style J fill:#f39c12,color:#fff,stroke:#d68910
    style K fill:#1e8449,color:#fff,stroke:#196f3d
    style L fill:#196f3d,color:#fff,stroke:#145a32
```

> **ข้อดีของระบบใหม่:**
> - ✅ พนักงานเห็นสถานะอุปกรณ์แบบเรียลไทม์ก่อนทำรายการ
> - ✅ ระบบเดียวครบจบ: ล็อกอิน → เลือกอุปกรณ์ → กรอกฟอร์ม → บันทึก
> - ✅ ข้อมูลผู้ยืมดึงมาจาก Active Directory อัตโนมัติ ลดการกรอกข้อมูลซ้ำ
> - ✅ ประวัติการยืม-คืนเก็บรวมศูนย์ใน Database สามารถตรวจสอบย้อนหลังได้ทุกเวลา
> - ✅ Admin เห็นรายการใหม่ใน Dashboard ทันทีโดยไม่ต้องรอรับอีเมล

---

### 📊 ตารางเปรียบเทียบสรุป

| หัวข้อ | 🔴 ระบบเดิม (Form + SharePoint) | 🟢 ระบบใหม่ (IT Asset Hub) |
|---|---|---|
| **จุดเริ่มต้นของผู้ใช้** | ได้รับลิงก์ Form จากเจ้าหน้าที่ | เข้าเว็บแอปและล็อกอินได้เลย |
| **การตรวจสอบอุปกรณ์ว่าง** | ❌ ไม่มี (ต้องถามเจ้าหน้าที่) | ✅ เห็นแบบเรียลไทม์ในระบบ |
| **การกรอกข้อมูล** | Microsoft Form (ภายนอก) | ฟอร์มในเว็บแอป (ดึง AD อัตโนมัติ) |
| **การบันทึกข้อมูล** | SharePoint List | SQLite Database (รวมศูนย์) |
| **การแจ้งเตือนเจ้าหน้าที่** | อีเมลแผนก (ล่าช้า) | Dashboard เรียลไทม์ (ทันที) |
| **ประวัติการยืม-คืน** | ❌ กระจัดกระจาย / Manual | ✅ รวมศูนย์ / อัตโนมัติ |
| **จำนวนเครื่องมือที่ใช้** | 3+ ระบบ (Form, SharePoint, Email) | 1 ระบบ (IT Asset Hub) |
| **ความซับซ้อนในการดูแล** | สูง (หลาย Platform) | ต่ำ (ระบบเดียวบน Node.js) |
