from __future__ import annotations

from django.core import signing

SIMULATION_TOKEN_SALT = "eventhub.payments.simulation"


def issue_simulation_token(order_number: str) -> str:
    signer = signing.TimestampSigner(salt=SIMULATION_TOKEN_SALT)
    return signer.sign(order_number)


def verify_simulation_token(order_number: str, token: str, max_age_seconds: int) -> bool:
    if not token:
        return False
    signer = signing.TimestampSigner(salt=SIMULATION_TOKEN_SALT)
    try:
        value = signer.unsign(token, max_age=max_age_seconds)
    except signing.BadSignature:
        return False
    except signing.SignatureExpired:
        return False
    return value == order_number
