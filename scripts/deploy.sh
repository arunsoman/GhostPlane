#!/bin/bash
set -e

echo "🚀 Deploying NLB+ with Docker Compose..."

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your production credentials!"
fi

# Start services
echo "🐳 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check status
docker-compose ps

echo ""
echo "✅ NLB+ is running!"
echo ""
echo "🌐 Access points:"
echo "  - UI:          http://localhost:3000"
echo "  - API:         http://localhost:8081"
echo "  - Proxy:       http://localhost:8080"
echo ""
echo "🔐 Default credentials:"
echo "  - Username: admin"
echo "  - Password: admin123"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop:      docker-compose down"
