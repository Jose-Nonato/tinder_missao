import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ChatProvider } from './chat/ChatContext'
import { Layout, RequireAuth, RequireProfile, RequireQuestionnaire } from './components/Layout'
import Profile from './pages/Profile'
import Blocked from './pages/Blocked'
import Safety from './pages/Safety'
import Discover from './pages/Discover'
import Home from './pages/Home'
import Matches from './pages/Matches'
import Messages from './pages/Messages'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import Legal from './pages/Legal'
import Support from './pages/Support'
import Questionnaire from './pages/Questionnaire'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Questions from './pages/admin/Questions'
import PasswordResets from './pages/admin/PasswordResets'
import Reports from './pages/admin/Reports'
import Users from './pages/admin/Users'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
        <Routes>
          <Route path="/apoie" element={<Support />} />
          <Route path="/termos" element={<Legal />} />
          <Route path="/privacidade" element={<Legal privacy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/questionnaire" element={<Questionnaire />} />
              <Route element={<RequireQuestionnaire />}>
                <Route path="/profile" element={<Profile />} />
                <Route element={<RequireProfile />}>
                  <Route path="/" element={<Home />} />
                  <Route element={<RequireAuth role="user" />}>
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/matches" element={<Matches />} />
                    <Route path="/safety" element={<Safety />} />
                    <Route path="/blocked" element={<Blocked />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/messages/:userId" element={<Messages />} />
                  </Route>
                  <Route element={<RequireAuth role="admin" />}>
                    <Route path="/admin/questions" element={<Questions />} />
                    <Route path="/admin/users" element={<Users />} />
                    <Route path="/admin/reports" element={<Reports />} />
                    <Route path="/admin/password-resets" element={<PasswordResets />} />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
