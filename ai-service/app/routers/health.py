from fastapi import APIRouter, Request

router = APIRouter()


@router.get("")
def health_check(request: Request):
    price_ready = getattr(request.app.state, "price_service", None)
    rec_ready   = getattr(request.app.state, "rec_service", None)
    return {
        "status": "ok",
        "services": {
            "price_prediction":  price_ready.is_ready() if price_ready else False,
            "recommendations":   rec_ready.is_ready()   if rec_ready   else False,
        },
    }
