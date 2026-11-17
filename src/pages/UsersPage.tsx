import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, Form, Input, Row, Select, Space, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type {
  ApiResponse,
  PageResponse,
  UserAdminResponse,
  UserRole,
  UserStatus,
} from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { DateTimeText } from '@/components/DateTimeText'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'
import { useTableParams } from '@/hooks/useTableParams'
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/lib/userOptions'

interface UserFilterFormValues {
  fullName?: string
  email?: string
  phone?: string
  status?: UserStatus
  role?: UserRole
}

export function UsersPage() {
  const [form] = Form.useForm<UserFilterFormValues>()
  const [appliedFilters, setAppliedFilters] = useState<UserFilterFormValues>({})
  const { params, setTableParams } = useTableParams({
    defaultPage: 0,
    defaultSize: 20,
  })

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'users', 'list', params.page, params.size, params.sort, appliedFilters],
    queryFn: async () => {
      const queryParams: Record<string, unknown> = {
        page: params.page,
        size: params.size,
      }
      if (params.sort) queryParams.sort = params.sort
      if (appliedFilters.fullName) queryParams.fullName = appliedFilters.fullName
      if (appliedFilters.email) queryParams.email = appliedFilters.email
      if (appliedFilters.phone) queryParams.phone = appliedFilters.phone
      if (appliedFilters.status) queryParams.status = appliedFilters.status
      if (appliedFilters.role) queryParams.role = appliedFilters.role

      const response = await apiClient.get<ApiResponse<PageResponse<UserAdminResponse>>>(
        '/admin/users',
        { params: queryParams },
      )
      return unwrapResponse(response)
    },
  })

  const handleFilterSubmit = (values: UserFilterFormValues) => {
    const cleaned: UserFilterFormValues = {
      fullName: values.fullName?.trim() || undefined,
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      status: values.status || undefined,
      role: values.role || undefined,
    }
    setAppliedFilters(cleaned)
    setTableParams({ page: 0 })
  }

  const handleReset = () => {
    form.resetFields()
    setAppliedFilters({})
    setTableParams({ page: 0 })
  }

  const columns: ColumnsType<UserAdminResponse> = [
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      sorter: true,
      render: (value: string | undefined, record) =>
        record.uid ? <Link to={`/users/${record.uid}`}>{value || record.uid}</Link> : value || '—',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (value: string | undefined) => value || '—',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (value: string | undefined) => value || '—',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (value: string | undefined) =>
        value ? <StatusTag kind="userRole" value={value} /> : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: string | undefined) =>
        value ? <StatusTag kind="userStatus" value={value} /> : '—',
    },
    {
      title: 'Số ví',
      dataIndex: 'totalWallets',
      key: 'totalWallets',
      align: 'right',
      render: (value: number | undefined) => value ?? 0,
    },
    {
      title: 'Tổng số dư',
      dataIndex: 'totalBalance',
      key: 'totalBalance',
      align: 'right',
      render: (value: number | undefined) => <MoneyText amount={value} />,
    },
    {
      title: 'Đăng nhập gần nhất',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      sorter: true,
      render: (value: string | undefined) => <DateTimeText value={value} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (record.uid ? <Link to={`/users/${record.uid}`}>Chi tiết</Link> : '—'),
    },
  ]

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Quản lý người dùng
      </Typography.Title>

      <ProCard bordered>
        <Form form={form} layout="vertical" onFinish={handleFilterSubmit}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Form.Item name="fullName" label="Họ và tên" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập họ tên" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Form.Item name="email" label="Email" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập email" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="phone" label="Số điện thoại" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập SĐT" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Form.Item name="status" label="Trạng thái" style={{ marginBottom: 8 }}>
                <Select placeholder="Tất cả trạng thái" allowClear options={USER_STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Form.Item name="role" label="Vai trò" style={{ marginBottom: 8 }}>
                <Select placeholder="Tất cả vai trò" allowClear options={USER_ROLE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end" style={{ marginTop: 8 }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Đặt lại
              </Button>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                Tìm kiếm
              </Button>
            </Space>
          </Row>
        </Form>
      </ProCard>

      {isError && (
        <Alert
          type="error"
          showIcon
          title="Không thể tải danh sách người dùng"
          description={normalizeError(error).message}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      <ProCard bordered>
        <DataTable<UserAdminResponse>
          rowKey="uid"
          columns={columns}
          data={data}
          loading={isLoading || isFetching}
        />
      </ProCard>
    </Space>
  )
}
