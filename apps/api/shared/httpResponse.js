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

export function errorResponse(error, statusCode = 500) {
    return createResponse(statusCode, {
        success: false,
        error: error.message || error
    });
}

export function notFoundResponse(message = 'Resource not found') {
    return errorResponse(message, 404);
}

export function badRequestResponse(message) {
    return errorResponse(message, 400);
}
