import hashlib

def generate_transaction_hash(date: str, amount: float, description: str, occurrence: int) -> str:
    """
    Generates a deterministic unique MD5 hash for a transaction line item 
    using the sequential Occurrence Counter strategy.
    """
    normalized_desc = description.strip().lower()
    base_signature = f"{date}_{amount}_{normalized_desc}_occ{occurrence}"
    return hashlib.md5(base_signature.encode("utf-8")).hexdigest()