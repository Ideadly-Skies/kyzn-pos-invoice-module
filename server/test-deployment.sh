#!/bin/bash

# Test script for deployed KYZN POS Invoice Server
APP_URL="https://kyzn-pos-invoice-server.fly.dev"

echo "🧪 Testing KYZN POS Invoice Server deployment..."
echo "🌐 Testing URL: $APP_URL"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
if curl -s -f "$APP_URL/health" > /dev/null; then
    echo "   ✅ Health check passed"
    curl -s "$APP_URL/health" | json_pp
else
    echo "   ❌ Health check failed"
fi

echo ""

# Test products endpoint
echo "2. Testing products endpoint..."
if curl -s -f "$APP_URL/products?limit=3" > /dev/null; then
    echo "   ✅ Products endpoint accessible"
    echo "   📊 Sample response:"
    curl -s "$APP_URL/products?limit=3" | json_pp | head -20
else
    echo "   ❌ Products endpoint failed"
fi

echo ""

# Test invoices endpoint
echo "3. Testing invoices endpoint..."
if curl -s -f "$APP_URL/invoices?limit=3" > /dev/null; then
    echo "   ✅ Invoices endpoint accessible"
    echo "   📊 Sample response:"
    curl -s "$APP_URL/invoices?limit=3" | json_pp | head -20
else
    echo "   ❌ Invoices endpoint failed"
fi

echo ""

# Test revenue endpoint
echo "4. Testing revenue endpoint..."
if curl -s -f "$APP_URL/revenue?bucket=weekly&limit=5" > /dev/null; then
    echo "   ✅ Revenue endpoint accessible"
    echo "   📊 Sample response:"
    curl -s "$APP_URL/revenue?bucket=weekly&limit=5" | json_pp | head -15
else
    echo "   ❌ Revenue endpoint failed"
fi

echo ""
echo "🎉 Testing complete!"
echo ""
echo "🔗 Access your deployed API at: $APP_URL"
echo "📖 API Documentation endpoints:"
echo "   • Health: $APP_URL/health"
echo "   • Products: $APP_URL/products"
echo "   • Invoices: $APP_URL/invoices"
echo "   • Revenue: $APP_URL/revenue"