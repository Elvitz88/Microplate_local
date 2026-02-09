# Microplate AI System Architecture

## 1. Overall System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Machine"]
        Browser["Browser<br/>dev-labexam.betagro.com"]
        Device["Device Service<br/>localhost:6407"]
        Camera["Basler Camera"]

        Browser <--> Device
        Device <--> Camera
    end

    subgraph Cloud["Kubernetes Cluster (dev namespace)"]
        subgraph Ingress["Ingress (nginx-private)"]
            ING["dev-labexam.betagro.com<br/>TLS: star-betagro-com"]
        end

        subgraph Frontend["Frontend"]
            FE["btg-labware-fe<br/>:80"]
        end

        subgraph Backend["Backend Services"]
            AUTH["Auth Service<br/>:6401"]
            IMG["Image Ingestion<br/>:6402"]
            VIS["Vision API<br/>:6403"]
            RES["Result API<br/>:6404"]
            LAB["Labware Interface<br/>:6405"]
            PRED["Prediction DB<br/>:6406"]
        end

        subgraph Workers["Vision Workers"]
            W1["Worker 1"]
            W2["Worker 2"]
            W3["Worker 3"]
            W4["Worker 4"]
            W5["Worker 5"]
        end

        subgraph Infrastructure["Infrastructure"]
            RMQ["RabbitMQ<br/>:5672"]
            PG["PostgreSQL"]
            PVC["PVC Storage<br/>10Gi"]
        end
    end

    Browser -->|HTTPS| ING
    ING --> FE
    ING -->|/api/v1/auth| AUTH
    ING -->|/api/v1/ingestion| IMG
    ING -->|/api/v1/vision| VIS
    ING -->|/api/v1/result| RES
    ING -->|/api/v1/interface| LAB
    ING -->|/api/v1/prediction| PRED

    VIS --> RMQ
    RMQ --> W1 & W2 & W3 & W4 & W5

    IMG --> PVC
    W1 & W2 & W3 & W4 & W5 --> PVC

    AUTH & IMG & RES & LAB & PRED --> PG
    W1 & W2 & W3 & W4 & W5 --> PRED
```

## 2. Service Details

```mermaid
flowchart LR
    subgraph Services["Cloud Services"]
        FE["Frontend<br/>React/TypeScript<br/>:80"]
        AUTH["Auth Service<br/>Node.js/Express<br/>:6401"]
        IMG["Image Ingestion<br/>Node.js/Express<br/>:6402"]
        VIS["Vision API<br/>Python/FastAPI<br/>:6403"]
        RES["Result API<br/>Node.js/Express<br/>:6404"]
        LAB["Labware Interface<br/>Node.js/Express<br/>:6405"]
        PRED["Prediction DB<br/>Node.js/Express<br/>:6406"]
        WORK["Vision Workers x5<br/>Python<br/>YOLO Model"]
    end

    subgraph Local["Client Local"]
        DEV["Device Service<br/>Python/FastAPI<br/>:6407"]
    end

    subgraph Infra["Infrastructure"]
        PG["PostgreSQL<br/>:5432"]
        RMQ["RabbitMQ<br/>:5672 / :15672"]
        PVC["PVC Storage<br/>ReadWriteOnce<br/>10Gi"]
    end
```

## 3. Database Schema

```mermaid
erDiagram
    USER ||--o{ PREDICTION_RUN : creates
    PREDICTION_RUN ||--o{ PREDICTION_WELL : contains
    PREDICTION_RUN ||--o{ PREDICTION_ROW_COUNT : has

    USER {
        int id PK
        string email
        string password_hash
        string role
        datetime created_at
    }

    PREDICTION_RUN {
        int id PK
        int user_id FK
        string sample_no
        string submission_no
        string description
        string status
        string image_path
        string annotated_image_path
        json grid_metadata
        datetime created_at
        datetime completed_at
    }

    PREDICTION_WELL {
        int id PK
        int run_id FK
        int row_index
        int col_index
        int colony_count
        json bounding_boxes
    }

    PREDICTION_ROW_COUNT {
        int id PK
        int run_id FK
        int row_index
        int total_count
    }
```

## 4. Image Upload & Prediction Flow

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant D as Device<br/>(localhost:6407)
    participant V as Vision API<br/>(:6403)
    participant I as Image Ingestion<br/>(:6402)
    participant P as Prediction DB<br/>(:6406)
    participant Q as RabbitMQ
    participant W as Vision Worker
    participant PVC as PVC Storage

    Note over B,D: Option A: Capture from Camera
    B->>D: GET /api/v1/capture/image
    D->>D: Capture from Basler
    D-->>B: Return image blob

    Note over B,V: Option B: Upload file directly

    B->>V: POST /api/v1/vision/predict<br/>{image, sampleNo, submissionNo}

    V->>I: POST /api/v1/ingestion/upload<br/>{image file}
    I->>PVC: Save original image<br/>/images/{sampleNo}/...
    I-->>V: Return image_path

    V->>P: POST /api/v1/prediction<br/>{status: pending, image_path}
    P-->>V: Return run_id

    V->>Q: Publish job<br/>{run_id, image_path}
    V-->>B: HTTP 202<br/>{run_id, status: pending}

    Note over B,W: Async Processing

    Q->>W: Consume job
    W->>P: Update status: processing
    W->>PVC: Read original image

    W->>W: YOLO Detection
    W->>W: Grid Calibration
    W->>W: Count Colonies
    W->>W: Draw Annotations

    W->>PVC: Save annotated image<br/>/annotated-images/{sampleNo}/...
    W->>P: Update results<br/>{status: completed, wells, counts}
    W->>Q: ACK message

    Note over B,P: Polling for Result

    loop Every 2 seconds
        B->>P: GET /api/v1/prediction/{run_id}
        P-->>B: {status, wells, annotated_url}
    end
```

## 5. PVC Storage Structure

```mermaid
flowchart TB
    subgraph PVC["PVC: pvc-labware-dev (10Gi)"]
        subgraph images["📁 /mnt/storage/images"]
            img1["📁 sp001/"]
            img2["📁 sp002/"]
            img1_file["📄 sp001_20260201_abc.jpg"]
            img2_file["📄 sp002_20260201_def.jpg"]
        end

        subgraph annotated["📁 /mnt/storage/annotated-images"]
            ann1["📁 sp001/"]
            ann2["📁 sp002/"]
            ann1_file["📄 sp001_20260201_abc_annotated.jpg"]
            ann2_file["📄 sp002_20260201_def_annotated.jpg"]
        end

        subgraph exports["📁 /mnt/storage/labware-exports"]
            exp1["📁 sp001/"]
            exp1_file["📄 sp001_results.csv"]
        end
    end

    IMG["Image Ingestion<br/>mount: /app/data"] -->|write| images
    WORK["Vision Workers<br/>mount: /mnt/storage"] -->|read| images
    WORK -->|write| annotated
    LAB["Labware Interface<br/>mount: /mnt/storage"] -->|write| exports
```

## 6. Worker Processing Flow

```mermaid
flowchart TB
    subgraph Queue["RabbitMQ Queue: vision-inference"]
        J1["Job 1"]
        J2["Job 2"]
        J3["Job 3"]
        J4["Job 4"]
        J5["Job 5"]
        J6["..."]
    end

    subgraph Workers["Vision Workers (5 replicas)"]
        W1["Worker 1<br/>prefetch: 2"]
        W2["Worker 2<br/>prefetch: 2"]
        W3["Worker 3<br/>prefetch: 2"]
        W4["Worker 4<br/>prefetch: 2"]
        W5["Worker 5<br/>prefetch: 2"]
    end

    J1 --> W1
    J2 --> W2
    J3 --> W3
    J4 --> W4
    J5 --> W5

    subgraph Processing["Processing Steps"]
        S1["1. Read image from PVC"]
        S2["2. YOLO Object Detection"]
        S3["3. Grid Calibration"]
        S4["4. Colony Counting"]
        S5["5. Draw Annotations"]
        S6["6. Save to PVC"]
        S7["7. Update DB"]

        S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7
    end

    W1 & W2 & W3 & W4 & W5 --> Processing
```

## 7. Status State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Job Created
    pending --> processing: Worker Picks Up
    processing --> completed: Success
    processing --> failed: Error
    completed --> [*]
    failed --> [*]

    note right of pending
        - Job in RabbitMQ queue
        - Waiting for worker
    end note

    note right of processing
        - Worker processing
        - YOLO detection running
    end note

    note right of completed
        - Results saved
        - Annotated image ready
    end note

    note right of failed
        - Error occurred
        - Check logs
    end note
```

## 8. Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant A as Auth Service
    participant AAD as Azure AD
    participant DB as PostgreSQL

    Note over B,AAD: Azure AD SSO Login
    B->>A: GET /api/v1/auth/login/aad
    A->>AAD: Redirect to Microsoft Login
    AAD->>AAD: User authenticates
    AAD->>A: Callback with auth code
    A->>AAD: Exchange code for tokens
    AAD-->>A: Access token + ID token
    A->>DB: Find/Create user
    A->>A: Generate JWT tokens
    A-->>B: Set cookies<br/>(access_token, refresh_token)

    Note over B,A: Subsequent API Calls
    B->>A: API Request + JWT Cookie
    A->>A: Verify JWT
    A-->>B: Response

    Note over B,A: Token Refresh
    B->>A: POST /api/v1/auth/refresh
    A->>A: Verify refresh token
    A-->>B: New access token
```

## 9. Deployment Architecture

```mermaid
flowchart TB
    subgraph AKS["Azure Kubernetes Service"]
        subgraph Node1["Node 1 (with PVC)"]
            IMG_POD["Image Ingestion Pod"]
            W1_POD["Worker Pod 1"]
            W2_POD["Worker Pod 2"]
            W3_POD["Worker Pod 3"]
            W4_POD["Worker Pod 4"]
            W5_POD["Worker Pod 5"]
            PVC_MOUNT["PVC Mount<br/>/mnt/storage"]
        end

        subgraph Node2["Node 2"]
            FE_POD["Frontend Pod"]
            AUTH_POD["Auth Pod"]
            VIS_POD["Vision API Pod"]
            RES_POD["Result API Pod"]
            PRED_POD["Prediction DB Pod"]
            LAB_POD["Labware Pod"]
            RMQ_POD["RabbitMQ Pod"]
        end

        subgraph Managed["Managed Services"]
            PG_SVC["Azure PostgreSQL"]
            ACR["Container Registry"]
        end
    end

    subgraph Client["Client Machines"]
        C1["Client 1<br/>Device + Camera"]
        C2["Client 2<br/>Device + Camera"]
    end

    C1 & C2 -->|HTTPS| Node1 & Node2
    IMG_POD & W1_POD & W2_POD & W3_POD & W4_POD & W5_POD --> PVC_MOUNT
```

## 10. Network Flow

```mermaid
flowchart LR
    subgraph Internet
        USER["User Browser"]
    end

    subgraph Client["Client LAN"]
        DEV["Device Service<br/>:6407"]
        CAM["Basler Camera<br/>169.254.x.x"]
    end

    subgraph Cloud["Azure Cloud"]
        ING["Ingress<br/>dev-labexam.betagro.com"]

        subgraph Services
            FE["Frontend"]
            API["Backend APIs"]
        end
    end

    USER -->|HTTPS :443| ING
    ING --> FE & API
    USER -->|HTTP :6407| DEV
    DEV -->|GigE Vision| CAM

    style USER fill:#e1f5fe
    style DEV fill:#fff3e0
    style ING fill:#e8f5e9
```

---

## Quick Reference

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| Frontend | 80 | React/TypeScript | Web UI |
| Auth | 6401 | Node.js/Express | JWT + Azure AD |
| Image Ingestion | 6402 | Node.js/Express | File storage |
| Vision API | 6403 | Python/FastAPI | AI inference API |
| Result API | 6404 | Node.js/Express | Data aggregation |
| Labware Interface | 6405 | Node.js/Express | CSV export |
| Prediction DB | 6406 | Node.js/Express | Prediction CRUD |
| Device | 6407 | Python/FastAPI | Camera capture (local) |
| RabbitMQ | 5672 | RabbitMQ | Message queue |
| PostgreSQL | 5432 | PostgreSQL | Database |
