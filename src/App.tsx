import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/app/guards/ProtectedRoute'
import { RoleGuard } from '@/app/guards/RoleGuard'
import { AdminLayout } from '@/app/layout/AdminLayout'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<PlaceholderPage title="Tổng quan" />} />
            <Route path="/dashboard" element={<PlaceholderPage title="Tổng quan" />} />
            <Route path="/users" element={<PlaceholderPage title="Người dùng" />} />
            <Route path="/users/:id" element={<PlaceholderPage title="Chi tiết người dùng" />} />
            <Route path="/wallets" element={<PlaceholderPage title="Ví điện tử" />} />
            <Route path="/wallets/:id" element={<PlaceholderPage title="Chi tiết ví điện tử" />} />
            <Route path="/transactions" element={<PlaceholderPage title="Giao dịch" />} />
            <Route
              path="/transactions/:id"
              element={<PlaceholderPage title="Chi tiết giao dịch" />}
            />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RoleGuard allowedRoles={['ADMIN', 'MANAGER']} />}>
              <Route path="/audit-logs" element={<PlaceholderPage title="Nhật ký kiểm toán" />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
