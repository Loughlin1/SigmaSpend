# app/database/dev_seeder.py
import hashlib
import logging
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.bank_account import BankAccount
from app.models.bucket_budget import BucketBudget
from app.models.budget import Budget
from app.models.category import Category
from app.models.category_rules import CategoryRule
from app.models.expense import Expense
from app.models.holiday import Holiday
from app.models.income_settings import IncomeSettings

logger = logging.getLogger("sigmaspend")


def _make_hash(account_id: int, d: date, amount: float, is_income: bool, desc: str, occurrence: int = 1) -> str:
    raw = f"{account_id}|{d}|{amount}|{is_income}|{desc}|{occurrence}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _add_expense(db: Session, account_id: int, d: date, amount: float,
                 is_income: bool, description: str, category_id: int | None = None,
                 holiday_id: int | None = None, notes: str | None = None):
    h = _make_hash(account_id, d, amount, is_income, description)
    if db.query(Expense).filter_by(transaction_hash=h).first():
        return
    db.add(Expense(
        date=d, amount=amount, is_income=is_income, description=description,
        notes=notes, category_id=category_id, account_id=account_id,
        holiday_id=holiday_id, transaction_hash=h,
    ))


def seed_dev_data(db: Session):
    """Populates the dev database with realistic example data for 2026."""

    # ── Bank Accounts ─────────────────────────────────────────────────────────
    def get_or_create_account(name, bank, style="single_column", invert=False):
        acc = db.query(BankAccount).filter_by(account_name=name).first()
        if not acc:
            acc = BankAccount(
                account_name=name, bank_name=bank,
                amount_style=style, invert_amounts=invert,
                mappings={"date": "Date", "description": "Description", "amount": "Amount"},
            )
            db.add(acc)
            db.flush()
        return acc

    current  = get_or_create_account("Current Account", "Revolut")
    savings  = get_or_create_account("Savings Account", "Revolut")
    _credit  = get_or_create_account("Credit Card", "AIB", invert=True)

    # ── Categories ────────────────────────────────────────────────────────────
    tree = [
        ("Housing",      "🏠", "50_needs",  ["Rent", "Electricity", "Gas", "Internet", "Home Insurance"]),
        ("Groceries",    "🛒", "50_needs",  ["Supermarket", "Farmers Market"]),
        ("Transport",    "🚗", "50_needs",  ["Fuel", "Public Transport", "Car Insurance", "Parking"]),
        ("Health",       "💊", "50_needs",  ["Pharmacy", "GP Visit", "Gym"]),
        ("Eating Out",   "🍽️", "30_wants", ["Restaurants", "Takeaway", "Coffee"]),
        ("Shopping",     "🛍️", "30_wants", ["Clothing", "Electronics", "Online Shopping"]),
        ("Entertainment","🎬", "30_wants",  ["Cinema", "Streaming", "Books"]),
        ("Travel",       "✈️", "30_wants", ["Flights", "Hotels", "Activities"]),
        ("Subscriptions","📱", "30_wants",  ["Netflix", "Spotify", "Software"]),
        ("Savings",      "💰", "20_savings",["Emergency Fund", "Investments"]),
        ("Income",       "💵", None,        ["Salary", "Freelance", "Bank Interest"]),
    ]

    cat_map: dict[str, Category] = {}
    for parent_name, icon, bucket, subs in tree:
        parent = db.query(Category).filter_by(name=parent_name).first()
        if not parent:
            parent = Category(name=parent_name, icon=icon, bucket=bucket)
            db.add(parent)
            db.flush()
        else:
            parent.icon = icon
            parent.bucket = bucket
        cat_map[parent_name] = parent
        for sub_name in subs:
            sub = db.query(Category).filter_by(name=sub_name).first()
            if not sub:
                sub = Category(name=sub_name, icon=icon, bucket=bucket, parent_id=parent.id)
                db.add(sub)
                db.flush()
            cat_map[sub_name] = sub

    # ── Automation Rules ──────────────────────────────────────────────────────
    rules_data = [
        ("Salary",           ["salary", "payroll", "wages"]),
        ("Supermarket",      ["tesco", "lidl", "aldi", "dunnes", "supervalu"]),
        ("Coffee",           ["starbucks", "costa", "coffee", "cafe"]),
        ("Restaurants",      ["restaurant", "bistro", "grill", "diner"]),
        ("Takeaway",         ["deliveroo", "just eat", "uber eats", "dominos", "mcdonalds", "kfc"]),
        ("Fuel",             ["circle k", "applegreen", "texaco", "topaz", "fuel", "petrol"]),
        ("Public Transport", ["dublin bus", "irish rail", "luas", "leap card", "transport"]),
        ("Electricity",      ["electric ireland", "energia", "bord gais energy"]),
        ("Internet",         ["virgin media", "sky broadband", "eir"]),
        ("Pharmacy",         ["boots", "lloyds pharmacy", "o'brien's pharmacy", "pharmacy"]),
        ("Netflix",          ["netflix"]),
        ("Spotify",          ["spotify"]),
        ("Clothing",         ["zara", "h&m", "penneys", "primark", "tk maxx"]),
        ("Online Shopping",  ["amazon", "ebay", "asos"]),
        ("Gym",              ["gym", "fitness", "leisure centre"]),
        ("Flights",          ["ryanair", "aer lingus", "flight"]),
        ("Hotels",           ["hotel", "airbnb", "booking.com"]),
    ]
    for cat_name, keywords in rules_data:
        cat = cat_map.get(cat_name)
        if not cat:
            continue
        for kw in keywords:
            if not db.query(CategoryRule).filter_by(keyword=kw, category_id=cat.id).first():
                db.add(CategoryRule(keyword=kw, category_id=cat.id, match_field="description"))

    # ── Budgets ───────────────────────────────────────────────────────────────
    monthly_budgets = {
        "Rent": 1800, "Electricity": 120, "Gas": 60, "Internet": 50,
        "Supermarket": 400, "Fuel": 150, "Public Transport": 80,
        "Eating Out": 200, "Coffee": 60, "Takeaway": 100,
        "Clothing": 100, "Online Shopping": 100, "Entertainment": 80,
        "Netflix": 18, "Spotify": 11, "Gym": 50, "Pharmacy": 40,
    }
    for cat_name, amount in monthly_budgets.items():
        cat = cat_map.get(cat_name)
        if cat and not db.query(Budget).filter_by(category_id=cat.id).first():
            db.add(Budget(category_id=cat.id, amount=Decimal(str(amount)), period="monthly"))

    for key, amount in [("50_needs", 2100), ("30_wants", 1260), ("20_savings", 840)]:
        if not db.query(BucketBudget).filter_by(bucket_key=key).first():
            db.add(BucketBudget(bucket_key=key, amount=Decimal(str(amount))))

    # ── Income Setting ────────────────────────────────────────────────────────
    if not db.query(IncomeSettings).first():
        db.add(IncomeSettings(monthly_net_income=Decimal("4200.00")))

    # ── Holidays ──────────────────────────────────────────────────────────────
    def get_or_create_holiday(name, dest, start, end, flag, notes=None):
        h = db.query(Holiday).filter_by(name=name).first()
        if not h:
            h = Holiday(name=name, destination=dest, start_date=start,
                        end_date=end, flag=flag, notes=notes)
            db.add(h)
            db.flush()
        return h

    lisbon = get_or_create_holiday(
        "Lisbon Trip", "Lisbon, Portugal",
        date(2026, 3, 14), date(2026, 3, 18), "🇵🇹",
        "City break — warm weather escape before spring",
    )
    barcelona = get_or_create_holiday(
        "Barcelona Summer", "Barcelona, Spain",
        date(2026, 7, 5), date(2026, 7, 12), "🇪🇸",
        "Summer holiday with friends",
    )
    edinburgh = get_or_create_holiday(
        "Edinburgh Weekend", "Edinburgh, Scotland",
        date(2026, 9, 19), date(2026, 9, 22), "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
        "Long weekend at the Fringe",
    )

    # ── Transactions ──────────────────────────────────────────────────────────
    c = current.id
    s = savings.id

    transactions = [
        # ── January 2026 ──────────────────────────────────────────────────────
        (c, date(2026,1,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,1,2),  1800.00, False, "Landlord Rent January",          "Rent",             None,         None),
        (c, date(2026,1,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,1,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,1,5),    88.50, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,1,7),    32.00, False, "Dublin Bus Leap Card Top-Up",    "Public Transport", None,         None),
        (c, date(2026,1,8),    42.00, False, "Starbucks Coffee x8",            "Coffee",           None,         None),
        (c, date(2026,1,10),   75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,1,12),   96.50, False, "Dunnes Stores Grocery",          "Supermarket",      None,         None),
        (c, date(2026,1,14),   45.00, False, "Just Eat Takeaway",              "Takeaway",         None,         None),
        (c, date(2026,1,15),  500.00, False, "Transfer to Savings Jan",        "Emergency Fund",   None,         "Monthly savings transfer"),
        (c, date(2026,1,16),   22.50, False, "Costa Coffee",                   "Coffee",           None,         None),
        (c, date(2026,1,18),  118.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,1,19),   48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,1,20),   62.00, False, "Lidl Weekly Shop",               "Supermarket",      None,         None),
        (c, date(2026,1,21),   89.00, False, "Zara Clothing",                  "Clothing",         None,         None),
        (c, date(2026,1,22),   35.00, False, "Cinema Vue Tickets x2",          "Cinema",           None,         None),
        (c, date(2026,1,24),   28.00, False, "Boots Pharmacy",                 "Pharmacy",         None,         None),
        (c, date(2026,1,25),   75.00, False, "Restaurant Il Valentino",        "Restaurants",      None,         "Dinner for two"),
        (c, date(2026,1,26),   50.00, False, "Leisure Centre Gym Membership",  "Gym",              None,         None),
        (c, date(2026,1,28),   55.00, False, "Aldi Weekly Shop",               "Supermarket",      None,         None),
        (c, date(2026,1,30),   38.00, False, "Amazon Books & Accessories",     "Online Shopping",  None,         None),

        # ── February 2026 ─────────────────────────────────────────────────────
        (c, date(2026,2,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,2,2),  1800.00, False, "Landlord Rent February",         "Rent",             None,         None),
        (c, date(2026,2,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,2,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,2,4),    92.00, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,2,6),    75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,2,7),    32.00, False, "Dublin Bus Leap Card Top-Up",    "Public Transport", None,         None),
        (c, date(2026,2,8),    36.00, False, "Starbucks x6",                   "Coffee",           None,         None),
        (c, date(2026,2,10),  114.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,2,10),   55.00, False, "Bord Gáis Gas Bill",             "Gas",              None,         None),
        (c, date(2026,2,11),   48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,2,12),   78.50, False, "Dunnes Stores",                  "Supermarket",      None,         None),
        (c, date(2026,2,14),  120.00, False, "Valentine's Dinner The Ivy",     "Restaurants",      None,         "Valentine's Day"),
        (c, date(2026,2,15),  500.00, False, "Transfer to Savings Feb",        "Emergency Fund",   None,         None),
        (c, date(2026,2,17),   45.00, False, "Just Eat Takeaway x3",           "Takeaway",         None,         None),
        (c, date(2026,2,18),   50.00, False, "Leisure Centre Gym Membership",  "Gym",              None,         None),
        (c, date(2026,2,20),   60.00, False, "Lidl Weekly Shop",               "Supermarket",      None,         None),
        (c, date(2026,2,22),  155.00, False, "H&M Clothing Haul",              "Clothing",         None,         None),
        (c, date(2026,2,24),   24.00, False, "Boots Pharmacy",                 "Pharmacy",         None,         None),
        (c, date(2026,2,26),   65.00, False, "Amazon Online Shopping",         "Online Shopping",  None,         None),
        (c, date(2026,2,28),   28.00, False, "GP Visit Fee",                   "GP Visit",         None,         None),

        # ── March 2026 (Lisbon) ───────────────────────────────────────────────
        (c, date(2026,3,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,3,2),  1800.00, False, "Landlord Rent March",            "Rent",             None,         None),
        (c, date(2026,3,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,3,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,3,5),    88.00, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,3,7),    32.00, False, "Dublin Bus Leap Card Top-Up",    "Public Transport", None,         None),
        (c, date(2026,3,10),  108.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,3,10),   42.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,3,13),  245.00, False, "Ryanair Dublin-Lisbon",          "Flights",          lisbon.id,    "Return flights x2"),
        (c, date(2026,3,14),  380.00, False, "Hotel Lisboa Central 4 nights",  "Hotels",           lisbon.id,    None),
        (c, date(2026,3,14),   42.00, False, "Restaurant Cervejaria Ramiro",   "Restaurants",      lisbon.id,    "Seafood dinner"),
        (c, date(2026,3,15),   18.00, False, "Coffee and Pastéis de Belém",    "Coffee",           lisbon.id,    None),
        (c, date(2026,3,15),   55.00, False, "Sintra Day Trip Activities",      "Activities",       lisbon.id,    None),
        (c, date(2026,3,16),   68.00, False, "Restaurant LX Factory",          "Restaurants",      lisbon.id,    None),
        (c, date(2026,3,16),   35.00, False, "Museum of Art & History tickets", "Activities",      lisbon.id,    None),
        (c, date(2026,3,17),   22.00, False, "Tram & Metro Lisbon",             "Activities",      lisbon.id,    None),
        (c, date(2026,3,17),   48.00, False, "Rooftop Bar Drinks",              "Eating Out",      lisbon.id,    "Sunset cocktails"),
        (c, date(2026,3,18),   28.00, False, "Airport Lunch",                   "Eating Out",      lisbon.id,    None),
        (c, date(2026,3,20),   90.00, False, "Lidl & Dunnes Shops",            "Supermarket",      None,         None),
        (c, date(2026,3,22),   75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,3,24),  500.00, False, "Transfer to Savings March",      "Emergency Fund",   None,         None),
        (c, date(2026,3,25),   50.00, False, "Leisure Centre Gym",             "Gym",              None,         None),
        (c, date(2026,3,26),   38.00, False, "Just Eat Takeaway",              "Takeaway",         None,         None),
        (c, date(2026,3,28),   32.00, False, "Starbucks x5",                   "Coffee",           None,         None),

        # ── April 2026 ────────────────────────────────────────────────────────
        (c, date(2026,4,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,4,2),  1800.00, False, "Landlord Rent April",            "Rent",             None,         None),
        (c, date(2026,4,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,4,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,4,5),    94.00, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,4,7),   120.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,4,7),    48.00, False, "Bord Gáis Gas Bill",             "Gas",              None,         None),
        (c, date(2026,4,8),    48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,4,9),    75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,4,10),   32.00, False, "Dublin Bus Leap Card",           "Public Transport", None,         None),
        (c, date(2026,4,12),   85.00, False, "Lidl & Aldi Shops",              "Supermarket",      None,         None),
        (c, date(2026,4,14),   65.00, False, "Easter Dinner Restaurant",       "Restaurants",      None,         "Family lunch"),
        (c, date(2026,4,15),  500.00, False, "Transfer to Savings April",      "Emergency Fund",   None,         None),
        (c, date(2026,4,17),   50.00, False, "Leisure Centre Gym",             "Gym",              None,         None),
        (c, date(2026,4,18),  220.00, False, "Penneys Clothing",               "Clothing",         None,         "Spring wardrobe refresh"),
        (c, date(2026,4,20),   28.00, False, "Just Eat Takeaway",              "Takeaway",         None,         None),
        (c, date(2026,4,22),   55.00, False, "Amazon Electronics",             "Electronics",      None,         None),
        (c, date(2026,4,24),   40.00, False, "Starbucks x7",                   "Coffee",           None,         None),
        (c, date(2026,4,25),   30.00, False, "Boots Pharmacy",                 "Pharmacy",         None,         None),
        (c, date(2026,4,28),   72.00, False, "Dunnes Stores",                  "Supermarket",      None,         None),
        (c, date(2026,4,30),  300.00, False, "Investment Transfer April",      "Investments",      None,         "S&P 500 ETF"),

        # ── May 2026 ──────────────────────────────────────────────────────────
        (c, date(2026,5,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,5,2),  1800.00, False, "Landlord Rent May",              "Rent",             None,         None),
        (c, date(2026,5,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,5,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,5,5),    99.00, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,5,6),    75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,5,7),   112.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,5,8),    48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,5,10),   32.00, False, "Dublin Bus Leap Card",           "Public Transport", None,         None),
        (c, date(2026,5,12),   80.00, False, "Lidl Weekly Shop",               "Supermarket",      None,         None),
        (c, date(2026,5,13),  500.00, False, "Transfer to Savings May",        "Emergency Fund",   None,         None),
        (c, date(2026,5,14),   50.00, False, "Leisure Centre Gym",             "Gym",              None,         None),
        (c, date(2026,5,15),   88.00, False, "Restaurant The Greenhouse",      "Restaurants",      None,         "Birthday dinner"),
        (c, date(2026,5,17),   42.00, False, "Starbucks x7",                   "Coffee",           None,         None),
        (c, date(2026,5,19),   55.00, False, "Just Eat x4",                    "Takeaway",         None,         None),
        (c, date(2026,5,21),  189.00, False, "ASOS Summer Clothing",           "Clothing",         None,         None),
        (c, date(2026,5,22),   95.00, False, "Dunnes Stores",                  "Supermarket",      None,         None),
        (c, date(2026,5,24),   45.00, False, "Cinema Vue x3",                  "Cinema",           None,         None),
        (c, date(2026,5,26),   68.00, False, "Amazon Online Shopping",         "Online Shopping",  None,         None),
        (c, date(2026,5,28),   22.00, False, "Boots Pharmacy",                 "Pharmacy",         None,         None),
        (c, date(2026,5,30),  300.00, False, "Investment Transfer May",        "Investments",      None,         None),

        # ── June 2026 ─────────────────────────────────────────────────────────
        (c, date(2026,6,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,6,2),  1800.00, False, "Landlord Rent June",             "Rent",             None,         None),
        (c, date(2026,6,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,6,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,6,5),    96.00, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,6,6),    75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,6,7),   105.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,6,8),    48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,6,10),   32.00, False, "Dublin Bus Leap Card",           "Public Transport", None,         None),
        (c, date(2026,6,15),  320.00, False, "Aer Lingus Dublin-Barcelona",    "Flights",          barcelona.id, "Return flights x2"),
        (c, date(2026,6,15),  500.00, False, "Transfer to Savings June",       "Emergency Fund",   None,         None),
        (c, date(2026,6,16),   50.00, False, "Leisure Centre Gym",             "Gym",              None,         None),
        (c, date(2026,6,18),   78.00, False, "Lidl & Dunnes",                  "Supermarket",      None,         None),
        (c, date(2026,6,20),   48.00, False, "Starbucks x8",                   "Coffee",           None,         None),
        (c, date(2026,6,22),   65.00, False, "Restaurant Fade Street Social",  "Restaurants",      None,         None),
        (c, date(2026,6,24),   42.00, False, "Just Eat x3",                    "Takeaway",         None,         None),
        (c, date(2026,6,26),  120.00, False, "TK Maxx Summer Shopping",        "Clothing",         None,         None),
        (c, date(2026,6,28),  300.00, False, "Investment Transfer June",       "Investments",      None,         None),

        # ── July 2026 (Barcelona) ─────────────────────────────────────────────
        (c, date(2026,7,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,7,2),  1800.00, False, "Landlord Rent July",             "Rent",             None,         None),
        (c, date(2026,7,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,7,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,7,5),   560.00, False, "Hotel Barceló Raval 7 nights",   "Hotels",           barcelona.id, None),
        (c, date(2026,7,5),    38.00, False, "Tapas Bar El Xampanyet",         "Restaurants",      barcelona.id, None),
        (c, date(2026,7,6),    55.00, False, "Sagrada Familia tickets x2",     "Activities",       barcelona.id, None),
        (c, date(2026,7,6),    42.00, False, "Restaurant Cervecería Catalana", "Restaurants",      barcelona.id, None),
        (c, date(2026,7,7),    28.00, False, "Barcelona Metro Day Passes",     "Activities",       barcelona.id, None),
        (c, date(2026,7,7),    65.00, False, "Beach Club Dinner & Drinks",     "Eating Out",       barcelona.id, None),
        (c, date(2026,7,8),    38.00, False, "Park Güell tickets & coffee",    "Activities",       barcelona.id, None),
        (c, date(2026,7,8),    72.00, False, "Restaurant El Nacional",         "Restaurants",      barcelona.id, "Group dinner"),
        (c, date(2026,7,9),    45.00, False, "Barceloneta Beach Lunch",        "Eating Out",       barcelona.id, None),
        (c, date(2026,7,9),    88.00, False, "Shopping La Rambla & Zara",      "Clothing",         barcelona.id, None),
        (c, date(2026,7,10),   55.00, False, "FC Barcelona Stadium Tour",      "Activities",       barcelona.id, None),
        (c, date(2026,7,10),   35.00, False, "Tapas & Wine Evening",           "Eating Out",       barcelona.id, None),
        (c, date(2026,7,11),   48.00, False, "Final Dinner Tickets x2",        "Restaurants",      barcelona.id, None),
        (c, date(2026,7,12),   22.00, False, "Airport Food & Coffee",          "Eating Out",       barcelona.id, None),
        (c, date(2026,7,15),   90.00, False, "Tesco & Lidl Shops",             "Supermarket",      None,         None),
        (c, date(2026,7,17),   75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,7,20),   32.00, False, "Dublin Bus Leap Card",           "Public Transport", None,         None),
        (c, date(2026,7,22),  500.00, False, "Transfer to Savings July",       "Emergency Fund",   None,         None),
        (c, date(2026,7,25),   48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,7,26),   50.00, False, "Leisure Centre Gym",             "Gym",              None,         None),
        (c, date(2026,7,28),   38.00, False, "Starbucks x6",                   "Coffee",           None,         None),
        (c, date(2026,7,30),  300.00, False, "Investment Transfer July",       "Investments",      None,         None),

        # ── August 2026 ───────────────────────────────────────────────────────
        (c, date(2026,8,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,8,2),  1800.00, False, "Landlord Rent August",           "Rent",             None,         None),
        (c, date(2026,8,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,8,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,8,5),    98.00, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,8,7),   110.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,8,8),    48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,8,9),    75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,8,10),   32.00, False, "Dublin Bus Leap Card",           "Public Transport", None,         None),
        (c, date(2026,8,12),   85.00, False, "Lidl Weekly Shop",               "Supermarket",      None,         None),
        (c, date(2026,8,14),  500.00, False, "Transfer to Savings August",     "Emergency Fund",   None,         None),
        (c, date(2026,8,16),   50.00, False, "Leisure Centre Gym",             "Gym",              None,         None),
        (c, date(2026,8,18),   72.00, False, "Restaurant Chapter One",         "Restaurants",      None,         "Special occasion"),
        (c, date(2026,8,19),   42.00, False, "Starbucks x7",                   "Coffee",           None,         None),
        (c, date(2026,8,20),  185.00, False, "Ryanair Dublin-Edinburgh Return","Flights",           edinburgh.id, None),
        (c, date(2026,8,22),   68.00, False, "Dunnes Stores",                  "Supermarket",      None,         None),
        (c, date(2026,8,24),   55.00, False, "Just Eat x4",                    "Takeaway",         None,         None),
        (c, date(2026,8,26),  145.00, False, "ASOS & Amazon Shopping",         "Online Shopping",  None,         None),
        (c, date(2026,8,28),   35.00, False, "Boots Pharmacy",                 "Pharmacy",         None,         None),
        (c, date(2026,8,30),  300.00, False, "Investment Transfer August",     "Investments",      None,         None),

        # ── September 2026 (Edinburgh) ────────────────────────────────────────
        (c, date(2026,9,1),  4200.00, True,  "Salary - Employer Ltd",         "Salary",           None,         None),
        (c, date(2026,9,2),  1800.00, False, "Landlord Rent September",        "Rent",             None,         None),
        (c, date(2026,9,3),    11.99, False, "Spotify Premium",                "Spotify",          None,         None),
        (c, date(2026,9,3),    17.99, False, "Netflix Monthly",                "Netflix",          None,         None),
        (c, date(2026,9,5),    92.00, False, "Tesco Weekly Shop",              "Supermarket",      None,         None),
        (c, date(2026,9,7),   108.00, False, "Electric Ireland Bill",          "Electricity",      None,         None),
        (c, date(2026,9,8),    48.00, False, "Virgin Media Broadband",         "Internet",         None,         None),
        (c, date(2026,9,9),    75.00, False, "Circle K Fuel",                  "Fuel",             None,         None),
        (c, date(2026,9,10),   32.00, False, "Dublin Bus Leap Card",           "Public Transport", None,         None),
        (c, date(2026,9,12),   82.00, False, "Lidl Weekly Shop",               "Supermarket",      None,         None),
        (c, date(2026,9,19),  320.00, False, "Hotel The Scotsman 3 nights",    "Hotels",           edinburgh.id, None),
        (c, date(2026,9,19),   45.00, False, "Dinner Whiski Rooms",            "Restaurants",      edinburgh.id, None),
        (c, date(2026,9,20),   28.00, False, "Edinburgh Castle Entry x2",      "Activities",       edinburgh.id, None),
        (c, date(2026,9,20),   55.00, False, "Fringe Show Tickets x2",         "Activities",       edinburgh.id, "Comedy night"),
        (c, date(2026,9,20),   38.00, False, "Royal Mile Pub Crawl",           "Eating Out",       edinburgh.id, None),
        (c, date(2026,9,21),   22.00, False, "Arthur's Seat Hike & Cafe",      "Activities",       edinburgh.id, None),
        (c, date(2026,9,21),   68.00, False, "Dinner Restaurant Mark Greenaway","Restaurants",     edinburgh.id, "Special dinner"),
        (c, date(2026,9,22),   18.00, False, "Airport Coffee & Snacks",        "Eating Out",       edinburgh.id, None),
        (c, date(2026,9,24),  500.00, False, "Transfer to Savings September",  "Emergency Fund",   None,         None),
        (c, date(2026,9,25),   50.00, False, "Leisure Centre Gym",             "Gym",              None,         None),
        (c, date(2026,9,26),   44.00, False, "Starbucks x7",                   "Coffee",           None,         None),
        (c, date(2026,9,28),   58.00, False, "Just Eat Takeaway",              "Takeaway",         None,         None),
        (c, date(2026,9,29),  300.00, False, "Investment Transfer September",  "Investments",      None,         None),

        # ── Savings account ───────────────────────────────────────────────────
        (s, date(2026,1,15),  500.00, True,  "Transfer from Current Jan",      "Emergency Fund",   None,         None),
        (s, date(2026,2,15),  500.00, True,  "Transfer from Current Feb",      "Emergency Fund",   None,         None),
        (s, date(2026,3,24),  500.00, True,  "Transfer from Current March",    "Emergency Fund",   None,         None),
        (s, date(2026,4,15),  500.00, True,  "Transfer from Current April",    "Emergency Fund",   None,         None),
        (s, date(2026,5,13),  500.00, True,  "Transfer from Current May",      "Emergency Fund",   None,         None),
        (s, date(2026,6,15),  500.00, True,  "Transfer from Current June",     "Emergency Fund",   None,         None),
        (s, date(2026,7,22),  500.00, True,  "Transfer from Current July",     "Emergency Fund",   None,         None),
        (s, date(2026,8,14),  500.00, True,  "Transfer from Current August",   "Emergency Fund",   None,         None),
        (s, date(2026,9,24),  500.00, True,  "Transfer from Current September","Emergency Fund",   None,         None),
        (s, date(2026,6,1),    12.50, True,  "Bank Interest Q2",               "Bank Interest",    None,         None),
        (s, date(2026,9,1),    14.80, True,  "Bank Interest Q3",               "Bank Interest",    None,         None),
    ]

    for row in transactions:
        account_id, d, amount, is_income, description, cat_name, holiday_id, notes = row
        cat = cat_map.get(cat_name)
        _add_expense(db, account_id, d, amount, is_income, description,
                     category_id=cat.id if cat else None,
                     holiday_id=holiday_id, notes=notes)

    logger.info(f"[DevSeeder] Loaded {len(transactions)} example transactions, 3 holidays, budgets & income setting.")
