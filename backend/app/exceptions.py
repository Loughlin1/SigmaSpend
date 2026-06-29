"""
Domain exception classes for the SigmaSpend service layer.

Services raise these instead of FastAPI's HTTPException, keeping them
decoupled from the HTTP transport layer. Handlers in main.py convert
them to appropriate HTTP responses.
"""


class SigmaSpendError(Exception):
    """Base exception for all domain errors."""
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


# ── 404 Not Found ────────────────────────────────────────────────────────────

class NotFoundError(SigmaSpendError):
    """A requested resource does not exist."""


class AccountNotFoundError(NotFoundError):
    pass


# ── 400 Bad Request ───────────────────────────────────────────────────────────

class BadRequestError(SigmaSpendError):
    """A request violates a business rule or carries invalid data."""


class InvalidDateError(BadRequestError):
    pass


class InvalidFileFormatError(BadRequestError):
    pass


class AccountInactiveError(BadRequestError):
    pass


class MissingBankConfigError(BadRequestError):
    pass


class MissingParserConfigError(BadRequestError):
    pass
