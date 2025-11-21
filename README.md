# 🐾 Pet Diary App - Docker 설치 가이드

## 📦 Docker Hub 이미지 주소

- **Auth Service**: `choijiyu/cloud_native-auth-service:v1.0`
- **Diary Service**: `choijiyu/cloud_native-diary-service:v1.0`
- **Frontend**: `choijiyu/cloud_native-frontend:v1.0`
- **Nginx**: `choijiyu/cloud_native-nginx:v1.0`

---

## 🚀 빠른 시작 (Docker Compose 사용)

### 1. 사전 요구사항

- Docker Engine 20.10 이상
- Docker Compose v2.0 이상

### 2. 프로젝트 클론 및 설정

```bash
# 저장소 클론
git clone <your-repository-url>
cd pet-diary-app

# 환경 변수 파일 생성
cp .env.example .env
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# MongoDB 환경 변수
MONGO_USERNAME=admin
MONGO_PASSWORD=password

# MongoDB 연결 URI
MONGO_URI=mongodb://mongodb:27017/diarydb

# JWT 비밀 키 (인증 서비스) - 강력한 랜덤 문자열 사용 권장
JWT_SECRET=your_jwt_secret_key_here

# 다이어리 서비스 포트
PORT_DIARY=3002

# 외부 접근 URL
BASE_URL=http://localhost:8080

# Redis 호스트
REDIS_HOST=redis
```

> ⚠️ **보안 주의**: 운영 환경에서는 반드시 강력한 비밀번호와 JWT 시크릿을 사용하세요!

### 4. 애플리케이션 실행

```bash
# 백그라운드에서 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 보기
docker-compose logs -f frontend
```

### 5. 접속하기

애플리케이션이 시작되면 다음 주소로 접속할 수 있습니다:

- **웹 애플리케이션**: http://localhost:8080
- **Auth Service API**: http://localhost:3001
- **Diary Service API**: http://localhost:3002
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

---

## 🛑 애플리케이션 중지 및 제거

```bash
# 서비스 중지
docker-compose stop

# 서비스 중지 및 컨테이너 제거
docker-compose down

# 컨테이너, 볼륨, 네트워크 모두 제거
docker-compose down -v
```

---

## 🔧 수동 설치 (Docker Hub 이미지 직접 사용)

Docker Compose 없이 직접 실행하려면:

### 1. 네트워크 생성

```bash
docker network create pet_diary_network
```

### 2. MongoDB 실행

```bash
docker run -d \
  --name mongodb_container \
  --network pet_diary_network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your_password \
  -v mongodb_data:/data/db \
  mongo:latest
```

### 3. Redis 실행

```bash
docker run -d \
  --name redis_container \
  --network pet_diary_network \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:latest
```

### 4. Auth Service 실행

```bash
docker run -d \
  --name auth_service_container \
  --network pet_diary_network \
  -p 3001:3001 \
  -e PORT=3001 \
  -e MONGO_URI=mongodb://mongodb_container:27017/auth_db \
  -e MONGO_USERNAME=admin \
  -e MONGO_PASSWORD=your_password \
  -e REDIS_HOST=redis_container \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET=your_jwt_secret \
  choijiyu/cloud_native-auth-service:v1.0
```

### 5. Diary Service 실행

```bash
docker run -d \
  --name diary_service_container \
  --network pet_diary_network \
  -p 3002:3002 \
  -e PORT=3002 \
  -e MONGO_URI=mongodb://mongodb_container:27017/diary_db \
  -e MONGO_USERNAME=admin \
  -e MONGO_PASSWORD=your_password \
  -e REDIS_HOST=redis_container \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET=your_jwt_secret \
  -v $(pwd)/uploads:/app/uploads \
  choijiyu/cloud_native-diary-service:v1.0
```

### 6. Frontend 실행

```bash
docker run -d \
  --name frontend_container \
  --network pet_diary_network \
  choijiyu/cloud_native-frontend:v1.0
```

### 7. Nginx 실행

```bash
docker run -d \
  --name nginx_container \
  --network pet_diary_network \
  -p 8080:80 \
  -p 443:443 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf \
  choijiyu/cloud_native-nginx:v1.0
```

---

## 📝 docker-compose.yml 파일

프로젝트 루트에 다음 파일을 생성하세요:

```yaml
services:
  # 1. MongoDB (데이터베이스)
  mongodb:
    image: mongo:latest
    container_name: mongodb_container
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    networks:
      - pet_diary_network
    restart: always

  # 2. Redis (세션 공유 및 캐시)
  redis:
    image: redis:latest
    container_name: redis_container
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - pet_diary_network
    restart: always

  # 3. 인증 서비스
  auth-service:
    image: choijiyu/cloud_native-auth-service:v1.0
    container_name: auth_service_container
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      MONGO_URI: mongodb://mongodb:27017/auth_db
      MONGO_USERNAME: ${MONGO_USERNAME}
      MONGO_PASSWORD: ${MONGO_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
    networks:
      - pet_diary_network
    depends_on:
      - mongodb
      - redis
    restart: always

  # 4. 일기 관리 서비스
  diary-service:
    image: choijiyu/cloud_native-diary-service:v1.0
    container_name: diary_service_container
    ports:
      - "3002:3002"
    environment:
      PORT: 3002
      MONGO_URI: mongodb://mongodb:27017/diary_db
      MONGO_USERNAME: ${MONGO_USERNAME}
      MONGO_PASSWORD: ${MONGO_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - ./uploads:/app/uploads
    networks:
      - pet_diary_network
    depends_on:
      - mongodb
      - redis
      - auth-service
    restart: always

  # 5. 프론트엔드
  frontend:
    image: choijiyu/cloud_native-frontend:v1.0
    container_name: frontend_container
    networks:
      - pet_diary_network
    restart: always

  # 6. Nginx (리버스 프록시)
  nginx:
    image: choijiyu/cloud_native-nginx:v1.0
    container_name: nginx_container
    ports:
      - "8080:80"
      - "443:443"
    networks:
      - pet_diary_network
    depends_on:
      - frontend
      - auth-service
      - diary-service
    restart: always
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf

volumes:
  mongodb_data:
  redis_data:

networks:
  pet_diary_network:
    driver: bridge
```

---

## 🔍 문제 해결

### 컨테이너 상태 확인

```bash
docker-compose ps
```

### 특정 서비스 재시작

```bash
docker-compose restart auth-service
```

### 컨테이너 내부 접속

```bash
docker exec -it auth_service_container sh
```

### 로그 실시간 확인

```bash
docker-compose logs -f --tail=100
```

### 볼륨 확인

```bash
docker volume ls
```

---

## ⚠️ 주의사항

1. **환경 변수 보안**: `.env` 파일은 절대 Git에 커밋하지 마세요
2. **포트 충돌**: 8080, 3001, 3002, 27017, 6379 포트가 사용 중이지 않은지 확인하세요
3. **볼륨 데이터**: 데이터를 완전히 삭제하려면 `-v` 옵션을 사용하세요
4. **운영 환경**: 프로덕션 배포 시 강력한 비밀번호와 HTTPS 설정을 사용하세요

---

## 📚 추가 정보

- **프로젝트 구조**: 프로젝트는 마이크로서비스 아키텍처로 구성되어 있습니다
- **데이터 지속성**: MongoDB와 Redis 데이터는 Docker 볼륨에 저장됩니다
- **네트워킹**: 모든 서비스는 `pet_diary_network` 브리지 네트워크로 연결됩니다

---

## 💬 지원

문제가 발생하면 GitHub Issues에 문의해주세요.

**Happy Coding! 🎉**