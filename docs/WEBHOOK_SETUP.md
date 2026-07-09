# Webhook Setup Guide - Lodgra

This guide explains how to register and configure webhooks for Booking.com and Airbnb with Lodgra.

## Overview

Webhooks enable **real-time synchronization** of reservations:
- Guest cancels on Booking → Lodgra updates **instantly** (no 5-60min lag)
- Property manager sees availability **immediately**
- No more overbooking or double-bookings

## Webhook URLs

| Platform | Endpoint |
|----------|----------|
| Booking.com | `https://www.lodgra.io/api/webhooks/booking/reservation` |
| Airbnb | `https://www.lodgra.io/api/webhooks/airbnb/reservation` |

---

## Booking.com Webhook Setup

### Step 1: Enable Extranet Partner Notifications

1. Go to **Booking.com Extranet** → **Account Settings**
2. Find **Partner Notifications** section
3. Enable **Reservation Events API**

### Step 2: Register Webhook URL

1. Go to **Settings** → **Integrations** → **Webhooks**
2. Click **Add Webhook**
3. Paste the Lodgra endpoint:
   ```
   https://www.lodgra.io/api/webhooks/booking/reservation
   ```
4. Select events:
   - ✅ Reservation Confirmed
   - ✅ Reservation Changed
   - ✅ Reservation Cancelled
   - ✅ Reservation Completed

### Step 3: Configure Signature Secret

1. In Webhook settings, copy the **Signature Secret**
2. Add to Lodgra environment variables:
   ```env
   BOOKING_WEBHOOK_SECRET=your_secret_here
   ```

### Step 4: Test Webhook

```bash
# Check webhook status
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  https://www.lodgra.io/api/admin/webhook-status?platform=booking
```

Expected response:
```json
{
  "platform": "booking",
  "status": "active",
  "stats": {
    "total": 0,
    "processed": 0,
    "pending": 0,
    "failed": 0
  }
}
```

---

## Airbnb Webhook Setup

### Step 1: Access Airbnb Integration Settings

1. Go to **Airbnb Host Center** → **Account** → **Integrations**
2. Find **API Access** section
3. Enable **Webhook Events**

### Step 2: Register Webhook URL

1. Click **Add Webhook Endpoint**
2. Paste the Lodgra endpoint:
   ```
   https://www.lodgra.io/api/webhooks/airbnb/reservation
   ```
3. Select events:
   - ✅ Reservation Accepted
   - ✅ Reservation Cancelled
   - ✅ Reservation Completed

### Step 3: Configure Signature Secret

1. Airbnb provides a **Signing Key**
2. Add to Lodgra environment variables:
   ```env
   AIRBNB_WEBHOOK_SECRET=your_signing_key_here
   ```

### Step 4: Test Webhook

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  https://www.lodgra.io/api/admin/webhook-status?platform=airbnb
```

---

## Webhook Payload Examples

### Booking.com - Reservation Cancelled

```json
{
  "id": "12345",
  "event_type": "reservation_cancelled",
  "reservation": {
    "id": "6816972454",
    "check_in": "2026-07-15",
    "check_out": "2026-07-18",
    "guests": 2,
    "phone": "+1-555-0123",
    "guest_name": "John Doe"
  }
}
```

### Airbnb - Reservation Cancelled

```json
{
  "id": "airbnb_evt_12345",
  "event_type": "RESERVATION_CANCELLED",
  "data": {
    "reservation_id": "87654321",
    "check_in_date": "2026-07-15",
    "check_out_date": "2026-07-18",
    "number_of_guests": 2,
    "guest": {
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "phone": "+1-555-9876"
    }
  }
}
```

---

## Troubleshooting

### Webhook Not Triggering

1. Check webhook status endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     https://www.lodgra.io/api/admin/webhook-status?platform=booking
   ```

2. Verify:
   - ✅ URL is correct (HTTPS only, no trailing slash)
   - ✅ Platform is enabled in settings
   - ✅ Events are selected

### Invalid Signature Error

1. Check that `BOOKING_WEBHOOK_SECRET` matches exactly (no spaces, case-sensitive)
2. Verify secret in platform settings hasn't changed
3. If changed, update environment variable and redeploy

### Events Not Processed

1. Check recent events:
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     https://www.lodgra.io/api/admin/webhook-status?platform=booking
   ```

2. Look for failed events in response
3. Check Lodgra logs for error details

---

## Security

### Signature Validation

All webhooks are validated using HMAC-SHA256 signatures:
- Booking.com uses `x-booking-signature` header
- Airbnb uses `x-airbnb-hmac-sha256` header

Invalid signatures are **rejected with 403 Forbidden**.

### Rate Limiting

- Max 100 concurrent webhook requests
- Failed webhooks are retried up to 3 times
- Webhooks older than 24h are archived

---

## Event Types Supported

### Booking.com
- `reservation_confirmed` → Status: confirmed
- `reservation_changed` → Status: confirmed (updated dates/guests)
- `reservation_cancelled` → Status: cancelled
- `reservation_completed` → Status: completed

### Airbnb
- `RESERVATION_ACCEPTED` → Status: confirmed
- `RESERVATION_CANCELLED` → Status: cancelled
- `RESERVATION_PREAPPROVED` → Status: pending

---

## Performance

| Metric | Target |
|--------|--------|
| Webhook latency | < 500ms |
| Signature validation | < 50ms |
| Database update | < 100ms |
| End-to-end | < 1s |
| Retry delay | 5min, 15min, 1h |

---

## Support

For webhook issues:
1. Check recent events: `/api/admin/webhook-status?platform=booking`
2. Review Lodgra logs for errors
3. Verify signature secret is correct
4. Confirm webhook URL is HTTPS (not HTTP)

