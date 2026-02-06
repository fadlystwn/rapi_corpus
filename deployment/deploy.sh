#!/bin/bash

# RAPI Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: dev, staging, prod

set -e

ENVIRONMENT=${1:-dev}
PROJECT_NAME="rapi-retrieval-system"

echo "🚀 Deploying RAPI Retrieval System to $ENVIRONMENT environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Invalid environment. Use: dev, staging, or prod"
    exit 1
fi

# Load environment-specific variables
ENV_FILE=".env.$ENVIRONMENT"
if [[ -f "$ENV_FILE" ]]; then
    echo "📝 Loading environment variables from $ENV_FILE"
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
else
    echo "⚠️  Environment file $ENV_FILE not found, using defaults"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p deployment/ssl
mkdir -p deployment/grafana/dashboards
mkdir -p deployment/grafana/datasources

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and deploy
echo "🔨 Building and starting services..."
cd deployment

if [[ "$ENVIRONMENT" == "prod" ]]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
else
    docker-compose up -d --build
fi

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Health checks
echo "🏥 Performing health checks..."

# Check API health
for i in {1..30}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ API is healthy"
        break
    fi
    if [[ $i -eq 30 ]]; then
        echo "❌ API health check failed"
        exit 1
    fi
    sleep 2
done

# Check Nginx
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Nginx is healthy"
else
    echo "❌ Nginx health check failed"
    exit 1
fi

# Show service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 Deployment successful!"
echo ""
echo "📋 Access URLs:"
echo "   API: http://localhost:3000"
echo "   Health: http://localhost:3000/health"
echo "   Status: http://localhost:3000/api/status"
echo "   Grafana: http://localhost:3001 (admin/admin)"
echo "   Prometheus: http://localhost:9090"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart API: docker-compose restart rapi-api"
echo ""
echo "🔍 Monitor: tail -f logs/requests-$(date +%Y-%m-%d).log"
