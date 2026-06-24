# SigmaSpend

A modern local expense tracker.

**SigmaSpend** is built with a decoupled, API-first architecture designed to practice modern web development workflows. The project is split into a **React (Vite)** frontend and a **Python (FastAPI)** backend, with a planned future migration to a **Java (Spring Boot)** backend — the API contract is kept identical so the frontend requires no changes during the swap.

The name draws inspiration from the mathematical summation symbol ($\Sigma$), representing the precise aggregation of financial data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite) |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 |
| Database | SQLite (via Alembic migrations) |
| PDF Parsing | pdfplumber |
| AI Classification | Ollama (Llama 3 / Mistral) — optional |
| Testing | pytest |

---

## Project Structure

```
sigmaspend/
├── frontend/                         # React (Vite) application
│   └── src/
│       ├── api/                      # Centralised Axios API client
│       ├── components/               # Shared UI components (modals, upload)
│       ├── features/
│       │   ├── ledger/               # Transaction ledger, filters, bulk actions
│       │   ├── analytics/            # Charts and summary views
│       │   ├── automation/           # Category rule management
│       │   ├── bank-accounts/        # Account creation and management
│       │   └── categories/           # Category manager
│       ├── styles/                   # Global CSS files
│       └── utils/                    # Date formatters, category helpers
│
└── backend-python/                   # FastAPI backend
    ├── app/
    │   ├── main.py                   # App entrypoint and router registration
    │   ├── api/
    │   │   ├── deps.py               # Shared dependencies (DB session injection)
    │   │   └── endpoints/
    │   │       ├── accounts.py       # Bank account CRUD
    │   │       ├── categories.py     # Category management
    │   │       ├── expenses.py       # Expense CRUD + bulk actions
    │   │       ├── ingestion.py      # CSV / PDF statement upload
    │   │       └── rules.py          # Automation rule engine
    │   ├── core/
    │   │   ├── config.py             # Environment config (pydantic-settings)
    │   │   └── logging_config.py     # Structured logging setup
    │   ├── database/
    │   │   ├── session.py            # SQLAlchemy engine and session factory
    │   │   └── seeder.py             # Dev data seeder
    │   ├── models/                   # SQLAlchemy ORM models (see Database Schema)
    │   ├── schemas/                  # Pydantic request/response schemas
    │   └── services/
    │       ├── analytics.py          # Aggregation and summary queries
    │       ├── classifier.py         # Rule-based + Ollama AI categorisation
    │       ├── expense.py            # Expense query and creation logic
    │       ├── parser.py             # CSV statement parser
    │       ├── pdf_parser.py         # PDF spatial layout parser
    │       └── utilities.py          # Shared helpers (date parsing etc.)
    ├── alembic/                      # Database migration scripts
    ├── tests/                        # pytest test suite
    └── requirements.txt
```

---

## Database Schema

### `bank_accounts`
Stores per-account parser configuration. Each account carries its own bank-specific settings so the parser knows how to read that bank's statement format.

| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `account_name` | String | User-facing name (e.g. "My Current Account") |
| `bank_name` | String | Bank display name (e.g. "Monzo") |
| `amount_style` | String | `single_column` or `split_columns` |
| `invert_amounts` | Boolean | Flips income/expense direction (for credit cards) |
| `mappings` | JSON | CSV header names, pdf_regex, bypass keywords |
| `is_active` | Boolean | Soft-delete flag |
| `created_at` | DateTime | |

### `expenses`
Core transaction table. Every imported or manually created transaction lives here.

| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `date` | Date | Transaction date |
| `amount` | Float | Absolute value |
| `is_income` | Boolean | `true` = income, `false` = expense |
| `description` | String | Raw merchant/description text |
| `notes` | String | Optional user notes |
| `category_id` | Integer FK → `categories` | `NULL` = Uncategorized |
| `account_id` | Integer FK → `bank_accounts` | |
| `transaction_hash` | String (unique) | Deduplication fingerprint |

### `categories`
Self-referential table supporting a two-level hierarchy (parent → subcategory).

| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `name` | String (unique) | Category name |
| `icon` | String | Emoji icon (e.g. `🏠`) |
| `parent_id` | Integer FK → `categories` | `NULL` = top-level category |

### `category_rules`
Keyword-based automation rules. When a transaction description or notes field matches a keyword, the transaction is automatically assigned the linked category.

| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `keyword` | String | Match string (e.g. `starbucks`, `tfl`) |
| `match_field` | String | `description` or `notes` |
| `category_id` | Integer FK → `categories` | Category to assign on match |

Unique constraint on `(keyword, match_field)`.

---

## Data Flow

### Statement Upload

```
Upload CSV / PDF
      │
      ▼
Parse file using account's bank config (mappings / pdf_regex)
      │
      ▼
For each row → generate transaction_hash
      │
      ▼
Deduplication check (query existing hashes)
      │
      ├── Hash exists → skip
      │
      └── Hash new → run categorisation → save to DB
```

### Transaction Categorisation

```
New transaction
      │
      ▼
Rule-based engine (keyword match on description / notes)
      │
      ├── Match found → assign category
      │
      └── No match → Ollama AI fallback (optional, requires local daemon)
                          │
                          └── Returns category name → look up ID → assign
```

---

## Deduplication Strategy

A simple `Date + Amount + Description` key is insufficient — identical transactions can occur legitimately on the same day (e.g. two coffees at the same café). SigmaSpend uses an **occurrence counter** strategy:

1. During ingestion, a running count is maintained per `(account_id, date, amount, is_income, description)` combination within the current file.
2. The occurrence number is included in the hash input, so the 1st and 2nd identical transaction produce different hashes.
3. The hash is stored on the `expenses` table with a unique constraint — re-uploading the same file simply fails the constraint check and skips the row.

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Accounts — `/accounts`
| Method | Path | Description |
|---|---|---|
| `GET` | `/accounts/` | List all bank accounts |
| `POST` | `/accounts/` | Create a new bank account |
| `GET` | `/accounts/{id}` | Get a single account |
| `PUT` | `/accounts/{id}` | Update account settings |

### Expenses — `/expenses`
| Method | Path | Description |
|---|---|---|
| `GET` | `/expenses/` | Paginated + filtered transaction list |
| `POST` | `/expenses/` | Create a manual transaction |
| `GET` | `/expenses/{id}` | Get a single transaction |
| `PUT` | `/expenses/{id}` | Update a transaction |
| `DELETE` | `/expenses/{id}` | Delete a transaction |
| `GET` | `/expenses/analytics/summary` | Aggregated category/period breakdown |
| `POST` | `/expenses/bulk-classify` | Bulk assign a category |
| `POST` | `/expenses/bulk-delete` | Bulk delete transactions |
| `POST` | `/expenses/bulk-update-type` | Bulk toggle income / expense type |
| `POST` | `/expenses/bulk-reclassify` | Re-run automation rules on selected rows |

### Categories — `/categories`
| Method | Path | Description |
|---|---|---|
| `GET` | `/categories/` | List all categories and subcategories |
| `POST` | `/categories/` | Create a category or subcategory |

### Automation Rules — `/rules`
| Method | Path | Description |
|---|---|---|
| `GET` | `/rules/` | List all keyword rules (paginated) |
| `POST` | `/rules/` | Create a new keyword rule |
| `DELETE` | `/rules/{id}` | Delete a rule |

### Ingestion — `/upload`
| Method | Path | Description |
|---|---|---|
| `POST` | `/upload/statement?account_id=N` | Upload a CSV or PDF bank statement |

---

## Running Locally

### Backend

```bash
cd backend-python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`.

---

## License

This project is open-source and available under the MIT license.
