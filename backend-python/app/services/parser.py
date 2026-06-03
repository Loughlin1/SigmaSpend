import csv
from io import StringIO
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.core.security import generate_transaction_hash

class StatementParserService:
    @staticmethod
    def process_csv(file_contents: str, db: Session) -> dict:
        """
        Parses raw standard CSV contents, dynamically tracking duplicate counts.
        """
        csv_file = StringIO(file_contents)
        reader = csv.DictReader(csv_file)
        
        seen_combinations = defaultdict(int)
        added_count = 0
        skipped_count = 0

        for row in reader:
            try:
                # Target layout config matching common bank exports (e.g. Date, Amount, Description)
                # Tweak string lookup parameters depending on your specific bank export naming conventions
                date = row["Date"]
                amount = float(row["Amount"])
                description = row["Description"]
                
                # 1. Determine key baseline parameters to discover occurrence volume
                base_sig = f"{date}_{amount}_{description.strip().lower()}"
                seen_combinations[base_sig] += 1
                occurrence = seen_combinations[base_sig]
                
                # 2. Derive permanent static hash
                tx_hash = generate_transaction_hash(date, amount, description, occurrence)
                
                # 3. Assess local database records
                exists = db.query(Expense).filter(Expense.transaction_hash == tx_hash).first()
                if exists:
                    skipped_count += 1
                    continue
                
                # 4. Generate entity state
                expense = Expense(
                    date=date,
                    amount=amount,
                    description=description,
                    transaction_hash=tx_hash
                )
                db.add(expense)
                added_count += 1
                
            except (KeyError, ValueError):
                # Safely skips broken header configurations or invalid empty file rows
                continue
                
        db.commit()
        return {"added": added_count, "skipped": skipped_count}