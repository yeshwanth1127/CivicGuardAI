"""ML microservice: serves live photo classification (replacing the old
in-process tfjs-node classifier in the Node backend) and exposes the
offline training/compare.py comparison results for the admin UI.

Run: uvicorn app.main:app --reload --port 8000
"""
import json
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.inference import classify_image

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"

app = FastAPI(title="CivicGuard ML Service")

# Wide open for local dev / student-project deployment. Restrict
# allow_origins to the real admin/backend origins before any public deploy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/classify")
async def classify(image: UploadFile = File(...)):
    image_bytes = await image.read()
    try:
        return classify_image(image_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/models/comparison")
def models_comparison():
    results_path = ARTIFACTS_DIR / "comparison_results.json"
    if not results_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No comparison results yet — run training/compare.py first.",
        )
    return json.loads(results_path.read_text())
