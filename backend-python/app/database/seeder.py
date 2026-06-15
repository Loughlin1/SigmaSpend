# app/database/seeder.py
import yaml
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.bank_account import BankAccount
from app.models.category import Category
from app.models.category_rules import CategoryRule

def seed_database_if_empty(db: Session):
    """
    Validates if structural tables are pristine and inserts default configurations 
    natively out of the core config.yaml specification properties.
    """
    # 1. Verify if seeding is even necessary
    has_accounts = db.query(BankAccount).first() is not None
    has_categories = db.query(Category).first() is not None
    has_rules = db.query(CategoryRule).first() is not None
    
    if has_accounts and has_categories and has_rules:
        return # Database already contains data, skip seeding to avoid integrity clashes

    config_path = Path(__file__).parent.parent / "core" / "config.yaml"
    if not config_path.exists():
        print(f"[Seeder] Warning: Config file missing at {config_path}. Skipping seed.")
        return

    with open(config_path, "r", encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}
    
    seed_definitions = config.get("seed_data", {})
    if not seed_definitions:
        return

    # 2. Seed Bank Accounts table
    if not has_accounts:
        print("[Seeder] Populating default bank accounts...")
        for acc in seed_definitions.get("bank_accounts", []):
            db_account = BankAccount(
                account_id=acc["account_id"],
                account_name=acc["account_name"],
                bank_name=acc["bank_name"],
                amount_style=acc["amount_style"],
                mappings=acc["mappings"]
            )
            db.add(db_account)

    # 3. Seed Hierarchical Category & Subcategory tables
    if not has_categories:
        print("[Seeder] Populating structured category tree...")
        for cat_data in seed_definitions.get("categories", []):
            # Create top-level parent category
            parent_name = cat_data["name"].strip().title()
            parent_cat = Category(
                name=parent_name,
                icon=cat_data.get("icon"),
                parent_id=None,
            )
            db.add(parent_cat)
            db.flush() # Flushes record to generate parent_cat.id for subcategory assignments

            # Inject corresponding nested children subcategories
            for sub_name in cat_data.get("subcategories", []):
                normalized_sub = sub_name.strip().title()
                child_cat = Category(name=normalized_sub, parent_id=parent_cat.id)
                db.add(child_cat)

    # 3. Seed Explicit Categorisation Rules
    if not has_rules:
        print("[Seeder] Populating keyword processing rules...")
        for rule_data in seed_definitions.get("rules", []):
            for keyword in rule_data["keywords"]:
                db_rule = CategoryRule(
                    keyword=keyword.strip().lower(),
                    target_category=rule_data["target_category"].strip()
                )
                db.add(db_rule)

    try:
        db.commit()
        print("[Seeder] Database tables initialized and seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"[Seeder] Critical: Failed to execute database seed: {e}")