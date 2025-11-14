const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true, // 같은 아이디로 중복 가입 방지
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  }
});

// [중요] 비밀번호 암호화: 'save' 이벤트가 발생하기 직전에 실행
// 사용자가 'save' (즉, 회원가입)될 때, 비밀번호를 해싱합니다.
UserSchema.pre('save', async function(next) {
  // 비밀번호가 변경되었거나 새로 생성될 때만 해싱
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10); // Salt 생성 (강도 10)
    this.password = await bcrypt.hash(this.password, salt); // 비밀번호 해싱
    next();
  } catch (error) {
    next(error);
  }
});

// (로그인 시 사용) 비밀번호가 일치하는지 확인하는 헬퍼 함수
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);