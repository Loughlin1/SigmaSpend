# SigmaSpend

A modern local expense tracker.

**SigmaSpend** is built with a decoupled, API-first architecture designed to practice modern web development workflows. The project is deliberately split into distinct phases: starting with a **React (Vite)** frontend powered by a rapid **Python** prototype backend, before transitioning to a production-hardened **Java** enterprise backend—all while keeping the core frontend UI completely intact.

The name draws inspiration from the mathematical summation symbol ($\\Sigma$), representing the precise aggregation of your financial data.

---

## The Architectural Roadmap

To ensure a seamless transition between backend languages, the project strictly adheres to an **API-First Design**. The React frontend communicates with an identical API contract, meaning the backend can be swapped simply by changing an environment port variable.

## Project Structure

```
sigmaspend/
├── frontend/               # React (Vite) Application
│   ├── src/
│   │   ├── components/     # UI Components (Form, History, Chart)
│   │   ├── api/            # Centralised API client logic
│   │   └── App.jsx
│   └── package.json
│
├── backend-python/         # Phase 1: FastAPI Backend             
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # Application configuration and server lifecycle
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py             # Global dependencies (e.g., database sessions)
│   │   │   └── endpoints/
│   │   │       ├── __init__.py
│   │   │       ├── expenses.py     # HTTP routes for standard expense CRUD
│   │   │       └── ingestion.py    # HTTP routes for CSV/PDF uploads
│   │   │       └── rules.py        # HTTP routes to create/delete explicit rules
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py           # Environment variables and app configurations
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py          # SQLAlchemy engine and session initialization
│   │   │   └── base_class.py       # Declarative base for models
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── bank_account.py     # SQLAlchemy database tables
│   │   │   └── category_rules.py   # SQLAlchemy database tables
│   │   │   └── category.py         # SQLAlchemy database tables
│   │   │   └── expense.py          # SQLAlchemy database tables
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── bank_account.py     # Pydantic data validation schemas
│   │   │   └── category_rules.py   # Pydantic data validation schemas
│   │   │   └── category.py         # Pydantic data validation schemas
│   │   │   └── expense.py          # Pydantic data validation schemas
│   │   └── services/
│   │       ├── __init__.py
│   │       └── parser.py           # Core business logic for processing CSV/PDF statements
│   │       └── classifier.py       # Core categorization worker engine (Rules + Ollama)
│   ├── requirements.txt
│   └── sigmaspend.db               # SQLite database file (generated automatically)

│
└── backend-java/           # Phase 2: Spring Boot Backend (Upcoming)
    └── src/
```

## Data Flow
When a user uploads a statement, the system reads it, extracts individual lines, runs them through a deduplication engine, and saves only the new records to the database.

[ Upload Statement (CSV/PDF) ] ──► [ Parse File ] ──► [ Deduplication Engine ] ──► [Categorisation]  ──► [ SQLite DB ]
                                                              ▲
                                                    (Checks Existing Hashes)

## Bank Account Configuration
SigmaSpend now stores bank-specific parser configuration on every bank account record instead of depending on bank profiles in `backend-python/app/core/config.yaml`.

Each account includes:
- `account_id`: unique identifier used for uploads
- `bank_name`: visible bank display name
- `amount_style`: either `single_column` or `split_columns`
- `mappings`: CSV header mappings such as `date_column`, `description_column`, `amount_column`, `amount_in_column`, and `amount_out_column`

The frontend account form collects these settings during account creation. When a statement is uploaded, the selected account's configuration is used to parse the CSV and deduplicate transactions.

## Transaction Deduplication Strategy

A major challenge when importing raw bank statements is preventing duplicate entries. This is especially true when overlapping statement periods are uploaded (e.g., uploading a standard monthly statement followed by a custom date-range export).

We cannot rely on a simple string combination of `Date + Amount + Description` to form a unique identifier, because real-world spending often includes valid, identical transactions on the exact same day (e.g., buying two separate coffees for £3.50 at the same cafe sequentially).

### The Solution: The "Occurrence Counter" Strategy

To make identical transactions uniquely identifiable while remaining completely deterministic across different file uploads, **SigmaSpend** implements an sequential occurrence tracking algorithm during file ingestion.

### Categorisation of transactions
[ Raw CSV Row ] 
       │
       ▼
 ┌───────────┐         Matches?
 │ Rule-Based│ ──────────────────────► [ Auto-Categorised ]
 │  Engine   │                                 │
 └───────────┘                                 │ No
       │                                       ▼
       │                          ┌─────────────────────────┐
       │                          │   Ollama AI Fallback    │
       └────────────────────────► │ (Llama 3 / Mistral)     │
                                  └─────────────────────────┘
                                               │
                                               ▼
                                       [ AI-Categorised ]



## API Backend
The FastAPI backend exposes the main ingestion endpoints used by the frontend:

- `POST /api/v1/accounts` — create a new bank account record with parser settings
- `GET /api/v1/accounts` — list existing bank accounts
- `POST /api/v1/upload/csv?account_id=...` — upload a CSV statement for a selected account

Bank-specific parsing information is now stored on every bank account in the database. This allows the parser to use per-account `amount_style` and `mappings` when ingesting statements.


## License
This project is open-source and available under the MIT license.