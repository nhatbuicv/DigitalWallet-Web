import { KeyOutlined, LockOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Result, Typography } from 'antd'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type { ApiResponse, ResetPasswordRequest } from '@/api/types'

interface ResetPasswordFormValues {
  token: string
  newPassword: string
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const initialToken = searchParams.get('token') ?? ''

  const [form] = Form.useForm<ResetPasswordFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)

    const payload: ResetPasswordRequest = {
      token: values.token.trim(),
      newPassword: values.newPassword,
    }

    try {
      const response = await apiClient.post<ApiResponse<unknown>>('/auth/reset-password', payload)
      unwrapResponse(response)
      setSucceeded(true)
    } catch (error) {
      const appError = normalizeError(error)
      setErrorMessage(appError.message)

      if (appError.fieldErrors) {
        const fields = Object.entries(appError.fieldErrors)
          .filter(([name]) => name === 'token' || name === 'newPassword')
          .map(([name, message]) => ({
            name: name as keyof ResetPasswordFormValues,
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
        {succeeded ? (
          <Result
            status="success"
            title="Đặt lại mật khẩu thành công"
            subTitle="Bạn có thể sử dụng mật khẩu mới để đăng nhập vào hệ thống."
            extra={
              <Link to="/login">
                <Button type="primary">Đăng nhập ngay</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Typography.Title level={3} style={{ marginBottom: 4 }}>
                Đặt lại mật khẩu
              </Typography.Title>
              <Typography.Text type="secondary">
                Nhập mã xác thực và mật khẩu mới cho tài khoản của bạn
              </Typography.Text>
            </div>

            {errorMessage && (
              <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
            )}

            <Form<ResetPasswordFormValues>
              form={form}
              layout="vertical"
              initialValues={{ token: initialToken, newPassword: '' }}
              onFinish={(values) => {
                void handleSubmit(values)
              }}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                name="token"
                label="Mã đặt lại mật khẩu (Token)"
                rules={[{ required: true, message: 'Vui lòng nhập mã đặt lại mật khẩu' }]}
              >
                <Input prefix={<KeyOutlined />} placeholder="Nhập mã token" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 8, message: 'Mật khẩu mới phải có ít nhất 8 ký tự' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 12, marginTop: 8 }}>
                <Button type="primary" htmlType="submit" block loading={submitting}>
                  Đặt lại mật khẩu
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
