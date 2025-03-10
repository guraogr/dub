import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CreateAvailabilityPage from './pages/CreateAvailabilityPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import AppointmentCompletedPage from './pages/AppointmentCompletedPage';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!session ? <RegisterPage /> : <Navigate to="/" />} />
        <Route path="/create-availability" element={session ? <CreateAvailabilityPage /> : <Navigate to="/login" />} />
        <Route path="/" element={session ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/messages" element={session ? <MessagesPage /> : <Navigate to="/login" />} />
        <Route path="/profile" element={session ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/appointment-completed/:id" element={session ? <AppointmentCompletedPage /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;