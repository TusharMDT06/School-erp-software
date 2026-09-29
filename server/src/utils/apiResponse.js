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

  /**
   * Static helper method for success responses.
   * Flexibly handles:
   *   ApiResponse.success(statusCode, message, data)
   *   ApiResponse.success(statusCode, data, message)
   *   ApiResponse.success(message, data)
   *   ApiResponse.success(data, message)
   */
  static success(arg1, arg2, arg3) {
    if (typeof arg1 === "number") {
      if (typeof arg2 === "string") {
        return new ApiResponse(arg1, arg3 !== undefined ? arg3 : null, arg2);
      }
      return new ApiResponse(arg1, arg2, typeof arg3 === "string" ? arg3 : "Success");
    }

    if (typeof arg1 === "string") {
      return new ApiResponse(200, arg2 !== undefined ? arg2 : null, arg1);
    }

    return new ApiResponse(200, arg1, typeof arg2 === "string" ? arg2 : "Success");
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
