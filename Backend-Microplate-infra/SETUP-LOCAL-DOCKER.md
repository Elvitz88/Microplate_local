# เตรียมสภาพแวดล้อมและรัน Docker (Local)

ใช้ **`docker-compose.apps.yml`** เป็นไฟล์หลักสำหรับรัน stack ทั้งหมดบนเครื่อง local (รวม Postgres, RabbitMQ และทุก app service)

> **นำไปลงเครื่องหน้างาน:** ดูคู่มือ ** [DEPLOY-ON-SITE.md](DEPLOY-ON-SITE.md) ** สำหรับขั้นตอนลงเครื่องหน้างาน (มีเน็ต / ไม่มีเน็ต)

---

## สรุป Repo และ Services

| Repo | Service ใน Compose | Port | หมายเหตุ |
|------|--------------------|------|----------|
| Backend-Microplate-auth-service | auth-service | 6401 | มี Dockerfile, env.example |
| Backend-Microplate-image-ingestion-service | image-ingestion | 6402 | มี Dockerfile, env.example |
| Backend-Microplate-vision-inference-service | vision-inference-api + workers 1–3 | 6403 | Dockerfile, Dockerfile.worker, env.example |
| Backend-Microplate-labware-interface-service | labware-interface | 6405 | มี Dockerfile, env.example |
| Backend-Microplate-result-api-service | result-api | 6404 | มี Dockerfile, env.example |
| Backend-Microplate-prediction-db-service | prediction-db | 6406 | มี Dockerfile, env.example |
| **Frontend** | **frontend** | **6410** | React + nginx proxy ไป backend |
| (infra) | postgres | 35432→5432 | postgres:17-alpine |
| (infra) | rabbitmq | 5672, 15672 | rabbitmq:3.13-management-alpine |
| (infra) | pvc-retention | - | ลบภาพเก่า 30 วัน (local Docker เท่านั้น; บน cloud ให้ IT จัดการ) |

ทุก repo อยู่ระดับเดียวกับ `Backend-Microplate-infra` (ภายใต้ `Microplate_local_latest`)

---

## ขั้นตอนเตรียมสภาพแวดล้อม (ครั้งแรก)

### 1. รันสคริปต์ Setup (PowerShell)

จากโฟลเดอร์ใดก็ได้ (สคริปต์จะหา path อัตโนมัติ):

```powershell
cd D:\Microplate_local_latest\Backend-Microplate-infra\scripts
.\setup-local-docker.ps1
```

หรือจาก repo root:

```powershell
$env:MICROPLATE_REPO_ROOT = "D:\Microplate_local_latest\Backend-Microplate-infra"
.\scripts\setup-local-docker.ps1
```

สคริปต์จะ:

- สร้าง Docker network **`microplate-network`** (ต้องมีเพราะใน compose ใช้ `external: true`)
- สร้างโฟลเดอร์ **`Backend-Microplate-infra/storage`** สำหรับ bind mount
- สร้าง **`.env`** ใน `Backend-Microplate-infra` จาก `.env.example` (ถ้ายังไม่มี)
- สร้าง **`.env`** ในแต่ละ Backend-Microplate-* จาก `env.example` (หรือ `.env copy.example` ใน vision) ถ้ายังไม่มี

### 2. ตรวจ/แก้ .env แต่ละ Service (ถ้าต้องการ)

- **Auth**: `Backend-Microplate-auth-service/.env`  
  - ใน Docker, `DATABASE_URL` ถูก override เป็น `postgres:5432/microplate_auth` แล้ว
- **Image ingestion**: `Backend-Microplate-image-ingestion-service/.env`  
  - ใน Docker ใช้ host ชื่อ `postgres` (ไม่ใช่ `microplate-postgres`) และ DB ถูก override
- **Vision**: `Backend-Microplate-vision-inference-service/.env`  
  - สำหรับ local อาจตั้ง `PUBLIC_IMAGE_SERVICE_URL=http://localhost:6410` (หรือตาม frontend ที่ใช้)
- **Labware, Result API, Prediction DB**: มี override ใน compose อยู่แล้ว ใช้ค่าจาก env.example ได้
- **Frontend**: `Frontend/.env` ควรใช้ `VITE_*_SERVICE_URL=http://localhost:6410` (ทุก service) เพื่อให้เรียก API ผ่าน same-origin แล้วให้ nginx หรือ webpack proxy ไปยัง backend

---

## รัน Docker (รวม Frontend)

ต้องรันคำสั่งจากโฟลเดอร์ **`Backend-Microplate-infra`** เพราะ path ใน compose เป็นแบบ `../Backend-Microplate-*` และ `./infra/postgres/init`, `./storage`

```powershell
cd D:\Microplate_local_latest\Backend-Microplate-infra
docker compose -f docker-compose.apps.yml up -d
```

 build ใหม่หลังแก้โค้ด:

```powershell
docker compose -f docker-compose.apps.yml up -d --build
```

ดู log:

```powershell
docker compose -f docker-compose.apps.yml logs -f
```

หยุด:

```powershell
docker compose -f docker-compose.apps.yml down
```

**Frontend:** รันรวมอยู่ใน stack แล้ว — เปิดเบราว์เซอร์ที่ **http://localhost:6410**  
ถ้าต้องการรัน Frontend แบบ dev (hot reload) แทนการรันใน Docker:

```powershell
cd D:\Microplate_local_latest\Frontend
yarn install
yarn dev
```

จากนั้นเปิด http://localhost:6410 — webpack dev server จะ proxy ไปยัง backend ที่ 6401–6406 (ต้องมี backend รันอยู่จาก docker-compose ก่อน)

---

## ความต่างระหว่าง docker-compose.apps.yml กับ docker-compose.apps.prod.yml

| หัวข้อ | docker-compose.apps.yml (Local) | docker-compose.apps.prod.yml (Cloud/Production) |
|--------|---------------------------------|--------------------------------------------------|
| **Postgres / RabbitMQ** | มีในไฟล์เดียวกัน (รันในเครื่อง) | **ไม่มี** – คาดว่าใช้ managed DB/broker บน cloud |
| **Network** | `microplate-network` (external) | เหมือนกัน (external) |
| **Storage** | bind mount `./storage` (local) | volume ปกติ (ใน K8s ใช้ PVC) |
| **Env / Secrets** | ค่า default ใน compose, .env ในแต่ละ repo | ใช้ `${JWT_ACCESS_SECRET}`, `${PUBLIC_URL}` เป็นหลัก (จาก env/secret บน cloud) |
| **Healthcheck** | ใช้ `127.0.0.1` | บางที่ใช้ `localhost` (เทียบเท่ากันใน container) |
| **Database URL** | กำหนดชัดใน compose (postgres:5432, DB แยก per service) | prod ไม่มี postgres ในไฟล์; ต้องตั้งจาก env/secret |

สรุป: **ใช้ `docker-compose.apps.yml` สำหรับรันบนเครื่อง local เท่านั้น**  
ถ้า deploy บน cloud ให้ใช้ `docker-compose.apps.prod.yml` หรือ Kubernetes manifests ใน `Manifest/kube/` โดยที่ Postgres/RabbitMQ มาจาก cloud หรือ cluster อื่น

**Storage / Retention:**  
- **Local Docker:** มี service `pvc-retention` ลบภาพเก่ากว่า 30 วันอัตโนมัติ  
- **Cloud:** การลบภาพเก่า / จัดการ storage บน cloud ให้ **IT จัดการ** (ไม่ใช้ pvc-retention จาก compose นี้)

---

## Config ที่เกี่ยวกับ Cloud / Production

- **Manifest/kube/** – Kubernetes (dev/uat/prod) สำหรับ deploy บน cluster  
- **docker-compose.apps.prod.yml** – สำหรับ production Docker (ไม่มี postgres/rabbitmq ในไฟล์)  
- **pipelines/** ในแต่ละ repo – Azure Pipelines (CI/CD)  
- **Backend-Microplate-infra/k8s/** – K8s manifests ของ infra (เช่น storage PVC)

การรันด้วย **docker-compose.apps.yml** ไม่ได้ใช้ config เหล่านี้ โดยตรง แค่ใช้ค่าจาก .env และ compose เท่านั้น

---

## Frontend รันด้วยอะไร? (webpack vs nginx)

| วิธีรัน | ใช้ตัวไหน | อธิบายสั้นๆ |
|--------|------------|-------------|
| **`yarn dev`** (รันบนเครื่อง) | **Webpack** | `webpack serve` เสิร์ฟ React + proxy ไป backend (ตาม `webpack.config.js` devServer.proxy) |
| **Docker** (`frontend` ใน compose) | **Nginx** | Build ด้วย webpack ใน image แล้วใน container ใช้ **nginx** เสิร์ฟไฟล์ static + proxy ไป backend (config: `Frontend/nginx.docker.conf` มount ทับใน container) |

สรุป: **ตอนพัฒนา** = webpack | **ตอนรันใน Docker** = nginx (ทั้งเสิร์ฟหน้าเว็บและ proxy API)

---

## Config เชื่อม Frontend กับ Backend

| รูปแบบ | Frontend เรียก API อย่างไร | หมายเหตุ |
|--------|----------------------------|----------|
| **Docker (frontend ใน compose)** | `http://localhost:6410` (same-origin) | **nginx** ใน container proxy ไป auth-service, image-ingestion, vision-inference-api, result-api, labware-interface, prediction-db ตาม path |
| **yarn dev (Frontend แยก)** | `http://localhost:6410` (same-origin) | **webpack** devServer proxy ไป localhost:6401–6406 ตาม path (/api/v1/auth → 6401, /api/v1/ingestion → 6402, ฯลฯ) |

**Frontend/.env ที่ใช้กับ Docker หรือ yarn dev (backend รันจาก Docker):**

- ตั้ง `VITE_*_SERVICE_URL=http://localhost:6410` ทุกตัว (ค่าปัจจุบัน) — ไม่ต้องเปลี่ยน
- Path prefix ใช้ค่าว่างสำหรับ local

**Backend CORS:** แต่ละ backend service ตั้ง CORS อนุญาต origin เช่น `http://localhost:6410` อยู่แล้ว จึงใช้ได้ทั้งรัน frontend ใน Docker และรัน yarn dev

**SSO (Azure AD) เทส local:**  
- เปิดจาก **http://localhost:6410** (หรือ 127.0.0.1) → `public/config.js` จะตั้งค่า service URLs เป็น **same origin** (localhost) ทำให้ปุ่ม SSO ไปที่ `http://localhost:6410/api/v1/auth/login/aad?...` ไม่ไปที่ cloud  
- ถ้าเทส SSO บนเครื่อง ต้องให้ Azure AD app มี Redirect URI เป็น URL ที่ browser เรียก callback ได้ เช่น `http://localhost:6410/api/v1/auth/login/aad/redirect` หรือ `http://localhost:6401/api/v1/auth/login/aad/redirect`  
- ใน auth service (Backend-Microplate-auth-service) ตั้ง **BASE_URL** ใน `.env` ให้ตรงกับ Redirect URI ที่ลงทะเบียนใน Azure (เช่น `BASE_URL=http://localhost:6410` ถ้าใช้ผ่าน frontend proxy)  
- **รูปโปรไฟล์จาก organization:** แอปดึงรูปจาก Microsoft Graph ตอนล็อกอิน SSO — ต้องมี scope **User.Read** ใน `AAD_SCOPES` (ค่า default มีแล้ว) และใน Azure AD App Registration ต้องเพิ่ม API permission **Microsoft Graph → User.Read (Delegated)** ถ้ายังไม่มี. หลังเพิ่ม permission ให้ user ล็อกอิน SSO ใหม่อีกครั้ง รูปจะถูกดึงมาเก็บใน profile และแสดงในหน้า Profile / Navbar

---

## ดูโหลดแต่ละ container (docker stats)

ใช้ดูว่า container ไหนใช้ CPU / RAM เยอะจริงๆ (ไม่ต้องเดา):

** snapshot ครั้งเดียว (ไม่ real-time):**
```powershell
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.PIDs}}"
```

** แบบ real-time อัปเดตทุก 2 วินาที (กด Ctrl+C ออก):**
```powershell
docker stats
```

** ดูแค่ service ใน stack นี้ (กรองชื่อ microplate):**
```powershell
docker stats --no-stream $(docker ps -q --filter "name=microplate") --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

อ่านผล: **CPU %** สูง = ตัวนั้นกำลังทำงานหนัก, **MEM USAGE** สูง = กิน RAM (เช่น vision worker ตัวละ ~700–800 MiB เพราะโหลดโมเดล). ถ้า **RabbitMQ** แสดง CPU สูงมากตลอด อาจเป็นจุดคอขวดหรือ connection เยอะ — ลอง restart rabbitmq หรือดูที่ Management UI (พอร์ต 15672).

---

## ปัญหาที่พบบ่อย

1. **Network ไม่พบ**  
   ต้องสร้างก่อน: `docker network create microplate-network`  
   หรือรัน `.\scripts\setup-local-docker.ps1`

2. **Volume bind mount ล้มเหลว (Windows)**  
   ให้มีโฟลเดอร์ `Backend-Microplate-infra/storage` (สคริปต์ setup สร้างให้แล้ว)

3. **Service เชื่อม postgres ไม่ได้**  
   รันจาก `Backend-Microplate-infra` และตรวจว่า postgres ขึ้นก่อน (healthcheck) แล้วค่อยขึ้น app อื่น

4. **ไม่มี .env ใน service**  
   รัน `.\scripts\setup-local-docker.ps1` เพื่อ copy จาก env.example

5. **413 Request Entity Too Large** ตอน upload รูปไป `/api/v1/vision/predict`  
   nginx ใน frontend container จำกัดขนาด request — ใน `Frontend/nginx.docker.conf` ตั้ง `client_max_body_size 100m` แล้ว (ทั้ง http, server และ location `/api/v1/vision/`).  
   ถ้าแก้ nginx config แล้ว ให้ **restart เฉพาะ frontend** (config มount เป็น volume ไม่ต้อง build ใหม่):  
   `docker compose -f docker-compose.apps.yml restart frontend`

6. **Prediction ช้า / รอ queue นาน**  
   - **เช็คคิว:** เรียก `GET /api/v1/vision/queue/stats` (ต้องมี token) จะได้ `message_count` (งานค้างในคิว) และ `consumer_count` (จำนวน worker ที่เชื่อมอยู่ ควรเป็น 5).  
   - **สาเหตุที่ช้า:** (1) โมเดล YOLOv12x ใช้ **CPU** หนัก (Docker worker ใช้ CPU-only) — งานหนึ่งอาจใช้เวลา 30s–2 นาที ต่อรูป (2) มี worker 5 ตัว รันงานพร้อมกันได้แค่ 5 งาน ถ้าส่งหลายรูปติดกัน จะเข้าคิว (3) เครื่อง RAM/CPU น้อย — worker แต่ละตัวโหลดโมเดลเต็มตัว ถ้า RAM เต็มจะสลับดิสก์แล้วช้าลง  
   - **ที่ปรับได้:** ใน `docker-compose.apps.yml` แต่ละ vision-inference-worker มี `WORKER_PREFETCH_COUNT=3` แล้ว (ให้ worker ดึงงานถัดไปไว้ล่วงหน้า). ถ้าเครื่องมี CPU แรงและ RAM เพียงพอ อาจเพิ่มจำนวน worker ได้ (คัดลอก block vision-inference-worker-5 แล้วเพิ่ม worker-6 ฯลฯ). ถ้าเครื่องจำกัด ลองลดจำนวน worker เหลือ 2–3 เพื่อลดการแย่ง CPU/RAM.  
   - **RabbitMQ Management:** เปิด http://localhost:15672 (user/pass ตาม .env หรือ microplate / microplate123) ดู Queue `vision-inference` ว่า Ready / Unacked กี่ข้อความ และมี Consumers กี่ตัว  
   - **ดูว่าโหลดหนักที่ container ไหน:** รัน `docker stats --no-stream` (ดูหัวข้อ "ดูโหลดแต่ละ container" ด้านบน). ถ้า **RabbitMQ** CPU สูงมาก (เช่น 30–40%+) อาจเป็นจุดคอขวด — ลอง restart rabbitmq หรือตรวจ connection/management plugin  
   - **ปรับให้รู้สึกไวขึ้น (ทำแล้ว):** Frontend โพล์สถานะทุก **500ms** (เดิม 1s) และส่ง **priority=10** ตอนเรียก predict — งานที่กดจาก UI จะขึ้นไปอยู่หัวคิวและหน้าเว็บอัปเดต "completed" ได้เร็วขึ้นเมื่อ worker ทำเสร็จ  
   - **ตรวจว่า worker ทุกตัวรับงานจากคิวหรือไม่:** ถ้ามีงาน **1 ชิ้น** RabbitMQ จะส่งให้ consumer ตัวใดตัวหนึ่งเท่านั้น จึงเห็นแค่ worker เดียว (เช่น worker-1) CPU สูง — ไม่ได้แปลว่า worker 2–5 ไม่รับงาน. วิธีเช็ค: (1) ดู **consumer_count** ควรเป็น **5** — เรียก `GET /api/v1/vision/queue/stats` (ใส่ Bearer token) หรือเปิด RabbitMQ Management http://localhost:15672 → Queues → `vision-inference` → ดูจำนวน Consumers (2) ดู log แต่ละ worker ว่าเคยมี "Received job" หรือไม่ เช่น `docker compose -f docker-compose.apps.yml logs --tail=100 vision-inference-worker-2` (3) ทดสอบ: ส่ง **predict 5 รูปติดกัน** แล้วรัน `docker stats --no-stream` — ควรเห็น worker หลายตัว CPU สูงพร้อมกัน (หรือสลับกันเมื่องานจบและรับงานถัดไป)

---

## ปรับให้กด Predict แล้วรู้สึกได้ผลกลับมาไวขึ้น (เช็คเบื้องต้น)

| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| **Frontend โพล์** | ปรับแล้ว | `Frontend/src/services/image.service.ts`: `POLL_INTERVAL_MS = 500` (เดิม 1 วินาที) — อัปเดตสถานะบ่อยขึ้น จึงเห็น "completed" เร็วขึ้น |
| **Priority คิว** | ปรับแล้ว | ส่ง `priority=10` ตอนเรียก `/api/v1/vision/predict` (ทั้ง upload path และ path จาก image_path) — RabbitMQ queue ใช้ x-max-priority=10 ทำให้งานที่กดจาก UI ไปอยู่หัวคิว ไม่ต้องรองานเก่าที่ priority ต่ำกว่า |
| **Worker / Inference** | ขึ้นกับ CPU | โหลดหนักอยู่ที่ vision-worker ตอนรัน YOLO (ดูจาก `docker stats`). เร็วขึ้นจริงๆ ต้องใช้ GPU หรือลดขนาดโมเดล |
| **Vision API ก่อนเข้าคิว** | ตรวจแล้ว | flow: รับไฟล์ → อัปโหลดไป image-ingestion → สร้าง run ใน prediction-db → publish ไป RabbitMQ → คืน 202. ไม่มีขั้นตอนที่ปรับ delay ได้ง่าย |

ถ้ายังรู้สึกช้าอยู่: ดู `docker stats` ตอนกด predict ว่า worker ตัวไหน CPU ขึ้น (แปลว่างานเข้า worker แล้ว) และใช้เวลาประมาณกี่วินาทีถึงจะ completed — ถ้านานมาก แปลว่าติดที่ inference ต่อรูป ต้องดูที่โมเดล/CPU/GPU.

---

## อ้างอิง

- **DOCKER-COMPOSE-GUIDE.md** – รายละเอียด storage และ volume  
- **docs/14-Service-Port-Allocation.md** – พอร์ตและ service  
- **docs/16-Troubleshooting-Guide.md** – แก้ปัญหาเพิ่มเติม
