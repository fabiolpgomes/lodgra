# Commission Tracking — User Guide

Welcome! This guide explains how to view, analyze, and export your commission data on the Home Stay platform.

---

## Overview

The Commission Dashboard gives you complete visibility into how much you're earning from bookings across all your properties. You can see:

- **Current Month Commission** — How much you've earned this month
- **Year-to-Date Commission** — Total earnings since January
- **All-Time Commission** — Your total earnings since the first booking
- **Trend Chart** — Visual representation of commission trends over time
- **Commission History** — Detailed booking-by-booking breakdown
- **CSV Export** — Download data for spreadsheets or accounting software

---

## Accessing the Commission Dashboard

### Step 1: Sign In
Log into your Home Stay manager account. You must have one of these roles:
- **Admin** — Full access to all properties
- **Manager** — Access to assigned properties only

### Step 2: Navigate to Reports
1. Click **Dashboard** in the left menu
2. Click **Reports** (or go directly to `/dashboard/reports`)
3. You'll see tabs: **Overview**, **Commissions**, **Occupancy**, **Revenue**

### Step 3: Click Commissions Tab
You're now viewing your Commission Dashboard! 🎉

---

## Understanding Commission Metrics

### Current Month
Shows commissions earned **this month** (since the 1st of the current month).

**What it includes:**
- All completed bookings checked in this month
- Commission calculated at your plan rate (see table below)

**Use case:** Track your current month progress at a glance

### Year-to-Date (YTD)
Shows commissions earned **since January 1st of this year**.

**What it includes:**
- All completed bookings checked in during the calendar year
- Running total towards annual goals

**Use case:** Monitor annual performance and compare to previous years

### All-Time
Shows your **total cumulative commission** since the first booking.

**What it includes:**
- Every booking ever completed on your properties
- Complete earning history

**Use case:** See your total lifetime earnings on the platform

---

## Commission Rates by Plan

Your commission rate depends on your subscription plan:

| Plan | Rate | Example |
|------|------|---------|
| **Starter** | 20% | €100 booking → €20 commission |
| **Professional** | 15% | €100 booking → €15 commission |
| **Business** | 10% | €100 booking → €10 commission |

**How it works:**
1. Guest books a property for €100
2. Platform automatically calculates commission based on your plan
3. Amount is deducted from your payout
4. You keep the rest (net revenue)

**Example Calculation:**
```
Booking Amount:        €500
Your Plan Rate:        15% (Professional)
Commission:            €500 × 15% = €75
Your Net Revenue:      €500 - €75 = €425
```

---

## Using the Trend Chart

The **Commission Trend** visualization shows your earning patterns over time.

### Switching Time Views

Three time period options are available:

1. **Daily** — See commission for each day
   - Best for: Identifying high-earning days
   - Use case: Plan staffing around busy periods

2. **Weekly** — Aggregated by week
   - Best for: Spotting weekly patterns
   - Use case: Plan maintenance around slow weeks

3. **Monthly** — Aggregated by month
   - Best for: Long-term trends
   - Use case: Compare performance across months

### Reading the Chart

**Vertical axis (Y-axis):** Commission amount in EUR (€)
**Horizontal axis (X-axis):** Time period (days, weeks, or months)
**Line:** Your commission over time

### Chart Tips

- **Hover over points** to see exact commission amounts
- **Upward trend** = More bookings or higher rates
- **Downward trend** = Fewer bookings or seasonal slowdown
- **Flat periods** = No bookings during that time

---

## Viewing Commission History

The **Commission History** table shows you every booking and its commission.

### Table Columns

| Column | Meaning | Example |
|--------|---------|---------|
| **Date** | Check-in date | 2026-03-27 |
| **Property** | Which property was booked | Villa Algarve |
| **Guest** | Guest name | João Silva |
| **Revenue** | Total booking amount | €500.00 |
| **Commission** | Platform commission | €75.00 (15%) |

### Filtering & Sorting

**By Date Range:**
1. Click the date range selector at the top
2. Choose start and end dates
3. Table updates automatically

**By Property:**
- Currently shows all your properties
- Use filters if available in your plan

### Pagination

If you have many bookings:
- **Next** button loads more bookings
- **Previous** button shows earlier bookings
- Number shows "Showing 50 bookings per page"

---

## Exporting Data

Export your commission data as a CSV file for use in spreadsheets or accounting software.

### How to Export

1. Click the **Export** tab
2. (Optional) Select a date range:
   - Click **Start Date** and choose a date
   - Click **End Date** and choose a date
3. Click **Download CSV**
4. File downloads as `commissions-YYYY-MM-DD.csv`

### CSV File Contents

The exported file includes:

```
reservation_id,date,property_name,guest_name,revenue,commission_rate,commission_amount
res-001,2026-03-20,Villa Algarve,João Silva,500.00,15%,75.00
res-002,2026-03-21,Apartamento Lisboa,Maria Costa,350.00,15%,52.50
res-003,2026-03-22,Casa Comporta,David Pereira,800.00,15%,120.00
```

### Using the CSV

**In Excel/Google Sheets:**
1. Download the CSV file
2. Open Excel or Google Sheets
3. File → Open → Select the CSV
4. Data is automatically organized in columns

**For Accounting:**
- Use the `commission_amount` column for your records
- Match dates to your bookings
- Track total commissions for tax reporting

**For Analysis:**
- Calculate monthly totals
- Compare properties
- Identify trends
- Build custom reports

---

## Understanding Your Earnings

### What You Keep vs. Platform Commission

Your payout is calculated as:

```
Booking Amount
    ↓
- Platform Commission (15-20% depending on plan)
    ↓
= Your Net Payout
    ↓
- Fees (if any)
    ↓
= Final Amount Paid to Your Account
```

### Example Transaction

```
Booking from Guest:        €1,000.00

Platform Commission (15%): €150.00

Your Net Earning:          €850.00
```

### When You Get Paid

Commissions are calculated and shown immediately, but:

- **Payouts:** Processed monthly (usually 1st of next month)
- **Failures:** If booking gets cancelled/refunded, commission is removed
- **Disputes:** Commission may be held during resolution

---

## Tips for Maximizing Earnings

### Increase Your Commission Tier

Current rates by plan:
- Starter: 20% commission
- Professional: 15% commission
- Business: 10% commission

**Lower commission = Higher earnings**

Upgrade your plan to reduce your commission rate and keep more of each booking!

### Optimize Your Pricing

1. Review which properties earn the most
2. Compare your rates to similar properties
3. Adjust prices seasonally
4. Track commission trends over time

### Monitor Trends

1. Check your dashboard weekly
2. Look for patterns in your data
3. Plan maintenance during slow periods
4. Capitalize on high-demand periods

### Check Commission History

1. Review bookings regularly
2. Ensure all completed bookings are shown
3. Verify commission rates match your plan
4. Report any discrepancies

---

## FAQ — Frequently Asked Questions

### Q: When is commission deducted?
**A:** Commission is automatically calculated and deducted from your payout for every completed booking. It's shown in real-time on your dashboard.

### Q: Can I change my plan to lower my commission?
**A:** Yes! Go to **Settings** → **Subscription** to upgrade your plan. Lower plans have lower commission rates.

### Q: What if a booking is cancelled?
**A:** If a guest cancels and is refunded, the associated commission is removed from your dashboard. Cancelled bookings won't appear in your reports.

### Q: Are these numbers final?
**A:** Yes, commissions shown here are what you'll be paid. The only exception is if a dispute is opened and resolved differently.

### Q: Can I export multiple months at once?
**A:** Yes! Use the date range selector before exporting. You can choose any range you want.

### Q: Why do I see different rates?
**A:** If you've upgraded your plan, older bookings may show your previous rate (when they were booked), and newer bookings show your current rate.

### Q: Is there a way to see bookings by property?
**A:** The history table shows all properties. You can use the export function and filter by property name in Excel/Sheets.

### Q: Do commissions affect my guest pricing?
**A:** No. Commissions are separate from guest pricing. You set guest prices; commission is deducted from your payout.

### Q: Can I see commissions for a specific property only?
**A:** Currently, the dashboard shows all properties. Export the CSV and filter by property name for specific analysis.

### Q: What about refunds?
**A:** If a guest is refunded after payment, the commission is also removed. You won't see that booking in reports after cancellation.

---

## Troubleshooting

### I don't see any commission data
**Possible causes:**
1. No completed bookings yet — Wait for first booking to complete
2. Viewing wrong date range — Check date filters
3. Wrong organization selected — Verify you're logged in correctly

**Solution:**
- Create a test booking to verify dashboard works
- Check that date range includes your bookings
- Contact support if issue persists

### The numbers seem wrong
**Verify:**
1. Your plan type (affects commission rate)
2. The booking amount (commission is % of this)
3. The date range (filtering may hide data)

**Example check:**
- Booking: €100
- Your plan: Professional (15%)
- Expected commission: €15 ✓

### Export file is empty or corrupted
**Try:**
1. Select a date range with data
2. Refresh the page
3. Try exporting again
4. Use a different browser if issue persists

### I can't see detailed information
**Check:**
1. You have Manager role (minimum required)
2. You're assigned to the property
3. The booking is completed (not pending)

---

## Getting Help

### Support Resources
- **Dashboard:** See "Help" section in app
- **Email:** support@homestay.com
- **Chat:** Click the chat icon in bottom right

### Reporting Issues
If you find incorrect commission data:
1. Note the booking ID or date
2. Screenshot the discrepancy
3. Contact support with details
4. Include the export CSV if possible

---

## Advanced: Using Commission Data

### For Accounting
1. Export commissions monthly
2. Match dates to your general ledger
3. Calculate tax liability
4. Create P&L reports

### For Tax Planning
1. Track cumulative commission throughout year
2. Estimate quarterly tax payments
3. Set aside appropriate amount
4. Consult your accountant

### For Business Analysis
1. Calculate revenue per property
2. Compare performance across properties
3. Identify seasonal patterns
4. Make pricing decisions

### For Forecasting
1. Review historical trends
2. Project next month's earnings
3. Plan cash flow
4. Set income goals

---

## Best Practices

✅ **DO:**
- Check dashboard weekly
- Export monthly for records
- Compare plan options
- Monitor trends
- Report discrepancies quickly

❌ **DON'T:**
- Rely only on commission for accounting
- Assume all bookings are shown (filter by date)
- Forget to update payment method
- Ignore disputes
- Skip reviewing your plan options

---

## Summary

The Commission Dashboard gives you complete transparency into:
- 📊 How much you're earning
- 📈 Commission trends over time
- 📋 Detailed booking breakdown
- 📥 Downloadable data for analysis

**Key Takeaways:**
1. Your commission depends on your plan
2. Lower commission rates = higher earnings
3. All data is real-time and accurate
4. Export anytime for records
5. Upgrade your plan to lower commission

---

## Next Steps

1. **Visit your dashboard** — `/dashboard/reports`
2. **Check your current metrics** — How much have you earned?
3. **Review your history** — Which properties perform best?
4. **Export your data** — Get data for your records
5. **Plan upgrades** — Consider upgrading to lower commission

---

**Questions?** Contact support or visit the Help section in your dashboard.

**Happy earning!** 🚀

---

**Last Updated:** 2026-03-27
**Version:** 1.0
**Status:** Production Ready
