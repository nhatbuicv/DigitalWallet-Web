import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { AppError, normalizeError } from '@/api/errorHandler'
import type { ApiResponse, PasswordLoginRequest, UserLoginResponse } from '@/api/types'
import { useAuthStore } from '@/stores/authStore'
import { getDeviceId, getDeviceName } from '@/utils/device'

interface LoginFormValues {
  identifier: string
  password: string
}

const LOGIN_ERROR_MESSAGES: Record<number, string> = {
  1003: 'Email hoặc mật khẩu không chính xác.',
  1011: 'Tài khoản của bạn không được phép đăng nhập vào Web Admin.',
  1050: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  1052: 'Tài khoản chưa được kích hoạt hoặc đã ngừng hoạt động.',
  9003: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.',
}

function getLoginErrorMessage(error: AppError): string {
  if (error.code === 9003 && error.retryAfter && error.retryAfter > 0) {
    return `Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ${error.retryAfter} giây.`
  }
  if (error.code !== undefined && error.code in LOGIN_ERROR_MESSAGES) {
    return LOGIN_ERROR_MESSAGES[error.code]
  }
  return error.message
}

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const setSession = useAuthStore((s) => s.setSession)

  if (accessToken || refreshToken) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (values: LoginFormValues) => {
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)

    const payload: PasswordLoginRequest = {
      identifier: values.identifier.trim(),
      password: values.password,
      clientType: 'WEB_ADMIN',
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    }

    try {
      const response = await apiClient.post<ApiResponse<UserLoginResponse>>('/auth/login', payload)
      const data = unwrapResponse(response)

      if (!data?.accessToken) {
        throw new AppError({
          kind: 'unknown',
          message: 'Phản hồi đăng nhập không hợp lệ.',
        })
      }

      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        user: {
          customerId: data.customerId,
          fullName: data.fullName,
          phone: data.phone,
        },
      })

      navigate('/dashboard', { replace: true })
    } catch (error) {
      const appError = normalizeError(error)
      setErrorMessage(getLoginErrorMessage(appError))

      if (appError.fieldErrors) {
        const fields = Object.entries(appError.fieldErrors)
          .filter(([name]) => name === 'identifier' || name === 'password')
          .map(([name, message]) => ({
            name: name as keyof LoginFormValues,
            errors: [message],
          }))
        if (fields.length > 0) {
          form.setFields(fields)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Đăng nhập Quản trị
          </Typography.Title>
          <Typography.Text type="secondary">Hệ thống quản trị Digital Wallet</Typography.Text>
        </div>

        {errorMessage && (
          <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
        )}

        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => {
            void handleSubmit(values)
          }}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="identifier"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không đúng định dạng' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@example.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Đăng nhập
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}
