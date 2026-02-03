/**
 * Standard API Response Structure
 */
export class ApiResponse {
  /**
   * Send a successful JSON response
   * @param data Data to return
   * @param message Optional message
   * @param statusCode HTTP status code (default: 200)
   */
  static success(data: any = null, message: string = 'Success', statusCode: number = 200) {
    return {
      success: true,
      message,
      data,
      statusCode
    };
  }

  /**
   * Helper for paginated responses
   */
  static paginated(data: any[], meta: { currentPage: number; limit: number; totalRecords: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean; }, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      meta,
      statusCode: 200
    };
  }

  /**
   * Helper for cursor-based paginated responses
   */
  static cursorPaginated(data: any[], meta: { nextCursor: string | null }, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      meta,
      statusCode: 200
    };
  }

  /**
   * Send an error JSON response
   * @param message Error message
   * @param statusCode HTTP status code (default: 500)
   * @param errors Optional array of specific errors
   */
  static error(message: string = 'Error', statusCode: number = 500, errors: any[] = []) {
    return {
      success: false,
      message,
      data: null,
      errors,
      statusCode
    };
  }
}

export default ApiResponse;
