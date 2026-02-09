#!/bin/bash

# ========================================
# Frontend Startup Script
# ========================================

set -e

echo "🚀 Starting Microplate Frontend..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please update it with your configuration.${NC}"
fi

# Check if Docker network exists
if ! docker network inspect microplate-network >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Network 'microplate-network' not found. Creating...${NC}"
    docker network create microplate-network
    echo -e "${GREEN}✅ Network created.${NC}"
fi

# Check if backend services are running
echo -e "${YELLOW}🔍 Checking backend services...${NC}"

REQUIRED_SERVICES=(
    "microplate-auth-service"
    "microplate-image-ingestion-service"
    "microplate-vision-inference-api"
    "microplate-result-api-service"
    "microplate-labware-interface-service"
    "microplate-prediction-db-service"
)

ALL_RUNNING=true
for service in "${REQUIRED_SERVICES[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        echo -e "${RED}❌ ${service} is not running${NC}"
        ALL_RUNNING=false
    else
        echo -e "${GREEN}✅ ${service} is running${NC}"
    fi
done

if [ "$ALL_RUNNING" = false ]; then
    echo -e "${YELLOW}⚠️  Some backend services are not running.${NC}"
    echo -e "${YELLOW}   Frontend will start, but may not work correctly.${NC}"
    echo -e "${YELLOW}   Please start backend services first:${NC}"
    echo -e "${YELLOW}   cd ../Backend-Microplate-infra && docker-compose up -d${NC}"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Ask which mode to start
echo ""
echo "Select deployment mode:"
echo "  1) Frontend only (Port 6410)"
echo "  2) Frontend + API Gateway (Ports 6410, 6400)"
echo "  3) Development mode (Webpack dev server)"
read -p "Enter choice [1-3]: " -n 1 -r
echo

case $REPLY in
    1)
        echo -e "${GREEN}🚀 Starting Frontend only...${NC}"
        docker-compose --profile frontend up -d --build
        ;;
    2)
        echo -e "${GREEN}🚀 Starting Frontend + API Gateway...${NC}"
        docker-compose --profile frontend --profile gateway up -d --build
        ;;
    3)
        echo -e "${GREEN}🚀 Starting Development mode...${NC}"
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}📦 Installing dependencies...${NC}"
            yarn install
        fi
        yarn dev
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 5

# Check health
if curl -sf http://localhost:6410/health >/dev/null; then
    echo -e "${GREEN}✅ Frontend is healthy!${NC}"
    echo -e "${GREEN}🌐 Access Frontend at: http://localhost:6410${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    echo -e "${YELLOW}📋 Showing logs:${NC}"
    docker-compose logs --tail=50 microplate-frontend
    exit 1
fi

if [ $REPLY = "2" ]; then
    if curl -sf http://localhost:6400/health >/dev/null; then
        echo -e "${GREEN}✅ API Gateway is healthy!${NC}"
        echo -e "${GREEN}🌐 Access API Gateway at: http://localhost:6400${NC}"
    else
        echo -e "${RED}❌ API Gateway health check failed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✨ Deployment complete!${NC}"
echo ""
echo "📝 Useful commands:"
echo "  docker-compose logs -f microplate-frontend  # View logs"
echo "  docker-compose --profile frontend restart   # Restart"
echo "  docker-compose --profile frontend down      # Stop"
echo ""
