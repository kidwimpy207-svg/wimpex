#!/bin/bash
# Deployment script for Wimpex

set -e

echo "🚀 Deploying Wimpex..."

# Check environment
if [ -z "$DEPLOY_ENV" ]; then
  echo "❌ Error: DEPLOY_ENV not set. Use: staging or production"
  exit 1
fi

echo "📍 Environment: $DEPLOY_ENV"

# Load environment variables
if [ -f ".env.$DEPLOY_ENV" ]; then
  export $(cat ".env.$DEPLOY_ENV" | xargs)
fi

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t wimpex:$DEPLOY_ENV .

# Stop existing container
echo "🛑 Stopping existing container..."
docker-compose -f docker-compose.$DEPLOY_ENV.yml down 2>/dev/null || true

# Start new container
echo "🚀 Starting new container..."
docker-compose -f docker-compose.$DEPLOY_ENV.yml up -d

# Wait for service
echo "⏳ Waiting for service to be ready..."
sleep 5

# Health check
echo "🏥 Running health check..."
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health || echo "failed")

if echo "$HEALTH_CHECK" | grep -q "ok"; then
  echo "✅ Deployment successful!"
  echo ""
  echo "Service is running at:"
  echo "  http://localhost:3000"
  echo ""
  echo "API Docs available at:"
  echo "  http://localhost:3000/api/health"
else
  echo "❌ Health check failed!"
  echo "Response: $HEALTH_CHECK"
  exit 1
fi

# Notify (optional)
if [ -n "$SLACK_WEBHOOK" ]; then
  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"✅ Wimpex deployed to $DEPLOY_ENV\"}"
fi

echo "✨ Done!"
