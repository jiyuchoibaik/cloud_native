# Nginx 공식 이미지 사용
FROM nginx:stable-alpine

# 우리가 작성할 Nginx 설정 파일을 컨테이너 안으로 복사
# 기본 설정 파일을 덮어쓰기
COPY nginx.conf /etc/nginx/nginx.conf

# (선택) SSL 인증서 사용 시
# COPY ./certs /etc/nginx/certs

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]