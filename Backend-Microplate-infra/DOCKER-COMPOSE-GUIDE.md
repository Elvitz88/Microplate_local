# Docker Compose Guide - Storage Configuration

This guide explains how to configure storage for both local development and production environments with PVC support.

## Overview

The project has two docker-compose configurations for application services:

1. **`docker-compose.apps.yml`** - For local development with bind mount storage
2. **`docker-compose.apps.prod.yml`** - For production with PVC support

## Local Development (Bind Mount)

### Configuration
- Uses bind mount to `./storage` directory
- Files are stored locally on your machine
- Easy access to files for debugging

### Usage

**Prepare environment (first time):**  
See **SETUP-LOCAL-DOCKER.md** and run `scripts/setup-local-docker.ps1` to create the Docker network, `./storage`, and per-service `.env` files.

**Start services:**  
`docker-compose.apps.yml` includes Postgres and RabbitMQ; no separate infra file is required.

```bash
cd Backend-Microplate-infra
docker compose -f docker-compose.apps.yml up -d
```

**Stop services:**
```bash
cd Backend-Microplate-infra
docker compose -f docker-compose.apps.yml down
```

**View logs:**
```bash
cd Backend-Microplate-infra
docker compose -f docker-compose.apps.yml logs -f
```

### Storage Location
Files are stored in: `Backend-Microplate-infra/storage/`

**Retention (local Docker only):** The `pvc-retention` service in `docker-compose.apps.yml` deletes images older than 30 days. On cloud, storage and retention are managed by IT (this service is not used there).

### Volume Configuration
```yaml
volumes:
  microplate-storage:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./storage  # Local storage directory for development
```

## Production (PVC Support)

### Configuration
- Uses Docker volumes that can be mapped to Kubernetes PVCs
- Environment variables for sensitive data
- Suitable for cloud deployment

### Usage

**Start services:**  
Production compose does **not** include Postgres or RabbitMQ; those must exist externally (e.g. cloud or another compose).

```bash
cd Backend-Microplate-infra
docker compose -f docker-compose.apps.prod.yml up -d
```

**Stop services:**
```bash
cd Backend-Microplate-infra
docker compose -f docker-compose.apps.prod.yml down
```

**View logs:**
```bash
cd Backend-Microplate-infra
docker compose -f docker-compose.apps.prod.yml logs -f
```

### Volume Configuration
```yaml
volumes:
  microplate-storage:
    driver: local
    # In Kubernetes, this is mapped to a PVC defined in k8s manifests
```

## Kubernetes Deployment with PVCs

When deploying to Kubernetes, the volumes are defined in PVC manifests:

### PVC Manifest Example
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: microplate-storage-pvc
  namespace: microplate
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: your-storage-class  # e.g., nfs-client, standard, etc.
```

### Deployment Manifest Example
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-ingestion-service
  namespace: microplate
spec:
  template:
    spec:
      containers:
      - name: image-ingestion
        volumeMounts:
        - name: microplate-storage
          mountPath: /mnt/storage
      volumes:
      - name: microplate-storage
        persistentVolumeClaim:
          claimName: microplate-storage-pvc
```

## Environment Variables

### Required for Production
Create a `.env` file in `Backend-Microplate-infra/`:

```bash
# PostgreSQL
POSTGRES_USER=microplate
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=microplate_db

# RabbitMQ
RABBITMQ_USER=microplate
RABBITMQ_PASS=your_secure_password

# JWT Secrets (for production, use strong secrets)
JWT_ACCESS_SECRET=your_jwt_access_secret
FILE_ACCESS_SECRET=your_file_access_secret

# Public URLs
PUBLIC_URL=https://your-domain.com
```

## Storage Class Recommendations

### For Local Development
- Use `hostPath` or `local` storage class
- Files are stored on the node's filesystem

### For Production
- Use `ReadWriteMany` access mode for shared storage
- Recommended storage classes:
  - **NFS**: `nfs-client` or similar
  - **Cloud Storage**:
    - AWS: `efs-sc` (EFS) or `gp2` (EBS with ReadWriteOnce)
    - GCP: `standard` or `premium-rwo`
    - Azure: `azurefile` (ReadWriteMany) or `azure-disk` (ReadWriteOnce)

## Troubleshooting

### Issue: Volume not found
**Solution:** Ensure the network exists before starting services:
```bash
docker network create microplate-network
```

### Issue: Permission denied on storage directory
**Solution:** Set proper permissions:
```bash
chmod -R 755 Backend-Microplate-infra/storage
```

### Issue: PVC pending state in Kubernetes
**Solution:** Check storage class and availability:
```bash
kubectl get sc
kubectl describe pvc microplate-storage-pvc
```

## Service Dependencies

All services have proper dependencies configured:

```
postgres (infrastructure)
  ├── auth-service
  ├── image-ingestion
  ├── prediction-db
  │   ├── vision-inference-api
  │   ├── vision-inference-worker-1
  │   ├── vision-inference-worker-2
  │   ├── vision-inference-worker-3
  │   └── result-api
  └── result-api

rabbitmq (infrastructure)
  ├── vision-inference-api
  ├── vision-inference-worker-1
  ├── vision-inference-worker-2
  └── vision-inference-worker-3
```

## Quick Reference

| Command | Local Development | Production |
|---------|------------------|------------|
| Start | `docker compose -f docker-compose.apps.yml up -d` | `docker compose -f docker-compose.apps.prod.yml up -d` |
| Stop | `docker compose -f docker-compose.apps.yml down` | `docker compose -f docker-compose.apps.prod.yml down` |
| Logs | `docker compose -f docker-compose.apps.yml logs -f` | `docker compose -f docker-compose.apps.prod.yml logs -f` |
| Restart | `docker compose -f docker-compose.apps.yml restart` | `docker compose -f docker-compose.apps.prod.yml restart` |

For full local setup (network, storage, .env), see **SETUP-LOCAL-DOCKER.md**.
