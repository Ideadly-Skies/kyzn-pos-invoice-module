# KYZN POS Invoice Server - Fly.io Deployment

This guide explains how to deploy the KYZN POS Invoice Server to Fly.io.

## Prerequisites

1. **Install flyctl** (Fly.io CLI):

   ```bash
   # macOS
   brew install flyctl

   # Or download from: https://fly.io/docs/getting-started/installing-flyctl/
   ```

2. **Login to Fly.io**:
   ```bash
   flyctl auth login
   ```

## Quick Deployment

### Option 1: Using the deployment script (Recommended)

```bash
# Set your DATABASE_URL environment variable
export DATABASE_URL="postgresql://postgres.ukvedzvhegdjwpoljoht:CristianoRonaldoTheBest7!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Run the deployment script
./deploy.sh
```

### Option 2: Manual deployment

1. **Create the app** (first time only):

   ```bash
   flyctl apps create kyzn-pos-invoice-server --org personal
   ```

2. **Set secrets**:

   ```bash
   flyctl secrets set PORT=8080 -a kyzn-pos-invoice-server
   flyctl secrets set DATABASE_URL="your_database_url_here" -a kyzn-pos-invoice-server
   ```

3. **Deploy**:
   ```bash
   flyctl deploy -a kyzn-pos-invoice-server
   ```

## Configuration

The deployment includes:

- **Dockerfile**: Optimized Node.js container with Alpine Linux
- **fly.toml**: Fly.io configuration with health checks and autoscaling
- **Health endpoint**: `/health` for monitoring
- **Environment variables**: PORT and DATABASE_URL as secrets

### Key Configuration Details

- **Region**: Singapore (sin) - closest to your Supabase database
- **Resources**: 1 CPU, 512MB RAM (suitable for development/testing)
- **Autoscaling**: Scales to 0 when idle, starts automatically on requests
- **Health checks**: Monitors `/health` endpoint every 10 seconds

## Post-Deployment

After successful deployment, your API will be available at:
`https://kyzn-pos-invoice-server.fly.dev`

### Available Endpoints

- `GET /health` - Health check
- `GET /products` - List products
- `GET /invoices` - List invoices
- `GET /invoices/:id` - Get specific invoice
- `POST /invoices` - Create invoice
- `PATCH /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `GET /revenue` - Revenue analytics

## Useful Commands

```bash
# View application logs
flyctl logs -a kyzn-pos-invoice-server

# Check application status
flyctl status -a kyzn-pos-invoice-server

# Open application in browser
flyctl open -a kyzn-pos-invoice-server

# View secrets (masked)
flyctl secrets list -a kyzn-pos-invoice-server

# Scale application
flyctl scale count 1 -a kyzn-pos-invoice-server

# Update secrets
flyctl secrets set DATABASE_URL="new_url" -a kyzn-pos-invoice-server
```

## Troubleshooting

### Common Issues

1. **Build failures**: Check Dockerfile and .dockerignore
2. **Connection errors**: Verify DATABASE_URL secret is set correctly
3. **Health check failures**: Ensure `/health` endpoint is accessible

### Debugging

```bash
# SSH into the running container
flyctl ssh console -a kyzn-pos-invoice-server

# View detailed logs
flyctl logs -a kyzn-pos-invoice-server --follow
```

## Production Considerations

For production deployment, consider:

- Upgrading to a dedicated CPU plan
- Adding more memory if needed
- Setting up monitoring and alerts
- Implementing proper error tracking
- Adding rate limiting
- Setting up CI/CD pipeline

## Cost Optimization

The current configuration uses:

- Shared CPU (cheapest option)
- Auto-stop when idle (no cost when not in use)
- Minimal resource allocation

This setup is ideal for development and testing with very low costs.
