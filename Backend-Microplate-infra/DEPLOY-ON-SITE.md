# ลงเครื่องหน้างาน (On-Site Deployment)

คู่มือนี้สำหรับนำ stack Microplate ไปรันบน**เครื่องหน้างาน** (PC / server ที่สถานที่ทำงาน) แบบเดียวกับที่รันบนเครื่องพัฒนาอยู่

---

## สิ่งที่เครื่องหน้างานต้องมี

| รายการ | หมายเหตุ |
|--------|----------|
| **Windows 10/11** (หรือ Linux ถ้ารัน Docker บน Linux ได้) | - |
| **Docker Desktop** (Windows) หรือ **Docker Engine + Docker Compose** (Linux) | [ดาวน์โหลด Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **พื้นที่ดิสก์** | อย่างน้อย ~15–20 GB (images + volumes + โปรเจกต์) |
| **พอร์ตว่าง** | 35432, 5672, 15672, 6401–6406, 6410 (ไม่ให้โปรแกรมอื่นใช้ซ้ำ) |

---

## วิธีที่ 1: เครื่องหน้างานมีเน็ต (แนะนำ)

เหมาะเมื่อเครื่องหน้างานต่ออินเทอร์เน็ตได้ และสามารถ clone หรือ copy โปรเจกต์มาทั้งชุดได้

### ขั้นตอน

**1. นำโปรเจกต์ไปไว้บนเครื่องหน้างาน**

- **แบบ clone (ถ้ามี Git):**
  ```bash
  git clone <url-repo> Microplate_local_latest
  cd Microplate_local_latest
  # ถ้าเป็นหลาย repo ให้ clone แต่ละ repo ไว้ในโฟลเดอร์เดียวกัน
  ```
- **แบบ copy:** copy โฟลเดอร์ทั้งก้อน (เช่น `Microplate_local_latest`) ไปไว้ที่เครื่องหน้างาน ให้โครงสร้างโฟลเดอร์เหมือนเดิม โดยเฉพาะต้องมี:
  - `Backend-Microplate-infra` (มี `docker-compose.apps.yml`, `infra/`, `scripts/`)
  - `Backend-Microplate-auth-service`
  - `Backend-Microplate-image-ingestion-service`
  - `Backend-Microplate-vision-inference-service`
  - `Backend-Microplate-labware-interface-service`
  - `Backend-Microplate-result-api-service`
  - `Backend-Microplate-prediction-db-service`
  - `Frontend`

**2. เปิด Docker Desktop** บนเครื่องหน้างาน ให้แน่ใจว่า Docker รันอยู่

**3. เตรียมสภาพแวดล้อม (ครั้งแรก)**

เปิด PowerShell แล้วรัน:

```powershell
cd D:\Microplate_local_latest\Backend-Microplate-infra\scripts
.\setup-local-docker.ps1
```

(ถ้าโปรเจกต์อยู่ path อื่น ให้ `cd` ไปที่ `Backend-Microplate-infra\scripts` ของ path นั้น)

สคริปต์จะสร้าง network, โฟลเดอร์ `storage`, และไฟล์ `.env` จาก `env.example` ในแต่ละ service (ถ้ายังไม่มี)

**4. รัน stack**

```powershell
cd D:\Microplate_local_latest\Backend-Microplate-infra
docker compose -f docker-compose.apps.yml up -d --build
```

ครั้งแรกจะโหลด base images (postgres, rabbitmq) และ build image ของแต่ละ service ใช้เวลาหลายนาที

**5. ตรวจสอบ**

- เปิดเบราว์เซอร์: **http://localhost:6410** (Frontend)
- RabbitMQ Management: **http://localhost:15672** (user/pass ตามที่ตั้งใน `.env` หรือ default microplate / microplate123)

รายละเอียดเพิ่มเติมดูใน **SETUP-LOCAL-DOCKER.md**

---

## วิธีที่ 2: เครื่องหน้างานไม่มีเน็ต (Offline / Air-gap)

ใช้เมื่อเครื่องหน้างานต่อเน็ตไม่ได้ ต้องเตรียม **images + โปรเจกต์** จากเครื่องที่ build ได้ (เครื่อง dev หรือเครื่องที่ต่อเน็ต) แล้วย้ายไปเครื่องหน้างาน

### ขั้นตอนบนเครื่องที่ build ได้ (เครื่อง dev)

**1. Build และ save images ทั้งหมด**

รันสคริปต์ export (หรือรันคำสั่งด้านล่างเอง):

```powershell
cd D:\Microplate_local_latest\Backend-Microplate-infra
.\scripts\export-images-for-offline.ps1
```

สคริปต์จะ build (ถ้ายังไม่มี image) แล้ว save ทุก image ที่ใช้ใน `docker-compose.apps.yml` ลงเป็นไฟล์ `.tar` ในโฟลเดอร์ `offline-images` (หรือ path ที่กำหนด)

**2. นำไปเครื่องหน้างาน**

- โฟลเดอร์ **โปรเจกต์ทั้งก้อน** (โครงสร้างเหมือนวิธีที่ 1)
- โฟลเดอร์ **`offline-images`** (หรือชื่อที่ใช้ในสคริปต์) ที่มีไฟล์ `.tar` ของทุก image
- ตรวจสอบว่าในแต่ละ Backend-Microplate-* และ Frontend มีไฟล์ **`.env`** (ถ้าไม่มี ให้ copy จาก `env.example` ในโฟลเดอร์นั้น)

### ขั้นตอนบนเครื่องหน้างาน

**1. ติดตั้ง Docker Desktop** (หรือ Docker Engine + Compose) แล้วเปิด Docker

**2. โหลด images จากไฟล์ .tar**

```powershell
cd D:\Microplate_local_latest\Backend-Microplate-infra\offline-images
Get-ChildItem *.tar | ForEach-Object { docker load -i $_.FullName }
```

(หรือไปที่โฟลเดอร์ที่มี `.tar` แล้วรันคำสั่งเดียวกัน)

**3. สร้าง network และโฟลเดอร์ storage**

```powershell
docker network create microplate-network
mkdir D:\Microplate_local_latest\Backend-Microplate-infra\storage
```

(ถ้า path โปรเจกต์ต่างไป ให้ใช้ path จริง)

**4. ตรวจสอบไฟล์ .env**

ให้มีไฟล์ `.env` ใน:

- `Backend-Microplate-infra\.env`
- แต่ละ `Backend-Microplate-auth-service\.env`, `Backend-Microplate-image-ingestion-service\.env`, ฯลฯ

ถ้าไม่มี ให้ copy จาก `env.example` ในโฟลเดอร์นั้นแล้วแก้ค่าตามต้องการ

**5. รัน stack (ไม่ build)**

```powershell
cd D:\Microplate_local_latest\Backend-Microplate-infra
docker compose -f docker-compose.apps.yml up -d
```

ห้ามใส่ `--build` เพราะเครื่องไม่มีเน็ต จะใช้ image ที่ load มาจาก `.tar` เท่านั้น

**6. ตรวจสอบ**

- Frontend: **http://localhost:6410**
- RabbitMQ: **http://localhost:15672**

---

## Checklist ก่อนไปหน้างาน

- [ ] เครื่องหน้างานติดตั้ง Docker แล้ว และเปิด Docker ได้
- [ ] Copy/clone โปรเจกต์ครบ (มี Backend-Microplate-infra + ทุก Backend-Microplate-* + Frontend)
- [ ] ถ้าแบบ offline: build + export images แล้ว copy โฟลเดอร์ `offline-images` ไปด้วย
- [ ] มีไฟล์ `.env` ใน Backend-Microplate-infra และในแต่ละ service (หรือจะสร้างจาก env.example บนเครื่องหน้างาน)
- [ ] พอร์ต 35432, 5672, 15672, 6401–6406, 6410 ไม่ถูกโปรแกรมอื่นใช้

---

## คำสั่งอ้างอิง (เครื่องหน้างาน)

| การทำงาน | คำสั่ง |
|----------|--------|
| เริ่ม stack | `cd Backend-Microplate-infra` แล้ว `docker compose -f docker-compose.apps.yml up -d` (หรือ `--build` ถ้ามีเน็ตและต้องการ build ใหม่) |
| หยุด stack | `docker compose -f docker-compose.apps.yml down` |
| ดู log | `docker compose -f docker-compose.apps.yml logs -f` |
| ดูสถานะ container | `docker compose -f docker-compose.apps.yml ps -a` |

---

## หมายเหตุ

- **ข้อมูลใน DB และไฟล์:** อยู่ในการ์ดหรือ volume ของ Docker (และโฟลเดอร์ `storage` ถ้าใช้ bind mount) ถ้าต้องการ backup ก่อนย้ายเครื่อง ให้ backup volume `postgres_data`, `rabbitmq_data` และโฟลเดอร์ `Backend-Microplate-infra\storage`
- **รหัสผ่าน / secret:** แนะนำให้เปลี่ยนค่าใน `.env` บนเครื่องหน้างาน (POSTGRES_PASSWORD, RABBITMQ_PASS, JWT_ACCESS_SECRET ฯลฯ) ให้เหมาะสมกับสถานที่ใช้งาน
