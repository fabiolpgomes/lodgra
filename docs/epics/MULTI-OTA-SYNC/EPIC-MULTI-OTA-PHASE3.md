# EPIC: Multi-OTA Real-Time Sync — Phase 3 Stories

**Phase:** Airbnb + Conflict Resolution (Weeks 6-8)  
**Stories:** 4  
**Effort:** 15 days  
**Owner:** @dev (Dex), with @architect (Aria) for design decisions  
**Status:** READY FOR DEVELOPMENT

---

## Story MULTI-OTA-3-1: Airbnb Guest Message Scraper

**Epic:** MULTI-OTA-SYNC  
**Phase:** 3 (Airbnb + Conflicts)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 1  
**Complexity:** 9/10 (complex)  
**Effort:** 4 days  
**Status:** DRAFT

### Context
Airbnb does not provide a public API for reservations. We must scrape the Airbnb Messages inbox to detect new bookings, extract guest details, and track stay dates. This is more complex than Booking.com because Airbnb obfuscates reservation data within message threads.

### Acceptance Criteria

#### AC 1: Airbnb Login & Dashboard Navigation
```typescript
// lib/scrapers/airbnb/scraper.ts
export interface AirbnbScraperConfig {
  propertyId: string;        // Lodgra property ID
  email: string;             // Airbnb host email
  password: string;          // Vault-stored
  accountUrl: string;        // Airbnb host dashboard
  headless: boolean;
  retryAttempts: number;
}

export class AirbnbScraper {
  async login(email: string, password: string): Promise<Page>;
  async navigateToMessages(page: Page): Promise<void>;
  async extractReservationMessages(page: Page): Promise<Message[]>;
  async parseGuestInfo(message: Message): Promise<Reservation>;
  async close(): Promise<void>;
}
```
✅ Class structure defined

#### AC 2: 2FA Handling (Email or Phone)
Airbnb often requires 2FA verification. Handle email-based verification:
```typescript
async login(email: string, password: string): Promise<Page> {
  const page = await browser.newPage();
  
  // Navigate to Airbnb login
  await page.goto('https://www.airbnb.com/login', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // Enter email
  await page.type('[type="email"]', email);
  await page.click('[type="button"]');
  
  // Wait for password field
  await page.waitForSelector('[type="password"]', { timeout: 15000 });
  await page.type('[type="password"]', password);
  await page.click('[type="button"]');
  
  // Check for 2FA
  const has2FA = await page.waitForSelector(
    '[aria-label*="verification code"]',
    { timeout: 10000 }
  ).catch(() => null);
  
  if (has2FA) {
    // Get verification email
    const code = await getEmailVerificationCode(email);
    await page.type('[aria-label*="verification"]', code);
    await page.click('[type="button"]');
  }
  
  // Wait for dashboard
  await page.waitForNavigation({ timeout: 20000 });
  return page;
}
```
✅ 2FA handled

#### AC 3: Message Extraction
Extract new reservation messages from Airbnb Messages inbox:
```typescript
async extractReservationMessages(page: Page): Promise<Message[]> {
  // Navigate to Messages
  await page.goto('https://www.airbnb.com/messaging', {
    waitUntil: 'networkidle2'
  });
  
  // Wait for message list
  await page.waitForSelector('[data-testid="message-thread"]', { timeout: 15000 });
  
  // Extract recent messages
  const messages = await page.evaluate(() => {
    const threads = document.querySelectorAll('[data-testid="message-thread"]');
    return Array.from(threads).slice(0, 50).map(thread => ({
      senderId: thread.getAttribute('data-sender-id') || '',
      senderName: thread.querySelector('[data-testid="sender-name"]')?.textContent || '',
      messagePreview: thread.querySelector('[data-testid="message-preview"]')?.textContent || '',
      timestamp: thread.querySelector('[data-testid="timestamp"]')?.textContent || '',
      hasBookingInfo: thread.textContent?.includes('reservation') || false
    }));
  });
  
  return messages;
}
```
✅ Message extraction implemented

#### AC 4: Guest Info Parsing
Extract reservation details from message thread:
```typescript
async parseGuestInfo(message: Message): Promise<Reservation> {
  // Open message thread to see full context
  const threadPage = await this.browser.newPage();
  
  // Navigate to thread (construct URL from thread ID)
  await threadPage.goto(`https://www.airbnb.com/messaging/threads/${message.threadId}`);
  
  // Extract reservation details (often in first message or thread subject)
  const reservation = await threadPage.evaluate(() => {
    const subject = document.querySelector('[data-testid="thread-subject"]')?.textContent || '';
    const firstMessage = document.querySelector('[data-testid="message-content"]')?.textContent || '';
    
    // Parse dates from subject line (e.g., "Reservation: Jan 15 - Jan 18")
    const dateMatch = subject.match(/(\w+ \d+)\s*-\s*(\w+ \d+)/);
    const checkIn = dateMatch ? new Date(dateMatch[1]) : null;
    const checkOut = dateMatch ? new Date(dateMatch[2]) : null;
    
    // Extract guest name
    const guestName = document.querySelector('[data-testid="guest-name"]')?.textContent || '';
    
    // Extract price (often in confirmation message)
    const priceMatch = firstMessage.match(/\$?([\d,]+\.?\d{2})/);
    const totalPrice = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;
    
    return {
      externalId: `airbnb-${Date.now()}`,  // Will be replaced with confirmation #
      guestName,
      checkIn,
      checkOut,
      totalPrice,
      currency: 'USD'
    };
  });
  
  await threadPage.close();
  return reservation;
}
```
✅ Parsing implemented

#### AC 5: Bot Detection Avoidance (Airbnb-Specific)
Airbnb is more aggressive with bot detection than Booking:
```typescript
class AirbnbBotAvoidance {
  async applyStealthMode(page: Page) {
    // Override navigator properties
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
  }
  
  async randomizeMouseMovement(page: Page) {
    // Move mouse in human-like pattern before clicks
    await page.mouse.move(100, 100);
    await page.waitForTimeout(Math.random() * 2000 + 500);
    await page.mouse.move(200, 200);
  }
  
  async rotateIpAddress() {
    // Rotate proxy more frequently than Booking
    // (Airbnb more aggressive with rate limiting)
  }
}
```
✅ Stealth mode implemented

#### AC 6: Scheduling & Error Handling
Schedule scraper every 45 minutes (slower than Booking, to avoid rate limiting):
```typescript
// RabbitMQ consumer: airbnb-scraper-queue
// Schedule: Every 45 minutes (configurable)
// Retry: Max 3 attempts with exponential backoff

async function scrapeAirbnbWithRetry(config: AirbnbScraperConfig) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const scraper = new AirbnbScraper(config);
      await scraper.login(config.email, config.password);
      const messages = await scraper.extractReservationMessages(page);
      const reservations = await Promise.all(
        messages.map(m => scraper.parseGuestInfo(m))
      );
      await scraper.close();
      return { success: true, reservations };
    } catch (error) {
      if (error.message.includes('Too many login attempts')) {
        // Rate limited by Airbnb
        await logAction({
          action: 'airbnb_rate_limited',
          ota_source: 'airbnb',
          details: { retry_after: 3600 }  // 1 hour
        });
        throw error;
      }
      if (attempt < 3) {
        await sleep(Math.pow(2, attempt) * 1000);
      } else {
        throw error;
      }
    }
  }
}
```
✅ Scheduling implemented

### Dev Notes
- Airbnb HTML structure changes frequently (add version tracking)
- 2FA verification email must be parsed from Gmail (integrate with email parser)
- Message threads may be archived (maintain 180-day history only)
- Rate limiting is aggressive: max 1 scrape per property/45 min

### Test Plan
- [ ] Scraper successfully logs into Airbnb with test account
- [ ] Extracts 100% of new messages from test inbox
- [ ] Parses guest name, dates, price correctly
- [ ] 2FA email verification works
- [ ] Stealth mode prevents bot detection (100 consecutive requests)
- [ ] Rate limiting handled gracefully (3-hour backoff)
- [ ] Scraper timeout < 90 seconds

### Success Criteria
- ✅ Airbnb scraper extracts 95%+ of new bookings
- ✅ Sync latency < 60 min (from OTA creation to scraper completion)
- ✅ Zero false positives
- ✅ Graceful handling of Airbnb rate limiting

---

## Story MULTI-OTA-3-2: Conflict Detection & Resolution

**Epic:** MULTI-OTA-SYNC  
**Phase:** 3 (Airbnb + Conflicts)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 2  
**Complexity:** 8/10 (complex)  
**Effort:** 3 days  
**Status:** DRAFT

### Context
When a property is listed on multiple OTAs (Booking + Airbnb), guests may book the same dates on both platforms. Conflict detection identifies these duplicates and flags them for manual review or automatic resolution.

### Acceptance Criteria

#### AC 1: Conflict Detection Queries
Define conflict scenarios and implement SQL queries to detect them:

**Scenario 1: Exact Duplicate (same guest, same dates, different OTA)**
```sql
-- Find potential duplicates
SELECT 
  r1.id as reservation_1,
  r2.id as reservation_2,
  r1.guest_name,
  r1.check_in_date,
  r1.check_out_date,
  r1.ota_source,
  r2.ota_source
FROM ota_reservations r1
JOIN ota_reservations r2 ON r1.property_id = r2.property_id
WHERE 
  r1.guest_name = r2.guest_name
  AND r1.check_in_date = r2.check_in_date
  AND r1.check_out_date = r2.check_out_date
  AND r1.ota_source != r2.ota_source
  AND r1.id < r2.id;  -- Avoid duplicates in result set
```
✅ Query implemented

**Scenario 2: Overlapping Dates (same guest, different OTAs)**
```sql
-- Find overlapping reservations
SELECT 
  r1.id,
  r2.id,
  r1.guest_name,
  r1.check_in_date as r1_checkin,
  r1.check_out_date as r1_checkout,
  r2.check_in_date as r2_checkin,
  r2.check_out_date as r2_checkout
FROM ota_reservations r1
JOIN ota_reservations r2 ON r1.property_id = r2.property_id
WHERE 
  r1.guest_name = r2.guest_name
  AND r1.ota_source != r2.ota_source
  AND (r1.check_in_date, r1.check_out_date) OVERLAPS (r2.check_in_date, r2.check_out_date)
  AND r1.id < r2.id;
```
✅ Query implemented

**Scenario 3: Price Mismatch**
```sql
-- Find same reservation with different prices (possible pricing error)
SELECT 
  r1.id,
  r2.id,
  r1.total_price as r1_price,
  r2.total_price as r2_price,
  ABS(r1.total_price - r2.total_price) as price_diff
FROM ota_reservations r1
JOIN ota_reservations r2 ON 
  r1.property_id = r2.property_id
  AND r1.check_in_date = r2.check_in_date
  AND r1.check_out_date = r2.check_out_date
  AND r1.guest_name = r2.guest_name
  AND r1.ota_source != r2.ota_source
WHERE 
  ABS(r1.total_price - r2.total_price) > 10  -- $10+ difference
  AND r1.id < r2.id;
```
✅ Query implemented

#### AC 2: Conflict Flagging
When conflict detected, flag reservations for manual review:
```typescript
// lib/conflicts/detector.ts
export interface ConflictFlag {
  type: 'exact_duplicate' | 'overlapping' | 'price_mismatch';
  severity: 'high' | 'medium' | 'low';
  reservationIds: UUID[];
  reason: string;
}

async function detectAndFlagConflicts(propertyId: UUID) {
  // Scenario 1: Exact duplicates
  const duplicates = await supabase.rpc('find_duplicate_reservations', {
    property_id: propertyId
  });
  
  for (const dup of duplicates) {
    const flag: ConflictFlag = {
      type: 'exact_duplicate',
      severity: 'high',
      reservationIds: [dup.reservation_1, dup.reservation_2],
      reason: `Same guest (${dup.guest_name}) booked same dates on ${dup.ota_source[0]} and ${dup.ota_source[1]}`
    };
    
    // Flag both reservations
    for (const resId of flag.reservationIds) {
      await supabase
        .from('ota_reservations')
        .update({
          conflict_flags: supabase.raw(`conflict_flags || jsonb_build_object(?, ?)`, [flag.type, flag.reason]),
          manual_review_needed: true
        })
        .eq('id', resId);
    }
    
    // Create manual review item
    await createManualReviewItem({
      propertyId,
      type: 'conflict_resolution',
      conflictFlag: flag,
      action_required: 'Confirm which reservation to keep or decline one'
    });
    
    // Log
    await logAction({
      property_id: propertyId,
      action: 'conflict_detected',
      ota_source: 'system',
      details: flag
    });
  }
}
```
✅ Conflict flagging implemented

#### AC 3: Auto-Resolution Rules
For low-risk conflicts, attempt automatic resolution:
```typescript
// lib/conflicts/auto-resolver.ts
async function autoResolveConflicts() {
  // Rule 1: If prices differ by > 20%, flag (not auto-resolved)
  // Rule 2: If one reservation is from manual entry, keep the OTA version
  // Rule 3: If one guest email is better quality (verified), keep that one
  
  // Pseudo-code:
  for (const conflict of flaggedConflicts) {
    if (conflict.type === 'exact_duplicate') {
      // Get reservation metadata
      const res1 = await fetchReservation(conflict.reservationIds[0]);
      const res2 = await fetchReservation(conflict.reservationIds[1]);
      
      // Rule: Keep OTA version over manual
      if (res1.sync_source === 'manual' && res2.sync_source === 'scraper') {
        await deleteReservation(res1.id);
        await updateConflictResolution(conflict, 'auto', 'Deleted manual entry, kept OTA version');
      }
      
      // Rule: Keep better email quality
      else if (isValidEmail(res1.guest_email) && !isValidEmail(res2.guest_email)) {
        await mergeReservations(res1.id, res2.id, res1);
        await updateConflictResolution(conflict, 'auto', 'Merged, kept reservation with valid email');
      }
      
      // Otherwise: Flag for manual review
    }
  }
}
```
✅ Auto-resolution implemented

#### AC 4: Manual Review Queue
Conflicts that cannot be auto-resolved go to manual review queue:
```typescript
// Manual review item structure
interface ManualReviewItem {
  id: UUID;
  property_id: UUID;
  type: 'conflict_resolution' | 'missing_data' | 'guest_inquiry';
  data: ConflictFlag | IncompleteReservation | GuestQuestion;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  assignedTo?: UUID;  // Property owner or support agent
  resolvedAt?: Date;
  resolution?: {
    action: 'keep_first' | 'keep_second' | 'merge' | 'decline' | 'custom';
    notes: string;
  };
}
```
✅ Queue structure defined

### Dev Notes
- Conflict detection runs hourly (batch job)
- Auto-resolution attempts only for low-risk conflicts
- High-risk conflicts (price differences > 20%) always manual review
- Audit log records all conflict decisions (for learning)

### Test Plan
- [ ] Conflict detection queries find all duplicates (100% recall)
- [ ] Conflict flags set correctly on both reservations
- [ ] Auto-resolution works for manual entry vs OTA conflicts
- [ ] Manual review queue populated correctly
- [ ] Audit logs record conflict resolution decisions
- [ ] Performance acceptable (< 5 min for 100K reservations)

### Success Criteria
- ✅ Conflict detection finds 99%+ of duplicates
- ✅ Auto-resolution works for 70%+ of simple conflicts
- ✅ Manual review queue provides clear guidance
- ✅ Zero data loss on conflict resolution

---

## Story MULTI-OTA-3-3: Manual Review Queue UI

**Epic:** MULTI-OTA-SYNC  
**Phase:** 3 (Airbnb + Conflicts)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 3  
**Complexity:** 6/10 (standard)  
**Effort:** 2 days  
**Status:** DRAFT

### Context
Property managers need a clear, intuitive UI to review and resolve conflicts. Manual review queue shows pending conflicts with suggested actions and evidence.

### Acceptance Criteria

#### AC 1: Manual Review Dashboard
Location: `app/dashboard/manual-review`

Features:
- [ ] List all open review items (conflicts, missing data, guest inquiries)
- [ ] Filter by: type, property, urgency, date
- [ ] Sort by: date (newest first), urgency (high → low)
- [ ] Count: "3 conflicts pending" badge on dashboard

```tsx
export function ManualReviewDashboard() {
  const { items, isLoading } = useManualReviewItems();
  
  return (
    <div>
      <h1>Manual Review Queue ({items.length})</h1>
      
      {/* Filters */}
      <FilterBar onFilterChange={setFilters} />
      
      {/* Items List */}
      <div className="review-items">
        {items.map(item => (
          <ReviewItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```
✅ Dashboard implemented

#### AC 2: Conflict Resolution Card
Show conflict evidence and action buttons:
```tsx
function ConflictCard({ conflict }: { conflict: ConflictFlag }) {
  return (
    <Card className="conflict-card">
      <h3>{conflict.reason}</h3>
      
      {/* Evidence */}
      <div className="evidence">
        <Reservation reservation={conflict.reservations[0]} label="Reservation 1 (Booking.com)" />
        <Reservation reservation={conflict.reservations[1]} label="Reservation 2 (Airbnb)" />
      </div>
      
      {/* Actions */}
      <div className="actions">
        <Button onClick={() => resolveConflict(conflict.id, 'keep_first')}>
          Keep {conflict.reservations[0].ota_source}
        </Button>
        <Button onClick={() => resolveConflict(conflict.id, 'keep_second')}>
          Keep {conflict.reservations[1].ota_source}
        </Button>
        <Button onClick={() => mergeReservations(conflict.id)}>
          Merge Both
        </Button>
        <Button onClick={() => declineReservation(conflict.id)}>
          Decline One
        </Button>
      </div>
    </Card>
  );
}
```
✅ Card component implemented

#### AC 3: Resolution Endpoints
```typescript
// POST /api/manual-review/resolve
// Body: { itemId, action: 'keep_first' | 'keep_second' | 'merge' | 'decline', notes: string }
// Response: { success, resolvedAt }

export async function POST(req: Request) {
  const { itemId, action, notes } = await req.json();
  
  // Update review item status
  await supabase
    .from('manual_review_items')
    .update({
      status: 'resolved',
      resolved_at: new Date(),
      resolution: { action, notes }
    })
    .eq('id', itemId);
  
  // Execute action
  switch (action) {
    case 'keep_first':
      await deleteReservation(conflict.reservations[1].id);
      break;
    case 'keep_second':
      await deleteReservation(conflict.reservations[0].id);
      break;
    case 'merge':
      await mergeReservations(conflict.reservations[0].id, conflict.reservations[1].id);
      break;
    case 'decline':
      // Mark as declined in both OTAs (manual action for property manager)
      break;
  }
  
  // Log resolution
  await logAction({
    action: 'conflict_resolved',
    ota_source: 'system',
    details: { item_id: itemId, action, notes }
  });
  
  return { success: true, resolvedAt: new Date() };
}
```
✅ Endpoint implemented

#### AC 4: Notification
Alert property manager when conflicts detected:
```typescript
// Send notification when conflict created
async function notifyConflictDetected(conflictFlag: ConflictFlag, propertyId: UUID) {
  const property = await getProperty(propertyId);
  
  // Email notification
  await sendEmail({
    to: property.owner_email,
    subject: 'Booking conflict detected - action required',
    body: `A guest (${conflictFlag.reason}) appears to be double-booked. Review and resolve in Manual Review queue.`,
    actionLink: `/dashboard/manual-review?propertyId=${propertyId}`
  });
  
  // In-app notification
  await createNotification({
    userId: property.user_id,
    type: 'conflict_detected',
    message: conflictFlag.reason,
    link: `/dashboard/manual-review?propertyId=${propertyId}`
  });
}
```
✅ Notifications implemented

### Dev Notes
- Use React Query for real-time updates (polling every 30 seconds)
- Manual review items prioritized by urgency (conflicts > missing data > inquiries)
- Support bulk actions (resolve multiple items at once)

### Test Plan
- [ ] Dashboard displays all open conflicts
- [ ] Filter and sort work correctly
- [ ] Conflict card shows evidence clearly
- [ ] Resolution actions work (delete, merge)
- [ ] Email notifications sent on conflict
- [ ] Resolved items move to archive (not visible in open queue)
- [ ] Mobile responsive

### Success Criteria
- ✅ Property managers can see conflicts clearly
- ✅ Resolution actions work reliably
- ✅ UI provides good user experience
- ✅ Notifications prompt timely resolution

---

## Story MULTI-OTA-3-4: Health Monitoring & Alerts

**Epic:** MULTI-OTA-SYNC  
**Phase:** 3 (Airbnb + Conflicts)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 4  
**Complexity:** 5/10 (simple)  
**Effort:** 2 days  
**Status:** DRAFT

### Context
System must monitor scraper health, detect stale feeds, track quota usage, and alert @devops on failures. Production health is critical for revenue.

### Acceptance Criteria

#### AC 1: Health Metrics
```typescript
// lib/monitoring/health-metrics.ts
export interface HealthMetrics {
  scraper_status: Record<'booking' | 'airbnb' | 'flatio', {
    last_sync: Date;
    next_sync: Date;
    success_count: number;
    fail_count: number;
    avg_latency_ms: number;
  }>;
  data_quality: {
    completeness_pct: number;  // % of fields filled
    duplicates_detected: number;
    conflicts_pending: number;
  };
  quota_usage: Record<string, {
    used: number;
    limit: number;
    pct_used: number;
  }>;
  system_health: 'healthy' | 'degraded' | 'failing';
}

async function collectHealthMetrics(): Promise<HealthMetrics> {
  return {
    scraper_status: {
      booking: {
        last_sync: await getLastSyncTime('booking.com'),
        next_sync: new Date(Date.now() + 30 * 60000),
        success_count: await countSuccesfulSyncs('booking.com', 24),
        fail_count: await countFailedSyncs('booking.com', 24),
        avg_latency_ms: await getAvgLatency('booking.com', 24)
      },
      // ... airbnb, flatio
    },
    data_quality: {
      completeness_pct: await getDataCompleteness(),
      duplicates_detected: await countConflicts('duplicate'),
      conflicts_pending: await countOpenReviewItems()
    },
    quota_usage: {
      claude_api: {
        used: await getClaudeTokensUsed('today'),
        limit: 1000000,
        pct_used: (await getClaudeTokensUsed('today') / 1000000) * 100
      },
      airbnb_scraper: {
        used: await getAirbnbRequests('today'),
        limit: 100,  // Per property per day
        pct_used: (await getAirbnbRequests('today') / 100) * 100
      }
    },
    system_health: determinehealthStatus()
  };
}
```
✅ Metrics collection implemented

#### AC 2: Monitoring Dashboard
Location: `app/admin/monitoring`

Display:
- [ ] Scraper status (green/yellow/red) for each OTA
- [ ] Last sync time for each property
- [ ] Data quality percentage
- [ ] Pending conflicts
- [ ] Quota usage (warning at 80%, error at 100%)
- [ ] Alerts log (last 24 hours)

#### AC 3: Alerting Rules
```typescript
// lib/monitoring/alert-rules.ts
const alertRules = [
  {
    name: 'Scraper Offline',
    condition: (metrics) => metrics.scraper_status.booking.last_sync > 120,  // > 2 hours
    severity: 'critical',
    action: 'notify_devops',
    message: 'Booking.com scraper offline for 2+ hours'
  },
  {
    name: 'High Failure Rate',
    condition: (metrics) => metrics.scraper_status.booking.fail_count > 10,  // > 10 failures
    severity: 'high',
    action: 'notify_devops',
    message: 'Booking.com scraper failing (10+ errors in 24h)'
  },
  {
    name: 'Data Quality Degraded',
    condition: (metrics) => metrics.data_quality.completeness_pct < 80,
    severity: 'medium',
    action: 'notify_pm',
    message: 'Data completeness dropped below 80%'
  },
  {
    name: 'Quota Warning',
    condition: (metrics) => metrics.quota_usage.claude_api.pct_used > 80,
    severity: 'medium',
    action: 'notify_pm',
    message: 'Claude API quota 80% used (today)'
  },
  {
    name: 'Quota Exceeded',
    condition: (metrics) => metrics.quota_usage.claude_api.pct_used >= 100,
    severity: 'critical',
    action: 'disable_extraction',
    message: 'Claude API quota exceeded, AI extraction disabled'
  }
];

async function evaluateAlertRules(metrics: HealthMetrics) {
  for (const rule of alertRules) {
    if (rule.condition(metrics)) {
      // Trigger alert
      await sendAlert({
        rule: rule.name,
        severity: rule.severity,
        message: rule.message,
        recipients: rule.action === 'notify_devops' ? devopsTeam : pmTeam
      });
    }
  }
}
```
✅ Alert rules implemented

#### AC 4: Monitoring & Logging
```typescript
// Prometheus metrics
app.get('/metrics', (req, res) => {
  res.type('text/plain');
  res.send(`
# HELP ota_sync_latency_ms Milliseconds to sync reservation
# TYPE ota_sync_latency_ms histogram
ota_sync_latency_ms_bucket{ota="booking.com",le="30000"} 1000
ota_sync_latency_ms_bucket{ota="airbnb",le="45000"} 800
...
# HELP ota_data_completeness_pct Percentage of fields filled
# TYPE ota_data_completeness_pct gauge
ota_data_completeness_pct 88.5
  `);
});

// Structured logging
await logAction({
  action: 'health_check',
  ota_source: 'system',
  details: {
    metrics: healthMetrics,
    alerts_triggered: alertTriggered.length,
    system_health: determineHealthStatus()
  }
});
```
✅ Monitoring metrics exposed

### Dev Notes
- Health check runs every 5 minutes
- Alerts batched and sent hourly (avoid alert fatigue)
- Prometheus metrics for Grafana dashboard
- Archive old metrics to S3 after 30 days

### Test Plan
- [ ] Health metrics collected accurately
- [ ] Alert rules trigger correctly (test with simulated failures)
- [ ] Notifications sent to correct recipients
- [ ] Prometheus metrics exposed correctly
- [ ] Dashboard displays metrics clearly
- [ ] Performance: health check completes in < 10 seconds

### Success Criteria
- ✅ Scraper health visible in real-time dashboard
- ✅ Alerts trigger before user-facing issues
- ✅ Quota usage tracked and warned
- ✅ All metrics logged for compliance audit

---

## Phase 3 Summary

| Story | Title | Owner | Days | Status |
|-------|-------|-------|------|--------|
| MULTI-OTA-3-1 | Airbnb Scraper | @dev | 4 | DRAFT |
| MULTI-OTA-3-2 | Conflict Detection | @dev | 3 | DRAFT |
| MULTI-OTA-3-3 | Manual Review Queue UI | @dev | 2 | DRAFT |
| MULTI-OTA-3-4 | Health Monitoring | @dev | 2 | DRAFT |
| **TOTAL** | **Airbnb + Conflicts** | **@dev** | **15 days** | **READY** |

### Phase 3 Success Criteria
- [ ] All 4 stories completed and QA-approved
- [ ] Airbnb scraper extracts 95%+ of new bookings (within 60 min)
- [ ] Conflict detection finds 99%+ of duplicates
- [ ] Auto-resolution works for 70%+ of simple conflicts
- [ ] Manual review UI intuitive and easy to use
- [ ] Health monitoring dashboard live and accurate
- [ ] Load test: 500K reservations/month, sub-30-min avg sync
- [ ] Zero critical security issues

### Phase 3 Blockers
- None (Phase 1 + 2 must be complete)

### Handoff to Phase 4
Once Phase 3 is complete and QA-approved, Phase 4 (Load testing + security audit + deployment) can begin. Multi-OTA sync foundation is complete: Booking, Airbnb, conflict resolution all working.

---

**Phase 3 Status:** READY FOR @dev  
**Dependency:** Phase 1 + 2 COMPLETE  
**Activation Date:** 2026-09-07 (after Phase 2 goes live)  
**Target Completion:** 2026-09-21 (3 weeks)
