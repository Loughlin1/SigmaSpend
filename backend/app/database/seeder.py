# app/database/seeder.py
import yaml
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.bank_account import BankAccount
from app.models.category import Category
from app.models.category_rules import CategoryRule

import logging
logger = logging.getLogger("sigmaspend")


def seed_database_if_empty(db: Session):
    """
    In development: loads realistic example data via dev_seeder (accounts,
    categories, rules, budgets, holidays, transactions).
    In production: seeds structural defaults only (accounts, categories, rules)
    from config.yaml.
    """
    from app.core.config import settings

    # ── Development: delegate entirely to the example-data seeder ────────────
    if settings.APP_ENV == "development":
        has_accounts = db.query(BankAccount).first() is not None
        has_categories = db.query(Category).first() is not None
        if has_accounts and has_categories:
            logger.debug("[Seeder] Dev database already populated; skipping.")
            return
        logger.info("[Seeder] Development environment detected — loading example data...")
        from app.database.dev_seeder import seed_dev_data
        seed_dev_data(db)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.critical(f"[Seeder] Failed to commit dev seed data: {e}")
        return

    # ── Production: structural defaults from config.yaml ─────────────────────
    # 1. Verify if seeding is even necessary
    has_accounts = db.query(BankAccount).first() is not None
    has_categories = db.query(Category).first() is not None
    has_rules = db.query(CategoryRule).first() is not None

    if has_accounts and has_categories and has_rules:
        logger.debug("Database already contains data; skipping seeding routine to prevent integrity conflicts.")
        return

    config_path = Path(__file__).parent.parent / "core" / "config.yaml"
    if not config_path.exists():
        logger.warning(f"[Seeder] Warning: Config file missing at {config_path}. Skipping seed.")
        return

    with open(config_path, "r", encoding="utf-8") as file:
        config = yaml.safe_load(file) or {}
    
    seed_definitions = config.get("seed_data", {})
    if not seed_definitions:
        logger.warning("Configuration file found, but 'seed_data' block is empty or missing.")
        return
    
    logger.info("Empty database structure detected. Beginning initial database seeding routine...")

    # 2. Seed Bank Accounts table
    if not has_accounts:
        logger.info("[Seeder] Populating default bank accounts...")
        for acc in seed_definitions.get("bank_accounts", []):
            db_account = BankAccount(
                account_name=acc["account_name"],
                bank_name=acc["bank_name"],
                amount_style=acc["amount_style"],
                mappings=acc["mappings"]
            )
            db.add(db_account)

    # 3. Seed Hierarchical Category & Subcategory tables
    if not has_categories:
        logger.info("[Seeder] Populating structured category tree...")
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

                # Double check to prevent global unique collision crashes
                existing = db.query(Category).filter(Category.name == normalized_sub).first()
                if existing:
                    logger.warning(f"[Seeder] Subcategory '{normalized_sub}' already exists globally! Skipping creation.")
                    continue

                child_cat = Category(name=normalized_sub, parent_id=parent_cat.id)
                db.add(child_cat)
        db.flush()

    # 3. Seed Explicit Categorisation Rules
    if not has_rules:
        logger.info("[Seeder] Populating keyword processing rules...")
        for rule_data in seed_definitions.get("rules", []):
            category_name = rule_data["target_category"].strip().title()
            category = db.query(Category).filter(Category.name == category_name).first()
            if not category:
                logger.warning(f"[Seeder] Skipping rules for '{category_name}': Category not found.")
                continue

            for keyword in rule_data["keywords"]:
                db_rule = CategoryRule(
                    keyword=keyword.strip().lower(),
                    category_id=category.id,
                    match_field=rule_data["match_field"].strip(),
                )
                db.add(db_rule)

    try:
        db.commit()
        logger.info("[Seeder] Database tables initialized and seeded successfully.")
    except Exception as e:
        db.rollback()
        logger.critical(f"[Seeder] Critical: Failed to execute database seed: {e}")