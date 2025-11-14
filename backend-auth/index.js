// ... (require, app, PORT, MONGO_URI, User, bcrypt 등은 맨 위에) ...
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// ... (PORT, MONGO_URI, REDIS_HOST, JWT_SECRET 등) ...
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const JWT_SECRET = process.env.JWT_SECRET;


// 1. [정의] MongoDB 연결 함수 (먼저 정의합니다)
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      user: process.env.MONGO_USERNAME,
      pass: process.env.MONGO_PASSWORD,
      authSource: "admin"
    });
    console.log('Auth Service: MongoDB Connected');
  } catch (err) {
    console.error('Auth Service: MongoDB Connection Error:', err.message);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectToMongoDB, 5000);
  }
};

// 2. [정의] Redis 연결 (먼저 정의합니다)
const redisClient = redis.createClient({
  socket: {
    host: REDIS_HOST,
    port: 6379
  }
});
redisClient.on('connect', () => console.log('Auth Service: Redis Connected'));
redisClient.on('error', (err) => console.error('Auth Service: Redis Connection Error:', err));


// 3. [호출] 정의된 함수들을 "호출"합니다.
connectToMongoDB();
redisClient.connect();


// 4. [라우트] API 엔드포인트들을 정의합니다.
app.get('/', (req, res) => {
  res.send('Welcome to the Auth Service (via Nginx)!');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  // 간단한 유효성 검사
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // 1. 사용자 중복 확인
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // 2. 새 사용자 생성
    // (User.js의 'pre save' 훅이 비밀번호를 자동으로 해싱합니다)
    const user = new User({
      username: username,
      password: password 
    });

    // 3. DB에 저장 (🌟 가장 중요 🌟)
    await user.save();

    // 4. 성공 응답
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: { id: user._id, username: user.username } 
    });

  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});



app.post('/login', async (req, res) => {
   const { username, password } = req.body;

  // 1. 간단한 유효성 검사
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // 2. DB에서 사용자 찾기
    const user = await User.findOne({ username: username });
    if (!user) {
      // 보안을 위해 "아이디가" 틀렸다고 알려주지 않음
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. 비밀번호 비교 (User.js에 만든 헬퍼 함수 사용)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // 보안을 위해 "비밀번호가" 틀렸다고 알려주지 않음
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. [성공] JWT 페이로드(내용물) 생성
    const payload = {
      id: user._id,
      username: user.username
    };

    // 5. JWT 토큰 서명 (비밀키와 만료 시간 사용)
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // .env 파일의 비밀키
      { expiresIn: '1h' }    // 1시간 뒤 만료
    );

    // 6. [세션 공유] Redis에 토큰 저장 (선택 사항이지만, 요구사항에 있었죠!)
    // (로그아웃 구현 시 이 키를 삭제하면 됨)
    await redisClient.set(`session:${user._id}`, token, { EX: 3600 }); // 1시간 (3600초)

    // 7. 클라이언트에게 토큰 전송
    res.status(200).json({
      message: 'Login successful',
      token: token,
      user: { id: user._id, username: user.username }
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});


// 5. [서버 실행] 마지막으로 서버를 실행합니다.
app.listen(PORT, () => {
  console.log(`Auth Service listening on port ${PORT}`);
});