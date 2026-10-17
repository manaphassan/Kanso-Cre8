# Kanso Cre8 — Frontmatter & Vault Data Schema Contract (SCHEMA.md)

This document defines the formal frontmatter schema contracts for Kanso Cre8 (`簡素`).
In accordance with the **Pure Markdown Storage Law**, all persistent entities in Kanso Cre8 are stored as human-readable UTF-8 `.md` documents with YAML frontmatter. There are zero SQL, SQLite, or binary database files.

---

## 1. Core Data & Storage Principles

1. **Human-Readable UTF-8**: Every document can be opened, inspected, and edited directly in VS Code, Obsidian, or standard text editors.
2. **Preservation of Unknown Keys**: When reading, validating, and writing frontmatter via `FrontmatterService`, **unknown and custom user keys are strictly preserved and never dropped**.
3. **Strict Date Formatting**: Dates must follow ISO 8601 calendar date format: `YYYY-MM-DD`. Timestamps must follow ISO 8601 UTC format (`YYYY-MM-DDTHH:mm:ss.sssZ`).
4. **Strict Money Formatting**: Monetary values are stored as raw numeric figures (e.g., `1250` or `1250.50`) paired with a `currency` key (e.g., `USD`, `EUR`, `MYR`). Currency symbols and thousand separators must never be saved in raw frontmatter.
5. **Color Data Restraint**: Hex color strings (e.g., `#38BDF8`) are permitted as data **only** in `_Clients/*/client.md` (`color:` or `palette:`). All UI styling elsewhere uses standard CSS tokens (`var(--kanso-*)`).

---

## 2. Document Schemas

### 2.1 Project Dossier (`project`)

- **File Path**: `_Projects/<YYYY>/<YYYYMM>_<NNNN><T>_<CODE>_<Title>/README.md`
- **Description**: The primary operational dossier and brief for a client design project.

| Key | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `status` | `string` | Yes | `backlog` | Stage: `backlog`, `in-progress`, `review`, `revision`, `approved`, `archived` |
| `priority` | `string` | No | `medium` | Urgency: `low`, `medium`, `high`, `urgent` |
| `client` | `string` | Yes | — | Canonical client code (e.g., `ACME`, `NEX`, `LUM`) |
| `designer` | `string` | No | `alex.mercer` | Assigned designer / creator handle |
| `created` | `string` | No | Current Date | Creation date in `YYYY-MM-DD` |
| `deadline` | `string` | No | — | Target deliverable sign-off date in `YYYY-MM-DD` |
| `duration` | `string` | No | — | Estimated timeframe (e.g., `2 weeks`, `3 sprints`) |
| `revision` | `integer` | No | `0` | Active client revision round counter (>= 0) |
| `tags` | `array<string>`| No | `[]` | Categorization tags (e.g., `[branding, 3d, mobile]`) |
| `department` | `string` | No | — | Functional area (e.g., `Product Design`, `Brand Identity`) |
| `manager` | `string` | No | — | Approving director or project lead |
| `creative_direction` | `object` | No | `{}` | `tone` and `key_messaging` guidelines |
| `copywriting` | `object` | No | `{}` | `status`, `headline`, and `body_copy` tracking |

```yaml
---
status: in-progress
client: ACME
priority: high
created: "2026-09-01"
deadline: "2026-09-23"
duration: 2 weeks
revision: 1
designer: alex.mercer
department: Product Design
tags:
  - illustration
  - 3d
  - fintech
creative_direction:
  tone: Trustworthy, Modern, Electric Blue Fintech
  key_messaging: Seamless Digital Banking Experience with 3D Depth
copywriting:
  status: approved
  headline: Next-Gen Mobile Banking Visualization
---
```

---

### 2.2 Client Profile & Brand Dossier (`client`)

- **File Path**: `_Clients/<CODE>_<Name>/client.md`
- **Description**: The single source of truth for client identities, swatches, and billing terms.

| Key | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `code` | `string` | Yes | — | 2 to 5 uppercase alphanumeric characters (e.g., `ACME`) |
| `name` | `string` | Yes | — | Full legal or trading business name |
| `id` | `string` | No | `lowercase(code)` | Client slug identifier |
| `contact_person`| `string` | No | `""` | Primary client stakeholder |
| `email` | `string` | No | `""` | Client billing and proof contact email |
| `phone` | `string` | No | `""` | Direct contact telephone number |
| `billing_address`| `string`| No | `""` | Registered corporate billing address |
| `currency` | `string` | No | `USD` | Standard ISO currency code |
| `default_hourly_rate` | `number` | No | `125` | Default billable hourly rate in numerical units |
| `payment_terms_days` | `integer`| No | `15` | Net invoice payment terms in days |
| `color` | `string` | No | `""` | Primary brand accent hex color (e.g., `#0066FF`) |
| `palette` | `object` | No | `{}` | Brand palette: `primary`, `secondary`, `dark`, `light`, `accent` |
| `tax_id` | `string` | No | `""` | Client Tax / VAT / SST Registration Number |
| `tags` | `array<string>`| No | `[]` | Industry and project affinity tags |

```yaml
---
id: acmecorp
name: Acme Corporation
code: ACME
contact_person: Sarah Jenkins
email: sarah.j@acmefintech.io
phone: +1 (555) 234-5678
billing_address: 100 Market St, Suite 400, San Francisco, CA 94105
currency: USD
default_hourly_rate: 125
payment_terms_days: 15
palette:
  primary: "#0066FF"
  secondary: "#0052CC"
  dark: "#0A0D14"
  light: "#F8FAFC"
  accent: "#00F0FF"
tags: [fintech, banking, 3d, mobile]
---
```

---

### 2.3 Financial Quote (`quote`)

- **File Path**: `_Finance/Quotes/QUOTE-YYYY-NNN_<CODE>.md` (or `QTE-YYYY-NNN_<CODE>.md`)
- **Description**: Creative fee estimate and milestone agreement.

| Key | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | Yes | — | Unique document identifier (e.g., `QTE-2026-001`) |
| `documentNumber`| `string` | Yes | — | Official sequential quote number |
| `type` | `string` | Yes | `quote` | Document classification (`quote`) |
| `client_code` | `string` | Yes | — | Associated client code |
| `client_name` | `string` | Yes | — | Client name |
| `client_email` | `string` | No | `""` | Client contact email |
| `date` | `string` | Yes | Current Date | Issuance date in `YYYY-MM-DD` |
| `valid_until` | `string` | Yes | Date + 30d | Expiration date in `YYYY-MM-DD` |
| `status` | `string` | Yes | `draft` | `draft`, `sent`, `accepted`, `rejected`, `converted` |
| `currency` | `string` | No | `USD` | ISO currency code |
| `hourly_rate` | `number` | No | `125` | Default billing rate for time-based items |
| `items` | `array<object>`| Yes | `[]` | Line items: `description`, `hours`, `rate`, `amount` |
| `subtotal` | `number` | Yes | Auto-calc | Sum of line item amounts |
| `tax_percent` | `number` | No | `0` | Applicable sales tax / VAT rate (%) |
| `tax_amount` | `number` | No | Auto-calc | Computed tax amount |
| `total` | `number` | Yes | Auto-calc | Subtotal + tax amount |
| `linked_project_id`| `string`| No | `""` | Associated project directory or ID |
| `linked_invoice_id`| `string`| No | `""` | Converted invoice reference |
| `theme` | `string` | No | `geist` | Printable document theme (`geist`, `minimal`) |
| `stamp` | `string` | No | `none` | Visual official stamp (`none`, `approved`, `draft`) |

```yaml
---
id: QTE-2026-001
documentNumber: QTE-2026-001
type: quote
client_code: ACME
client_name: Acme Corporation
client_email: billing@acmefintech.io
date: "2026-09-01"
valid_until: "2026-10-01"
status: accepted
currency: USD
hourly_rate: 125
items:
  - description: 3D Isometric Mobile App Assets
    hours: 32
    rate: 125
    amount: 4000
subtotal: 4000
tax_percent: 0
tax_amount: 0
total: 4000
linked_project_id: 202609_0001D_ACME_MobileAppIllustration
theme: geist
stamp: approved
---
```

---

### 2.4 Financial Invoice (`invoice`)

- **File Path**: `_Finance/Invoices/INV-YYYY-NNN_<CODE>.md`
- **Description**: Final billable document with remittance instructions and payment status.

| Key | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | Yes | — | Unique document identifier (e.g., `INV-2026-001`) |
| `documentNumber`| `string` | Yes | — | Official sequential invoice number |
| `type` | `string` | Yes | `invoice` | Document classification (`invoice`) |
| `client_code` | `string` | Yes | — | Canonical client code |
| `client_name` | `string` | Yes | — | Full client company name |
| `date` | `string` | Yes | Current Date | Issuance date in `YYYY-MM-DD` |
| `due_date` | `string` | Yes | Issuance + Net | Payment deadline in `YYYY-MM-DD` |
| `status` | `string` | Yes | `draft` | `draft`, `sent`, `pending`, `paid`, `overdue`, `cancelled` |
| `currency` | `string` | No | `USD` | ISO currency code |
| `hourly_rate` | `number` | No | `125` | Session rate |
| `items` | `array<object>`| Yes | `[]` | Line items: `description`, `hours`, `rate`, `amount` |
| `subtotal` | `number` | Yes | Auto-calc | Sum of line items |
| `tax_percent` | `number` | No | `0` | Tax percentage |
| `tax_amount` | `number` | No | Auto-calc | Tax value |
| `total` | `number` | Yes | Auto-calc | Grand total due |
| `paid_amount` | `number` | No | `0` | Amount settled |
| `paid_at` | `string` | No | `""` | Payment settlement date |
| `linked_project_id`| `string`| No | `""` | Source project folder |
| `linked_quote_id`| `string` | No | `""` | Originating quote reference |
| `tin` | `string` | No | `""` | Freelancer Tax Identification Number |
| `sst_registration_no` | `string`| No | `""` | Freelancer SST/VAT Registration |
| `buyer_tin` | `string` | No | `""` | Client Tax Identification Number |
| `buyer_sst_no` | `string` | No | `""` | Client SST/VAT Registration |
| `theme` | `string` | No | `geist` | Offline printable layout theme |
| `stamp` | `string` | No | `none` | Status seal |
| `show_client_accent` | `boolean`| No | `true` | Apply client swatch accent to invoice banner |

```yaml
---
id: INV-2026-001
documentNumber: INV-2026-001
type: invoice
client_code: ACME
client_name: Acme Corporation
client_email: billing@acmefintech.io
date: "2026-09-08"
due_date: "2026-09-23"
status: paid
currency: USD
hourly_rate: 125
items:
  - description: 3D Isometric Mobile App Assets
    hours: 32
    rate: 125
    amount: 4000
subtotal: 4000
tax_percent: 0
tax_amount: 0
total: 4000
paid_amount: 4000
paid_at: "2026-09-15"
linked_project_id: 202609_0001D_ACME_MobileAppIllustration
theme: geist
stamp: none
show_client_accent: true
---
```

---

### 2.5 Bullet Journal Daily Log (`journal_day`)

- **File Path**: `_Journal/Daily/YYYY-MM-DD.md`
- **Description**: Rapid daily logging, priority focus, habit metrics, and BuJo task rollovers.

| Key | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `date` | `string` | Yes | — | Calendar date in `YYYY-MM-DD` |
| `title` | `string` | No | Formatted Date| Header title for the day's record |
| `tags` | `array<string>`| No | `[journal, bujo, daily]` | Journal categorization tags |
| `habits` | `array<string>`| No | `[]` | Checked daily creative habits (e.g. `[Deep Craft, Zero Sugar]`) |
| `energy` | `number\|string`| No | — | Creative energy level (1-5 or descriptive) |
| `focus_minutes` | `integer` | No | `0` | Accrued Pomodoro/radio focus minutes |
| `migrated_from` | `string` | No | — | Date of source note if rolled over |
| `migrated_to` | `string` | No | — | Date of next note if deferred |

```yaml
---
date: "2026-09-09"
title: Wednesday, September 9, 2026
tags: [journal, bujo, daily]
habits:
  - Deep Visual Craft
  - Zero Distraction Sprint
  - Daily Walk
energy: 5
focus_minutes: 125
---
```

---

### 2.6 Atelier Atomic Note (`note`)

- **File Path**: `_Notes/01_Fleeting/`, `02_Literature/`, `03_Permanent/`
- **Description**: Knowledge engine atomic note with WikiLink indexing and universal `#task` extraction.

| Key | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | Yes | Auto-ID | Unique note identifier (timestamp or slug) |
| `title` | `string` | Yes | — | Clear conceptual title of the atomic note |
| `type` / `category` | `string` | Yes | `permanent` | Classification: `fleeting`, `literature`, `permanent` |
| `tags` | `array<string>`| No | `[]` | Conceptual index tags |
| `created` | `string` | No | Current Date | Creation date in `YYYY-MM-DD` |
| `updated` | `string` | No | Current Date | Last modified date in `YYYY-MM-DD` |
| `links` | `array<string>`| No | `[]` | Outgoing WikiLink references (e.g., `[[Color-Palette]]`) |
| `aliases` | `array<string>`| No | `[]` | Alternative search terms and headings |

```yaml
---
id: zettel_002
title: The 60-30-10 Creative Color Rule
type: permanent
category: permanent
tags: [design-theory, color-systems, branding]
created: "2026-09-08"
updated: "2026-09-08"
---
```

---

## 3. Validation Service: `FrontmatterService.validate(type, data)`

The server enforces these contracts via `FrontmatterService.validate(type, data)`:
- Returns `{ valid: boolean, errors: string[], data: Object }`.
- Unknown keys are preserved intact in `data`.
- Any format discrepancies (such as non-ISO dates or unparsed tags) produce structured errors or safe normalization.
