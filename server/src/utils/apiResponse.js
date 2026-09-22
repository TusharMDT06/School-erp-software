/**
 * Standardized API response helpers.
 * All controllers should use these to ensure a consistent response shape.
 */

class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (2xx)
   * @param {*} data            - Response payload
   * @param {string} message    - Human-readable success message
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} message    - Human-readable error message
   * @param {Array}  errors     - Optional array of field-level errors
   */
  constructor(statusCode, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    this.data = null;
  }
}

module.exports = { ApiResponse, ApiError };
