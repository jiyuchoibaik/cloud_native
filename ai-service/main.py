# main.py (AI Service - Skeleton)
from fastapi import FastAPI, UploadFile, File
import uvicorn
import httpx # 외부 API 호출
import os

app = FastAPI()

# 환경 변수 (Hugging Face 등)
# HF_API_KEY = os.getenv("HF_API_KEY")

# 1. 기본 라우트 (Nginx 라우팅 테스트용)
@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Service (via Nginx)!"}

# 2. 이미지 분석 API (스켈레톤)
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    # 이 엔드포인트는 /api/ai/analyze 로 Nginx를 통해 접근됨
    
    # 1. (실제) 이미지 받기
    # image_bytes = await file.read()
    
    # 2. (실제) CV API 또는 Hugging Face API 호출
    # (예시)
    # async with httpx.AsyncClient() as client:
    #     response = await client.post(
    #         "https://api-inference.huggingface.co/models/google/vit-base-patch16-224-in21k",
    #         headers={"Authorization": f"Bearer {HF_API_KEY}"},
    #         data=image_bytes
    #     )
    #     cv_result = response.json()
    
    # 3. (실제) CV 결과로 LLM 프롬프트 생성 후 일기 생성 API 호출
    # ...
    
    # 4. (스켈레톤) 임시 Mock 데이터 반환
    print(f"Analyzing image: {file.filename}")
    
    # 임시 분석 결과
    species = "강아지" # (CV가 'dog' 반환)
    action = "산책 중" # (CV가 'walking' 반환)
    
    # 임시 일기 생성 (원래는 LLM이)
    diary_text = f"오늘은 주인님이랑 {action}을 했어오. {species}는 신나오. 멍멍!"
    
    return {
        "original_filename": file.filename,
        "detected_species": species,
        "detected_action": action,
        "generated_diary": diary_text
    }

if __name__ == "__main__":
    # 이 부분은 Docker CMD가 Uvicorn을 직접 실행하므로, 로컬 테스트용
    uvicorn.run(app, host="0.0.0.0", port=5000)