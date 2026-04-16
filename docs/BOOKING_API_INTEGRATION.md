# Booking.com API Integration Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Webhook Setup](#webhook-setup)
3. [API Payload Structure](#api-payload-structure)
4. [Testing Locally](#testing-locally)
5. [Troubleshooting](#troubleshooting)
6. [Security Considerations](#security-considerations)
7. [Rate Limiting](#rate-limiting)

## Getting Started

### Prerequisites
- Active Booking.com extranet account with API access enabled
- Administrator or property manager role in Booking.com
- Vercel or local development environment with ngrok

### Step 1: Register Application in Booking.com Extranet

1. Log in to [Booking.com Extranet](https://partner.booking.com)
2. Navigate to **Tools → APIs & Integrations**
3. Click **Create New Application**
4. Fill in application details:
   - **Application Name**: "Synkra AIOS" (or your organization name)
   - **Description**: "Channel management and reservation sync"
   - **Redirect URI**: `https://<your-domain>/api/auth/booking/callback` (optional for webhooks)
5. Accept terms and click **Create**
6. Copy your **Client ID** and **Client Secret** from the credentials panel

### Step 2: Generate API Credentials

1. In the Booking.com Extranet, navigate to **Tools → API Documentation**
2. Generate an **API Key** (not OAuth token)
3. Record the **Webhook Secret** provided for your application
4. Store credentials securely in your `.env.local`:

```bash
BOOKING_API_KEY=your-api-key-here
BOOKING_WEBHOOK_SECRET=your-webhook-secret-here
BOOKING_API_ENDPOINT=https://api.booking.com/v2  # Booking's API base URL
BOOKING_PROPERTY_ID=your-property-id  # For testing
```

### Step 3: Request API Scopes

Contact Booking.com support to enable:
- **Reservations Read**: Access to reservation data
- **Availability Write**: Push availability/calendar updates
- **Price Write**: Push pricing updates
- **Webhooks**: Receive real-time notifications

Include in your request:
- Application ID
- Business use case description
- Expected monthly API call volume

## Webhook Setup

### Registering Webhook Endpoints

Once API access is approved, register webhook endpoints in the Booking.com Extranet:

1. Navigate to **Tools → APIs & Integrations → Webhooks**
2. Click **Add Webhook**
3. Configure for each event type:

#### Reservation Events
- **Endpoint URL**: `https://your-domain.com/api/webhooks/booking/reservation`
- **Event Types**:
  - `reservation.created`
  - `reservation.modified`
  - `reservation.cancelled`
- **Version**: Select latest API version (v2.x)
- **Enable**: Check "Active"

#### Availability Events (optional)
- **Endpoint URL**: `https://your-domain.com/api/webhooks/booking/availability`
- **Event Types**:
  - `availability.updated`
- **Version**: Latest API version

#### Price Events (optional)
- **Endpoint URL**: `https://your-domain.com/api/webhooks/booking/price`
- **Event Types**:
  - `price.updated`
- **Version**: Latest API version

4. Booking.com will perform a **test handshake** — your endpoint must respond within 5 seconds
5. Click **Verify** to confirm successful registration

### Webhook Security

Each webhook request includes an `X-Booking-Signature` header:

```
X-Booking-Signature: Base64(HMAC-SHA256(raw_body, BOOKING_WEBHOOK_SECRET))
```

**Always validate this signature** before processing the webhook. See [Testing Locally](#testing-locally) for validation examples.

## API Payload Structure

### Reservation Webhook Payload

```json
{
  "event_id": "evt_1a2b3c4d5e6f7g8h",
  "timestamp": "2026-03-25T14:30:00Z",
  "event_type": "reservation.created",
  "data": {
    "reservation": {
      "id": "booking_12345678",
      "booking_reference": "BK123ABC",
      "property_id": "12345",
      "guest": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1 (555) 123-4567",
        "country_code": "US"
      },
      "check_in": "2026-04-01",
      "check_out": "2026-04-05",
      "nights": 4,
      "number_of_guests": 2,
      "number_of_rooms": 1,
      "status": "CONFIRMED",
      "total_price": {
        "currency": "USD",
        "amount": 400.00,
        "commission": 80.00,
        "net": 320.00
      },
      "special_requests": "Early check-in requested",
      "created_at": "2026-03-24T10:15:00Z",
      "updated_at": "2026-03-25T14:30:00Z"
    }
  }
}
```

### Availability Update Payload

```json
{
  "event_id": "evt_2b3c4d5e6f7g8h9i",
  "timestamp": "2026-03-25T15:45:00Z",
  "event_type": "availability.updated",
  "data": {
    "availability": {
      "property_id": "12345",
      "date": "2026-04-01",
      "blocked": false,
      "min_stay": 1,
      "max_stay": 30
    }
  }
}
```

### Price Update Payload

```json
{
  "event_id": "evt_3c4d5e6f7g8h9i0j",
  "timestamp": "2026-03-25T16:20:00Z",
  "event_type": "price.updated",
  "data": {
    "price": {
      "property_id": "12345",
      "date": "2026-04-01",
      "currency": "USD",
      "nightly_rate": 100.00,
      "surcharge": 0.00
    }
  }
}
```

## Testing Locally

### Option 1: Using ngrok (Recommended)

1. Install [ngrok](https://ngrok.com/download)
2. Start your local dev server:
   ```bash
   npm run dev
   ```
3. In a new terminal, expose your local server:
   ```bash
   ngrok http 3000
   ```
4. Copy the `https://xxxxx.ngrok.io` URL
5. Register webhook endpoint: `https://xxxxx.ngrok.io/api/webhooks/booking/reservation`
6. In Booking.com Extranet, test the webhook (Booking.com will send a test payload)

### Option 2: Using curl with Mock Payload

Generate a valid HMAC signature and test locally:

```bash
#!/bin/bash

# Configuration
WEBHOOK_SECRET="your-webhook-secret-here"
ENDPOINT="http://localhost:3000/api/webhooks/booking/reservation"

# Create test payload
PAYLOAD='{"event_id":"evt_test_123","timestamp":"2026-03-25T14:30:00Z","event_type":"reservation.created","data":{"reservation":{"id":"booking_test_1","property_id":"12345","guest":{"name":"Test Guest","email":"test@example.com"},"check_in":"2026-04-01","check_out":"2026-04-05","number_of_guests":2,"status":"CONFIRMED","total_price":{"currency":"USD","amount":400.00}}}}'

# Generate HMAC-SHA256 signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

# Send webhook request
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Booking-Signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  "$ENDPOINT"
```

Save this as `test-webhook.sh` and run:
```bash
chmod +x test-webhook.sh
./test-webhook.sh
```

Expected response: `200 OK` with JSON response indicating reservation was processed.

### Option 3: Using Postman

1. Create a new POST request in Postman
2. Set URL: `http://localhost:3000/api/webhooks/booking/reservation`
3. Set headers:
   ```
   Content-Type: application/json
   X-Booking-Signature: <computed_signature>
   ```
4. Set body to the example JSON payload above
5. Use Postman's **Pre-request Script** tab to compute HMAC:
   ```javascript
   const payload = JSON.stringify(pm.request.body.raw);
   const secret = pm.environment.get('booking_webhook_secret');
   const signature = CryptoJS.enc.Base64.stringify(
     CryptoJS.HmacSHA256(payload, secret)
   );
   pm.request.headers.add({
     key: 'X-Booking-Signature',
     value: signature
   });
   ```

### Debugging Webhook Delivery

Check webhook delivery logs in Booking.com Extranet:

1. Navigate to **Tools → APIs & Integrations → Webhooks**
2. Click on your webhook endpoint
3. View **Recent Deliveries** tab to see:
   - Request timestamp
   - Response status code
   - Response body
   - Any error messages
   - Retry attempts

## Troubleshooting

### Issue: Webhook Not Receiving Events

**Symptoms**: Registered webhook but no events are being sent.

**Solutions**:
1. Verify webhook is **Active** in Booking.com Extranet
2. Check that **Test Handshake** passed (should return 200 within 5 seconds)
3. Verify your endpoint is **publicly accessible** (not localhost)
4. Check endpoint logs for incoming requests
5. Verify API scope **Webhooks** is enabled for your application
6. Re-register webhook — sometimes the initial registration fails silently

### Issue: 401 Unauthorized on Webhook

**Symptoms**: Endpoint returns 401 Unauthorized when webhook is sent.

**Solutions**:
1. Verify `BOOKING_WEBHOOK_SECRET` is correct in `.env.local`
2. Check that signature validation is comparing **exact same raw body**
3. Ensure no middleware is modifying/parsing the request body before signature validation
4. Log the incoming signature and computed signature for comparison

### Issue: Duplicate Reservations

**Symptoms**: Same reservation appears multiple times in database.

**Solutions**:
1. Verify `external_id` uniqueness constraint on reservations table
2. Check for duplicate webhook deliveries in Booking.com logs
3. Implement idempotency key (event_id should be unique per event)
4. Use database transaction to prevent race conditions

### Issue: Rate Limiting (429 Responses)

**Symptoms**: Webhook returns 429 Too Many Requests.

**Solutions**:
1. Current limit is 5 requests/minute per property_id
2. Booking.com has exponential backoff retry logic — let it retry
3. Check Redis connection if using Upstash (fallback to in-memory if offline)
4. Monitor dashboard for spike in webhook traffic
5. Contact Booking.com support if you need higher limits

### Issue: Signature Validation Fails

**Symptoms**: X-Booking-Signature does not match computed value.

**Common Causes**:
- Body was modified after reading (middleware parsing, logging, etc.)
- Signature header is URL-decoded (should be Base64 raw)
- Using different encoding (UTF-8 vs ASCII)
- Clock skew (server time out of sync)

**Debug Steps**:
```typescript
// Log the raw body as bytes
console.log('Raw body bytes:', Buffer.from(rawBody).toString('hex'));
console.log('Received signature:', req.headers['x-booking-signature']);
console.log('Computed signature:', computedSignature);
```

## Security Considerations

### 1. Always Validate Signatures

**Never process a webhook without signature validation:**

```typescript
import crypto from 'crypto';

function validateBookingSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf-8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}
```

### 2. Use HTTPS Only

- Always use HTTPS endpoints (not HTTP)
- Booking.com will reject HTTP endpoints
- Use valid SSL/TLS certificate

### 3. Store Secrets Securely

- **Never commit** `BOOKING_WEBHOOK_SECRET` or `BOOKING_API_KEY` to git
- Use environment variables or secret management service
- Rotate API keys periodically (recommended every 90 days)
- Use service role key for server-side operations only

### 4. Implement Idempotency

- Use `event_id` to detect duplicate deliveries
- Store processed event IDs with timestamp
- Clean up old event IDs after 24 hours

### 5. Log Sensitive Data Carefully

- **Never log** full BOOKING_API_KEY or BOOKING_WEBHOOK_SECRET
- **Never log** guest emails/phones in production
- Log request ID, property ID, event type, status code only
- Use structured logging with appropriate log levels

### 6. Rate Limiting

- Implement per-property-id rate limiting
- Return `429 Too Many Requests` with `Retry-After` header
- Allow Booking.com's retry logic to handle temporary limits

### 7. Timeout Management

- Set webhook timeout to 5 seconds (Booking.com requirement)
- Return response immediately, process asynchronously if needed
- Use background jobs (Bull queue or similar) for long-running operations

## Rate Limiting

### Configuration

The system uses Upstash Redis for distributed rate limiting:

```typescript
// Rate limit: 5 requests per minute per property_id
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 5;     // requests
```

### Fallback Behavior

If Redis is unavailable:
- In-memory store is used (within single instance)
- **Warning**: Multi-instance deployments must use Redis
- Rate limit window resets on server restart

### Response Headers

When rate limited, the API returns:

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45

{"error": "Too many requests", "retry_after": 45}
```

Booking.com will automatically retry after the `Retry-After` duration.

## Next Steps

1. **Enable Webhook Support**: Contact Booking.com support to enable webhooks API
2. **Deploy Webhook Endpoint**: Ensure `/api/webhooks/booking/reservation` is deployed
3. **Register Endpoints**: Add webhook URLs in Booking.com Extranet
4. **Test Delivery**: Verify webhook test handshake succeeds
5. **Monitor Logs**: Watch for incoming webhook events in application logs
6. **Verify Sync**: Confirm reservations appear in dashboard within seconds

## Related Documentation

- [Channel Manager Foundation](./channel-manager.md)
- [Stripe Webhook Pattern](./STRIPE_WEBHOOK_PATTERN.md) — Similar implementation reference
- [RLS & Multi-tenancy](./SCHEMA.md) — Organization isolation details
- [Environment Variables Guide](./ENV_SETUP.md)

## Support

For issues with:
- **Booking.com API**: Contact [Booking.com Partner Support](https://partner.booking.com/en-us/help)
- **Webhook Integration**: Review logs in Booking.com Extranet → Recent Deliveries
- **Application Bugs**: Check application logs and GitHub Issues
