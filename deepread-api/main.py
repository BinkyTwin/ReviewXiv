from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from services.parser import parse_pdf
from pydantic import BaseModel

app = FastAPI(title="DeepRead API")

# CORS setup for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class AuditResponse(BaseModel):
    id: str
    metadata: dict
    structure: dict

@app.get("/")
def read_root():
    return {"message": "DeepRead API is running"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    return {"id": file_id, "filename": file.filename, "status": "uploaded"}

@app.get("/audit/{file_id}")
def audit_pdf(file_id: str):
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Parse the PDF
        structure = parse_pdf(file_path)
        return {
            "id": file_id,
            "metadata": {
                "title": structure["title"],
                "author": structure["author"],
                "pages": structure["page_count"]
            },
            "structure": structure
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing error: {str(e)}")


from services.ai_client import explain_text

class ExplainRequest(BaseModel):
    text: str
    model: str = "tngtech/tng-r1t-chimera:free"

@app.post("/explain")
async def explain_text_endpoint(request: ExplainRequest):
    explanation = explain_text(request.text, request.model)
    return {"explanation": explanation}

