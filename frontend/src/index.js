import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AdminPanel from './components/AdminPanel';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
// Получаем DOM-элемент с id="root"
const rootElement = document.getElementById('root');

// Создаем корень React
const root = ReactDOM.createRoot(rootElement);

// Рендерим приложение
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  </BrowserRouter>
);