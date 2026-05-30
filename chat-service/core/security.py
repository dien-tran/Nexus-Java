from dataclasses import dataclass

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt

from core.config import get_settings


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    roles: list[str]
    bearer_token: str


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()

    try:
        payload = jwt.decode(token, settings.jwt_signer_key, algorithms=["HS512"])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is missing",
        )

    raw_roles = payload.get("scope") or payload.get("roles") or []
    if isinstance(raw_roles, str):
        roles = raw_roles.split()
    elif isinstance(raw_roles, list):
        roles = [str(role) for role in raw_roles]
    else:
        roles = []

    return CurrentUser(user_id=str(user_id), roles=roles, bearer_token=token)
