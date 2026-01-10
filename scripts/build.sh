#!/bin/bash
set -e

echo "🐳 Building NLB+ Docker images..."

# Build backend
echo "📦 Building backend image..."
docker build -t nlb-backend:latest .

# Build UI
echo "🎨 Building UI image..."
docker build -t nlb-ui:latest ./ui

echo "✅ Build complete!"
echo ""
echo "Images created:"
echo "  - nlb-backend:latest"
echo "  - nlb-ui:latest"
