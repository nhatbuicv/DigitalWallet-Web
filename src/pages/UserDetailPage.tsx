import {
  ArrowLeftOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Col,
  Descriptions,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type { ApiResponse, UserAdminResponse, UserRole, UserStatus } from '@/api/types'
import { DateTimeText } from '@/components/DateTimeText'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'
import { decodeJwt } from '@/lib/jwt'
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/lib/userOptions'
import { useAuthStore } from '@/stores/authStore'

export function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const authUser = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const currentRole = authUser?.role ?? decodeJwt(accessToken)?.role

  const canChangeStatus = currentRole === 'ADMIN' || currentRole === 'MANAGER'
  const canChangeRole = currentRole === 'ADMIN'

  const [selectedStatus, setSelectedStatus] = useState<UserStatus | undefined>(undefined)
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(undefined)
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'users', 'detail', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<UserAdminResponse>>(`/admin/users/${uid}`)
      return unwrapResponse(response)
    },
  })

  const effectiveStatus = selectedStatus ?? (user?.status as UserStatus | undefined)
  const effectiveRole = selectedRole ?? (user?.role as UserRole | undefined)

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: UserStatus) => {
      const response = await apiClient.patch<ApiResponse<void>>(
        `/admin/users/${uid}/status`,
        null,
        { params: { status: nextStatus } },
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      setSelectedStatus(undefined)
      setActionFeedback({
        type: 'success',
        message: 'Cập nhật trạng thái người dùng thành công.',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err) => {
      setActionFeedback({
        type: 'error',
        message: normalizeError(err).message,
      })
    },
  })

  const roleMutation = useMutation({
    mutationFn: async (nextRole: UserRole) => {
      const response = await apiClient.patch<ApiResponse<void>>(`/admin/users/${uid}/role`, null, {
        params: { role: nextRole },
      })
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      setSelectedRole(undefined)
      setActionFeedback({
        type: 'success',
        message: 'Cập nhật vai trò người dùng thành công.',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err) => {
      setActionFeedback({
        type: 'error',
        message: normalizeError(err).message,
      })
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>
          Quay lại danh sách
        </Button>
        <Alert
          type="error"
          showIcon
          title="Không thể tải thông tin người dùng"
          description={error ? normalizeError(error).message : 'Không tìm thấy người dùng.'}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Space wrap align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>
              Quay lại
            </Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {user.fullName || user.uid}
            </Typography.Title>
            {user.role && <StatusTag kind="userRole" value={user.role} />}
            {user.status && <StatusTag kind="userStatus" value={user.status} />}
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <ProCard bordered>
            <Statistic
              title="Tổng số ví"
              value={user.totalWallets ?? 0}
              prefix={<WalletOutlined />}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard bordered>
            <Statistic
              title="Tổng số dư"
              valueRender={() => (
                <MoneyText amount={user.totalBalance} style={{ fontSize: 24, fontWeight: 600 }} />
              )}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard bordered>
            <Statistic
              title="Số lần đăng nhập sai"
              value={user.failedLoginAttempts ?? 0}
              prefix={<LockOutlined />}
            />
          </ProCard>
        </Col>
      </Row>

      <ProCard title="Thông tin cơ bản & KYC" bordered>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="UID">{user.uid || '—'}</Descriptions.Item>
          <Descriptions.Item label="Họ và tên">{user.fullName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{user.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Xác thực SĐT">
            {user.phoneVerified === undefined ? (
              '—'
            ) : (
              <Tag color={user.phoneVerified ? 'success' : 'default'}>
                {user.phoneVerified ? 'Đã xác thực' : 'Chưa xác thực'}
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="CCCD / CMND (KYC)">{user.citizenId || '—'}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">
            <DateTimeText value={user.dateOfBirth} format="DD/MM/YYYY" />
          </Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{user.address || '—'}</Descriptions.Item>
        </Descriptions>
      </ProCard>

      <ProCard title="Bảo mật & Hoạt động" bordered>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Trạng thái khóa ví">
            {user.walletNonLocked === undefined ? (
              '—'
            ) : (
              <Tag color={user.walletNonLocked ? 'success' : 'error'}>
                {user.walletNonLocked ? 'Không bị khóa' : 'Đang bị khóa'}
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Số lần đăng nhập sai">
            {user.failedLoginAttempts ?? 0}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian khóa (lockTime)">
            <DateTimeText value={user.lockTime} />
          </Descriptions.Item>
          <Descriptions.Item label="Đăng nhập gần nhất (lastLogin)">
            <DateTimeText value={user.lastLogin} />
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            <DateTimeText value={user.createdAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật lần cuối">
            <DateTimeText value={user.updatedAt} />
          </Descriptions.Item>
        </Descriptions>
      </ProCard>

      {(canChangeStatus || canChangeRole) && (
        <ProCard
          title={
            <Space>
              <SafetyCertificateOutlined />
              <span>Quản trị trạng thái & phân quyền</span>
            </Space>
          }
          bordered
        >
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {actionFeedback && (
              <Alert
                type={actionFeedback.type}
                showIcon
                closable
                title={actionFeedback.message}
                onClose={() => setActionFeedback(null)}
              />
            )}

            <Row gutter={[24, 16]}>
              {canChangeStatus && (
                <Col xs={24} md={12}>
                  <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                    <Typography.Text strong>Đổi trạng thái tài khoản</Typography.Text>
                    <Space wrap>
                      <Select<UserStatus>
                        aria-label="Chọn trạng thái"
                        style={{ minWidth: 220 }}
                        value={effectiveStatus}
                        onChange={(value) => setSelectedStatus(value)}
                        options={USER_STATUS_OPTIONS}
                      />
                      <Button
                        type="primary"
                        loading={statusMutation.isPending}
                        disabled={!effectiveStatus || effectiveStatus === user.status}
                        onClick={() => {
                          if (effectiveStatus) {
                            setActionFeedback(null)
                            statusMutation.mutate(effectiveStatus)
                          }
                        }}
                      >
                        Cập nhật trạng thái
                      </Button>
                    </Space>
                  </Space>
                </Col>
              )}

              {canChangeRole && (
                <Col xs={24} md={12}>
                  <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                    <Typography.Text strong>Đổi vai trò tài khoản</Typography.Text>
                    <Space wrap>
                      <Select<UserRole>
                        aria-label="Chọn vai trò"
                        style={{ minWidth: 220 }}
                        value={effectiveRole}
                        onChange={(value) => setSelectedRole(value)}
                        options={USER_ROLE_OPTIONS}
                      />
                      <Button
                        type="primary"
                        loading={roleMutation.isPending}
                        disabled={!effectiveRole || effectiveRole === user.role}
                        onClick={() => {
                          if (effectiveRole) {
                            setActionFeedback(null)
                            roleMutation.mutate(effectiveRole)
                          }
                        }}
                      >
                        Cập nhật vai trò
                      </Button>
                    </Space>
                  </Space>
                </Col>
              )}
            </Row>
          </Space>
        </ProCard>
      )}
    </Space>
  )
}
