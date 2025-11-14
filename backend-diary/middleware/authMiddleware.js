const jwt = require('jsonwebtoken');

// .env 파일에서 auth-service와 동일한 비밀키를 가져옴
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  // 1. 헤더에서 'Authorization' 값을 찾습니다.
  const authHeader = req.headers.authorization;

  // 2. 헤더가 없거나, 'Bearer '로 시작하지 않으면 에러
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication failed: No token provided or invalid format' });
  }

  // 3. 'Bearer ' 부분을 잘라내고 토큰만 추출
  const token = authHeader.split(' ')[1];

  try {
    // 4. 토큰을 검증 (auth-service와 같은 비밀키 사용)
    const decodedPayload = jwt.verify(token, JWT_SECRET);

    // 5. [성공] 검증된 사용자 정보를 req 객체에 저장
    // (이제 이 요청은 로그인한 사용자의 것임을 보장)
    // payload에는 { id: '...', username: '...' }이 들어있음
    req.user = decodedPayload;

    // 6. 다음 단계(실제 API 로직)로 이동
    next();

  } catch (error) {
    // 7. 토큰이 만료되었거나, 위조된 경우
    return res.status(401).json({ message: 'Authentication failed: Invalid token', error: error.message });
  }
};

module.exports = authMiddleware;