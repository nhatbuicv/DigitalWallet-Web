import {
  AuditOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Avatar, Breadcrumb, Button, Dropdown, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import type { RefreshTokenRequest, UserRole } from '@/api/types'
import { StatusTag } from '@/components/StatusTag'
import { decodeJwt } from '@/lib/jwt'
import { useAuthStore } from '@/stores/authStore'

const { Header, Sider, Content } = Layout

interface NavItem {
  key: string
  label: string
  icon: ReactNode
  roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { key: '/', label: 'Tổng quan', icon: <DashboardOutlined /> },
  { key: '/users', label: 'Người dùng', icon: <TeamOutlined /> },
  { key: '/wallets', label: 'Ví điện tử', icon: <WalletOutlined /> },
  { key: '/transactions', label: 'Giao dịch', icon: <SwapOutlined /> },
  {
    key: '/audit-logs',
    label: 'Nhật ký kiểm toán',
    icon: <AuditOutlined />,
    roles: ['ADMIN', 'MANAGER'],
  },
]

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Tổng quan',
  users: 'Người dùng',
  wallets: 'Ví điện tử',
  transactions: 'Giao dịch',
  'audit-logs': 'Nhật ký kiểm toán',
  profile: 'Hồ sơ cá nhân',
}

function getSelectedMenuKey(pathname: string): string {
  if (pathname === '/' || pathname === '/dashboard') return '/'
  const match = NAV_ITEMS.find((item) => item.key !== '/' && pathname.startsWith(item.key))
  return match?.key ?? '/'
}

export interface AdminLayoutProps {
  children?: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearSession = useAuthStore((s) => s.clearSession)

  const currentRole = user?.role ?? decodeJwt(accessToken)?.role
  const selectedKey = getSelectedMenuKey(location.pathname)

  const visibleNavItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) =>
        item.roles ? Boolean(currentRole && item.roles.includes(currentRole)) : true,
      ),
    [currentRole],
  )

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', {
          refreshToken,
        } satisfies RefreshTokenRequest)
      }
    } catch {
      // Still clear local session even if the server logout request fails
    } finally {
      clearSession()
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }

  const breadcrumbItems = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    const items: { title: ReactNode }[] = [
      {
        title: segments.length === 0 ? 'Tổng quan' : <Link to="/">Tổng quan</Link>,
      },
    ]

    let accPath = ''
    segments.forEach((segment, index) => {
      accPath += `/${segment}`
      const isLast = index === segments.length - 1
      const label = ROUTE_LABELS[segment] ?? (index > 0 ? 'Chi tiết' : segment)
      items.push({
        title: isLast ? label : <Link to={accPath}>{label}</Link>,
      })
    })

    return items
  }, [location.pathname])

  const accountMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin tài khoản',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      disabled: loggingOut,
      onClick: () => {
        void handleLogout()
      },
    },
  ]

  const displayName = user?.fullName || user?.phone || 'Quản trị viên'
  const displayRole = user?.role || 'ADMIN'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        collapsedWidth={68}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0 8px' : '0 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.3,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? 'WLS' : 'Wallet Ledger Service'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleNavItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => navigate(item.key),
          }))}
          style={{ borderInlineEnd: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{
            height: 56,
            lineHeight: '56px',
            padding: '0 20px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Space size={12} align="center" style={{ minWidth: 0 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              style={{ width: 36, height: 36 }}
            />
            <Breadcrumb items={breadcrumbItems} />
          </Space>

          <Space size={10} align="center" style={{ flexShrink: 0 }}>
            <StatusTag kind="userRole" value={displayRole} style={{ marginInlineEnd: 0 }} />
            <Dropdown
              menu={{ items: accountMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Space
                size={8}
                style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
                className="admin-user-trigger"
              >
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1677ff' }}
                />
                <Typography.Text strong style={{ maxWidth: 160 }} ellipsis>
                  {displayName}
                </Typography.Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 20, background: '#f5f5f5', minWidth: 0 }}>
          {children ?? <Outlet />}
        </Content>
      </Layout>
    </Layout>
  )
}
