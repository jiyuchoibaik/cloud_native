// frontend/src/App.js (예시)

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DiaryListPage from './pages/DiaryListPage'; // 🚨 일기 목록 페이지 (새로 생성할 예정)
import CreateDiaryPage from './pages/CreateDiaryPage'; // 🚨 일기 작성 페이지 (새로 생성할 예정)
import ProtectedRoute from './components/ProtectedRoute'; // 🚨 ProtectedRoute 컴포넌트 임포트
import EditDiaryPage from './pages/EditDiaryPage'; // ⬅️ 새로 임포트

function App() {
  return (
    <Router>
      <Routes>
        
        {/* 1. 공개 경로: 누구나 접근 가능 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 2. 보호 경로: 토큰이 있어야만 접근 가능 */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DiaryListPage /> {/* 일기 목록 페이지 */}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create" 
          element={
            <ProtectedRoute>
              <CreateDiaryPage /> {/* 일기 작성 페이지 */}
            </ProtectedRoute>
          } 
        />
        
        <Route path="/edit/:id" element={
           <ProtectedRoute>
              <EditDiaryPage /> {/* 일기 수정 페이지 */}
           </ProtectedRoute>
          } />
        
        {/* 필요한 경우 <Route path="*" element={<NotFound />} /> */}

      </Routes>
    </Router>
  );
}

export default App;