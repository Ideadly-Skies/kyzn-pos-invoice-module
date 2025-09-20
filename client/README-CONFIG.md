# Client Configuration

## Environment Variables

The client uses Vite for building and supports environment variables with the `VITE_` prefix.

### Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   ```
   VITE_API_URL=https://kyzn-pos-invoice-server.fly.dev
   ```

### Available Environment Variables

- **VITE_API_URL**: The backend API URL
  - Local development: `http://localhost:8080`
  - Production: `https://kyzn-pos-invoice-server.fly.dev`

### Development vs Production

- **Development**: The app will use `http://localhost:8080` by default if no environment variable is set
- **Production**: Set `VITE_API_URL` to point to your deployed Fly.io server

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will automatically use the environment variables during build time.
