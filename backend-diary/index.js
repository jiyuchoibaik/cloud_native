// index.js (Diary Service - Full CRUD)
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

// [추가] Diary 모델과 authMiddleware 임포트
const Diary = require('./models/Diary');
const authMiddleware = require('./middleware/authMiddleware');

// 🌟 [AI 연동] 라이브러리 임포트
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
app.use(express.json());

// 🌟 [AI 연동] Multer 설정 (메모리에 임시 저장)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🌟 [AI 연동] AI 서비스 주소 (Docker Compose 내부)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:5000';

const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';

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


// 4. [라우팅]
app.get('/', (req, res) => {
  res.send('Welcome to the Diary Service (via Nginx)!');
});

// 🌟 [중요] /api/diary/ (이하) 모든 라우트에 'authMiddleware'를 적용
// 이 미들웨어를 통과해야만 (즉, 토큰이 유효해야만) 아래 API 사용 가능
app.use(authMiddleware);

// ------------------------------------------
// 🌟 C.R.U.D API (AI 연동 버전) 🌟
// ------------------------------------------

// 1. [Create] 새 일기 작성 (POST /)
// (Nginx 경유: POST /api/diary/)
// [수정] JSON 대신 'multipart/form-data'를 받고, 'image'라는 필드로 파일을 받음
app.post('/', upload.single('image'), async (req, res) => {
  // 'upload.single' 미들웨어가 파일(req.file)과 텍스트(req.body)를 분리
  const { title } = req.body;
  const file = req.file;
  const userId = req.user.id; // authMiddleware가 넣어준 사용자 ID

  if (!title || !file) {
    return res.status(400).json({ message: 'Title and image file are required' });
  }

  try {
    // 1. [AI 전송] Axios와 FormData를 사용해 AI 서비스로 이미지 전송
    const formData = new FormData();
    formData.append('file', file.buffer, { filename: file.originalname });
    
    console.log('Diary Service: Forwarding image to AI service...');
    
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/analyze`, // -> ai-service (Python/FastAPI)
      formData,
      { headers: formData.getHeaders() } // 'Content-Type: multipart/form-data' 자동 설정
    );

    // 2. [AI 응답] AI가 분석/생성한 일기 내용 받기
    const { generated_diary, detected_species, detected_action } = aiResponse.data;
    console.log('Diary Service: Received analysis from AI service.');

    // 3. [DB 저장] AI가 생성한 content로 DB에 저장
    const newDiary = new Diary({
      user: userId,
      title: title,
      content: generated_diary, // ⬅️ AI가 생성한 일기 내용
      imageUrl: "temp_url_placeholder", // (나중에 S3 등 실제 저장 URL로 변경)
      aiAnalysis: {
        species: detected_species,
        action: detected_action
      }
    });

    await newDiary.save();
    res.status(201).json(newDiary);

  } catch (error) {
    console.error('Error during AI processing or diary creation:', error.message);
    res.status(500).json({ message: 'Error creating diary', error: error.message });
  }
});

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