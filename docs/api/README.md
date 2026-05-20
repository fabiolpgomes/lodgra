# Lodgra API Documentation

Quick reference for main API endpoints.

---

## Properties

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/properties` | List user properties | ✅ |
| POST | `/api/properties` | Create property | ✅ |
| GET | `/api/properties/[id]` | Get property details | ✅ |
| PUT | `/api/properties/[id]` | Update property | ✅ |
| DELETE | `/api/properties/[id]` | Delete property | ✅ |
| GET | `/api/public/properties/[slug]` | Public property view | ❌ |

---

## Reservations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/reservations` | List reservations | ✅ |
| POST | `/api/reservations` | Create reservation | ✅ |
| GET | `/api/reservations/[id]` | Get reservation details | ✅ |
| PUT | `/api/reservations/[id]` | Update reservation | ✅ |
| DELETE | `/api/reservations/[id]` | Cancel reservation | ✅ |

---

## Billing & Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/billing/subscription` | Get subscription details | ✅ |
| POST | `/api/billing/checkout` | Create checkout session | ✅ |
| POST | `/api/billing/portal` | Create billing portal session | ✅ |
| POST | `/api/webhooks/stripe` | Stripe webhook handler | ❌ |

---

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | User login | ❌ |
| POST | `/api/auth/signup` | User registration | ❌ |
| POST | `/api/auth/logout` | User logout | ✅ |
| POST | `/api/auth/refresh` | Refresh session | ✅ |

---

## Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List all users | ✅ Admin |
| PUT | `/api/admin/users/[id]` | Update user | ✅ Admin |
| DELETE | `/api/admin/users/[id]` | Delete user | ✅ Admin |

---

## Sync & Integrations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/sync/airbnb` | Sync Airbnb calendar | ✅ |
| POST | `/api/sync/booking` | Sync Booking.com calendar | ✅ |
| POST | `/api/webhook/airbnb` | Airbnb webhook | ❌ |
| POST | `/api/webhook/booking` | Booking.com webhook | ❌ |

---

## Response Format

### Success (2xx)
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error (4xx, 5xx)
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Rate Limiting

- **Standard:** 1000 requests/hour
- **Authentication:** 50 requests/minute
- **Webhooks:** Unlimited

---

## Authentication

All protected endpoints require:

```
Authorization: Bearer {access_token}
```

Get token via:
- Supabase authentication session
- Cookie-based session (automatic in Next.js)

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Server Error |

---

## Example: Create Property

```bash
curl -X POST https://lodgra.io/api/properties \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beach House",
    "description": "Beautiful beach property",
    "address": "123 Main St",
    "city": "Lagos",
    "country": "Portugal",
    "max_guests": 6,
    "bedrooms": 3,
    "bathrooms": 2,
    "base_price": 150,
    "currency": "EUR"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prop_123abc",
    "slug": "beach-house-lagos",
    "name": "Beach House",
    "created_at": "2026-05-20T12:00:00Z"
  }
}
```

---

## Webhooks

### Stripe Events

Webhook secret: `STRIPE_WEBHOOK_SECRET`

Endpoint: `POST /api/webhooks/stripe`

Handled events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## Pagination

APIs supporting pagination use:

```
GET /api/properties?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

## Filtering & Sorting

### Filtering
```
GET /api/properties?city=Lagos&status=active
```

### Sorting
```
GET /api/properties?sort=created_at&order=desc
```

---

**Note:** This is a quick reference. For complete API documentation with request/response examples for each endpoint, see:
- Supabase GraphQL API: https://supabase.com/docs/reference/graphql-api
- Next.js API Routes: https://nextjs.org/docs/pages/building-your-application/routing/api-routes

---

**Last Updated:** 2026-05-20
