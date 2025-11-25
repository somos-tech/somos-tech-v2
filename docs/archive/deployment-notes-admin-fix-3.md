# Admin API Fixes - Part 3

## Issue Description
The Admin Dashboard endpoints were returning 500 Internal Server Errors.
Investigation revealed a mismatch in the `errorResponse` function signature between the shared utility and the consumer functions.

- `apps/api/functions/adminUsers.js` was calling `errorResponse(statusCode, message, details)`.
- `apps/api/shared/httpResponse.js` was defined as `errorResponse(error, statusCode)`.

This caused the `statusCode` in the response to be a string (the message), which Azure Functions rejected, resulting in a 500 error.

## Changes Implemented

### 1. Polymorphic Error Response Handler
Updated `apps/api/shared/httpResponse.js` to support both calling conventions:
- `errorResponse(statusCode, message, details)` - Legacy/Admin usage.
- `errorResponse(messageOrError, statusCode)` - Standard usage.

This ensures backward compatibility and fixes the immediate crash in the admin endpoints.

### 2. Verification Script
Added `scripts/verify-http-response.js` to test the `errorResponse` function with various input patterns to ensure stability.

## Verification
The fix ensures that `errorResponse` always returns a valid numeric status code, preventing the Azure Functions runtime from crashing due to invalid response formats.
