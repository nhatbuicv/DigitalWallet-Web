import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/app/guards/ProtectedRoute'
import { RoleGuard } from '@/app/guards/RoleGuard'
import { AdminLayout } from '@/app/layout/AdminLayout'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { TransactionDetailPage } from '@/pages/TransactionDetailPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { UserDetailPage } from '@/pages/UserDetailPage'
import { UsersPage } from '@/pages/UsersPage'
import { WalletDetailPage } from '@/pages/WalletDetailPage'
import { WalletsPage } from '@/pages/WalletsPage'

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
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:uid" element={<UserDetailPage />} />
            <Route path="/wallets" element={<WalletsPage />} />
            <Route path="/wallets/:walletUid" element={<WalletDetailPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/:id" element={<TransactionDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RoleGuard allowedRoles={['ADMIN', 'MANAGER']} />}>
              <Route path="/audit-logs" element={<AuditLogsPage />} />
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
