# Deployment Guide

## Overview

This guide covers production deployment strategies for the Microplate AI System, including Docker, Kubernetes, and cloud deployment options.

## Production Architecture

### Infrastructure Components
- **Load Balancer**: Nginx or cloud load balancer (optional)
- **Microservices**: 7 backend services with direct access
- **Database**: PostgreSQL 17 with replication
- **Object Storage**: MinIO or cloud storage (S3)
- **Cache**: Redis for session and data caching
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack or cloud logging

## Docker Deployment

### 1. Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: microplates
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
    restart: unless-stopped

  auth-service:
    image: microplate-ai/auth-service:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/microplates
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 2

  image-ingestion-service:
    image: microplate-ai/image-ingestion-service:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/microplates
      OBJECT_STORAGE_ENDPOINT: http://minio:9000
      OBJECT_STORAGE_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      OBJECT_STORAGE_SECRET_KEY: ${MINIO_SECRET_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 2

  vision-inference-service:
    image: microplate-ai/vision-inference-service:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/microplates
      IMAGE_SERVICE_URL: http://image-ingestion-service:6402
    depends_on:
      postgres:
        condition: service_healthy
      image-ingestion-service:
        condition: service_started
    restart: unless-stopped
    deploy:
      replicas: 1
    resources:
      limits:
        memory: 4G
        cpus: '2.0'

  result-api-service:
    image: microplate-ai/result-api-service:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/microplates
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 2

  labware-interface-service:
    image: microplate-ai/labware-interface-service:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/microplates
      OUTPUT_DIRECTORY: /app/generated
    volumes:
      - ./shared:/app/generated
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 1

  vision-capture-service:
    image: microplate-ai/vision-capture-service:latest
    environment:
      NODE_ENV: production
      DEFAULT_CAMERA_ID: 0
    devices:
      - /dev/video0:/dev/video0
    restart: unless-stopped
    deploy:
      replicas: 1

  frontend:
    image: microplate-ai/frontend:latest
    depends_on:
      - nginx
    restart: unless-stopped
    deploy:
      replicas: 2

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 2. Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:80;
    }

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    server {
        listen 80;
        server_name app.microplate-ai.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name app.microplate-ai.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Kubernetes Deployment

### 1. Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: microplate-ai
  labels:
    name: microplate-ai
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: microplate-config
  namespace: microplate-ai
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DATABASE_URL: "postgresql://microplate_user:${DB_PASSWORD}@postgres:5432/microplates"
  REDIS_URL: "redis://redis:6379"
  OBJECT_STORAGE_ENDPOINT: "http://minio:9000"
  OBJECT_STORAGE_ACCESS_KEY: "${MINIO_ACCESS_KEY}"
  OBJECT_STORAGE_SECRET_KEY: "${MINIO_SECRET_KEY}"
```

### 2. Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: microplate-secrets
  namespace: microplate-ai
type: Opaque
data:
  db-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-jwt-secret>
  jwt-refresh-secret: <base64-encoded-refresh-secret>
  minio-access-key: <base64-encoded-access-key>
  minio-secret-key: <base64-encoded-secret-key>
```

### 3. Database Deployment

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: microplate-ai
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:17
        env:
        - name: POSTGRES_DB
          value: microplates
        - name: POSTGRES_USER
          value: microplate_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: microplate-secrets
              key: db-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: microplate-ai
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### 4. Service Deployments

```yaml
# k8s/auth-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: microplate-ai
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: microplate-ai/auth-service:latest
        ports:
        - containerPort: 6401
        envFrom:
        - configMapRef:
            name: microplate-config
        - secretRef:
            name: microplate-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 6401
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: 6401
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: microplate-ai
spec:
  selector:
    app: auth-service
  ports:
  - port: 6401
    targetPort: 6401
```

### 5. Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: microplate-ai-ingress
  namespace: microplate-ai
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.microplate-ai.com
    - app.microplate-ai.com
    secretName: microplate-ai-tls
  rules:
  - host: api.microplate-ai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway
            port:
              number: 6400
  - host: app.microplate-ai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

## Cloud Deployment

### 1. AWS Deployment

#### EKS Cluster
```bash
# Create EKS cluster
eksctl create cluster \
  --name microplate-ai \
  --region us-west-2 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 5 \
  --managed
```

#### RDS Database
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier microplate-ai-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 17.0 \
  --master-username microplate_user \
  --master-user-password your-password \
  --allocated-storage 20 \
  --storage-type gp2
```

#### S3 Bucket
```bash
# Create S3 bucket for object storage
aws s3 mb s3://microplate-ai-storage
aws s3api put-bucket-versioning \
  --bucket microplate-ai-storage \
  --versioning-configuration Status=Enabled
```

### 2. Azure Deployment

#### AKS Cluster
```bash
# Create AKS cluster
az aks create \
  --resource-group microplate-ai-rg \
  --name microplate-ai-aks \
  --node-count 3 \
  --node-vm-size Standard_B2s \
  --enable-addons monitoring \
  --generate-ssh-keys
```

#### Azure Database for PostgreSQL
```bash
# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group microplate-ai-rg \
  --name microplate-ai-db \
  --admin-user microplate_user \
  --admin-password your-password \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --public-access 0.0.0.0
```

### 3. Google Cloud Deployment

#### GKE Cluster
```bash
# Create GKE cluster
gcloud container clusters create microplate-ai \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 5
```

#### Cloud SQL
```bash
# Create Cloud SQL instance
gcloud sql instances create microplate-ai-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1 \
  --root-password your-password
```

## Monitoring and Observability

### 1. Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'microplate-services'
    static_configs:
      - targets: ['auth-service:6401', 'image-ingestion-service:6402']
    metrics_path: /metrics
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 2. Grafana Dashboards

```json
{
  "dashboard": {
    "title": "Microplate AI System",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### 3. Log Aggregation

```yaml
# logging/fluentd.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: microplate-ai
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*microplate-ai*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>
    
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch
      port 9200
      index_name microplate-ai
    </match>
```

## Backup and Recovery

### 1. Database Backup

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="microplates_backup_${DATE}.sql"

# Create backup
pg_dump -h postgres -U microplate_user -d microplates > "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}.gz" s3://microplate-ai-backups/

# Cleanup old backups (keep last 7 days)
find ${BACKUP_DIR} -name "*.gz" -mtime +7 -delete
```

### 2. Object Storage Backup

```bash
#!/bin/bash
# scripts/backup-storage.sh

# Sync MinIO to S3
mc mirror minio/raw-images s3://microplate-ai-backups/raw-images/
mc mirror minio/annotated-images s3://microplate-ai-backups/annotated-images/
mc mirror minio/thumbnails s3://microplate-ai-backups/thumbnails/
```

## Security Hardening

### 1. Network Security

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: microplate-ai-network-policy
  namespace: microplate-ai
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: microplate-ai
    ports:
    - protocol: TCP
      port: 6400
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: microplate-ai
    ports:
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
```

### 2. Pod Security

```yaml
# k8s/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: microplate-ai-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Deployment Scripts

### 1. Automated Deployment

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

# Configuration
ENVIRONMENT=${1:-production}
NAMESPACE="microplate-ai"
REGISTRY="your-registry.com"

echo "Deploying to ${ENVIRONMENT} environment..."

# Build and push images
services=("auth-service" "image-ingestion-service" "vision-inference-service" "result-api-service" "labware-interface-service" "vision-capture-service" "frontend")

for service in "${services[@]}"; do
  echo "Building ${service}..."
  docker build -t ${REGISTRY}/${service}:latest ./services/${service}
  docker push ${REGISTRY}/${service}:latest
done

# Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml

# Wait for infrastructure
kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n ${NAMESPACE} --timeout=300s
kubectl wait --for=condition=ready pod -l app=minio -n ${NAMESPACE} --timeout=300s

# Deploy services
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/image-ingestion-service.yaml
kubectl apply -f k8s/vision-inference-service.yaml
kubectl apply -f k8s/result-api-service.yaml
kubectl apply -f k8s/labware-interface-service.yaml
kubectl apply -f k8s/vision-capture-service.yaml
kubectl apply -f k8s/frontend.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml

echo "Deployment completed successfully!"
```

### 2. Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

set -e

API_URL="https://api.microplate-ai.com"
FRONTEND_URL="https://app.microplate-ai.com"

echo "Performing health checks..."

# Check service health
echo "Checking service health..."
curl -f "http://localhost:6401/healthz" || exit 1
curl -f "http://localhost:6402/healthz" || exit 1
curl -f "http://localhost:6403/api/v1/inference/health" || exit 1
curl -f "http://localhost:6404/api/v1/results/health" || exit 1
curl -f "http://localhost:6405/healthz" || exit 1
curl -f "http://localhost:6406/health" || exit 1
curl -f "http://localhost:6407/api/v1/capture/health" || exit 1

# Check frontend
echo "Checking frontend..."
curl -f "${FRONTEND_URL}" || exit 1

# Check database connectivity
echo "Checking database..."
kubectl exec -n microplate-ai deployment/postgres -- pg_isready -U microplate_user -d microplates || exit 1

# Check Redis
echo "Checking Redis..."
kubectl exec -n microplate-ai deployment/redis -- redis-cli ping || exit 1

echo "All health checks passed!"
```

This deployment guide provides comprehensive instructions for deploying the Microplate AI System in various environments, from local Docker setups to production Kubernetes clusters and cloud platforms.
