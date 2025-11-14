// frontend/src/pages/EditDiaryPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function EditDiaryPage() {
  // 1. URL에서 일기 ID 추출
  const { id } = useParams(); 
  const navigate = useNavigate();

  const [diary, setDiary] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:8080/api/diary';

  // 2. 초기 데이터 불러오기 (GET /api/diary/:id)
  useEffect(() => {
    const fetchDiary = async () => {
      const token = localStorage.getItem('token');
      if (!token || !id) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setDiary(data);
          setTitle(data.title);     // 폼에 초기값 설정
          setContent(data.content); // 폼에 초기값 설정
        } else if (response.status === 401 || response.status === 403) {
          // 인증 실패 또는 접근 권한 없음
          localStorage.removeItem('token');
          alert('수정 권한이 없거나 세션이 만료되었습니다.');
          navigate('/login');
        } else {
          setError('일기 정보를 불러오는 데 실패했습니다.');
        }
      } catch (err) {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchDiary();
  }, [id, navigate]);

  // 3. 수정된 데이터 저장 (PUT /api/diary/:id)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }), // 수정된 데이터 전송
      });

      if (response.ok) {
        alert('일기가 성공적으로 수정되었습니다!');
        // 목록 페이지로 돌아가기
        navigate('/'); 
      } else if (response.status === 401 || response.status === 403) {
        alert('수정 권한이 없습니다.');
      } else {
        const errorData = await response.json();
        alert(`수정 실패: ${errorData.message}`);
      }
    } catch (error) {
      alert('네트워크 오류로 수정에 실패했습니다.');
    }
  };

  if (loading) return <div className="loading">일기 정보를 불러오는 중...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!diary) return <div className="error">수정할 일기를 찾을 수 없습니다.</div>;

  return (
    <div className="edit-diary-container">
      <h2>일기 수정하기</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">내용</label>
          <textarea
            id="content"
            rows="10"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          ></textarea>
        </div>
        
        {/* 이미지 URL은 현재 수정하지 않는다고 가정합니다. */}
        {diary.imageUrl && (
          <div className="current-image">
            <p>현재 이미지:</p>
            <img src={`http://localhost:8080${diary.imageUrl}`} alt="Diary Image" style={{ maxWidth: '300px', maxHeight: '300px' }} />
          </div>
        )}

        <button type="submit" className="save-button">수정 완료</button>
        <button type="button" onClick={() => navigate('/')} className="cancel-button">취소</button>
      </form>
    </div>
  );
}

export default EditDiaryPage;