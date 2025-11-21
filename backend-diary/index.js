const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const path = require('path');
const fs = require('fs/promises'); 
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const PORT = process.env.PORT_DIARY || 3002;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`; 
const MONGO_URI = process.env.MONGO_URI; 
const REDIS_HOST = process.env.REDIS_HOST; 

const Diary = require('./models/Diary');
const authMiddleware = require('./middleware/authMiddleware');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            cb(null, UPLOADS_DIR);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        if (!req.user || !req.user.id) {
            return cb(new Error('Authentication data missing for file upload.'), null);
        }
        const ext = path.extname(file.originalname);
        const fileName = `${req.user.id}-${Date.now()}${ext}`;
        cb(null, fileName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

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
    setTimeout(connectToMongoDB, 5000);
  }
};

const redisClient = redis.createClient({ socket: { host: REDIS_HOST, port: 6379 } });
redisClient.on('connect', () => console.log('Diary Service: Redis Connected'));
redisClient.on('error', (err) => console.error('Diary Service: Redis Connection Error:', err));

connectToMongoDB();
redisClient.connect();

const UserSchema = new mongoose.Schema({ username: { type: String } }, { collection: 'users' }); 
if (!mongoose.models.User) {
    mongoose.model('User', UserSchema);
}

app.get('/public', async (req, res) => {
    try {
        const publicDiaries = await Diary.find({ isPublic: true }).sort({ createdAt: -1 });
        res.json(publicDiaries);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching public diaries', error: error.message });
    }
});

app.use(authMiddleware);

app.post('/', upload.single('image'), async (req, res) => {
  const { title, content, isPublic } = req.body; 
  const file = req.file; 
  const userId = req.user.id; 

  if (!title || !file || !content) { 
    if (file) {
        try { await fs.unlink(file.path); } catch {} 
    }
    return res.status(400).json({ message: 'Title, content, and an image file are required' });
  }

  try {
    const imageUrl = `${BASE_URL}/uploads/${file.filename}`;
    const newDiary = new Diary({
      user: userId,
      title,
      content, 
      imageUrl,
      isPublic: isPublic === 'true', 
      aiAnalysis: { species: null, action: null }
    });

    await newDiary.save();
    res.status(201).json(newDiary);
  } catch (error) {
    if (file) { try { await fs.unlink(file.path); } catch {} }
    res.status(500).json({ message: 'Error creating diary', error: error.message });
  }
}); 

app.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const diaries = await Diary.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json(diaries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diaries', error: error.message });
  }
});

app.get('/:id', async (req, res) => {
  const diaryId = req.params.id;
  const userId = req.user.id;
  try {
    const diary = await Diary.findById(diaryId);
    if (!diary) return res.status(404).json({ message: 'Diary not found' });
    if (diary.user.toString() !== userId) return res.status(403).json({ message: 'Forbidden: You do not own this diary' });
    res.status(200).json(diary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diary', error: error.message });
  }
});

app.put('/:id', async (req, res) => {
  const diaryId = req.params.id;
  const userId = req.user.id;
  const { title, content, isPublic } = req.body; 

  try {
    const diary = await Diary.findById(diaryId);
    if (!diary) return res.status(404).json({ message: 'Diary not found' });
    if (diary.user.toString() !== userId) return res.status(403).json({ message: 'Forbidden: You do not own this diary' });

    diary.title = title !== undefined ? title : diary.title;
    diary.content = content !== undefined ? content : diary.content;
    if (isPublic !== undefined) diary.isPublic = isPublic;
    
    const updatedDiary = await diary.save();
    res.status(200).json(updatedDiary);
    
  } catch (error) {
    res.status(500).json({ message: 'Error updating diary', error: error.message });
  }
});

app.delete('/:id', async (req, res) => {
  const diaryId = req.params.id;
  const userId = req.user.id;

  try {
    const diary = await Diary.findById(diaryId);
    if (!diary) return res.status(404).json({ message: 'Diary not found' });
    if (diary.user.toString() !== userId) return res.status(403).json({ message: 'Forbidden: You do not own this diary' });

    if (diary.imageUrl) {
        const filename = path.basename(new URL(diary.imageUrl).pathname);
        const filePath = path.join(UPLOADS_DIR, filename);
        try { await fs.unlink(filePath); } catch {}
    }

    await Diary.deleteOne({ _id: diaryId });
    res.status(200).json({ message: 'Diary deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting diary', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Diary Service listening on port ${PORT}`);
  console.log(`Base URL is set to: ${BASE_URL}`);
});
