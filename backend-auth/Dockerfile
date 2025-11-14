# 1. 기본 Node.js 이미지
FROM node:18-alpine

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 설치 (캐싱 활용)
COPY package*.json ./
RUN npm install

# 4. 소스 코드 복사
COPY . .

# 5. 포트 노출 (docker-compose에서 3001로 매핑됨)
EXPOSE 3001

# 6. 애플리케이션 실행
CMD ["node", "index.js"]