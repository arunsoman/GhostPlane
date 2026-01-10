#!/bin/bash
set -e

echo "🛑 Stopping NLB+ services..."

docker-compose down

echo "✅ Services stopped!"
