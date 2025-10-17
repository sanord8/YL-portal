import { cors } from 'hono/cors';

// CORS configuration with whitelist
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  process.env.FRONTEND_URL || '',
].filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null; // Allow requests with no origin (like mobile apps)

    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // Block other origins
    return null;
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
