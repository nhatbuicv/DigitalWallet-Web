import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, Form, Input, Row, Select, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type {
  ApiResponse,
  PageResponse,
  WalletAdminResponse,
  WalletStatus,
  WalletType,
} from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { DateTimeText } from '@/components/DateTimeText'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'
import { useTableParams } from '@/hooks/useTableParams'
import { WALLET_STATUS_OPTIONS, WALLET_TYPE_OPTIONS } from '@/lib/walletOptions'

interface WalletFilterFormValues {
  walletNumber?: string
  userName?: string
  userPhone?: string
  userEmail?: string
  status?: WalletStatus
  walletType?: WalletType
}

export function WalletsPage() {
  const [form] = Form.useForm<WalletFilterFormValues>()
  const [appliedFilters, setAppliedFilters] = useState<WalletFilterFormValues>({})
  const { params, setTableParams } = useTableParams({
    defaultPage: 0,
    defaultSize: 20,
  })

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'wallets', 'list', params.page, params.size, params.sort, appliedFilters],
    queryFn: async () => {
      const queryParams: Record<string, unknown> = {
        page: params.page,
        size: params.size,
      }
      if (params.sort) queryParams.sort = params.sort
      if (appliedFilters.walletNumber) queryParams.walletNumber = appliedFilters.walletNumber
      if (appliedFilters.userName) queryParams.userName = appliedFilters.userName
      if (appliedFilters.userPhone) queryParams.userPhone = appliedFilters.userPhone
      if (appliedFilters.userEmail) queryParams.userEmail = appliedFilters.userEmail
      if (appliedFilters.status) queryParams.status = appliedFilters.status
      if (appliedFilters.walletType) queryParams.walletType = appliedFilters.walletType

      const response = await apiClient.get<ApiResponse<PageResponse<WalletAdminResponse>>>(
        '/admin/wallets',
        { params: queryParams },
      )
      return unwrapResponse(response)
    },
  })

  const handleFilterSubmit = (values: WalletFilterFormValues) => {
    const cleaned: WalletFilterFormValues = {
      walletNumber: values.walletNumber?.trim() || undefined,
      userName: values.userName?.trim() || undefined,
      userPhone: values.userPhone?.trim() || undefined,
      userEmail: values.userEmail?.trim() || undefined,
      status: values.status || undefined,
      walletType: values.walletType || undefined,
    }
    setAppliedFilters(cleaned)
    setTableParams({ page: 0 })
  }

  const handleReset = () => {
    form.resetFields()
    setAppliedFilters({})
    setTableParams({ page: 0 })
  }

  const columns: ColumnsType<WalletAdminResponse> = [
    {
      title: 'Số ví',
      dataIndex: 'walletNumber',
      key: 'walletNumber',
      sorter: true,
      render: (value: string | undefined, record) =>
        record.uid ? (
          <Link to={`/wallets/${record.uid}`}>{value || record.uid}</Link>
        ) : (
          value || '—'
        ),
    },
    {
      title: 'Tên ví',
      dataIndex: 'walletName',
      key: 'walletName',
      render: (value: string | undefined) => value || '—',
    },
    {
      title: 'Loại ví',
      dataIndex: 'walletType',
      key: 'walletType',
      render: (value: string | undefined) => (value ? <Tag>{value}</Tag> : '—'),
    },
    {
      title: 'Chủ ví',
      dataIndex: 'userFullName',
      key: 'userFullName',
      render: (value: string | undefined, record) =>
        record.userUid ? (
          <Link to={`/users/${record.userUid}`}>{value || record.userUid}</Link>
        ) : (
          value || '—'
        ),
    },
    {
      title: 'SĐT chủ ví',
      dataIndex: 'userPhone',
      key: 'userPhone',
      render: (value: string | undefined) => value || '—',
    },
    {
      title: 'Số dư',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      sorter: true,
      render: (value: number | undefined, record) => (
        <MoneyText amount={value} currency={record.currency} />
      ),
    },
    {
      title: 'Số dư khả dụng',
      dataIndex: 'availableBalance',
      key: 'availableBalance',
      align: 'right',
      render: (value: number | undefined, record) => (
        <MoneyText amount={value} currency={record.currency} />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: string | undefined) =>
        value ? <StatusTag kind="walletStatus" value={value} /> : '—',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (value: string | undefined) => <DateTimeText value={value} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, record) =>
        record.uid ? <Link to={`/wallets/${record.uid}`}>Chi tiết</Link> : '—',
    },
  ]

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Quản lý ví điện tử
      </Typography.Title>

      <ProCard bordered>
        <Form form={form} layout="vertical" onFinish={handleFilterSubmit}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="walletNumber" label="Số ví" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập số ví" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="userName" label="Tên chủ ví" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập tên chủ ví" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="userPhone" label="SĐT chủ ví" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập SĐT" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="userEmail" label="Email chủ ví" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập email" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="status" label="Trạng thái" style={{ marginBottom: 8 }}>
                <Select
                  placeholder="Tất cả trạng thái"
                  allowClear
                  options={WALLET_STATUS_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="walletType" label="Loại ví" style={{ marginBottom: 8 }}>
                <Select placeholder="Tất cả loại ví" allowClear options={WALLET_TYPE_OPTIONS} />
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
          title="Không thể tải danh sách ví"
          description={normalizeError(error).message}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      <ProCard bordered>
        <DataTable<WalletAdminResponse>
          rowKey="uid"
          columns={columns}
          data={data}
          loading={isLoading || isFetching}
        />
      </ProCard>
    </Space>
  )
}
