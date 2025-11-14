# 1. 기본 Python 이미지
FROM python:3.10-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 설치 (캐싱 활용)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 4. 소스 코드 복사
COPY . .

# 5. 포트 노출 (docker-compose에서 5000으로 매핑됨)
EXPOSE 5000

# 6. 애플리케이션 실행 (Uvicorn 사용)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]