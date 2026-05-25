import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registrado correctamente'))
      .catch(err => console.log('Error al registrar Service Worker:', err));
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
