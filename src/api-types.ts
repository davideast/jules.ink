export interface GenerateRequest {
  prompt: string;
}

/**
 * Response for the generate endpoint.
 * On success, the response body is a binary image (PNG).
 * On error, it returns a JSON object with an error message.
 */
export interface GenerateResponse {
  error?: string;
}
