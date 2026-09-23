const morgan = require("morgan");

// Escape character 0x1b constructed dynamically to avoid escape literal issues in Windows terminals
const ESC = String.fromCharCode(27);

// Color helpers
const colorize = (code, str) => `${ESC}[${code}m${str}${ESC}[0m`;
const bold = (code, str) => `${ESC}[${code}m${ESC}[1m${str}${ESC}[0m`;

// Helper: Colorize HTTP status code
const getStatusBadge = (status) => {
  if (status >= 500) return bold("31", status); // Red: Server error
  if (status >= 400) return bold("33", status); // Yellow: Client error / Unauthorized
  if (status >= 300) return bold("36", status); // Cyan: Redirection / Cached
  if (status >= 200) return bold("32", status); // Green: Success
  return bold("37", status);
};

// Helper: Colorize HTTP method
const getMethodBadge = (method) => {
  const padded = method.padEnd(6);
  switch (method) {
    case "GET":
      return bold("32", padded); // Green
    case "POST":
      return bold("34", padded); // Blue
    case "PUT":
    case "PATCH":
      return bold("33", padded); // Yellow
    case "DELETE":
      return bold("31", padded); // Red
    default:
      return bold("35", padded); // Magenta
  }
};

/**
 * Custom Morgan Logger Middleware
 * Output format: [HH:MM:SS] METHOD /path STATUS - TIME ms - SIZE
 * Example: [21:58:30] GET    /api/dashboard/admin 200 - 4.43 ms - 67B
 */
const morganMiddleware = morgan(
  (tokens, req, res) => {
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const timestamp = colorize("90", `[${time}]`);
    const method = getMethodBadge(req.method);
    const url = tokens.url(req, res);
    const status = getStatusBadge(res.statusCode);
    const responseTime = `${tokens["response-time"](req, res)} ms`;
    const contentLength = tokens.res(req, res, "content-length");
    const size = contentLength ? `${contentLength}B` : "-";

    return `${timestamp} ${method} ${url} ${status} - ${responseTime} - ${size}`;
  },
  {
    // Skip noisy CORS OPTIONS preflights
    skip: (req) => req.method === "OPTIONS",
  }
);

module.exports = morganMiddleware;
