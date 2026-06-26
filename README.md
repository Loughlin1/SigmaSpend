# SigmaSpend

A modern local personal finance tracker.

**SigmaSpend** is built with a decoupled, API-first architecture. The project is split into a **React (Vite)** frontend and a **Python (FastAPI)** backend. The name draws inspiration from the mathematical summation symbol (Σ), representing the precise aggregation of financial data.

---

## Features

- **Transaction Ledger** — import CSV/PDF bank statements, manually add transactions, bulk categorise, bulk delete, bulk export to CSV
- **Automation Rules** — keyword-based rules that auto-categorise transactions on import; re-run rules on existing data
- **Budget Planner** — set monthly budgets per category; view actuals vs limits across month, year, and custom date ranges grouped by Needs / Wants / Savings buckets
- **Analytics** — income vs expense summaries by month or year with category breakdowns
- **Holidays & Trips** — create holiday records, assign expenses to trips, view per-holiday spend breakdowns with category pie charts; ledger highlights expenses that fall within a holiday's date range
- **Expense Detail Sidebar** — click any transaction description to open a detail panel; assign a holiday directly from the sidebar
- **Database Backups** — automatic daily SQLite backups via APScheduler; manual trigger from the UI; keeps last 30 copies
- **Logs Viewer** — structured log browser with level and module filters

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Vite) |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 |
| Database | SQLite (via Alembic migrations) |
| Scheduling | APScheduler 3.x (daily backups) |
| PDF Parsing | pdfplumber |
| AI Classification | Ollama (Llama 3 / Mistral) — optional |
| Backend Testing | pytest, pytest-asyncio |
| Frontend Testing | Vitest, React Testing Library |

---

## Project Structure

```
sigmaspend/
├── start.sh                          # One-command launcher (opens browser automatically)
├── stop.sh                           # Graceful shutdown script
│
├── frontend/                         # React (Vite) application
│   └── src/
│       ├── api/                      # Centralised Axios API client
│       ├── components/               # Shared UI components (modals, upload)
│       ├── features/
│       │   ├── analytics/            # Charts and summary views
│       │   ├── automation/           # Category rule management
│       │   ├── backup/               # Database backup UI
│       │   ├── bank-accounts/        # Account creation and management
│       │   ├── budget/               # Budget planner (month / year / months views)
│       │   ├── categories/           # Category manager
│       │   ├── holidays/             # Holiday CRUD, analytics, and pie charts
│       │   ├── ledger/               # Transaction ledger, filters, bulk actions, sidebar
│       │   └── logs-viewer/          # Structured log browser
│       ├── styles/                   # Global CSS
│       └── utils/                    # Date formatters, category helpers
│
└── backend-python/                   # FastAPI backend
    ├── app/
    │   ├── main.py                   # App entrypoint, router registration, scheduler startup
    │   ├── api/endpoints/
    │   │   ├── accounts.py           # Bank account CRUD
    │   │   ├── backup.py             # Backup trigger and list
    │   │   ├── budgets.py            # Budget limits per category
    │   │   ├── bucket_budgets.py     # Per-bucket (Needs/Wants/Savings) budget limits
    │   │   ├── categories.py         # Category management
    │   │   ├── expenses.py           # Expense CRUD, bulk actions, analytics
    │   │   ├── holidays.py           # Holiday CRUD
    │   │   ├── income.py             # Monthly net income setting
    │   │   ├── ingestion.py          # CSV / PDF statement upload
    │   │   ├── logs.py               # Log file browser
    │   │   └── rules.py              # Automation rule engine
    │   ├── core/
    │   │   ├── config.py             # Environment config (pydantic-settings)
    │   │   └── logging_config.py     # Structured JSON logging
    │   ├── database/
    │   │   ├── session.py            # SQLAlchemy engine and session factory
    │   │   └── seeder.py             # Dev data seeder
    │   ├── models/                   # SQLAlchemy ORM models
    │   ├── schemas/                  # Pydantic request/response schemas
    │   └── services/
    │       ├── analytics.py          # Multi-tier aggregation queries
    │       ├── backup.py             # SQLite backup (safe live copy + pruning)
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
| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `account_name` | String | User-facing name |
| `bank_name` | String | Bank display name |
| `amount_style` | String | `single_column` or `split_columns` |
| `invert_amounts` | Boolean | Flips direction for credit cards |
| `mappings` | JSON | CSV header names, pdf_regex, bypass keywords |
| `is_active` | Boolean | Soft-delete flag |

### `expenses`
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
| `holiday_id` | Integer FK → `holidays` | `NULL` = not assigned; `SET NULL` on holiday delete |
| `transaction_hash` | String (unique) | Deduplication fingerprint |

### `categories`
Self-referential, two-level hierarchy (parent → subcategory).

| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `name` | String (unique) | Category name |
| `icon` | String | Emoji icon |
| `bucket` | String | `50_needs`, `30_wants`, or `20_savings` |
| `parent_id` | Integer FK → `categories` | `NULL` = top-level |

### `holidays`
| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | |
| `name` | String | Trip name |
| `destination` | String | Optional destination |
| `start_date` | Date | |
| `end_date` | Date | |
| `notes` | String | |
| `flag` | String | Country flag emoji |

### `budgets`
| Column | Type | Description |
|---|---|---|
| `category_id` | Integer FK (unique) | One budget per category |
| `amount` | Numeric(10,2) | Budget limit |
| `period` | String | `monthly` or `yearly` |

### `bucket_budgets`
| Column | Type | Description |
|---|---|---|
| `bucket_key` | String PK | `50_needs`, `30_wants`, `20_savings` |
| `amount` | Numeric(10,2) | Monthly budget for the bucket |

### `category_rules`
| Column | Type | Description |
|---|---|---|
| `keyword` | String | Match string |
| `match_field` | String | `description` or `notes` |
| `category_id` | Integer FK → `categories` | Category to assign on match |

### `income_settings`
| Column | Type | Description |
|---|---|---|
| `id` | Integer PK | Single-row table |
| `monthly_net_income` | Float | Used for budget percentage calculations |

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Accounts — `/accounts`
| Method | Path | Description |
|---|---|---|
| `GET` | `/accounts/` | List all accounts |
| `POST` | `/accounts/` | Create account |
| `PUT` | `/accounts/{id}` | Update account |

### Expenses — `/expenses`
| Method | Path | Description |
|---|---|---|
| `GET` | `/expenses/` | Paginated + filtered list |
| `POST` | `/expenses/` | Create manual transaction |
| `PUT` | `/expenses/{id}` | Update transaction |
| `DELETE` | `/expenses/{id}` | Delete transaction |
| `GET` | `/expenses/analytics/summary` | Category/period aggregation |
| `GET` | `/expenses/analytics/years` | Years with data |
| `POST` | `/expenses/bulk-classify` | Bulk assign category |
| `POST` | `/expenses/bulk-delete` | Bulk delete |
| `POST` | `/expenses/bulk-update-type` | Bulk toggle income/expense |
| `POST` | `/expenses/bulk-reclassify` | Re-run automation rules |
| `POST` | `/expenses/bulk-assign-holiday` | Bulk assign holiday |

### Holidays — `/holidays`
| Method | Path | Description |
|---|---|---|
| `GET` | `/holidays/` | List all holidays (with expense_count, total_spend) |
| `POST` | `/holidays/` | Create holiday |
| `PUT` | `/holidays/{id}` | Update holiday |
| `DELETE` | `/holidays/{id}` | Delete holiday (unlinks expenses first) |

### Budgets — `/budgets`
| Method | Path | Description |
|---|---|---|
| `GET` | `/budgets/` | List all budget limits |
| `PUT` | `/budgets/{category_id}` | Upsert budget limit |
| `DELETE` | `/budgets/{category_id}` | Remove budget limit |

### Bucket Budgets — `/bucket-budgets`
| Method | Path | Description |
|---|---|---|
| `GET` | `/bucket-budgets/` | List bucket budgets |
| `PUT` | `/bucket-budgets/{key}` | Upsert bucket budget |
| `DELETE` | `/bucket-budgets/{key}` | Remove bucket budget |

### Categories — `/categories`
| Method | Path | Description |
|---|---|---|
| `GET` | `/categories/` | List all categories and subcategories |
| `POST` | `/categories/` | Create category or subcategory |
| `PATCH` | `/categories/{id}/bucket` | Assign category to a budget bucket |

### Automation Rules — `/rules`
| Method | Path | Description |
|---|---|---|
| `GET` | `/rules/` | List rules (paginated) |
| `POST` | `/rules/` | Create rule |
| `DELETE` | `/rules/{id}` | Delete rule |

### Income — `/income`
| Method | Path | Description |
|---|---|---|
| `GET` | `/income/` | Get monthly net income setting |
| `PUT` | `/income/` | Update monthly net income |

### Backup — `/backup`
| Method | Path | Description |
|---|---|---|
| `POST` | `/backup/trigger` | Create a backup immediately |
| `GET` | `/backup/list` | List all backup files |

### Ingestion — `/upload`
| Method | Path | Description |
|---|---|---|
| `POST` | `/upload/statement?account_id=N` | Upload CSV or PDF statement |

---

## Deduplication Strategy

A simple `Date + Amount + Description` key is insufficient — identical transactions can occur legitimately on the same day. SigmaSpend uses an **occurrence counter** strategy:

1. A running count is maintained per `(account_id, date, amount, is_income, description)` within the current file
2. The occurrence number is included in the hash so the 1st and 2nd identical transaction produce different hashes
3. Re-uploading the same file skips duplicates via a unique constraint on `transaction_hash`

---

## Running Locally

### Quick Start (recommended)

A one-command launcher opens the backend and frontend in separate Terminal tabs and automatically opens the browser when ready:

```bash
./start.sh
```

To stop:
```bash
./stop.sh
```

macOS `.app` wrappers (`SigmaSpend.app` / `SigmaSpendStop.app`) in `~/Applications/` make these accessible from Spotlight search.

Shell aliases are also available after reloading your shell:
```bash
sigmaspend        # start
sigmaspend-stop   # stop
```

### Manual Setup

**Backend:**
```bash
cd backend-python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
make run-prod     # production (no reload)
make run-dev      # development (live reload)
```

Available Make targets:
```
make help         # full list of targets
make migrate-dev  # run Alembic migrations on dev DB
make migrate-prod # run Alembic migrations on prod DB
make test         # run pytest suite
```

Interactive API docs: `http://localhost:8000/docs`

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

---

## Database Backups

Backups run automatically every day at **02:00** while the server is running, using SQLite's built-in `backup()` API (safe during live writes). The last 30 copies are kept.

Backups are stored alongside the database file in a `backups/` subdirectory.

A manual backup can be triggered from the **Configuration → Database Backups** panel in the UI, or via:
```bash
curl -X POST http://localhost:8000/api/v1/backup/trigger
```

---

## Testing

### Backend (pytest) — 195 tests

```bash
cd backend-python
make test
# or
source .venv/bin/activate && pytest --tb=short -q
```

| Test file | Coverage |
|---|---|
| `test_accounts.py` | Account CRUD |
| `test_expenses.py` | Expense CRUD, filtering, bulk actions |
| `test_holidays.py` | Holiday CRUD, expense unlinking, computed fields |
| `test_budgets.py` | Budget upsert/delete |
| `test_bucket_budgets.py` | Bucket budget upsert/delete |
| `test_income.py` | Income get/set |
| `test_backup.py` | Backup endpoints |
| `test_backup_service.py` | `run_backup()`, `list_backups()`, pruning |
| `test_logs.py` | Log filtering |
| `test_rules.py` | Rule CRUD |
| `test_ingestion.py` | CSV/PDF parsing |
| `test_analytics.py` | Aggregation queries |
| `test_expense_service.py` | Core business logic |
| `test_utilities.py` | Date parsing |

### Frontend (Vitest + React Testing Library) — 225 tests

```bash
cd frontend
npm test             # run once
npm run test:watch   # watch mode
npm run test:coverage
```

Hooks tested: `useExpenses`, `useExpenseAnalytics`, `useRules`, `useAccounts`, `useBanks`, `useBudget`, `useCategories`, `useHolidays`, `useExpenseFilters`, `useExpenseForm`, `useLogs`

Components tested: `BulkActionsPanel`, `ConfirmationModal`, `ExpenseDetailSidebar`, `ExpenseForm`, `LedgerFilters`, `HolidayList`, `HolidayAnalyticsSection`, `BackupSection`

---

## License

MIT
