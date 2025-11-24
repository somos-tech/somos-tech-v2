
import { errorResponse } from '../apps/api/shared/httpResponse.js';

console.log("Verifying errorResponse fix...");

// Test Case 1: Old usage (status, message, details)
console.log("\nTest Case 1: errorResponse(500, 'Internal Error', 'Details')");
const res1 = errorResponse(500, 'Internal Error', 'Details');
console.log("Result:", JSON.stringify(res1, null, 2));

if (res1.status === 500 && JSON.parse(res1.body).error === 'Internal Error' && JSON.parse(res1.body).details === 'Details') {
    console.log("PASS");
} else {
    console.log("FAIL");
}

// Test Case 2: New usage (message, status)
console.log("\nTest Case 2: errorResponse('Auth Failed', 401)");
const res2 = errorResponse('Auth Failed', 401);
console.log("Result:", JSON.stringify(res2, null, 2));

if (res2.status === 401 && JSON.parse(res2.body).error === 'Auth Failed') {
    console.log("PASS");
} else {
    console.log("FAIL");
}

// Test Case 3: New usage with Error object
console.log("\nTest Case 3: errorResponse(new Error('Crash'), 500)");
const res3 = errorResponse(new Error('Crash'), 500);
console.log("Result:", JSON.stringify(res3, null, 2));

if (res3.status === 500 && JSON.parse(res3.body).error === 'Crash') {
    console.log("PASS");
} else {
    console.log("FAIL");
}
