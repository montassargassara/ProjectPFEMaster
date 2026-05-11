from fastapi import APIRouter, Request, HTTPException
from app.schemas.price import PriceRequest, PriceResponse, RentalPriceResponse

router = APIRouter()


def _svc(request: Request):
    svc = getattr(request.app.state, "price_service", None)
    if svc is None or not svc.is_ready():
        raise HTTPException(status_code=503, detail="Price model not ready yet")
    return svc


@router.post("/predict-price", response_model=PriceResponse, summary="Estimer le prix de vente")
def predict_sale_price(body: PriceRequest, request: Request):
    try:
        return _svc(request).predict_sale(body)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict-rental", response_model=RentalPriceResponse, summary="Estimer le loyer mensuel")
def predict_rental_price(body: PriceRequest, request: Request):
    try:
        return _svc(request).predict_rental(body)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
