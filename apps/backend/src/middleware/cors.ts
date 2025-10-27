import { cors } from 'hono/cors';

// CORS configuration with whitelist
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  process.env.FRONTEND_URL || '',
].filter(Boolean);

// Helper to check if origin is an ngrok domain
const isNgrokDomain = (origin: string): boolean => {
  return /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i.test(origin);
};

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null; // Allow requests with no origin (like mobile apps)

    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // Allow ngrok domains for development (temporary tunneling)
    if (process.env.NODE_ENV !== 'production' && isNgrokDomain(origin)) {
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
