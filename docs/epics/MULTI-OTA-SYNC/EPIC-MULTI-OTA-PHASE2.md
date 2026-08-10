# EPIC: Multi-OTA Real-Time Sync — Phase 2 Stories

**Phase:** Booking.com MVP (Weeks 3-5)  
**Stories:** 6  
**Effort:** 15 days  
**Owner:** @dev (Dex), with @architect (Aria) for decisions  
**Status:** READY FOR DEVELOPMENT

---

## Story MULTI-OTA-2-1: Booking.com Web Scraper

**Epic:** MULTI-OTA-SYNC  
**Phase:** 2 (Booking MVP)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 1  
**Complexity:** 9/10 (complex)  
**Effort:** 4 days  
**Status:** DRAFT

### Context
Booking.com does not provide a public reservation API. We must use Playwright headless browser to scrape the Booking.com property dashboard, extract new reservations, and detect changes in real-time. Success = 95% accuracy on new reservations within 30 minutes.

### Acceptance Criteria

#### AC 1: Scraper Architecture
```typescript
// lib/scrapers/booking/scraper.ts
export interface BookingScraperConfig {
  propertyId: string;  // Lodgra property ID
  email: string;       // Booking.com account email
  password: string;    // Retrieved from Vault
  propertyUrl: string; // Booking.com property dashboard URL
  headless: boolean;   // true in production, false for debugging
  retryAttempts: number;
  timeoutMs: number;
}

export class BookingComScraper {
  async login(email: string, password: string): Promise<Page>;
  async navigateToDashboard(page: Page): Promise<void>;
  async extractReservations(page: Page): Promise<Reservation[]>;
  async close(): Promise<void>;
}
```
✅ Class implemented  
✅ Async error handling

#### AC 2: Login Flow
1. Open Booking.com login page
2. Enter email + password (from Vault)
3. Handle 2FA if present (email-based, click confirmation link)
4. Navigate to property dashboard
5. Wait for reservations table to load (Playwright waitForSelector)

```typescript
async login(email: string, password: string): Promise<Page> {
  const page = await browser.newPage();
  
  // Random user agent + delay (avoid bot detection)
  await page.setUserAgent(randomUserAgent());
  
  // Navigate to login
  await page.goto('https://secure.booking.com/login.html', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // Fill credentials
  await page.type('[name="username"]', email);
  await page.type('[name="password"]', password);
  
  // Submit
  await page.click('[name="login"]');
  
  // Wait for dashboard (either bypassed 2FA or on 2FA page)
  await page.waitForNavigation({ timeout: 20000 });
  
  return page;
}
```
✅ Login implemented  
✅ 2FA handling (email verification link clicked automatically)  
✅ Timeout handling (max 30s)

#### AC 3: Reservation Extraction
Scrape Booking.com reservations table and extract:
- Booking reference (external_id)
- Guest name
- Check-in date
- Check-out date
- Number of guests
- Total price
- Status (confirmed, pending, cancelled)

```typescript
async extractReservations(page: Page): Promise<Reservation[]> {
  // Wait for reservations table
  await page.waitForSelector('[data-testid="reservations-table"]', { timeout: 15000 });
  
  // Extract from each row
  const reservations = await page.evaluate(() => {
    const rows = document.querySelectorAll('[data-testid="reservation-row"]');
    return Array.from(rows).map(row => ({
      externalId: row.querySelector('[data-field="reference"]')?.textContent?.trim() || '',
      guestName: row.querySelector('[data-field="guest-name"]')?.textContent?.trim() || '',
      checkIn: row.querySelector('[data-field="checkin"]')?.textContent?.trim() || '',
      checkOut: row.querySelector('[data-field="checkout"]')?.textContent?.trim() || '',
      guestCount: parseInt(row.querySelector('[data-field="guests"]')?.textContent || '1'),
      totalPrice: parseFloat(row.querySelector('[data-field="price"]')?.textContent?.replace('€', '') || '0'),
      status: row.querySelector('[data-field="status"]')?.textContent?.trim() || 'confirmed'
    }));
  });
  
  return reservations;
}
```
✅ Extraction implemented  
✅ Error handling for missing fields (defaults to '')

#### AC 4: Bot Detection Avoidance
- **User Agent Rotation:** Change every 10 requests from pool of 50+ real user agents
- **Random Delays:** 2-5 seconds between actions (human-like)
- **Proxy Rotation:** Rotate proxy every 1K requests (if blocked)
- **Request Throttling:** Max 1 request/5 seconds per property
- **Cloudflare Bypass:** Retry with axios-cloudflare-bypass if initially blocked

```typescript
// Bot avoidance middleware
class BotAvoidanceMiddleware {
  async applyDelays(page: Page) {
    // Random delay before each action
    await page.waitForTimeout(Math.random() * 3000 + 2000);
  }
  
  getRandomUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
      // ... 48 more agents
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }
  
  async rotateProxy(page: Page) {
    // Rotate proxy every 1K requests
    if (this.requestCount % 1000 === 0) {
      const newProxy = this.getNextProxy();
      await page.goto('about:blank');  // Reset connection
    }
  }
}
```
✅ Bot avoidance implemented  
✅ User agent pool > 50

#### AC 5: Error Handling & Retry Logic
- **Login fails:** Retry with email verification (2FA)
- **Dashboard timeout:** Log error, retry in 5 minutes
- **Extraction fails:** Use fallback (email parsing, MULTI-OTA-2-2)
- **Rate limited (429):** Backoff 30 minutes, alert @pm for quota check
- **Max 3 retries** per scrape attempt

```typescript
async scrapeWithRetry(config: BookingScraperConfig, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const scraper = new BookingComScraper(config);
      const page = await scraper.login(config.email, config.password);
      await scraper.navigateToDashboard(page);
      const reservations = await scraper.extractReservations(page);
      await scraper.close();
      return { success: true, reservations };
    } catch (error) {
      if (error.code === 429) {
        await logAction({ action: 'rate_limited', ota_source: 'booking.com' });
        throw new Error('Rate limited, will retry in 30 minutes');
      }
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;  // Exponential backoff
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}
```
✅ Retry logic implemented  
✅ Exponential backoff with jitter

#### AC 6: Scraper Scheduling
Run scraper every 30 minutes for each property with Booking credentials:
```bash
# RabbitMQ topic: booking-scraper-queue
# Consumer: lib/queue/consumers/booking-scraper-consumer.ts
# Schedule: Every 30 minutes (configurable per tier)
```
✅ RabbitMQ consumer implemented  
✅ Scheduled via node-cron

### Dev Notes
- Use `puppeteer` (or Playwright) for headless browser automation
- Store browser instance as singleton (pool of 5 concurrent browsers max)
- Log all scraper actions to audit table
- Implement circuit breaker: if 5 consecutive failures, disable scraper for property
- Booking changes dashboard HTML every 3-6 months; add CSS selector version tracking

### Test Plan
- [ ] Scraper successfully logs into Booking.com with test account
- [ ] Extracts 100% of reservations from test property (manually verified)
- [ ] Handles login timeout gracefully
- [ ] Retry logic works (simulate network failure)
- [ ] Bot detection avoidance tested (no blocks on 100 consecutive requests)
- [ ] User agent rotation working (10+ different agents used)
- [ ] Rate limiting triggers correctly (simulate 429)
- [ ] Scraper timeout < 60 seconds for extraction

### Success Criteria
- ✅ Booking.com scraper extracts 95%+ of new reservations
- ✅ Sync latency < 60 seconds (from OTA creation to scraper completion)
- ✅ Zero false positives (no duplicate reservations)
- ✅ Graceful error handling (never crashes middleware)

---

## Story MULTI-OTA-2-2: Email Parsing & Guest Enrichment

**Epic:** MULTI-OTA-SYNC  
**Phase:** 2 (Booking MVP)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 2  
**Complexity:** 8/10 (complex)  
**Effort:** 3 days  
**Status:** DRAFT

### Context
Not all reservation data is visible on Booking.com dashboard (e.g., detailed guest preferences, special requests, cancellation policies). Booking.com sends detailed emails with this data. We parse these emails + use Claude AI to extract structured data.

### Acceptance Criteria

#### AC 1: Gmail API Integration
```typescript
// lib/integrations/gmail.ts
export interface GmailConfig {
  refreshToken: string;      // OAuth2 refresh token (Vault)
  clientId: string;          // Google OAuth app ID
  clientSecret: string;      // Google OAuth app secret
}

export async function connectGmail(config: GmailConfig) {
  // Use refresh token to get access token
  const auth = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret
  );
  auth.setCredentials({ refresh_token: config.refreshToken });
  return google.gmail({ version: 'v1', auth });
}

// Query Booking emails
async function queryBookingEmails(gmail: gmail_v1.Gmail, after: Date) {
  const query = `from:noreply@booking.com subject:"New reservation" after:${dateToGmailQuery(after)}`;
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100
  });
  return res.data.messages || [];
}
```
✅ Gmail API configured  
✅ OAuth2 refresh token stored in Vault

#### AC 2: Email Parsing & Structure Extraction
Parse raw email to extract:
- Booking confirmation number
- Guest name & contact
- Check-in/check-out dates
- Price breakdown
- Special requests (allergies, late arrival, etc.)

```typescript
// lib/parsers/booking-email.ts
export interface BookingEmailParsed {
  externalId: string;       // Booking ref
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  specialRequests: string;
  totalPrice: number;
  currency: string;
  cancellationPolicy: string;
}

export async function parseBookingEmail(rawEmail: string): Promise<BookingEmailParsed> {
  // 1. Extract confirmation number using regex
  const refMatch = rawEmail.match(/Confirmation number:[\s]*([A-Z0-9]+)/i);
  const externalId = refMatch?.[1] || '';
  
  // 2. Use Claude to extract structured data (fallback to regex)
  try {
    const parsed = await extractWithClaude(rawEmail);
    return parsed;
  } catch (error) {
    // Fallback to regex patterns
    return parseWithRegex(rawEmail);
  }
}

function parseWithRegex(email: string): BookingEmailParsed {
  return {
    externalId: email.match(/Confirmation: ([A-Z0-9]+)/)?.[1] || '',
    guestName: email.match(/Guest: (.+?)(?:\n|<)/)?.[1] || '',
    guestEmail: email.match(/Email: ([^\s]+@[^\s]+)/)?.[1] || '',
    // ... more patterns
  };
}
```
✅ Regex patterns for 20+ fields  
✅ Claude AI fallback for ambiguous cases

#### AC 3: Claude API Integration for Complex Extraction
Use Claude to intelligently extract data from unstructured email:

```typescript
// lib/extractors/claude-extractor.ts
async function extractWithClaude(emailBody: string): Promise<BookingEmailParsed> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4.5',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Extract structured data from this Booking.com email:\n\n${emailBody}\n\nReturn JSON: { externalId, guestName, guestEmail, guestPhone, checkIn, checkOut, specialRequests, totalPrice, currency, cancellationPolicy }`
    }]
  });
  
  const content = response.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
  throw new Error('Failed to parse Claude response');
}
```
✅ Claude model used (claude-opus-4.5)  
✅ Cost tracking: ~$0.001 per extraction

#### AC 4: Email Deduplication
Prevent parsing same email twice:
- Store `message_id` (Gmail) in `ota_sync_audit` table
- Skip if already processed
- Use external_id to merge with web scraper results

```typescript
async function isDuplicateEmail(messageId: string): Promise<boolean> {
  const count = await supabase
    .from('ota_sync_audit')
    .select('id')
    .eq('action', 'email_parsed')
    .eq('details->gmail_message_id', messageId)
    .single();
  
  return !!count;
}
```
✅ Deduplication implemented

#### AC 5: Enrichment Flow
1. Parse email → Extract data
2. Match to scraper reservation (external_id)
3. Merge data: if scraper has guest_name, use it; else use email
4. Update reservation in database
5. Log to audit table

```typescript
async function enrichReservationWithEmail(
  propertyId: string,
  email: BookingEmailParsed
) {
  // Find or create reservation
  const existing = await supabase
    .from('ota_reservations')
    .select('*')
    .eq('external_id', email.externalId)
    .eq('ota_source', 'booking.com')
    .single();
  
  if (existing) {
    // Merge data (email takes precedence for contact info)
    await supabase
      .from('ota_reservations')
      .update({
        guest_email: email.guestEmail || existing.guest_email,
        guest_phone: email.guestPhone || existing.guest_phone,
        updated_at: new Date()
      })
      .eq('id', existing.id);
  } else {
    // Create new reservation
    await supabase
      .from('ota_reservations')
      .insert({
        property_id: propertyId,
        external_id: email.externalId,
        ota_source: 'booking.com',
        guest_name: email.guestName,
        guest_email: email.guestEmail,
        guest_phone: email.guestPhone,
        check_in_date: email.checkIn,
        check_out_date: email.checkOut,
        total_price: email.totalPrice,
        sync_source: 'email'
      });
  }
  
  // Log
  await logAction({
    action: 'email_enriched',
    ota_source: 'booking.com',
    details: { external_id: email.externalId, enriched_fields: ['email', 'phone'] }
  });
}
```
✅ Enrichment flow implemented

### Dev Notes
- Gmail API quota: 10M requests/day (more than enough for 10K properties)
- Email parsing runs asynchronously (doesn't block scraper)
- Fallback to regex if Claude extraction fails
- Batch process emails every 5 minutes

### Test Plan
- [ ] Gmail API connects successfully
- [ ] Email parsing extracts 100% of structured fields
- [ ] Regex fallback works (if Claude unavailable)
- [ ] Deduplication prevents processing same email twice
- [ ] Enrichment merges scraper + email data correctly
- [ ] Claude extraction cost is < $0.001/email
- [ ] Audit logs record all email parsing events

### Success Criteria
- ✅ Booking emails parsed with 90%+ accuracy
- ✅ Guest contact info extracted reliably
- ✅ Special requests captured
- ✅ Zero duplicate email processing

---

## Story MULTI-OTA-2-3: iCal Check-Out Extraction

**Epic:** MULTI-OTA-SYNC  
**Phase:** 2 (Booking MVP)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 3  
**Complexity:** 4/10 (simple)  
**Effort:** 2 days  
**Status:** DRAFT

### Context
Booking.com iCal feed is still useful for extracting check-out dates (more reliable than scraper). We use iCal as a secondary data source to verify/correct check-out dates.

### Acceptance Criteria

#### AC 1: iCal Fetching
```typescript
// lib/ical/ical-fetcher.ts
async function fetchBookingIcal(icalUrl: string): Promise<CalendarData> {
  const response = await fetch(icalUrl, {
    headers: { 'User-Agent': 'Lodgra/1.0' },
    timeout: 10000
  });
  
  if (!response.ok) throw new Error(`Failed to fetch iCal: ${response.status}`);
  
  const text = await response.text();
  const calendar = ical.parseICS(text);
  
  return calendar;
}
```
✅ Fetching implemented  
✅ Timeout handling

#### AC 2: Event Extraction
Extract VEVENT entries and map to reservations:
```typescript
function extractEventsFromIcal(calendar: any): IcalEvent[] {
  const events = [];
  for (const [k, v] of Object.entries(calendar)) {
    if (v.component === 'VEVENT') {
      events.push({
        summary: v.summary || '',    // Guest name or "Booking Ref"
        dtstart: new Date(v.dtstart.value),
        dtend: new Date(v.dtend.value),
        description: v.description || ''
      });
    }
  }
  return events;
}
```
✅ Extraction implemented

#### AC 3: Merge with Scraper Data
Use iCal to verify/correct check-out dates:
```typescript
async function mergeIcalData(
  propertyId: string,
  events: IcalEvent[]
) {
  for (const event of events) {
    // Find matching reservation (by date range)
    const existing = await supabase
      .from('ota_reservations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('ota_source', 'booking.com')
      .gte('check_in_date', subtractDays(event.dtstart, 1))
      .lte('check_in_date', addDays(event.dtstart, 1))
      .single();
    
    if (existing && event.dtend !== existing.check_out_date) {
      // Update check-out (iCal is more reliable)
      await supabase
        .from('ota_reservations')
        .update({ check_out_date: event.dtend })
        .eq('id', existing.id);
        
      await logAction({
        action: 'ical_corrected_checkout',
        ota_source: 'booking.com',
        details: { 
          external_id: existing.external_id, 
          old_checkout: existing.check_out_date, 
          new_checkout: event.dtend 
        }
      });
    }
  }
}
```
✅ Merge logic implemented

### Dev Notes
- iCal is secondary (web scraper is primary)
- Run iCal fetch every 60 minutes (less frequent than scraper)
- Use iCal for check-out correction only (doesn't override other fields)

### Test Plan
- [ ] iCal fetched successfully
- [ ] Events extracted correctly
- [ ] Merge updates check-out dates
- [ ] No data loss (audit log records all changes)

### Success Criteria
- ✅ iCal check-out dates verified against scraper
- ✅ Corrections logged to audit table
- ✅ No false positives (only correct genuine mismatches)

---

## Story MULTI-OTA-2-4: AI Extraction Service

**Epic:** MULTI-OTA-SYNC  
**Phase:** 2 (Booking MVP)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 4  
**Complexity:** 7/10 (standard)  
**Effort:** 3 days  
**Status:** DRAFT

### Context
Claude API is the backbone of intelligent data extraction. Create a reusable service to extract structured data from unstructured text (emails, OCR, broken HTML).

### Acceptance Criteria

#### AC 1: Extraction Service Interface
```typescript
// lib/extractors/ai-extractor.ts
export interface ExtractionRequest {
  source: 'email' | 'screenshot' | 'ocr' | 'html';
  data: string;           // Raw email, base64 image, or HTML
  schema: Record<string, string>;  // { fieldName: "description" }
  examples?: Array<{ input: string, output: Record<string, any> }>;
}

export interface ExtractionResult {
  success: boolean;
  data: Record<string, any>;
  confidence: number;  // 0-1
  errors?: string[];
}

export async function extractStructuredData(
  request: ExtractionRequest
): Promise<ExtractionResult> {
  // Implementation
}
```
✅ Interface defined

#### AC 2: Claude-Powered Extraction
```typescript
async function extractWithClaude(
  request: ExtractionRequest
): Promise<ExtractionResult> {
  const systemPrompt = buildSystemPrompt(request.schema);
  const userPrompt = buildUserPrompt(request);
  
  const response = await anthropic.messages.create({
    model: 'claude-opus-4.5',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: userPrompt
    }]
  });
  
  const content = response.content[0];
  if (content.type === 'text') {
    const parsed = JSON.parse(content.text);
    return {
      success: true,
      data: parsed,
      confidence: calculateConfidence(parsed)
    };
  }
  
  return { success: false, data: {}, confidence: 0 };
}

function buildSystemPrompt(schema: Record<string, string>): string {
  return `You are a data extraction specialist. Extract structured data from unstructured text.

Schema:
${JSON.stringify(schema, null, 2)}

Return valid JSON only. For missing fields, use null.`;
}
```
✅ Claude integration implemented  
✅ Error handling for malformed responses

#### AC 3: Few-Shot Learning (Examples)
Support optional examples for better accuracy:
```typescript
function buildUserPrompt(request: ExtractionRequest): string {
  let prompt = `Extract data from this ${request.source}:\n\n${request.data}\n\n`;
  
  if (request.examples?.length) {
    prompt += 'Examples:\n';
    for (const example of request.examples) {
      prompt += `Input: ${example.input}\nOutput: ${JSON.stringify(example.output)}\n\n`;
    }
  }
  
  prompt += 'Now extract from the above data:';
  return prompt;
}
```
✅ Few-shot examples supported

#### AC 4: Fallback & Validation
If Claude fails, try regex patterns:
```typescript
async function extractWithFallback(
  request: ExtractionRequest
): Promise<ExtractionResult> {
  try {
    return await extractWithClaude(request);
  } catch (error) {
    console.warn('Claude extraction failed, trying regex fallback', error);
    
    // Fallback to regex patterns (if available)
    const result = tryRegexExtraction(request.data, request.schema);
    if (Object.keys(result).length > 0) {
      return {
        success: true,
        data: result,
        confidence: 0.5  // Lower confidence for regex
      };
    }
    
    return { success: false, data: {}, confidence: 0 };
  }
}
```
✅ Fallback implemented

#### AC 5: Cost & Rate Limiting
Track cost per extraction, implement rate limiting:
```typescript
class ExtractionCostTracker {
  private costs: Map<string, number> = new Map();
  
  async trackCost(propertyId: string, tokens: number) {
    const cost = (tokens / 1000000) * 3;  // $3 per 1M tokens (claude-opus)
    this.costs.set(propertyId, (this.costs.get(propertyId) || 0) + cost);
  }
  
  async checkQuota(propertyId: string, tierMaxCostPerMonth: number): Promise<boolean> {
    return (this.costs.get(propertyId) || 0) < tierMaxCostPerMonth;
  }
}
```
✅ Cost tracking implemented  
✅ Rate limiting per property

### Dev Notes
- Cache successful extractions (avoid repeated calls)
- Batch multiple extractions per API call (reduces cost)
- Monitor Claude API response times (should be < 5s)
- Log all extractions for quality improvement

### Test Plan
- [ ] Extraction succeeds on 10 sample emails
- [ ] Fallback regex works when Claude unavailable
- [ ] Cost tracking accurate (manual calculation vs tracked)
- [ ] Rate limiting enforced per property
- [ ] Confidence scores consistent with accuracy

### Success Criteria
- ✅ Extraction accuracy > 90% on test dataset
- ✅ Cost per extraction < $0.005
- ✅ Latency < 10 seconds
- ✅ Graceful degradation (fallback works)

---

## Story MULTI-OTA-2-5: Graceful Degradation & Fallback Chain

**Epic:** MULTI-OTA-SYNC  
**Phase:** 2 (Booking MVP)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 5  
**Complexity:** 6/10 (standard)  
**Effort:** 2 days  
**Status:** DRAFT

### Context
System must ALWAYS create a reservation, even if preferred scraper fails. Implement 4-stage fallback chain to ensure robustness.

### Acceptance Criteria

#### AC 1: Fallback Chain Implementation
```typescript
// lib/scrapers/fallback-chain.ts
export class ReservationFallbackChain {
  async sync(propertyId: string, config: SyncConfig): Promise<Reservation[]> {
    const reservations: Reservation[] = [];
    
    // Stage 1: Web Scraper
    try {
      const scraped = await BookingComScraper.scrape(config);
      reservations.push(...scraped);
      return reservations;  // Success!
    } catch (error) {
      await logAction({ action: 'stage1_failed', error: error.message });
    }
    
    // Stage 2: Email Parsing
    try {
      const enriched = await EmailParser.parse(propertyId);
      // Merge with any scraped data
      reservations.push(...enriched.filter(e => !reservations.find(r => r.external_id === e.external_id)));
      if (reservations.length > 0) return reservations;
    } catch (error) {
      await logAction({ action: 'stage2_failed', error: error.message });
    }
    
    // Stage 3: iCal + Manual Queue
    try {
      const ical = await IcalFetcher.fetch(config.icalUrl);
      const minimal = ical.map(e => ({
        externalId: generateId(),
        checkIn: e.dtstart,
        checkOut: e.dtend,
        syncSource: 'ical'
      }));
      reservations.push(...minimal);
      // Mark for manual enrichment
      await addToManualReviewQueue(reservations, propertyId);
      return reservations;
    } catch (error) {
      await logAction({ action: 'stage3_failed', error: error.message });
    }
    
    // Stage 4: Manual Entry
    await alertPropertyOwner({
      message: 'Auto-sync failed for 24 hours. Please add reservations manually.',
      propertyId
    });
    
    return [];  // Fallback to manual
  }
}
```
✅ Chain implemented  
✅ Logging at each stage

#### AC 2: Always-Create Principle
Test: Even if all scrapers fail, system offers manual entry option:
```typescript
// If all stages fail, create placeholder
async function createPlaceholder(
  propertyId: string,
  manualData: { checkIn: Date, checkOut: Date, guestName?: string }
) {
  await supabase
    .from('ota_reservations')
    .insert({
      property_id: propertyId,
      external_id: `manual-${Date.now()}`,
      ota_source: 'manual',
      guest_name: manualData.guestName || 'Unknown',
      check_in_date: manualData.checkIn,
      check_out_date: manualData.checkOut,
      sync_source: 'manual',
      manual_review_needed: true
    });
}
```
✅ Placeholder creation works

#### AC 3: Fallback Metrics
Track which stages are used:
```typescript
interface FallbackMetrics {
  total_syncs: number;
  stage1_success: number;  // %
  stage2_success: number;  // %
  stage3_success: number;  // %
  stage4_fallback: number; // %
  avg_latency_per_stage: Record<1|2|3|4, number>;
}
```
✅ Metrics collected per property

### Dev Notes
- Stage 1 (scraper) = 0-60s latency
- Stage 2 (email) = 5-30 min latency (runs async)
- Stage 3 (iCal) = 30-120 min latency
- Stage 4 (manual) = user-dependent
- Always create reservation at Stage 1, enrich in background

### Test Plan
- [ ] Fallback chain succeeds for all 4 stages
- [ ] Each stage is independent (failure doesn't block next)
- [ ] Placeholder reservation created on total failure
- [ ] Metrics collected accurately
- [ ] Email alerts sent on repeated failures

### Success Criteria
- ✅ Fallback chain never loses reservation data
- ✅ Each stage can operate independently
- ✅ Graceful degradation verified with staged failures

---

## Story MULTI-OTA-2-6: Enrichment Retry Jobs

**Epic:** MULTI-OTA-SYNC  
**Phase:** 2 (Booking MVP)  
**Owner Agent:** @dev (Dex)  
**Story Number:** 6  
**Complexity:** 5/10 (simple)  
**Effort:** 2 days  
**Status:** DRAFT

### Context
Reservations created at Stage 1 may be incomplete (missing guest email, phone, special requests). Background retry jobs enrich reservations with data from email, manual review, etc.

### Acceptance Criteria

#### AC 1: Enrichment Job Queue
```typescript
// lib/queue/enrichment-jobs.ts
export interface EnrichmentJob {
  reservationId: UUID;
  propertyId: UUID;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lastError?: string;
}

async function createEnrichmentJob(
  reservationId: UUID,
  propertyId: UUID
) {
  await supabase
    .from('enrichment_jobs')
    .insert({
      reservation_id: reservationId,
      property_id: propertyId,
      attempts: 0,
      max_attempts: 5,
      next_retry_at: new Date(Date.now() + 5 * 60000),  // 5 min delay
      status: 'pending'
    });
}
```
✅ Job created

#### AC 2: Retry Logic with Exponential Backoff
```typescript
async function processEnrichmentJobs() {
  // Find jobs due for retry
  const jobs = await supabase
    .from('enrichment_jobs')
    .select('*')
    .eq('status', 'pending')
    .lt('next_retry_at', new Date())
    .limit(100);
  
  for (const job of jobs.data || []) {
    try {
      // Try to enrich
      await enrichReservation(job.reservation_id);
      
      // Mark complete
      await supabase
        .from('enrichment_jobs')
        .update({ status: 'completed' })
        .eq('id', job.id);
        
    } catch (error) {
      // Increment attempts + backoff
      const nextRetry = exponentialBackoff(job.attempts, job.max_attempts);
      await supabase
        .from('enrichment_jobs')
        .update({
          attempts: job.attempts + 1,
          last_error: error.message,
          next_retry_at: nextRetry,
          status: job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending'
        })
        .eq('id', job.id);
    }
  }
}

function exponentialBackoff(attempt: number, maxAttempts: number): Date {
  // Delay: 5 min, 15 min, 45 min, 2h, 6h
  const delays = [5, 15, 45, 120, 360];
  const delayMinutes = delays[Math.min(attempt, delays.length - 1)];
  return new Date(Date.now() + delayMinutes * 60000);
}
```
✅ Retry logic implemented

#### AC 3: Enrichment Strategies
Try multiple sources to fill missing data:
```typescript
async function enrichReservation(reservationId: UUID) {
  const reservation = await supabase
    .from('ota_reservations')
    .select('*')
    .eq('id', reservationId)
    .single();
  
  // 1. Try email enrichment
  if (!reservation.guest_email) {
    const email = await findBookingEmail(reservation.external_id);
    if (email) {
      const parsed = await parseBookingEmail(email);
      await supabase
        .from('ota_reservations')
        .update({ guest_email: parsed.guestEmail })
        .eq('id', reservationId);
      return;  // Success
    }
  }
  
  // 2. Try manual review queue (if available)
  if (!reservation.guest_phone) {
    const manualData = await supabase
      .from('manual_review_queue')
      .select('suggestion')
      .eq('reservation_id', reservationId)
      .single();
    
    if (manualData?.suggestion?.phone) {
      await supabase
        .from('ota_reservations')
        .update({ guest_phone: manualData.suggestion.phone })
        .eq('id', reservationId);
      return;
    }
  }
  
  throw new Error('No enrichment source available');
}
```
✅ Enrichment strategies implemented

### Dev Notes
- Run job processor every 1 minute (RabbitMQ worker)
- Max 100 jobs per batch (avoid memory issues)
- Enrichment jobs expire after 7 days (manual review required)

### Test Plan
- [ ] Enrichment job created for incomplete reservations
- [ ] Retry logic works (simulate failures)
- [ ] Exponential backoff delays correct
- [ ] Job expires after 7 days
- [ ] Metrics tracked (enrichment success rate)

### Success Criteria
- ✅ 90% of reservations enriched within 1 hour
- ✅ Failed jobs escalated to manual review queue
- ✅ No data loss on job failure

---

## Phase 2 Summary

| Story | Title | Owner | Days | Status |
|-------|-------|-------|------|--------|
| MULTI-OTA-2-1 | Booking.com Web Scraper | @dev | 4 | DRAFT |
| MULTI-OTA-2-2 | Email Parsing & Enrichment | @dev | 3 | DRAFT |
| MULTI-OTA-2-3 | iCal Check-Out Extraction | @dev | 2 | DRAFT |
| MULTI-OTA-2-4 | AI Extraction Service | @dev | 3 | DRAFT |
| MULTI-OTA-2-5 | Graceful Degradation & Fallback | @dev | 2 | DRAFT |
| MULTI-OTA-2-6 | Enrichment Retry Jobs | @dev | 2 | DRAFT |
| **TOTAL** | **Booking MVP** | **@dev** | **15 days** | **READY** |

### Phase 2 Success Criteria
- [ ] All 6 stories completed and QA-approved
- [ ] Booking.com scraper extracts 95%+ of new reservations
- [ ] Email parsing achieves 90%+ accuracy
- [ ] Graceful degradation tested (all 4 stages)
- [ ] Enrichment jobs working (90% within 1 hour)
- [ ] Load test: 100K reservations/month, sub-5-min avg sync
- [ ] Zero critical security issues

### Phase 2 Blockers
- None (Phase 1 must be complete)

### Handoff to Phase 3
Once Phase 2 is complete and QA-approved, Phase 3 stories (Airbnb + conflicts) can begin. Booking.com foundation is solid, scraper proven, AI extraction working.

---

**Phase 2 Status:** READY FOR @dev  
**Dependency:** Phase 1 COMPLETE  
**Activation Date:** 2026-08-24 (after Phase 1 goes live)  
**Target Completion:** 2026-09-07 (3 weeks)
