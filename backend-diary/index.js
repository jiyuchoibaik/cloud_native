// index.js (Diary Service - Full CRUD)
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

// 🚨 [필수 추가] 환경 변수를 process.env에서 읽어와 선언합니다.
const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI; 
const REDIS_HOST = process.env.REDIS_HOST; 

// [추가] Diary 모델과 authMiddleware 임포트
const Diary = require('./models/Diary');
const authMiddleware = require('./middleware/authMiddleware');

// 🌟 [AI 연동] 라이브러리 임포트
const multer = require('multer');

const app = express();
app.use(express.json());

// 🌟 [AI 연동] Multer 설정 (메모리에 임시 저장)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// 1. MongoDB 연결
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, { 
      user: process.env.MONGO_USERNAME, 
      pass: process.env.MONGO_PASSWORD,
      authSource: "admin"
    });
    console.log('Diary Service: MongoDB Connected');
  } catch (err) {
    console.error('Diary Service: MongoDB Connection Error:', err.message);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectToMongoDB, 5000);
  }
};

// 2. Redis 연결
const redisClient = redis.createClient({
  socket: { host: REDIS_HOST, port: 6379 }
});
redisClient.on('connect', () => console.log('Diary Service: Redis Connected'));
redisClient.on('error', (err) => console.error('Diary Service: Redis Connection Error:', err));

// 3. [호출]
connectToMongoDB();
redisClient.connect();

// 🌟 [중요] /api/diary/ (이하) 모든 라우트에 'authMiddleware'를 적용
// 이 미들웨어를 통과해야만 (즉, 토큰이 유효해야만) 아래 API 사용 가능
app.use(authMiddleware);

/*
// 4. [라우팅]
app.get('/', (req, res) => {
  res.send('Welcome to the Diary Service (via Nginx)!');
});
*/


// ------------------------------------------
// 🌟 C.R.U.D API (AI 제거 버전) 🌟
// ------------------------------------------

// 1. [Create] 새 일기 작성 (POST /)
app.post('/', upload.single('image'), async (req, res) => {
  // 🌟 [수정] AI 없이 사용자가 title, content를 직접 입력한다고 가정
  const { title, content } = req.body; 
  const file = req.file;
  const userId = req.user.id; 

  // content 유효성 검사 추가
  if (!title || !file || !content) { 
    return res.status(400).json({ message: 'Title, content, and image file are required' });
  }

  try {
    // 1. [AI 전송] 관련 코드 모두 삭제

    // 2. [DB 저장] 사용자가 제공한 content로 DB에 저장
    const newDiary = new Diary({
      user: userId,
      title: title,
      content: content, // ⬅️ 사용자가 직접 작성한 내용 저장
      imageUrl: "placeholder_for_simple_upload", 
      // aiAnalysis 필드는 스키마에 따라 null 처리
      aiAnalysis: {
        species: null, 
        action: null      
      }
    });

    await newDiary.save();
    res.status(201).json(newDiary);

  } catch (error) {
    console.error('Error creating diary:', error.message);
    // 에러 메시지를 일반적인 DB 저장 오류로 변경
    res.status(500).json({ message: 'Error creating diary', error: error.message });
  }
}); // 🚨 [수정] app.post 라우트를 여기서 올바르게 닫습니다.

// 2. [Read] "나의" 모든 일기 조회 (GET /)
// (Nginx 경유: GET /api/diary/)
app.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const diaries = await Diary.find({ user: userId }).sort({ createdAt: -1 }); // 최신순
    res.status(200).json(diaries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diaries', error: error.message });
  }
});

// 3. [Read] 특정 일기 1개 조회 (GET /:id)
// (Nginx 경유: GET /api/diary/12345)
app.get('/:id', async (req, res) => {
  const diaryId = req.params.id;
  const userId = req.user.id;

  try {
    const diary = await Diary.findById(diaryId);
    if (!diary) {
      return res.status(404).json({ message: 'Diary not found' });
    }
    // [보안] 이 일기가 "내 것"이 맞는지 확인
    if (diary.user.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this diary' });
    }
    res.status(200).json(diary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diary', error: error.message });
  }
});

// 4. [Update] 특정 일기 수정 (PUT /:id)
// (Nginx 경유: PUT /api/diary/12345)
app.put('/:id', async (req, res) => {
  const diaryId = req.params.id;
  const userId = req.user.id;
  const { title, content } = req.body;

  try {
    const diary = await Diary.findById(diaryId);
    if (!diary) {
      return res.status(404).json({ message: 'Diary not found' });
    }
    // [보안] "내 것"인지 확인
    if (diary.user.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this diary' });
    }

    // 수정 및 저장
    diary.title = title || diary.title;
    diary.content = content || diary.content;
    
    const updatedDiary = await diary.save();
    res.status(200).json(updatedDiary);
    
  } catch (error) {
    res.status(500).json({ message: 'Error updating diary', error: error.message });
  }
});

// 5. [Delete] 특정 일기 삭제 (DELETE /:id)
// (Nginx 경유: DELETE /api/diary/12345)
app.delete('/:id', async (req, res) => {
  const diaryId = req.params.id;
  const userId = req.user.id;

  try {
    const diary = await Diary.findById(diaryId);
    if (!diary) {
      return res.status(404).json({ message: 'Diary not found' });
    }
    // [보안] "내 것"인지 확인
    if (diary.user.toString() !== userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this diary' });
    }

    await Diary.deleteOne({ _id: diaryId });
    res.status(200).json({ message: 'Diary deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting diary', error: error.message });
  }
});


// 5. 서버 실행
app.listen(PORT, () => {
  console.log(`Diary Service listening on port ${PORT}`);
});