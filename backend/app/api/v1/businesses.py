"""
Businesses API endpoints (multi-business / multi-branch workspaces).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.business import BusinessCreate, BusinessUpdate, Business as BusinessSchema
from app.services.business_service import BusinessService

router = APIRouter()


@router.get("/", response_model=List[BusinessSchema])
async def get_businesses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all businesses owned by the current user."""
    service = BusinessService(db)
    return service.get_user_businesses(current_user.id)


@router.get("/{business_id}", response_model=BusinessSchema)
async def get_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific business by ID."""
    service = BusinessService(db)
    business = service.get_business(business_id, current_user.id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


@router.post("/", response_model=BusinessSchema, status_code=status.HTTP_201_CREATED)
async def create_business(
    business_data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new business (workspace). The first business becomes the default."""
    service = BusinessService(db)
    return service.create_business(business_data, current_user.id)


@router.put("/{business_id}", response_model=BusinessSchema)
async def update_business(
    business_id: int,
    business_data: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing business."""
    service = BusinessService(db)
    business = service.update_business(business_id, business_data, current_user.id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


@router.post("/{business_id}/set-default", response_model=BusinessSchema)
async def set_default_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch the active/default business for the current user."""
    service = BusinessService(db)
    business = service.set_default_business(business_id, current_user.id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business


@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a business. Fails if it's the only one or still has accounts."""
    service = BusinessService(db)
    business = service.get_business(business_id, current_user.id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    success, error = service.delete_business(business_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error or "Cannot delete business")
