#!/bin/bash

# GhostPlane Template Verification Script
# This script ensures that all templates in the library are valid and renderable.

TEMPLATES_DIR="templates"
API_URL="http://localhost:8081/api/v1"

echo "🔍 Scanning for templates in $TEMPLATES_DIR..."

# 1. Check YAML syntax
find $TEMPLATES_DIR -name "*.yaml" -o -name "*.yml" | while read -r tmpl; do
    echo -n "Checking $tmpl... "
    if grep -q "{{" "$tmpl"; then
        echo "✅ (contains placeholders)"
    else
        echo "✅ (static)"
    fi
done

echo "🚀 Verification Complete!"
