const DEFAULT_ORIGINS = ["http://localhost:3000"];

const parseOrigins = (origins = "") =>
  origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS);
const resolvedOrigins = allowedOrigins.length ? allowedOrigins : DEFAULT_ORIGINS;

const isOriginAllowed = (origin) => {
  // Allow non-browser clients (e.g., curl, Postman, server-to-server)
  if (!origin) return true;

  return resolvedOrigins.includes(origin);
};

const corsOriginHandler = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }

  return callback(new Error("Not allowed by CORS"));
};

const expressCorsOptions = {
  origin: corsOriginHandler,
  credentials: true,
};

const socketCorsOptions = {
  origin: corsOriginHandler,
  credentials: true,
};

module.exports = {
  allowedOrigins: resolvedOrigins,
  expressCorsOptions,
  socketCorsOptions,
};
