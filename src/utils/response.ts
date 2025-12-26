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
  static paginated(data: any[], meta: { total: number; page: number; limit: number; totalPages: number }, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      meta,
      statusCode: 200
    };
  }
}

export default ApiResponse;
