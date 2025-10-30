# Agent Schema Consistency Guide

## Problem Statement

The Azure OpenAI agent was generating responses with an incorrect schema that didn't match the TypeScript `SocialMediaPosts` interface, causing display issues in the frontend.

### Bad Response Example
The agent was returning complex nested structures with extra fields like:
- `locale`, `event`, `constraints`, `compliance` (duplicated from input)
- `campaign` object with `posts` containing `schedule`, `assets`, etc.
- `id`, `publishAtISO`, `type` fields in posts
- Additional platforms like "facebook" not in the schema

## Solution

### 1. **Strict System Instructions** 📋

Created `/apps/api/shared/prompts/socialPostsAgent.md` with:

- ✅ **Clear JSON schema** with exact field requirements
- ✅ **Explicit examples** showing correct output format
- ✅ **DO NOT INCLUDE list** of fields to avoid
- ✅ **Validation checklist** before returning
- ✅ **Platform-specific rules** (x, instagram, linkedin only)
- ✅ **Variant restrictions** (A or B only)

**Key instruction added:**
```
REMEMBER: Return ONLY the JSON. No markdown code blocks, no explanatory text, just the raw JSON object.
```

### 2. **Backend Validation** ✅

Enhanced `agentService.js` with:

#### `validateSocialMediaPostsSchema(data)`
Validates that agent responses match the expected schema:
- Required top-level fields: `summary`, `recommendedWindow`, `posts`, `complianceChecklist`
- Each post must have: `platform`, `variant`, `copy`, `altText`, `suggestedMedia`, `suggestedHashtags`, `suggestedMentions`, `suggestedTime`, `utmLink`
- Platform must be: `x`, `instagram`, or `linkedin`
- Variant must be: `A` or `B`
- All arrays and booleans properly typed

#### `extractJsonFromResponse(text)`
Extracts JSON from various response formats:
- Handles markdown code blocks (```json ... ```)
- Handles raw JSON objects
- Throws clear errors if JSON not found

#### Updated `invokeAgent()`
Now returns:
```javascript
{
  threadId: string,
  runId: string,
  message: string,          // Raw response
  parsedData: object|null,  // Validated JSON or null
  validationError: string|null, // Error message if validation failed
  allMessages: array
}
```

### 3. **Updated Social Media Service** 🔄

Modified `socialMediaService.js` to:
- Use the validated `parsedData` from agent response
- Return clear success/failure status
- Include validation error details for debugging
- Provide fallback handling for unexpected formats

## How to Use in Your Agent Configuration

### Step 1: Configure Your Azure OpenAI Agent

In Azure AI Foundry/OpenAI Studio:

1. **Create or update your agent**
2. **Paste the system instructions** from `/apps/api/shared/prompts/socialPostsAgent.md`
3. **Save the agent configuration**
4. **Copy the Agent ID** to your environment variables

### Step 2: Environment Variables

```bash
# In apps/api/local.settings.json or .env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_API_VERSION=2024-05-01-preview
AZURE_OPENAI_AGENT_ID=asst_xxxxxxxxxxxxx

# Optional: Separate agent for social media
SOCIAL_MEDIA_AGENT_ID=asst_xxxxxxxxxxxxx
```

### Step 3: Testing the Schema

Use the test endpoint to verify schema compliance:

```bash
# Test the agent directly
curl -X POST http://localhost:7071/api/agent/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate social media posts for: {\"event\":{\"name\":\"Test Event\",\"description\":\"A test event\",\"startDateTimeISO\":\"2025-11-15T18:00:00-07:00\",\"venue\":\"Test Venue\",\"city\":\"Seattle\",\"channel\":\"in-person\",\"url\":\"https://test.com\",\"rsvpUrl\":\"https://test.com/rsvp\"},\"audience\":{\"primary\":\"developers\"},\"constraints\":{\"tone\":\"friendly\",\"hashtags\":[\"#Test\"],\"emojiAllowed\":true,\"linksInCopy\":true},\"compliance\":{\"noMedicalClaims\":true,\"accessibleAltText\":true}}"
  }'
```

Expected response structure:
```json
{
  "success": true,
  "data": {
    "threadId": "thread_...",
    "runId": "run_...",
    "message": "{...}",
    "parsedData": {
      "summary": "...",
      "recommendedWindow": ["...", "..."],
      "posts": [...],
      "complianceChecklist": {...}
    },
    "validationError": null,
    "allMessages": [...]
  }
}
```

If validation fails:
```json
{
  "success": true,
  "data": {
    "threadId": "thread_...",
    "parsedData": null,
    "validationError": "Missing required field: summary",
    "message": "..."
  }
}
```

## Debugging Schema Issues

### Check Validation Errors

If the agent is still returning incorrect schema:

1. **Check the logs** for validation errors:
   ```bash
   # In Azure Functions logs
   Failed to parse/validate agent response as SocialMediaPosts: ...
   ```

2. **Inspect the raw response**:
   ```javascript
   // The response.message contains the raw agent output
   console.log('Raw agent response:', response.message);
   ```

3. **Common issues**:
   - Agent includes markdown code blocks → Should be handled by `extractJsonFromResponse`
   - Extra fields in response → Update system instructions to emphasize "NO ADDITIONAL FIELDS"
   - Wrong platform names → Validate against `['x', 'instagram', 'linkedin']`
   - Missing required fields → Check required fields list in validation

### Iterating on System Instructions

If you need to modify the schema:

1. Update the TypeScript type in `/apps/web/src/shared/types.ts`
2. Update the validation in `/apps/api/shared/services/agentService.js`
3. Update the system instructions in `/apps/api/shared/prompts/socialPostsAgent.md`
4. Update the examples in the prompt
5. Test with the agent endpoint

## Best Practices

### 1. **Be Explicit in Instructions** 📝
- List exact field names
- Show complete examples
- Use "DO NOT INCLUDE" lists
- Repeat critical constraints

### 2. **Validate Everything** ✅
- Required fields
- Field types (string, array, boolean)
- Enum values (platform, variant)
- Array contents

### 3. **Provide Clear Error Messages** 🚨
- Return validation errors to help debug
- Log raw responses for inspection
- Include field names in error messages

### 4. **Test Regularly** 🧪
- Test with various event types
- Verify all platforms generate correctly
- Check edge cases (missing fields, etc.)
- Validate datetime formats

### 5. **Version Your Prompts** 📌
- Keep prompt versions in git
- Document schema changes
- Test before deploying to production

## Expected TypeScript Schema

```typescript
interface SocialMediaPost {
  platform: 'x' | 'instagram' | 'linkedin';
  variant: 'A' | 'B';
  copy: string;
  altText: string;
  suggestedMedia: string[];
  suggestedHashtags: string[];
  suggestedMentions: string[];
  suggestedTime: string; // ISO8601 datetime
  utmLink: string;
  notes?: string;
}

interface SocialMediaPosts {
  summary: string;
  recommendedWindow: string[]; // 2 ISO8601 datetimes
  posts: SocialMediaPost[];
  complianceChecklist: {
    no_deceptive_claims: boolean;
    no_personal_data: boolean;
    alt_text_present: boolean;
    length_ok: boolean;
  };
}
```

## Troubleshooting

### Agent still returns wrong schema

1. **Verify agent configuration** in Azure AI Foundry
2. **Check that system instructions are applied** (re-save the agent)
3. **Try with a new thread** (old threads may have cached instructions)
4. **Increase temperature** if responses are too rigid (or decrease if too creative)

### Validation always fails

1. **Check the validation logic** in `agentService.js`
2. **Log the raw response** to see what's actually being returned
3. **Update system instructions** to be more explicit
4. **Verify JSON parsing** is working correctly

### Frontend displays incorrectly

1. **Verify the parsedData** is being used (not the raw message)
2. **Check TypeScript types** match the schema
3. **Validate at the API boundary** before sending to frontend
4. **Use defensive rendering** in React components

## Summary

To ensure consistent agent schema output:

1. ✅ Use the detailed system instructions in `/apps/api/shared/prompts/socialPostsAgent.md`
2. ✅ Validation happens automatically in `agentService.js`
3. ✅ Check `parsedData` and `validationError` in responses
4. ✅ Monitor logs for validation failures
5. ✅ Test regularly with various inputs

The system now validates every agent response against your TypeScript schema and provides clear error messages when the agent deviates from the expected format.
