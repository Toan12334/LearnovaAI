from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PricingPackageModel(BaseModel):
    id: str
    name: str
    price: int
    words: int
    description: Optional[str] = None
    features: List[str] = []
    is_popular: bool = False
    badge: Optional[str] = None
    sort_order: int = 0


class CreateOrderRequest(BaseModel):
    package_id: str = Field(..., description="ID gói cước muốn mua (starter | plus | master)")


class CreateOrderResponse(BaseModel):
    order_code: int
    package_id: str
    package_name: str
    amount: int
    words: int
    status: str
    checkout_url: Optional[str] = None
    qr_code: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    payment_content: str
    is_simulation: bool = False
    expires_in_seconds: int = 600


class OrderStatusResponse(BaseModel):
    order_code: int
    status: str
    amount: int
    words: int
    package_name: str
    paid_at: Optional[str] = None
    words_balance: Optional[int] = None


class PayOSWebhookItem(BaseModel):
    orderCode: int
    amount: int
    description: str
    accountNumber: Optional[str] = None
    reference: Optional[str] = None
    transactionDateTime: Optional[str] = None
    currency: Optional[str] = "VND"
    paymentLinkId: Optional[str] = None
    code: Optional[str] = None
    desc: Optional[str] = None


class PayOSWebhookPayload(BaseModel):
    code: str
    desc: str
    success: bool
    data: Dict[str, Any]
    signature: str
