/**
 * Standard response handler for Azure Functions
 */
export function createResponse(statusCode, body) {
    return {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

export function successResponse(data, statusCode = 200) {
    return createResponse(statusCode, {
        success: true,
        data
    });
}

export function errorResponse(errorOrStatus, statusCodeOrMessage = 500, details = null) {
    let status = 500;
    let message = 'Unknown error';
    let errorDetails = details;

    if (typeof errorOrStatus === 'number') {
        // Usage: errorResponse(status, message, details)
        status = errorOrStatus;
        message = statusCodeOrMessage;
    } else {
        // Usage: errorResponse(message/error, status)
        message = (errorOrStatus && errorOrStatus.message) ? errorOrStatus.message : errorOrStatus;
        status = statusCodeOrMessage;
    }

    const body = {
        success: false,
        error: message
    };

    if (errorDetails) {
        body.details = errorDetails;
    }

    return createResponse(status, body);
}

// Aliases for compatibility
export const createSuccessResponse = successResponse;
export const createErrorResponse = errorResponse;

export function notFoundResponse(message = 'Resource not found') {
    return errorResponse(message, 404);
}

export function badRequestResponse(message) {
    return errorResponse(message, 400);
}
