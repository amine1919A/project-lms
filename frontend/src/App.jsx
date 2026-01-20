// src/App.jsx
import React from 'react';
import AppRouter from './routes/Router';
import { AuthProvider } from './context/AuthContext';
import { AgoraProvider } from './context/AgoraContext'; // IMPORTEZ AGORA PROVIDER
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <AgoraProvider> {/* AJOUTEZ CETTE LIGNE */}
        <AppRouter />
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AgoraProvider> {/* AJOUTEZ CETTE LIGNE */}
    </AuthProvider>
  );
}

export default App;