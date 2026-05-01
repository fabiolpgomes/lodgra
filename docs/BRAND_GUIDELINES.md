# LODGRA Brand Guidelines v1.1

**Status:** Production Ready  
**Version:** 1.1  
**Created:** 2026-04-15  
**Updated:** 2026-05-01  
**Brand:** Lodgra - Intelligent Property Management

---

## 🎨 Brand Identity Quick Reference

| Element | Value |
|---------|-------|
| **Primary Action Color** | Verde Crescimento (Sábio) #059669 — ALL CTA buttons |
| **Primary Text/Borders** | Azul Confiança #1E3A8A |
| **Accent / "Mais Popular"** | Ouro Próspero #D4AF37 |
| **Background / Light** | Cinza Neutro #F3F4F6 |
| **Body Text** | Cinza Escuro #374151 |
| **Heading Font** | Poppins Bold 700 |
| **Body Font** | Inter Regular 400/500 |
| **Logo** | SVG (48x48px base) |
| **Tone** | Confident, Accessible, Empathetic |

---

## 🎨 Production Color Palette (Tailwind)

These are the **canonical** Lodgra colors as defined in `tailwind.config.ts`. Use only these — do not invent variants.

| Tailwind Token | Hex | Name | Primary Use |
|----------------|-----|------|-------------|
| `lodgra-blue` | `#1E3A8A` | Azul Confiança | Primary text, borders, Pro plan card, navbar brand |
| `lodgra-gold` | `#D4AF37` | Ouro Próspero | "Mais Popular" badge, accents, star ratings |
| `lodgra-green` | `#059669` | Verde Crescimento (Sábio) | **ALL CTA buttons**, success states, active indicators |
| `lodgra-gray` | `#F3F4F6` | Cinza Neutro | Section backgrounds, card backgrounds, input fills |
| `lodgra-dark` | `#374151` | Cinza Escuro | Body text, secondary text, descriptions |

### Important Rules

- `lodgra-primary` **does NOT exist** — use `lodgra-blue` for primary text/borders or `lodgra-green` for CTAs
- `lodgra-light` **does NOT exist** — use `lodgra-gray` for light backgrounds
- All CTA buttons (primary actions) MUST use `#059669` (lodgra-green / Sábio archetype)
- For inline styles where Tailwind purges classes: use `style={{ backgroundColor: '#059669' }}` directly
- The Pro plan card uses `lodgra-blue` (#1E3A8A) background as a premium differentiator

### Tailwind Safelist

The following classes are safelisted in `tailwind.config.ts` to prevent purging:

```javascript
safelist: [
  'bg-lodgra-blue',
  'bg-lodgra-gold',
  'bg-lodgra-green',
  'bg-lodgra-gray',
  'bg-lodgra-dark',
  'text-lodgra-blue',
  'text-lodgra-gold',
  'text-lodgra-green',
  'border-lodgra-blue',
  'border-lodgra-gold',
  'border-lodgra-green',
]
```

### CTA Button Standard

```tsx
// Correct: green CTA button
<button style={{ backgroundColor: '#059669' }} className="text-white px-6 py-3 rounded-lg font-semibold">
  Assinar Expansão
</button>

// Wrong: using non-existent lodgra-primary
<button className="bg-lodgra-primary text-white ...">  // ❌ lodgra-primary does not exist
  Assinar Expansão
</button>
```

---

## 📸 Image Filters & Processing

### **Filter Specifications**
- ✅ Slight color boost: **Vibrancy +10%**
- ✅ Clarity enhancement: **+15% (sharpness)**
- ✅ Saturation: **Neutral to +5%** (natural look)
- ✅ Avoid heavy filters (no VSCO presets)
- ✅ Maintain natural color palette (blues, golds, greens)

### **Editing Guidelines**
1. **Start:** Natural, unfiltered photo
2. **Vibrancy:** +10% boost (not saturation)
3. **Clarity:** +15% sharpness for detail
4. **Saturation:** Keep at 0 or +5% max
5. **Avoid:** Vignetting, grain, heavy processing
6. **Result:** Professional, natural-looking

### **Forbidden Image Styles**
- ❌ Overly staged, artificial looking
- ❌ Generic stock photos (iStock, Shutterstock clichés)
- ❌ Heavy vignetting or filters
- ❌ Low-quality phone photos
- ❌ Inconsistent lighting across photo series
- ❌ Overexposed or blown-out highlights
- ❌ Images with watermarks

### **Approved Image Sources**
- ✅ Professional property photography (actual listings)
- ✅ Authentic user-generated content (with permission)
- ✅ Premium stock (Unsplash, Pexels, custom photography)
- ✅ Illustrations (consistent style, hand-drawn or vector)
- ✅ Data visualizations (charts, graphs, dashboards)

---

## 💬 Voice & Tone

### **Brand Voice Principles**

**Confident**
- We know what we're talking about
- Data-driven expertise, not assumptions
- Speak with authority, not arrogance

**Accessible**
- Complex ideas explained simply
- Never condescending
- Meet users where they are

**Empathetic**
- We understand your challenges
- Your success is our mission
- Show we care about outcomes

**Action-Oriented**
- "Do this now" not "maybe you could"
- Direct CTAs, clear next steps
- Urgency without pressure

**Honest**
- No hype, no false promises
- Real results with proof
- Transparent about limitations

### **Tone by Context**

#### 🚀 Marketing/Landing Pages
**Tone:** Aspirational, inspiring, action-driven

**Examples:**
- ✅ "Turn your property into a revenue machine"
- ✅ "Maximize bookings. Minimize stress."
- ✅ "Your data. Your growth. Your control."
- ❌ "Synergize your STR ecosystem"
- ❌ "Disruptive short-term rental solutions"

**Guidelines:**
- Paint the transformation (before → after)
- Focus on outcomes, not features
- Use power words (maximize, unlock, master)
- Action-driven language
- Avoid corporate jargon

#### 💻 Product Copy (In-App)
**Tone:** Clear, direct, helpful

**Examples:**
- ✅ "Your property is earning €2,450 this month—€230 above average"
- ✅ "Calendar sync paused. Let's reconnect your iCal link"
- ✅ "3 quick wins to boost bookings this week"
- ❌ "Optimization metrics have been updated"
- ❌ "Please re-authenticate your integration"

**Guidelines:**
- Show actual numbers and context
- Be helpful, not robotic
- Acknowledge user's context
- Suggest concrete next steps
- Avoid feature names, focus on benefits

#### 🤝 Customer Support
**Tone:** Warm, patient, solution-focused

**Examples:**
- ✅ "Let's get your calendar synced in 3 minutes"
- ✅ "I see the issue. Here's the fastest fix"
- ✅ "We're here to help—no question is too small"
- ❌ "Refer to documentation section 4.2.1"
- ❌ "User error detected: invalid input"

**Guidelines:**
- Start with empathy
- Offer specific solutions
- Set clear expectations (time, next steps)
- Be warm but professional
- Avoid technical jargon

#### ⚠️ Error Messages
**Tone:** Helpful, constructive, never blaming

**Examples:**
- ✅ "Calendar sync paused. Let's reconnect your iCal link"
- ✅ "Property photo needs to be at least 800px wide"
- ✅ "We couldn't reach Airbnb. Let's try again in a moment"
- ❌ "ERROR: Invalid iCal feed"
- ❌ "User authentication failed"
- ❌ "Bad request: malformed JSON"

**Guidelines:**
- Explain what happened (not blame)
- Show how to fix it
- Be encouraging and patient
- Use plain language
- Provide next steps

### **Example Messaging Archive**

**Good Messaging:**
- "Maximize revenue with data-driven pricing"
- "See how your property stacks up"
- "3 quick wins to boost bookings"
- "Your property earns while you sleep"
- "Stop leaving money on the table"
- "One platform. All your properties."
- "Grow smarter, not harder"

**Bad Messaging:**
- "Synergize your STR ecosystem"
- "Leverage cutting-edge AI algorithms"
- "Disruptive short-term rental solutions"
- "Next-gen property optimization"
- "Enterprise-grade revenue intelligence"
- "Seamlessly integrate your workflows"

---

## 🎯 Iconography System

### **Icon Style Guide**

**Design Principles:**
- Outline style (stroke-based, not filled)
- Stroke weight: **1.5-2px** (consistent)
- Rounded corners: **8-16px radius**
- Consistent visual weight across all icons
- Maximum 2-3 colors per icon
- Friendly but professional appearance
- Scale gracefully from 16px to 128px

### **Icon Grid & Dimensions**
- **Base Unit:** 24x24px
- **Stroke Weight:** 1.5px
- **Corner Radius:** 12px
- **Padding:** 2px minimum around content
- **Export:** SVG + PNG @2x

### **Icon Color Palette**

| Usage | Color | Hex | Context |
|-------|-------|-----|---------|
| Primary Actions / CTAs | Verde Crescimento | #059669 | Buttons, CheckCircle, TrendingUp |
| Brand / Navigation | Azul Confiança | #1E3A8A | Home, Shield, Brand marks |
| Revenue/Pricing/Accents | Ouro Próspero | #D4AF37 | DollarSign, Star, "Mais Popular" |
| Success | Verde Crescimento | #059669 | CheckCircle, Checkmark |
| Warning | Ouro Próspero | #D4AF37 | AlertCircle, ExclamationMark |
| Neutral | Cinza Escuro | #374151 | Settings, Info, Help |

### **Core Icon Set (50+ Icons)**

| Icon | Use Case | Color | Notes |
|------|----------|-------|-------|
| Calendar | Booking management, dates | Verde Primário | Essential |
| DollarSign | Revenue, pricing, costs | Ouro | Essential |
| TrendingUp | Growth, analytics, ROI | Verde Primário | Essential |
| Home | Properties, listings | Verde Primário | Essential |
| Users | Guests, team, sharing | Verde Primário | Essential |
| Settings | Configuration, preferences | Cinza | Essential |
| Bell | Notifications, alerts | Ouro | Essential |
| Lock | Security, privacy | Verde Escuro | Essential |
| CheckCircle | Success, completion | Verde | Essential |
| AlertCircle | Warning, caution | Ouro | Essential |
| Mail | Email, messages | Verde Primário | Optional |
| MapPin | Location, address | Verde Primário | Optional |
| BarChart | Analytics, reports | Verde Primário | Optional |
| RefreshCw | Sync, update | Verde Primário | Optional |
| Download | Export, save | Ouro | Optional |
| Upload | Import, add | Verde Primário | Optional |
| Eye | View, visibility | Cinza | Optional |
| EyeOff | Hide, privacy | Cinza | Optional |
| Copy | Duplicate, clone | Cinza | Optional |
| Trash | Delete, remove | Ouro | Optional |
| Edit | Modify, update | Verde Primário | Optional |

### **Icon Usage Examples**

**Hero Section Icons:**
- Calendar + TrendingUp = automatic sync + growth
- Home + DollarSign = property revenue
- Users + CheckCircle = team management

**Dashboard Icons:**
- BarChart + TrendingUp = analytics
- Home + DollarSign = revenue per property
- Bell + AlertCircle = notifications

**Navigation Icons:**
- Home = Dashboard/Properties
- Calendar = Reservations/Calendar
- BarChart = Reports/Analytics
- Settings = Configuration/Preferences

---

## 📐 Layout & Spacing

### **Spacing System (8px Grid)**

```
4px   — Micro spacing (borders, small gaps)
8px   — Small spacing (component padding)
16px  — Medium spacing (sections)
24px  — Large spacing (major sections)
32px  — XL spacing (page breaks)
```

### **Common Spacing Values**

| Element | Padding | Margin | Notes |
|---------|---------|--------|-------|
| **Button** | 12px 24px | 8px | Clickable area |
| **Input** | 12px 16px | 8px | Form fields |
| **Card** | 24px | 16px bottom | Content container |
| **Section** | 32px horizontal | 32px vertical | Major section |
| **Container** | 16px-24px | 0px | Page wrapper |
| **List Item** | 8px vertical | 4px | Item spacing |
| **Badge** | 4px 8px | 0px | Inline elements |

### **Responsive Spacing**

| Breakpoint | Container Padding | Section Gap | Card Gap |
|------------|------------------|-------------|----------|
| **Mobile** (< 640px) | 16px | 16px | 16px |
| **Tablet** (640px-1024px) | 24px | 24px | 20px |
| **Desktop** (> 1024px) | 32px | 32px | 24px |

### **Grid System**

**Desktop:** 12-column grid, 24px gutter
```css
grid-template-columns: repeat(12, 1fr);
gap: 24px;
```

**Tablet:** 8-column grid, 16px gutter
```css
grid-template-columns: repeat(8, 1fr);
gap: 16px;
```

**Mobile:** Single column, 16px padding
```css
grid-template-columns: 1fr;
padding: 16px;
```

### **Spacing in Components**

**Hero Section:**
- Top padding: 80px (desktop), 60px (mobile)
- Bottom padding: 100px (desktop), 60px (mobile)
- Title to subtitle gap: 24px
- Subtitle to CTA gap: 40px

**Card Grid:**
- Row gap: 24px
- Column gap: 24px
- Card internal padding: 24px
- Inside heading to text: 12px

**Footer:**
- Section padding: 64px vertical, 32px horizontal
- Column gap: 32px
- Row gap: 16px
- Bottom copyright padding: 24px

---

## ♿ Accessibility (WCAG AA)

### **Color Contrast**
- ✅ All body text: **4.5:1 minimum** (AAA)
- ✅ Interactive elements: **3:1 minimum** (AA)
- ✅ Large text (18px+ bold): **3:1 minimum** (AA)
- ✅ No color as sole information source (use icons/patterns)
- ✅ Test with WAVE or Lighthouse

### **Typography**
- ✅ Minimum **16px** body text (mobile-friendly)
- ✅ Line-height **≥1.5** for readability
- ✅ Font weights: **400, 500, 600, 700 only**
- ✅ Max line length: **80 characters** (optimal)
- ✅ No all-caps body text (except headings)

### **Interactive Elements**
- ✅ Minimum **44x44px** touch target (mobile)
- ✅ Focus indicators **always visible** (outline or ring)
- ✅ Keyboard navigable (Tab, Enter, Escape)
- ✅ No focus traps
- ✅ Skip to main content link

### **Images & Icons**
- ✅ Alt text describes content (not "image of...")
- ✅ Icons have `aria-label` or `title`
- ✅ Decorative images: `alt=""` (empty)
- ✅ SVG logos have `role="img"` + `aria-label`

### **Forms & Inputs**
- ✅ `<label>` associated with input via `htmlFor`
- ✅ Required fields marked with `*` or `aria-required`
- ✅ Error messages clear, specific, helpful
- ✅ Error color + icon (not just color)
- ✅ Success states clear (icon + color + text)

### **Structure & Semantics**
- ✅ Proper heading hierarchy (H1 → H2 → H3)
- ✅ Semantic HTML (nav, main, section, article)
- ✅ Links have descriptive text (not "click here")
- ✅ Lists use `<ul>`, `<ol>`, `<li>`
- ✅ Landmarks: nav, main, footer, aside

### **Testing Checklist**
- [ ] Color contrast: 4.5:1+ (WAVE/Lighthouse)
- [ ] Keyboard navigation: Tab works everywhere
- [ ] Screen reader: Tested with NVDA/JAWS
- [ ] Mobile touch targets: 44x44px minimum
- [ ] Focus visible on all interactive elements
- [ ] No keyboard traps
- [ ] Heading hierarchy logical
- [ ] Alt text on all images
- [ ] Forms fully accessible
- [ ] 100 Lighthouse Accessibility score

---

## ✅ Do's & Don'ts

### **✅ DO's**

**Logo**
- ✅ Use logo on light backgrounds (white, light gray)
- ✅ Maintain clear space around logo (10px minimum)
- ✅ Use horizontal OR stacked variant appropriately
- ✅ Export as SVG for scalability

**Typography**
- ✅ Use Poppins Bold (700) for all headings
- ✅ Use Inter for body text (400/500/600)
- ✅ Pair Poppins + Inter together
- ✅ Maintain heading hierarchy (H1 > H2 > H3)
- ✅ Use 16px minimum for body text

**Colors**
- ✅ Use `lodgra-green` (#059669) for ALL primary CTA buttons (Sábio archetype)
- ✅ Use `lodgra-blue` (#1E3A8A) for primary text, borders, Pro plan accents
- ✅ Use `lodgra-gold` (#D4AF37) for "Mais Popular" badge, accent elements
- ✅ Use `lodgra-gray` (#F3F4F6) for section and card backgrounds
- ✅ Use `lodgra-dark` (#374151) for body text and descriptions
- ✅ Ensure 4.5:1 contrast on text
- ✅ Use inline `style={{ backgroundColor: '#059669' }}` if Tailwind class is being purged

**Imagery**
- ✅ Use professional, high-quality photos
- ✅ Apply +10% vibrancy, +15% clarity filters
- ✅ Maintain consistent lighting/style
- ✅ Show authentic property photography
- ✅ Include diverse, real people

**Voice & Messaging**
- ✅ Be confident and direct
- ✅ Use power words (maximize, unlock, master)
- ✅ Focus on outcomes, not features
- ✅ Show data and proof
- ✅ Use action-oriented language

**Design**
- ✅ Follow 8px grid spacing system
- ✅ Test for accessibility (WCAG AA)
- ✅ Use consistent component styles
- ✅ Maintain 44x44px touch targets
- ✅ Use outline icons (1.5-2px stroke)

### **❌ DON'Ts**

**Logo**
- ❌ Don't use logo on dark backgrounds (no white version shown)
- ❌ Don't rotate, skew, or stretch logo
- ❌ Don't change logo colors
- ❌ Don't add effects (shadows, glows, gradients)
- ❌ Don't use outline/hollow versions

**Typography**
- ❌ Don't use serif fonts (Times, Georgia)
- ❌ Don't use script or handwriting fonts
- ❌ Don't use font weights outside 400/500/600/700
- ❌ Don't use all-caps in body text
- ❌ Don't use italics for emphasis (use weight instead)
- ❌ Don't use body text smaller than 16px

**Colors**
- ❌ Don't use more than 3 colors in one design
- ❌ Don't use color alone to convey meaning (use patterns)
- ❌ Don't create custom color variations
- ❌ Don't use light text on light backgrounds
- ❌ Don't use colors without sufficient contrast

**Imagery**
- ❌ Don't use generic stock photos (obvious clichés)
- ❌ Don't use low-quality or blurry photos
- ❌ Don't use overly staged, artificial photos
- ❌ Don't apply heavy filters (VSCO, Instagram)
- ❌ Don't use photos with watermarks
- ❌ Don't use vignetting or grain effects
- ❌ Don't use inconsistent lighting/style

**Voice & Messaging**
- ❌ Don't use corporate jargon ("synergize," "leverage")
- ❌ Don't use hype language ("revolutionary," "disruptive")
- ❌ Don't make unsupported claims
- ❌ Don't use passive voice ("it is believed...")
- ❌ Don't assume user knowledge
- ❌ Don't be condescending

**Design**
- ❌ Don't deviate from spacing grid
- ❌ Don't use arbitrary margins/padding
- ❌ Don't create touch targets smaller than 44x44px
- ❌ Don't remove focus indicators
- ❌ Don't use filled icons (use outline only)
- ❌ Don't ignore accessibility requirements

---

## 📋 Implementation Checklist

**Before Launch:**
- [ ] All text meets WCAG AA contrast (4.5:1)
- [ ] All images use +10% vibrancy, +15% clarity filters
- [ ] Copy reviewed for tone and accuracy
- [ ] Icons use consistent 1.5-2px stroke weight
- [ ] Spacing follows 8px grid system
- [ ] Typography uses only Poppins (headings) + Inter (body)
- [ ] Mobile touch targets are 44x44px minimum
- [ ] Keyboard navigation works fully
- [ ] Alt text on all images
- [ ] No color used alone to convey information
- [ ] Lighthouse Accessibility score ≥95
- [ ] All links have descriptive anchor text

---

**Brand Guidelines v1.1 — Production Ready ✅**

Lodgra. Revenue. Growth. Stay.

— Design System Team | Updated 2026-05-01 (v1.1: production color palette, Tailwind tokens, CTA standards)
