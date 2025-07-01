import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { auth } from './auth';
import { toNodeHandler } from 'better-auth/node';
import artworkRoutes from './routes/artwork.js';
import vaultRoutes from './routes/vault.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration with credentials support
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081', // Expo dev server
  ],
  credentials: true,
}));

// Better Auth handler - MUST be before express.json()
app.all('/api/auth/*', toNodeHandler(auth));

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/artwork', artworkRoutes);
app.use('/api/vault', vaultRoutes);

// Custom Morgan format for beautiful API call tracking
morgan.token('timestamp', () => {
  return new Date().toISOString();
});

morgan.token('colored-status', (req: Request, res: Response) => {
  const status = res.statusCode;
  if (status >= 500) return `\x1b[31m${status}\x1b[0m`; // Red
  if (status >= 400) return `\x1b[33m${status}\x1b[0m`; // Yellow
  if (status >= 300) return `\x1b[36m${status}\x1b[0m`; // Cyan
  if (status >= 200) return `\x1b[32m${status}\x1b[0m`; // Green
  return status.toString();
});

// Custom logging format
app.use(
  morgan(
    '🚀 \x1b[36m:timestamp\x1b[0m | :colored-status | \x1b[35m:method\x1b[0m \x1b[34m:url\x1b[0m | ⚡ :response-time ms | 📦 :res[content-length] bytes'
  )
);

// Request counter middleware
let requestCount = 0;
app.use((req: Request, res: Response, next: NextFunction) => {
  requestCount++;
  req.requestId = requestCount;
  next();
});

// Extend Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: number;
    }
  }
}

// Routes
app.get('/health', (req: Request, res: Response) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.requestId,
    totalRequests: requestCount,
    memoryUsage: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(healthStatus);
});

app.get('/api/test', (req: Request, res: Response) => {
  const testData = {
    message: '🎉 Test API call successful!',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    data: {
      users: [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
        { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
        { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' }
      ],
      totalUsers: 3,
      serverInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }
  };

  res.status(200).json(testData);
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🚀 Artefact AI Backend is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      test: '/api/test',
      auth: '/api/auth/*',
      artworkSearch: '/api/artwork/search',
      vault: {
        toggle: '/api/vault/toggle',
        check: '/api/vault/check/:objectId',
        myVault: '/api/vault/my-vault'
      }
    }
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Startup function with beautiful banner
const startServer = () => {
  const server = app.listen(PORT, () => {
    const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                     🚀 ARTEFACT AI BACKEND                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🌐 Server URL: http://localhost:${PORT}                      ║
║  📊 Health Check: http://localhost:${PORT}/health             ║
║  🧪 Test API: http://localhost:${PORT}/api/test               ║
║  🔐 Auth API: http://localhost:${PORT}/api/auth/*             ║
║  🎨 Artwork Search: http://localhost:${PORT}/api/artwork/search║
║  🔐 Vault API: http://localhost:${PORT}/api/vault/*           ║
║                                                               ║
║  🔥 Environment: ${(process.env.NODE_ENV || 'development').toUpperCase().padEnd(11)}║
║  ⚡ Node.js: ${process.version.padEnd(15)}                     ║
║  📦 TypeScript: Enabled                                       ║
║  🔄 Auto-reload: ${process.env.NODE_ENV === 'development' ? 'Enabled ' : 'Disabled'}║
║                                                               ║
║  📝 API calls will be tracked and logged below...             ║
╚═══════════════════════════════════════════════════════════════╝
    `;
    
    console.log(banner);
    console.log('🎯 Ready to accept connections!');
    console.log('👀 Watching for API calls...\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  });
};

// Start the server
startServer();

export default app; 