import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type {
  ApiResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfileResponse,
  UserRole,
  UserStatus,
} from '@/api/types'
import { DateTimeText } from '@/components/DateTimeText'
import { StatusTag } from '@/components/StatusTag'
import provinces from '@/data/provinces.json'
import { useAuthStore } from '@/stores/authStore'

interface ProfileFormValues {
  fullName: string
  dateOfBirth: Dayjs | null
  address?: string
  provinceCode?: string
}

interface ChangePasswordFormValues {
  oldPassword: string
  password: string
  confirmPassword: string
}

const PROFILE_QUERY_KEY = ['users', 'me'] as const

export function ProfilePage() {
  const [profileForm] = Form.useForm<ProfileFormValues>()
  const [passwordForm] = Form.useForm<ChangePasswordFormValues>()
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [logoutAllError, setLogoutAllError] = useState<string | null>(null)

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)

  const provinceOptions = useMemo(
    () =>
      provinces.map((p) => ({
        value: p.code,
        label: p.name,
      })),
    [],
  )

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<UserProfileResponse>>('/users/me')
      return unwrapResponse(response)
    },
  })

  useEffect(() => {
    if (!profile) return
    profileForm.setFieldsValue({
      fullName: profile.fullName ?? '',
      dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth, 'YYYY-MM-DD') : null,
      address: profile.address ?? '',
      provinceCode: profile.provinceResponse?.code ?? undefined,
    })
  }, [profile, profileForm])

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const payload: UpdateProfileRequest = {
        fullName: values.fullName.trim(),
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
        address: values.address?.trim() || undefined,
        provinceCode: values.provinceCode || undefined,
      }
      const response = await apiClient.put<ApiResponse<UserProfileResponse>>('/users/me', payload)
      return unwrapResponse(response)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updated)
      if (accessToken && updated.fullName) {
        setSession({
          accessToken,
          user: {
            ...authUser,
            fullName: updated.fullName,
          },
        })
      }
      setProfileFeedback({ type: 'success', message: 'Cập nhật thông tin hồ sơ thành công.' })
    },
    onError: (err) => {
      const appError = normalizeError(err)
      setProfileFeedback({ type: 'error', message: appError.message })

      if (appError.fieldErrors) {
        const fields = Object.entries(appError.fieldErrors)
          .filter(([name]) => ['fullName', 'dateOfBirth', 'address', 'provinceCode'].includes(name))
          .map(([name, msg]) => ({
            name: name as keyof ProfileFormValues,
            errors: [msg],
          }))
        if (fields.length > 0) {
          profileForm.setFields(fields)
        }
      }
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (values: ChangePasswordFormValues) => {
      const payload: ChangePasswordRequest = {
        oldPassword: values.oldPassword,
        password: values.password,
        confirmPassword: values.confirmPassword,
      }
      const response = await apiClient.put<ApiResponse<unknown>>('/users/me/password', payload)
      return unwrapResponse(response)
    },
    onSuccess: () => {
      passwordForm.resetFields()
      setPasswordFeedback({ type: 'success', message: 'Đổi mật khẩu thành công.' })
    },
    onError: (err) => {
      const appError = normalizeError(err)
      setPasswordFeedback({ type: 'error', message: appError.message })

      if (appError.fieldErrors) {
        const fields = Object.entries(appError.fieldErrors)
          .filter(([name]) => ['oldPassword', 'password', 'confirmPassword'].includes(name))
          .map(([name, msg]) => ({
            name: name as keyof ChangePasswordFormValues,
            errors: [msg],
          }))
        if (fields.length > 0) {
          passwordForm.setFields(fields)
        }
      }
    },
  })

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<ApiResponse<unknown>>('/auth/logout-all')
      return unwrapResponse(response)
    },
    onSuccess: () => {
      clearSession()
      navigate('/login', { replace: true })
    },
    onError: (err) => {
      setLogoutAllError(normalizeError(err).message)
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không thể tải thông tin hồ sơ"
        description={normalizeError(error).message}
        action={
          <Button size="small" onClick={() => void refetch()}>
            Thử lại
          </Button>
        }
      />
    )
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Hồ sơ cá nhân
      </Typography.Title>

      <Card title="Thông tin tài khoản">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Mã khách hàng">{profile?.customerId || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile?.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{profile?.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">
            {profile?.role ? <StatusTag kind="userRole" value={profile.role as UserRole} /> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            {profile?.status ? (
              <StatusTag kind="userStatus" value={profile.status as UserStatus} />
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Đăng nhập gần nhất">
            <DateTimeText value={profile?.lastLogin} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Cập nhật thông tin cá nhân">
            {profileFeedback && (
              <Alert
                type={profileFeedback.type}
                showIcon
                title={profileFeedback.message}
                style={{ marginBottom: 16 }}
              />
            )}

            <Form<ProfileFormValues>
              form={profileForm}
              layout="vertical"
              onFinish={(values) => {
                setProfileFeedback(null)
                updateProfileMutation.mutate(values)
              }}
              requiredMark={false}
            >
              <Form.Item
                name="fullName"
                label="Họ và tên"
                rules={[
                  { required: true, message: 'Vui lòng nhập họ và tên' },
                  { max: 100, message: 'Họ và tên tối đa 100 ký tự' },
                ]}
              >
                <Input placeholder="Nguyễn Văn A" maxLength={100} />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="dateOfBirth" label="Ngày sinh">
                    <DatePicker
                      format="YYYY-MM-DD"
                      placeholder="YYYY-MM-DD"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="provinceCode" label="Tỉnh / Thành phố">
                    <Select
                      showSearch
                      allowClear
                      placeholder="Chọn tỉnh/thành phố"
                      optionFilterProp="label"
                      options={provinceOptions}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="address"
                label="Địa chỉ"
                rules={[{ max: 500, message: 'Địa chỉ tối đa 500 ký tự' }]}
              >
                <Input.TextArea rows={3} placeholder="Nhập địa chỉ" maxLength={500} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={updateProfileMutation.isPending}>
                  Lưu thay đổi
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Card title="Đổi mật khẩu">
              {passwordFeedback && (
                <Alert
                  type={passwordFeedback.type}
                  showIcon
                  title={passwordFeedback.message}
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form<ChangePasswordFormValues>
                form={passwordForm}
                layout="vertical"
                onFinish={(values) => {
                  setPasswordFeedback(null)
                  changePasswordMutation.mutate(values)
                }}
                requiredMark={false}
              >
                <Form.Item
                  name="oldPassword"
                  label="Mật khẩu hiện tại"
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
                >
                  <Input.Password
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Mật khẩu mới"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                    { min: 8, message: 'Mật khẩu mới phải có ít nhất 8 ký tự' },
                    { max: 100, message: 'Mật khẩu mới tối đa 100 ký tự' },
                  ]}
                >
                  <Input.Password placeholder="8–100 ký tự" autoComplete="new-password" />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Xác nhận mật khẩu mới"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve()
                        }
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changePasswordMutation.isPending}
                  >
                    Đổi mật khẩu
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="Phiên đăng nhập">
              {logoutAllError && (
                <Alert type="error" showIcon title={logoutAllError} style={{ marginBottom: 12 }} />
              )}
              <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Đăng xuất khỏi tất cả thiết bị đang đăng nhập vào tài khoản này.
              </Typography.Paragraph>
              <Button
                danger
                loading={logoutAllMutation.isPending}
                onClick={() => {
                  setLogoutAllError(null)
                  logoutAllMutation.mutate()
                }}
              >
                Đăng xuất khỏi tất cả thiết bị
              </Button>
            </Card>
          </Space>
        </Col>
      </Row>
    </Space>
  )
}
