# Calendar Management Guide

Complete guide for managing property calendars, blocking dates, and reservation visibility.

---

## Overview

The Lodgra calendar system provides property managers with comprehensive tools to:
- View multi-property calendars with reservations overview
- Access detailed property-specific calendars with guest information
- Block dates for maintenance/cleaning
- Synchronize with external booking platforms (Airbnb, Booking.com)

---

## Property Calendar View

### Overview

The Property Calendar provides a detailed view of a single property's reservations with comprehensive guest and booking information displayed directly in the calendar cells.

### Accessing Property Calendar

1. Navigate to your dashboard: `https://lodgra.io/pt-BR/calendar`
2. Click on any property name or row to view its detailed calendar
3. URL: `https://lodgra.io/pt-BR/calendar/[propertyId]`

### Calendar Features

#### Desktop View
- **Full property name** displayed in header
- **Complete reservation information** in each cell:
  - Guest full name
  - Number of guests (occupancy)
  - Reservation price with currency symbol
  - Status badge (Confirmado, Hospedado, Pendente, Concluído)
- **Month and week number** navigation
- **Color-coded status badges:**
  - Confirmado: Blue background
  - Hospedado: Green background
  - Pendente: Amber background
  - Concluído: Gray background

#### Mobile View
- **Optimized layout** for devices < 1024px width
- **Compact property name** (truncated with ellipsis if long)
- **"← Retornar" button** to return to dashboard
- **Guest first name only** (space-efficient display)
- **Touch-friendly cell sizing**

### Date Filtering

The property calendar automatically displays:
- ✅ **Current & future reservations** (checkout date ≥ today)
- ❌ **Past reservations** (hidden to reduce clutter)

This ensures you see only relevant, actionable reservations.

### Navigation

#### Desktop
- **← Voltar** button (top-left) → Returns to dashboard
- **Month display** with week number (center)
- **← → arrows** to browse previous/next weeks

#### Mobile
- **← Retornar** button with property name (top bar)
- **Compact week/month display**
- **← → arrows** for week navigation

### Timezone Information

The property calendar uses UTC-based date calculations to ensure consistency across all timezones. This eliminates timezone-related offset bugs and ensures reservations display on the correct dates regardless of your local time zone.

---

## Block Dates Modal

### Purpose
The Block Dates modal allows property managers to mark specific date ranges as unavailable on their calendars. This is useful for:
- Maintenance and repairs
- Deep cleaning sessions
- Personal use of the property
- Buffer time between bookings

### Accessing Block Dates

1. Navigate to your property calendar: `https://lodgra.io/pt-BR/calendar`
2. Click on any date in the calendar
3. Select "Bloquear Datas" (Block Dates) from the action menu
4. The Block Dates modal will open

### Using the Block Dates Modal

#### Fields

| Field | Format | Description | Required |
|-------|--------|-------------|----------|
| **Check-in** | `dd.mm.yyyy` | Start date of the block period | ✅ Yes |
| **Check-out** | `dd.mm.yyyy` | End date of the block period | ✅ Yes |
| **Propriedade** | Dropdown | Select the property to block dates for | ✅ Yes |
| **Motivo** | Text | Reason for blocking (e.g., "Maintenance", "Cleaning") | ❌ Optional |

#### Date Format

Dates must be entered in **Portuguese locale format**: `dd.mm.yyyy`

**Examples:**
- 19.12.2026 (December 19, 2026)
- 01.01.2027 (January 1, 2027)
- 31.03.2026 (March 31, 2026)

**Not Supported:**
- ❌ `2026-12-19` (ISO format)
- ❌ `12/19/2026` (US format)
- ❌ `2026.12.19` (wrong order)

#### Example: Blocking Dates for Maintenance

```
Check-in:    20.12.2026
Check-out:   25.12.2026
Propriedade: AHS Premium Apart 2 Pools
Motivo:      Deep cleaning and maintenance
```

### Validation

The modal performs the following validations:

| Validation | Error Message | Condition |
|-----------|---------------|-----------| 
| **Required Fields** | "Preencha as datas de check-in e check-out" | Empty date fields |
| **Date Format** | "Formato de data inválido. Use dd.mm.yyyy" | Wrong format entered |
| **Property Selected** | "Seleccione uma propriedade" | No property chosen |

### Submission

After filling all required fields:

1. Click **"Bloquear Datas"** button
2. The system converts the user-friendly format to API format internally
3. Success toast appears: "Datas bloqueadas com sucesso"
4. Calendar updates immediately to show blocked dates

### Error Handling

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| "Erro ao criar bloqueio" | API error | Try again, check internet connection |
| "Seleccione uma propriedade" | No property selected | Click property dropdown and choose |
| Date field greyed out | Loading state | Wait for submission to complete |

---

## Date Format Conversion

The modal automatically converts between user-friendly and API formats:

### User Interface → API
```
Input:  19.12.2026  →  Internal conversion  →  2026-12-19
Input:  01.01.2027  →  Internal conversion  →  2027-01-01
```

### Technical Details

- **User sees:** Portuguese format `dd.mm.yyyy`
- **API receives:** ISO format `yyyy-mm-dd`
- **Conversion happens:** Automatically on form submission
- **Validation:** Format checked before submission to prevent errors

---

## FAQs

### Q: Can I edit dates after blocking them?
**A:** Currently, you need to contact support or create a new block. Future versions will support edit functionality.

### Q: What's the difference between blocking dates and reservations?
**A:** 
- **Blocked dates:** Manually marked as unavailable (maintenance, cleaning, etc.)
- **Reservations:** Automatically unavailable due to bookings from guests

### Q: Can I block dates across multiple properties at once?
**A:** Not in a single action. You'll need to block dates for each property separately.

### Q: Do blocked dates synchronize with Airbnb/Booking.com?
**A:** Yes, blocked dates are synced to your connected booking platforms to maintain calendar accuracy.

### Q: What happens if I block dates that already have reservations?
**A:** Blocked dates must not overlap with existing reservations. The system will prevent this.

---

## Troubleshooting

### Modal Won't Open
- Refresh the page
- Clear browser cache
- Try a different date
- Check internet connection

### Can't Enter Dates
- Ensure date format is correct: `dd.mm.yyyy`
- Remove any extra spaces or characters
- Try using numeric keypad if available

### Block Didn't Save
- Check success toast notification
- Verify calendar updated
- Try submitting again with same dates
- Check browser console for errors (F12)

---

## API Reference

### Block Dates Endpoint

**POST** `/api/calendar/blocks`

**Payload:**
```json
{
  "property_id": "uuid",
  "start_date": "yyyy-mm-dd",
  "end_date": "yyyy-mm-dd",
  "notes": "Optional reason"
}
```

**Response (Success):**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "start_date": "2026-12-19",
  "end_date": "2026-12-25",
  "notes": "Deep cleaning",
  "block_type": "BLOCKED",
  "created_at": "2026-06-28T16:30:00Z"
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Invalid date format | Date not in `yyyy-mm-dd` format |
| 400 | Property not found | Invalid `property_id` |
| 500 | Database error | Contact support |

---

## Updates

### Latest Changes (2026-06-28)

- ✅ **Fixed:** Date format now displays as `dd.mm.yyyy` (Portuguese locale)
- ✅ **Enhanced:** Date input fields are now editable (removed read-only restriction)
- ✅ **Added:** Automatic format conversion (user input → API format)
- ✅ **Improved:** Better validation with clear error messages
- ✅ **Tested:** 6 unit tests added to ensure reliability

---

**Last Updated:** 2026-07-27  
**Status:** ✅ Production Ready  
**Support:** contact support@lodgra.io

---

## Recent Updates (2026-07-27)

### Property Calendar Implementation
- ✅ **New:** Property-specific calendar view with detailed reservation information
- ✅ **Enhanced:** UTC-based date calculations (eliminates timezone offset bugs)
- ✅ **Improved:** Responsive design for mobile and desktop layouts
- ✅ **Added:** Status badges with color-coded visualization
- ✅ **Fixed:** Date filtering to show only current/future reservations
