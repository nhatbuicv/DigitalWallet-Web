import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { decodeJwt } from '@/lib/jwt'
import { useAuthStore } from '@/stores/authStore'

export function ForbiddenPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const clearSession = useAuthStore((s) => s.clearSession)

  const role = user?.role ?? decodeJwt(accessToken)?.role
  const isEndUser = role === 'USER'

  const handleAction = () => {
    if (isEndUser) {
      clearSession()
      navigate('/login', { replace: true })
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập trang này."
        extra={
          <Button type="primary" onClick={handleAction}>
            {isEndUser ? 'Đăng xuất' : 'Về trang tổng quan'}
          </Button>
        }
      />
    </div>
  )
}
