# iCal Sync Testing Guide

## Overview
This guide walks through testing the bidirectional iCal synchronization feature for direct bookings.

## Test User Setup
- **Email:** `final1776145435@test.com`
- **Organization:** Default (00000000-0000-0000-0000-000000000001)
- **Role:** Admin (full access)
- **Deployment:** https://home-stay-hl9bhx5w3-fabiolpgomes-projects.vercel.app

## Test Steps

### 1. Login
1. Go to staging deployment
2. Click "Login" or go to `/auth/login`
3. Enter credentials for `final1776145435@test.com`
4. Should redirect to `/pt/calendar`

### 2. Navigate to Reservations (Availability Check)
1. Click "Reservas" in the navigation
2. Should NOT logout or redirect to login
3. You're now at `/pt/reservations`

### 3. Create a Test Reservation
1. Click "Nova Reserva" or go to `/pt/reservations/new`
2. Fill in the form:
   - **Propriedade:** Select any property
   - **Check-in:** Select a date (e.g., 2026-07-01)
   - **Check-out:** Select a date after check-in (e.g., 2026-07-05)
   - **Hóspede:**
     - Nome: "Test Guest"
     - Sobrenome: "Final"
     - Email: "testguest@example.com"
     - Telefone: (optional)
   - **Nº Hóspedes:** 2
   - **Valor Total:** 500.00

3. Click "Criar Reserva"
4. Should see success message: "Reserva criada com sucesso!"
5. Should be redirected to reservation details page

### 4. Verify Database Records (Testing)
Execute these queries in Supabase dashboard:

**Check reservation was created:**
```sql
SELECT id, property_listing_id, check_in, check_out, synced_to_platforms, synced_platforms_at
FROM reservations
WHERE check_in = '2026-07-01'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: `synced_to_platforms = true`

**Check sync logs:**
```sql
SELECT reservation_id, property_listing_id, platform, direction, status, message
FROM sync_logs
WHERE direction = 'app_to_platform'
ORDER BY created_at DESC
LIMIT 10;
```

Expected: Entries for each platform (booking_com, airbnb, flatio, direct)

### 5. Test Availability Validation
1. Go back to `/pt/reservations/new`
2. Try creating another reservation with overlapping dates (2026-07-03 to 2026-07-06)
3. Should see error: "As datas selecionadas já estão bloqueadas" with conflicting dates
4. Try different dates, should allow creation

### 6. Test Reservation Editing
1. Go to a reservation detail page (`/pt/reservations/{id}`)
2. Click "Editar Reserva"
3. Change check-in date to 2026-07-10
4. Click "Salvar Alterações"
5. Should see success message
6. Check sync_logs for new `app_to_platform` entries

## Expected Behavior

### On Reservation Creation
- ✓ Availability check validates dates against existing reservations
- ✓ Synced_to_platforms flag set to true
- ✓ Sync logs created with direction='app_to_platform'
- ✓ Fire-and-forget sync doesn't block form submission

### On Reservation Editing
- ✓ Availability check excludes current reservation
- ✓ Can change dates without triggering conflicts with self
- ✓ Sync logs updated with new sync operation

### Conflict Scenarios
- ✓ Overlapping dates show conflicting reservation names
- ✓ Multiple conflicts listed if they exist
- ✓ Guest names displayed correctly (first_name + last_name)

## Troubleshooting

### User Logged Out When Accessing Reservations
**Status:** ✅ FIXED by migration 20260414_01
- Root cause was missing user_profiles record
- User can now access /reservations without logout

### Sync Not Happening
- Check CRON_SECRET is set in environment
- Check that sync_logs has entries
- Verify synced_to_platforms flag is true

### Availability Check Not Working
- Verify property has active listings
- Check that listings are in property_listings table
- Verify reservation dates are in YYYY-MM-DD format

## Notes
- Sync to platforms is fire-and-forget (doesn't block reservation creation)
- Actual platform sync happens asynchronously
- Sync status can be monitored in sync_logs table
- Migration 20260414_01 is temporary and should be removed after testing
