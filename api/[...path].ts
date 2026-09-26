/**
 * Vercel catch-all API handler for /api/*
 * Re-exports the Express app so paths like /api/skills/site_audit work.
 */
import app from '../server';

export default app;
