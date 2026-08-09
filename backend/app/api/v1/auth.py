"""
Authentication API endpoints.
"""
import json
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
import logging
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    create_2fa_pending_token,
    decode_token,
    verify_password,
    get_password_hash,
)
from app.core.config import settings
from app.schemas.user import (
    UserCreate,
    User,
    UserUpdate,
    Token,
    UserLogin,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TwoFactorSetupResponse,
    TwoFactorEnableRequest,
    TwoFactorDisableRequest,
    TwoFactorVerifyLoginRequest,
)
from app.models.user import User as UserModel
from app.models.business import Business as BusinessModel
from app.dependencies import get_current_user
import pyotp

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(UserModel).filter(
        (UserModel.email == user_data.email) | (UserModel.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = UserModel(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Every new user gets a default business/workspace to own their accounts.
    default_business = BusinessModel(
        owner_id=db_user.id,
        name=user_data.full_name or user_data.username,
        is_default=True,
    )
    db.add(default_business)
    db.commit()

    return db_user


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login: returns tokens, or requires_2fa + temp_token if 2FA is enabled."""
    identifier = form_data.username
    user = db.query(UserModel).filter(
        (UserModel.username == identifier) | (UserModel.email == identifier)
    ).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    if user.totp_secret:
        temp_token = create_2fa_pending_token(user.id)
        return {"requires_2fa": True, "temp_token": temp_token}
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id), "username": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token."""
    payload = decode_token(token_data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = int(payload.get("sub"))
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": str(user.id), "username": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: UserModel = Depends(get_current_user)):
    """Get current user information."""
    return current_user


@router.patch("/me", response_model=User)
async def update_current_user(
    body: UserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile (email, username, full_name)."""
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        return current_user
    if "email" in update_data:
        existing = db.query(UserModel).filter(
            UserModel.email == update_data["email"],
            UserModel.id != current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
    if "username" in update_data:
        existing = db.query(UserModel).filter(
            UserModel.username == update_data["username"],
            UserModel.id != current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already in use")
    if "dashboard_preferences" in update_data:
        v = update_data["dashboard_preferences"]
        current_user.dashboard_preferences = json.dumps(v) if v is not None else None
        del update_data["dashboard_preferences"]
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset. If the email exists, a reset token is generated.
    In production you would send the reset link by email; in dev it is logged.
    """
    user = db.query(UserModel).filter(UserModel.email == body.email).first()
    if user and user.is_active:
        reset_token = create_reset_token(data={"sub": user.id})
        base = getattr(settings, "FRONTEND_URL", None) or "http://localhost:3000"
        reset_link = f"{base.rstrip('/')}/reset-password?token={reset_token}"
        from app.core.email import send_password_reset_email
        send_password_reset_email(user.email, reset_link)
    return ForgotPasswordResponse()


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token from forgot-password flow."""
    payload = decode_token(body.token)
    if payload is None or payload.get("type") != "reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    user_id = int(payload.get("sub"))
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    return ResetPasswordResponse()


@router.get("/2fa/setup", response_model=TwoFactorSetupResponse)
async def twofa_setup(current_user: UserModel = Depends(get_current_user)):
    """Generate a new TOTP secret and provisioning URI for QR. Does not enable 2FA until /2fa/enable."""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    app_name = getattr(settings, "APP_NAME", "Pishbin")
    uri = totp.provisioning_uri(name=current_user.email or current_user.username, issuer_name=app_name)
    return {"secret": secret, "provisioning_uri": uri}


@router.post("/2fa/enable")
async def twofa_enable(
    body: TwoFactorEnableRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify code and enable 2FA by storing the secret."""
    totp = pyotp.TOTP(body.secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    current_user.totp_secret = body.secret
    db.commit()
    return {"message": "2FA enabled"}


@router.post("/2fa/disable")
async def twofa_disable(
    body: TwoFactorDisableRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable 2FA after verifying password."""
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    current_user.totp_secret = None
    db.commit()
    return {"message": "2FA disabled"}


@router.post("/2fa/verify-login", response_model=Token)
async def twofa_verify_login(body: TwoFactorVerifyLoginRequest, db: Session = Depends(get_db)):
    """After password login returned requires_2fa, verify TOTP code and return real tokens."""
    payload = decode_token(body.temp_token)
    if payload is None or payload.get("type") != "2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = int(payload.get("sub"))
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user or not user.is_active or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id), "username": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

