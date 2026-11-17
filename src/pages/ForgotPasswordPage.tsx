import { MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Result, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type { ApiResponse, ForgotPasswordRequest } from '@/api/types'

interface ForgotPasswordFormValues {
  email: string
}

export function ForgotPasswordPage() {
  const [form] = Form.useForm<ForgotPasswordFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)

    const email = values.email.trim()
    const payload: ForgotPasswordRequest = { email }

    try {
      const response = await apiClient.post<ApiResponse<unknown>>('/auth/forgot-password', payload)
      unwrapResponse(response)
      setSubmittedEmail(email)
    } catch (error) {
      const appError = normalizeError(error)
      if (appError.code === 9003 && appError.retryAfter && appError.retryAfter > 0) {
        setErrorMessage(`Bạn thao tác quá nhanh. Vui lòng thử lại sau ${appError.retryAfter} giây.`)
      } else {
        setErrorMessage(appError.message)
      }

      if (appError.fieldErrors?.email) {
        form.setFields([{ name: 'email', errors: [appError.fieldErrors.email] }])
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
        {submittedEmail ? (
          <Result
            status="success"
            title="Đã gửi yêu cầu"
            subTitle={`Nếu email ${submittedEmail} tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.`}
            extra={[
              <Link key="reset" to="/reset-password">
                <Button type="primary">Nhập mã đặt lại mật khẩu</Button>
              </Link>,
              <Link key="login" to="/login">
                <Button>Quay lại đăng nhập</Button>
              </Link>,
            ]}
          />
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Typography.Title level={3} style={{ marginBottom: 4 }}>
                Quên mật khẩu
              </Typography.Title>
              <Typography.Text type="secondary">
                Nhập email tài khoản quản trị để nhận hướng dẫn đặt lại mật khẩu
              </Typography.Text>
            </div>

            {errorMessage && (
              <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
            )}

            <Form<ForgotPasswordFormValues>
              form={form}
              layout="vertical"
              onFinish={(values) => {
                void handleSubmit(values)
              }}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không đúng định dạng' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 12, marginTop: 8 }}>
                <Button type="primary" htmlType="submit" block loading={submitting}>
                  Gửi yêu cầu đặt lại mật khẩu
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <Link to="/login">Quay lại đăng nhập</Link>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  )
}
