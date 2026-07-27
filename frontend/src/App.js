import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage       from './pages/LandingPage';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import DashboardLayout   from './pages/DashboardLayout';
import DashboardHome     from './pages/DashboardHome';
import NotesPage         from './pages/NotesPage';
import ProblemsPage      from './pages/ProblemsPage';
import AptitudePage      from './pages/AptitudePage';
import CompaniesPage     from './pages/CompaniesPage';
import DiscussionsPage   from './pages/DiscussionsPage';
import AdminPage         from './pages/AdminPage';
import SkillPathModule   from './components/skillpath/SkillPathModule';
import PracticeRoundPage from './pages/practice/PracticeRoundPage';
import DrivesPage        from './pages/DrivesPage';
import InterviewPrepHub  from './pages/InterviewPrepHub';
import InterviewPrepPage from './pages/InterviewPrepPage';
import PWAInstallPrompt  from './components/PWAInstallPrompt';
import FacultyStudentsPage      from './pages/faculty/FacultyStudentsPage';
import FacultyLeaderboardPage   from './pages/faculty/FacultyLeaderboardPage';
import FacultyAnnouncementsPage from './pages/faculty/FacultyAnnouncementsPage';
import GDLobbyPage  from './pages/gd/GDLobbyPage';
import GDRoomPage   from './pages/gd/GDRoomPage';
import GDReportPage from './pages/gd/GDReportPage';
import AlumniPage   from './pages/AlumniPage';


function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#f4f6fb' }}>
      <div style={{ textAlign:'center' }}>
        <img src="/logo.png" alt="PRAGATI"
          style={{ height:56, marginBottom:16, animation:'float 2s ease-in-out infinite' }} />
        <div style={{ width:36, height:36, border:'3px solid #e4e8f0',
          borderTopColor:'#531697', borderRadius:'50%',
          animation:'spin .7s linear infinite', margin:'0 auto' }} />
      </div>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* ── Public ───────────────────────────────────────────────────── */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />

      {/* ── GD Room & Report — OUTSIDE DashboardLayout ───────────────
           Must be BEFORE the /dashboard nested routes so React Router
           doesn't try to match them as dashboard children.
           Report must be BEFORE :code so "report" isn't read as a code.
      ──────────────────────────────────────────────────────────────── */}
      <Route
        path="/dashboard/gd/report/:code/:userId"
        element={<RequireAuth><GDReportPage /></RequireAuth>}
        
      />
      <Route
        path="/dashboard/gd/:code"
        element={<RequireAuth><GDRoomPage /></RequireAuth>}
      />

      {/* ── Dashboard (with sidebar) ──────────────────────────────── */}
      <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route index                   element={<DashboardHome />} />
        <Route path="notes"            element={<NotesPage />} />
        <Route path="problems"         element={<ProblemsPage />} />
        <Route path="aptitude"         element={<AptitudePage />} />
        <Route path="companies"        element={<CompaniesPage />} />
        <Route path="skillpath"        element={<SkillPathModule />} />
        <Route path="discussions"      element={<DiscussionsPage />} />
        <Route path="practice/:roundType" element={<PracticeRoundPage />} />
        <Route path="drives"           element={<DrivesPage />} />
        <Route path="interview-prep"   element={<InterviewPrepHub />} />
        <Route path="ai-interview"      element={<InterviewPrepPage />} />
        <Route path="students"         element={<FacultyStudentsPage />} />
        <Route path="leaderboard-view" element={<FacultyLeaderboardPage />} />
        <Route path="announcements"    element={<FacultyAnnouncementsPage />} />
        {/* Lobby stays inside dashboard — it uses the sidebar */}
        <Route path="gd"               element={<GDLobbyPage />} />
        <Route path="alumni"           element={<AlumniPage />} />
        <Route path="admin"            element={
          <RequireAuth role="admin"><AdminPage /></RequireAuth>
        } />

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <PWAInstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}