#!/bin/bash

# Fly.io Deployment Script for KYZN POS Invoice Server
# Make sure you have flyctl installed: https://fly.io/docs/getting-started/installing-flyctl/

echo "🚀 Deploying KYZN POS Invoice Server to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 Please log in to Fly.io first:"
    flyctl auth login
fi

# Create app if it doesn't exist (first deployment)
if ! flyctl apps list | grep -q "kyzn-pos-invoice-server"; then
    echo "🆕 Creating new Fly.io app..."
    flyctl apps create kyzn-pos-invoice-server --org personal
fi

# Set secrets
echo "🔑 Setting up secrets..."
flyctl secrets set PORT=8080 DATABASE_URL="$DATABASE_URL" -a kyzn-pos-invoice-server

# Deploy
echo "🚀 Deploying application..."
flyctl deploy -a kyzn-pos-invoice-server

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://kyzn-pos-invoice-server.fly.dev"
echo ""
echo "📋 Useful commands:"
echo "   flyctl logs -a kyzn-pos-invoice-server           # View logs"
echo "   flyctl status -a kyzn-pos-invoice-server         # Check app status"
echo "   flyctl open -a kyzn-pos-invoice-server           # Open app in browser"