// frontend/src/components/EditDiaryForm.js

import React from 'react';

function EditDiaryForm({ title, setTitle, content, setContent, imageUrl, handleSubmit, handleCancel }) {

  return (
    <div className="edit-diary-container">
      <h2>일기 수정하기</h2>
      
      {/* 폼 제출 시 상위 컴포넌트의 handleSubmit 함수 실행 */}
      <form onSubmit={handleSubmit}> 
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            // 🌟 여기에 CSS 프레임워크 클래스 추가 가능 (예: className="form-control")
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
             // 🌟 여기에 CSS 프레임워크 클래스 추가 가능 (예: className="form-textarea")
          ></textarea>
        </div>
        
        {/* 이미지 표시 부분 */}
        {imageUrl && (
          <div className="current-image">
            <p>현재 이미지:</p>
            <img 
              src={`http://localhost:8080${imageUrl}`} 
              alt="Diary Image" 
              style={{ maxWidth: '300px', maxHeight: '300px' }} 
            />
          </div>
        )}

        <button type="submit" className="save-button">
          수정 완료
           {/* 🌟 여기에 CSS 프레임워크 클래스 추가 가능 (예: className="btn btn-primary") */}
        </button>
        <button type="button" onClick={handleCancel} className="cancel-button">
          취소
        </button>
      </form>
    </div>
  );
}

export default EditDiaryForm;