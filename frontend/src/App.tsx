import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import FeedPage from './pages/FeedPage';
import ReportPage from './pages/ReportPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';

import './App.css';

function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('auth') === 'true'
  );

  const PrivateRoute = ({
    children
  }: {
    children: React.ReactElement
  }) => {

    return isAuthenticated
      ? children
      : <Navigate to="/auth" replace />;
  };

  return (
    <BrowserRouter>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#05050A',
          color: 'white'
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: 'auto'
          }}
        >
          <Routes>

            <Route
              path="/"
              element={<LandingPage />}
            />

            <Route
              path="/auth"
              element={
                <AuthPage
                  onLogin={() => {
                    localStorage.setItem('auth', 'true');
                    setIsAuthenticated(true);
                  }}
                />
              }
            />

            <Route
              path="/admin"
              element={<AdminPage />}
            />

            <Route
              path="/map"
              element={
                <PrivateRoute>
                  <MapPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/feed"
              element={
                <PrivateRoute>
                  <FeedPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/report"
              element={
                <PrivateRoute>
                  <ReportPage />
                </PrivateRoute>
              }
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />

          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;