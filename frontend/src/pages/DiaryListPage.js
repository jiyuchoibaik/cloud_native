// frontend/src/pages/DiaryListPage.js (수정된 최종 코드)

import React, { useState, useEffect, useCallback } from 'react'; // useCallback 추가
import { useNavigate } from 'react-router-dom';

function DiaryListPage() {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. 일기 목록 불러오기 (useCallback으로 최적화 및 안정화)
  // 이 함수는 dependency array에 추가되어야 하므로 useCallback 사용
  const fetchDiaries = useCallback(async () => {
    setLoading(true); // 로딩 상태 재설정
    setError(null);

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/diary/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiaries(data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
        navigate('/login');
      } else {
        // 서버에서 JSON 응답을 기대
        const errorData = await response.json(); 
        setError(errorData.message || '일기 목록을 불러오는 데 실패했습니다.');
      }
    } catch (err) {
      console.error('API 호출 에러:', err);
      // '네트워크 오류'는 이제 JSON 파싱 오류나 실제 네트워크 오류를 모두 포괄합니다.
      setError('서버 연결 또는 처리 중 오류가 발생했습니다.'); 
    } finally {
      setLoading(false);
    }
  }, [navigate]);


  // 2. useEffect: 컴포넌트 마운트 시 목록 로드
  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]); // fetchDiaries를 dependency에 추가


  // 3. [수정] 버튼 클릭 핸들러: Edit 페이지로 이동 (로직 변경 없음)
  const handleEdit = (diaryId) => {
    navigate(`/edit/${diaryId}`); 
  };

  // 4. [삭제] 버튼 클릭 핸들러: DELETE API 호출 (로직 변경 없음)
  const handleDelete = async (diaryId) => {
    if (!window.confirm('정말로 이 일기를 삭제하시겠습니까?')) {
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`http://localhost:8080/api/diary/${diaryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('일기가 성공적으로 삭제되었습니다.');
        // 🌟 삭제 성공 후 목록을 다시 불러와 화면을 갱신합니다.
        fetchDiaries(); 
      } else if (response.status === 401 || response.status === 403) {
        alert('인증 오류 또는 권한이 없습니다.');
        navigate('/login');
      } else {
        const errorData = await response.json();
        alert(errorData.message || '일기 삭제에 실패했습니다.');
      }

    } catch (error) {
      console.error('삭제 중 에러 발생:', error);
      alert('네트워크 오류로 삭제에 실패했습니다.');
    }
  };


  // 5. 로그아웃 기능 (로직 변경 없음)
  const handleLogout = () => {
    localStorage.removeItem('token');
    alert('로그아웃 되었습니다.');
    navigate('/login');
  };

  // 6. 렌더링 로직 (UI 영역)

  // 로딩 중 상태 표시
  if (loading) {
    return (
      <div className="diary-list-container">
        <h2>일기 목록</h2>
        <p>일기를 불러오는 중...</p>
      </div>
    );
  }

  // 에러 발생 시 표시
  if (error) {
    return (
      <div className="diary-list-container">
        <h2>일기 목록</h2>
        <p className="error-message">오류: {error}</p>
        <button onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    );
  }

  // 최종 렌더링
  return (
    <div className="diary-list-container">
      <div className="header">
        <h2>우리 강아지 일기장 🐶</h2>
        <div>
          <button onClick={() => navigate('/create')} className="create-button">새 일기 작성</button>
          <button onClick={handleLogout} className="logout-button">로그아웃</button>
        </div>
      </div>

      {diaries.length === 0 ? (
        <div className="no-diaries">
          <p>아직 작성된 일기가 없습니다. 첫 일기를 작성해 보세요!</p>
          <button onClick={() => navigate('/create')} className="create-link-button">일기 작성하러 가기</button>
        </div>
      ) : (
        <div className="diary-grid">
          {diaries.map((diary) => (
            <div key={diary._id || diary.id} className="diary-card">
              {diary.imageUrl && (
                <img
                  src={`http://localhost:8080${diary.imageUrl}`}
                  alt={diary.title}
                  className="diary-image"
                />
              )}
              <h3 className="diary-title">{diary.title}</h3>
              <p className="diary-content">{diary.content.substring(0, 100)}...</p>
              <span className="diary-date">
                {new Date(diary.createdAt).toLocaleDateString()}
              </span>

              <div className="card-actions">
                <button
                  onClick={() => handleEdit(diary._id || diary.id)}
                  className="edit-button"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(diary._id || diary.id)}
                  className="delete-button"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DiaryListPage;