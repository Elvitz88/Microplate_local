# Troubleshooting Guide

## Overview

This comprehensive guide provides solutions to common issues encountered when developing, deploying, and operating the Microplate AI System.

---

## Table of Contents

1. [Database Issues](#database-issues)
2. [Service Communication Issues](#service-communication-issues)
3. [Authentication Issues](#authentication-issues)
4. [Image Storage Issues](#image-storage-issues)
5. [Camera Capture Issues](#camera-capture-issues)
6. [AI Inference Issues](#ai-inference-issues)
7. [Frontend Issues](#frontend-issues)
8. [Docker & Container Issues](#docker--container-issues)
9. [Performance Issues](#performance-issues)
10. [Network & Connectivity Issues](#network--connectivity-issues)

---

## Database Issues

### Issue: Cannot connect to PostgreSQL

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

1. **Check if PostgreSQL is running:**
```bash
# Check container status
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

2. **Verify connection string:**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql "postgresql://postgres:password@localhost:5432/microplates"
```

3. **Check PostgreSQL is listening:**
```bash
# Inside container
docker exec -it postgres psql -U postgres -c "SHOW listen_addresses;"

# Should return: listen_addresses | *
```

4. **Reset database:**
```bash
docker-compose down -v
docker-compose up -d postgres
# Wait for PostgreSQL to start
sleep 10
# Run migrations
cd services/auth-service
yarn prisma migrate deploy
```

---

### Issue: Migration fails with "relation already exists"

**Symptoms:**
```
P3006: Migration failed to apply cleanly
relation "users" already exists
```

**Solutions:**

1. **Reset Prisma migration history:**
```bash
# Backup your data first!
yarn prisma migrate reset

# Or manually fix migration state
yarn prisma migrate resolve --applied "migration-name"
```

2. **Use db push for development:**
```bash
yarn prisma db push
```

3. **Check migration status:**
```bash
yarn prisma migrate status
```

---

### Issue: Slow database queries

**Symptoms:**
- API responses taking > 1 second
- High CPU usage on PostgreSQL container

**Solutions:**

1. **Analyze slow queries:**
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

2. **Check missing indexes:**
```sql
-- Find tables with sequential scans
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;

-- Add indexes
CREATE INDEX idx_prediction_run_sample_no ON microplates.prediction_run(sample_no);
CREATE INDEX idx_well_prediction_run_id ON microplates.well_prediction(run_id);
```

3. **Optimize connection pool:**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

4. **Use EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT * FROM microplates.prediction_run
WHERE sample_no = 'TEST001';
```

---

## Service Communication Issues

### Issue: Service returns 502 Bad Gateway

**Symptoms:**
```json
{
  "error": "Bad Gateway",
  "statusCode": 502
}
```

**Solutions:**

1. **Check if target service is running:**
```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs -f result-api-service

# Check service health
curl http://localhost:6404/healthz
```

2. **Verify service ports:**
```bash
# Check if port is listening
netstat -tulpn | grep 6404

# Or use lsof
lsof -i :6404
```

3. **Check Docker network:**
```bash
# List networks
docker network ls

# Inspect network
docker network inspect microplate-network

# Test connectivity between containers
docker exec -it result-api-service curl http://prediction-db-service:6406/health
```

4. **Restart the service:**
```bash
docker-compose restart result-api-service
```

---

### Issue: CORS errors in browser console

**Symptoms:**
```
Access to fetch at 'http://localhost:6404/api/v1/results' has been blocked by CORS policy
```

**Solutions:**

1. **ตรวจสอบ gateway / proxy:**
   - Development: ยืนยันว่า `.env` frontend ชี้ไป `http://localhost:6410` และมี proxy สำหรับเส้นทางที่เรียกใช้งาน
   - Production: ดู config nginx / API gateway ว่ากำหนด `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, `Access-Control-Allow-Methods` ให้ตรงกับโดเมนที่อนุญาต

2. **ทดสอบ preflight จาก gateway:**
```bash
curl -i -X OPTIONS https://api.example.com/api/v1/results/samples \
     -H "Origin: https://app.example.com" \
     -H "Access-Control-Request-Method: GET"
```

3. **ตรวจสอบ Certificate / Mixed Content:** ถ้า frontend ทำงานผ่าน HTTPS แต่ gateway/บริการตอบเป็น HTTP ธรรมดา browser จะบล็อกคำขอ

4. **ตรวจสอบค่า `VITE_*_SERVICE_URL`:** ต้องชี้ไปยัง gateway/proxy ไม่ใช่ `http://localhost:6404` โดยตรงเพื่อหลีกเลี่ยง CORS

5. **ดู console เพิ่มเติม:** ใน dev ถ้า proxy ไม่ match เส้นทาง `webpack-dev-server` จะรายงาน 404 หรือข้อความ proxy error

---

## Authentication Issues

### Issue: Token expired or invalid

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired token"
  }
}
```

**Solutions:**

1. **Check token expiration:**
```javascript
// Decode JWT in browser console
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

const payload = parseJwt(localStorage.getItem('accessToken'));
console.log('Token expires at:', new Date(payload.exp * 1000));
```

2. **Implement token refresh:**
```typescript
// Auto-refresh token before expiry
async function refreshTokenIfNeeded() {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  const payload = parseJwt(token);
  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;

  // Refresh if less than 5 minutes until expiry
  if (timeUntilExpiry < 5 * 60 * 1000) {
    await refreshToken();
  }
}
```

3. **Verify JWT secret across services:**
```bash
# Check JWT_SECRET in all services
docker-compose config | grep JWT_SECRET

# All services should have the same secret
```

4. **Clear tokens and re-login:**
```javascript
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
// Then login again
```

---

### Issue: User cannot login

**Symptoms:**
- Login returns 401 Unauthorized
- Correct credentials but still fails

**Solutions:**

1. **Check user exists in database:**
```sql
SELECT id, email, username, is_active, email_verified
FROM auth.users
WHERE email = 'user@example.com';
```

2. **Verify password hash:**
```bash
# Test password hashing
node -e "
const argon2 = require('argon2');
const hash = 'your-hash-from-db';
const password = 'test-password';
argon2.verify(hash, password).then(console.log);
"
```

3. **Check auth service logs:**
```bash
docker-compose logs -f auth-service | grep "login"
```

4. **Test with API directly:**
```bash
curl -X POST http://localhost:6401/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com","password":"password123"}'
```

---

## Image Storage Issues

### Issue: Images not uploading to MinIO

**Symptoms:**
- Upload hangs or times out
- 500 Internal Server Error

**Solutions:**

1. **Check MinIO is running:**
```bash
# Check MinIO status
docker-compose ps minio

# Access MinIO console
open http://localhost:9001

# Test MinIO connection
curl http://localhost:9000/minio/health/live
```

2. **Verify buckets exist:**
```bash
# Install MinIO client
brew install minio/stable/mc

# Configure mc
mc alias set local http://localhost:9000 minioadmin minioadmin

# List buckets
mc ls local

# Create missing buckets
mc mb local/raw-images
mc mb local/annotated-images
```

3. **Check MinIO credentials:**
```bash
# Verify credentials in .env
cat .env | grep MINIO

# Test with credentials
mc alias set test http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
```

4. **Check disk space:**
```bash
# Check MinIO volume size
docker exec minio df -h /data
```

---

### Issue: Signed URLs not working

**Symptoms:**
- 403 Forbidden when accessing signed URL
- URL works initially but fails later

**Solutions:**

1. **Check URL expiration:**
```javascript
// Extract expiration from URL
const url = new URL(signedUrl);
const expires = url.searchParams.get('X-Amz-Expires');
console.log('URL expires in:', expires, 'seconds');
```

2. **Verify MinIO endpoint configuration:**
```bash
# Check both internal and external endpoints
echo $OBJECT_STORAGE_ENDPOINT          # For services
echo $OBJECT_STORAGE_EXTERNAL_ENDPOINT # For browser
```

3. **Regenerate signed URL:**
```bash
curl -X POST http://localhost:6402/api/v1/signed-urls \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "raw-images",
    "objectKey": "TEST006/14/image.jpg",
    "expiresIn": 3600
  }'
```

4. **Check MinIO bucket policy:**
```bash
mc admin policy list local
mc admin policy info local readonly
```

---

## Camera Capture Issues

### Issue: Camera not detected

**Symptoms:**
```json
{
  "error": "Camera not available",
  "device_id": 0
}
```

**Solutions:**

1. **List available cameras:**
```bash
# Linux
ls -la /dev/video*

# Windows
ffmpeg -list_devices true -f dshow -i dummy

# macOS
ffmpeg -f avfoundation -list_devices true -i ""
```

2. **Check Docker device mapping:**
```yaml
# docker-compose.yml
vision-capture-service:
  devices:
    - /dev/video0:/dev/video0
  privileged: true  # May be needed
```

3. **Test camera outside Docker:**
```python
import cv2
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
print("Camera working:", ret)
cap.release()
```

4. **Check camera permissions:**
```bash
# Linux - add user to video group
sudo usermod -aG video $USER

# Check permissions
ls -l /dev/video0
```

---

### Issue: Poor image quality

**Symptoms:**
- Blurry or dark images
- Low resolution

**Solutions:**

1. **Adjust camera settings:**
```python
# In vision-capture-service
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
cap.set(cv2.CAP_PROP_BRIGHTNESS, 128)
cap.set(cv2.CAP_PROP_CONTRAST, 128)
cap.set(cv2.CAP_PROP_EXPOSURE, -6)  # Auto exposure
```

2. **Increase JPEG quality:**
```python
cv2.imwrite(
    filename,
    frame,
    [cv2.IMWRITE_JPEG_QUALITY, 95]
)
```

3. **Check lighting conditions:**
- Ensure adequate lighting
- Avoid glare and reflections
- Use diffused lighting

4. **Use manual focus if available:**
```bash
# v4l2-ctl (Linux)
v4l2-ctl --device=/dev/video0 --set-ctrl=focus_auto=0
v4l2-ctl --device=/dev/video0 --set-ctrl=focus_absolute=20
```

---

## AI Inference Issues

### Issue: Inference taking too long

**Symptoms:**
- Inference > 10 seconds
- Timeout errors

**Solutions:**

1. **Check GPU availability:**
```python
import torch
print("CUDA available:", torch.cuda.is_available())
print("CUDA device:", torch.cuda.get_device_name(0))
```

2. **Use smaller model or batch size:**
```python
# Reduce model size
model = YOLO('yolov8n.pt')  # nano instead of large

# Reduce batch size
results = model(image, batch_size=1)
```

3. **Profile the inference:**
```python
import time

start = time.time()
results = model(image)
print(f"Inference time: {time.time() - start:.2f}s")
```

4. **Check system resources:**
```bash
# CPU usage
top

# Memory usage
free -h

# GPU usage (if available)
nvidia-smi
```

---

### Issue: Low confidence scores

**Symptoms:**
- Most predictions < 0.5 confidence
- Many false positives

**Solutions:**

1. **Adjust confidence threshold:**
```python
results = model(
    image,
    conf=0.7,  # Increase threshold
    iou=0.45
)
```

2. **Check image quality:**
- Ensure good lighting
- Proper focus
- No motion blur

3. **Retrain or fine-tune model:**
- Collect more training data
- Use transfer learning
- Adjust hyperparameters

4. **Verify model file:**
```bash
# Check model file exists and is not corrupted
ls -lh models/yolo/best.pt
md5sum models/yolo/best.pt
```

---

## Frontend Issues

### Issue: White screen / blank page

**Symptoms:**
- Browser shows blank page
- No errors in console

**Solutions:**

1. **Check browser console:**
```javascript
// Open DevTools (F12)
// Look for errors in Console tab
```

2. **Verify build output:**
```bash
# Check dist folder
ls -la dist/

# Rebuild
yarn build

# Start dev server
yarn dev
```

3. **Check React errors:**
```bash
# Look for React errors in terminal
yarn dev

# Check if ErrorBoundary is catching errors
```

4. **Clear browser cache:**
```
Ctrl + Shift + Delete (Windows/Linux)
Cmd + Shift + Delete (macOS)
```

---

### Issue: API calls failing from frontend

**Symptoms:**
```
Failed to fetch
Network request failed
```

**Solutions:**

1. **Check service URLs in .env:**
```bash
# frontend/.env
VITE_AUTH_SERVICE_URL=http://localhost:6401
VITE_RESULTS_SERVICE_URL=http://localhost:6404
```

2. **Verify CORS headers:**
```bash
curl -i -X OPTIONS http://localhost:6404/api/v1/results/samples \
  -H "Origin: http://localhost:6410"
```

3. **Check network tab in DevTools:**
- Open DevTools > Network
- Filter by XHR
- Check request/response details

4. **Test API with curl:**
```bash
curl http://localhost:6404/api/v1/results/samples \
  -H "Authorization: Bearer $TOKEN"
```

---

## Docker & Container Issues

### Issue: Container constantly restarting

**Symptoms:**
```bash
$ docker-compose ps
NAME                     STATE
result-api-service    Restarting
```

**Solutions:**

1. **Check container logs:**
```bash
docker-compose logs result-api-service

# Follow logs in real-time
docker-compose logs -f result-api-service
```

2. **Check exit code:**
```bash
docker inspect result-api-service | grep ExitCode
```

3. **Common causes:**
- Port already in use
- Missing environment variables
- Database not ready
- Out of memory

4. **Add health checks and dependencies:**
```yaml
services:
  result-api-service:
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6404/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

### Issue: Cannot remove container or volume

**Symptoms:**
```
Error response from daemon: container is in use
```

**Solutions:**

1. **Stop all containers first:**
```bash
docker-compose down

# Force remove
docker-compose down -v --remove-orphans
```

2. **Remove specific container:**
```bash
docker stop result-api-service
docker rm result-api-service
```

3. **Remove volumes:**
```bash
# List volumes
docker volume ls

# Remove specific volume
docker volume rm microplate_postgres_data

# Remove all unused volumes
docker volume prune
```

4. **Clean up everything:**
```bash
# WARNING: This removes ALL Docker resources
docker system prune -a --volumes
```

---

## Performance Issues

### Issue: High memory usage

**Symptoms:**
- Container killed with OOM
- System becomes unresponsive

**Solutions:**

1. **Check memory usage:**
```bash
docker stats

# Check specific service
docker stats result-api-service
```

2. **Set memory limits:**
```yaml
services:
  result-api-service:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

3. **Optimize Node.js memory:**
```bash
# Set max memory
NODE_OPTIONS="--max-old-space-size=512" yarn start
```

4. **Check for memory leaks:**
```bash
# Use Node.js heap snapshot
node --inspect server.js

# Connect Chrome DevTools
# chrome://inspect
```

---

### Issue: High CPU usage

**Symptoms:**
- CPU at 100%
- Slow response times

**Solutions:**

1. **Identify CPU-intensive processes:**
```bash
# Top processes
top -o %CPU

# Docker stats
docker stats --no-stream
```

2. **Profile application:**
```javascript
// Add profiling
const profiler = require('v8-profiler-next');
profiler.startProfiling('CPU');

// After operation
const profile = profiler.stopProfiling('CPU');
profile.export((error, result) => {
  fs.writeFileSync('profile.cpuprofile', result);
});
```

3. **Optimize database queries:**
```sql
-- Find expensive queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time * calls DESC
LIMIT 10;
```

4. **Use caching:**
```typescript
// Add Redis caching for expensive operations
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);
```

---

## Network & Connectivity Issues

### Issue: DNS resolution fails

**Symptoms:**
```
getaddrinfo ENOTFOUND prediction-db-service
```

**Solutions:**

1. **Check Docker DNS:**
```bash
docker exec result-api-service nslookup prediction-db-service

# Check /etc/hosts
docker exec result-api-service cat /etc/hosts
```

2. **Verify network configuration:**
```bash
docker network inspect microplate-network
```

3. **Use IP address instead:**
```bash
# Get container IP
docker inspect prediction-db-service | grep IPAddress
```

4. **Restart Docker daemon:**
```bash
sudo systemctl restart docker
```

---

### Issue: Port already in use

**Symptoms:**
```
Error starting userland proxy: listen tcp 0.0.0.0:6404: bind: address already in use
```

**Solutions:**

1. **Find process using port:**
```bash
# Linux/macOS
lsof -i :6404

# Windows
netstat -ano | findstr :6404
```

2. **Kill the process:**
```bash
# Linux/macOS
kill -9 PID

# Windows
taskkill /PID PID /F
```

3. **Change port:**
```yaml
# docker-compose.yml
services:
  result-api-service:
    ports:
      - "6405:6404"  # Use different host port
```

---

## Quick Reference

### Useful Commands

```bash
# Health check all services
for port in 6401 6402 6403 6404 6405 6406 6407; do
  echo "Checking port $port:"
  curl -s http://localhost:$port/healthz || echo "Failed"
done

# Restart all services
docker-compose restart

# View logs from all services
docker-compose logs -f

# Check service status
docker-compose ps

# Rebuild specific service
docker-compose build result-api-service
docker-compose up -d result-api-service

# Reset database
docker-compose down -v
docker-compose up -d postgres
sleep 10
yarn prisma migrate deploy

# Clear all Docker resources (WARNING: Destructive!)
docker-compose down -v
docker system prune -a --volumes
```

### Log Locations

```
Service Logs:
- Docker: docker-compose logs [service]
- Development: stdout/stderr
- Production: /var/log/[service]/

Database Logs:
- PostgreSQL: docker-compose logs postgres
- Prisma: Check service logs

Application Logs:
- Frontend: Browser DevTools Console
- Backend: Service container logs
```

### Debug Mode

Enable debug logging:

```bash
# Backend services
LOG_LEVEL=debug docker-compose up

# Frontend
VITE_DEBUG=true yarn dev

# Prisma
DEBUG=prisma* yarn dev
```

---

## Getting Help

If issues persist:

1. **Check documentation** in `/docs` folder
2. **Review logs** thoroughly
3. **Search issues** on GitHub (if applicable)
4. **Contact support** with:
   - Error messages and stack traces
   - Service logs
   - System information
   - Steps to reproduce

---

## Appendix: Health Check Script

Save as `scripts/health-check.sh`:

```bash
#!/bin/bash

services=(
  "Auth:6401"
  "Image:6402"
  "Labware:6403"
  "Results:6404"
  "Inference:6405"
  "PredictionDB:6406"
  "Capture:6407"
)

echo "Checking service health..."
echo "=========================="

for service in "${services[@]}"; do
  IFS=':' read -r name port <<< "$service"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/healthz 2>/dev/null)
  
  if [ "$response" = "200" ]; then
    echo "✓ $name (port $port): Healthy"
  else
    echo "✗ $name (port $port): Unhealthy (HTTP $response)"
  fi
done

echo "=========================="
```

Make executable and run:
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

