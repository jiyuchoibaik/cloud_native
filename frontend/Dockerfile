# 1. 빌드(Build) 단계
FROM node:18-alpine as builder

WORKDIR /app

# 의존성 설치
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# React 앱 빌드 (static 파일 생성)
RUN npm run build

# 2. 서빙(Serve) 단계
# Nginx를 사용하여 빌드된 static 파일 서빙
FROM nginx:stable-alpine

# React Router를 위한 Nginx 설정 복사 (client-side routing)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 단계(builder)에서 생성된 static 파일들을
# Nginx의 기본 HTML 서빙 폴더로 복사
COPY --from=builder /app/build /usr/share/nginx/html

# [수정] Nginx가 파일을 읽을 수 있도록 권한을 변경합니다.
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html
# Nginx는 기본 80 포트 사용
EXPOSE 80

# Nginx 서버 실행
CMD ["nginx", "-g", "daemon off;"]