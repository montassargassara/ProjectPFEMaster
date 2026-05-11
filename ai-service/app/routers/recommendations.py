from fastapi import APIRouter, Request, HTTPException
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse

router = APIRouter()


@router.post("/recommendations", response_model=RecommendationResponse)
def get_recommendations(body: RecommendationRequest, request: Request):
    svc = getattr(request.app.state, "rec_service", None)
    if svc is None or not svc.is_ready():
        raise HTTPException(status_code=503, detail="Recommendation engine not ready yet")
    try:
        return svc.recommend(body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations/reload")
def reload_recommendations(request: Request):
    svc = getattr(request.app.state, "rec_service", None)
    if svc:
        svc.reload_properties()
    return {"status": "reload triggered"}
