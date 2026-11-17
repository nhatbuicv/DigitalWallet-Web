import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, DatePicker, Form, Input, Row, Select, Space, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type {
  ApiResponse,
  PageResponse,
  TransactionAdminResponse,
  TransactionStatus,
  TransactionType,
} from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { DateTimeText } from '@/components/DateTimeText'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'
import { useTableParams } from '@/hooks/useTableParams'
import { TRANSACTION_STATUS_OPTIONS, TRANSACTION_TYPE_OPTIONS } from '@/lib/transactionOptions'

interface TransactionFilterFormValues {
  reference?: string
  status?: TransactionStatus
  type?: TransactionType
  dateRange?: [Dayjs | null, Dayjs | null] | null
}

interface AppliedTransactionFilters {
  reference?: string
  status?: TransactionStatus
  type?: TransactionType
  fromDate?: string
  toDate?: string
}

function renderWalletParty(walletId?: string, walletNumber?: string, ownerName?: string) {
  if (!walletNumber && !ownerName && !walletId) {
    return '—'
  }
  const label = walletNumber || walletId || ''
  return (
    <Space size={4} wrap>
      {walletId ? <Link to={`/wallets/${walletId}`}>{label}</Link> : <span>{label}</span>}
      {ownerName && <Typography.Text type="secondary">({ownerName})</Typography.Text>}
    </Space>
  )
}

export function TransactionsPage() {
  const [form] = Form.useForm<TransactionFilterFormValues>()
  const [appliedFilters, setAppliedFilters] = useState<AppliedTransactionFilters>({})
  const { params, setTableParams } = useTableParams({
    defaultPage: 0,
    defaultSize: 20,
    defaultSort: 'createdAt,desc',
  })

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      'admin',
      'transactions',
      'list',
      params.page,
      params.size,
      params.sort,
      appliedFilters,
    ],
    queryFn: async () => {
      const queryParams: Record<string, unknown> = {
        page: params.page,
        size: params.size,
      }
      if (params.sort) queryParams.sort = params.sort
      if (appliedFilters.reference) queryParams.reference = appliedFilters.reference
      if (appliedFilters.status) queryParams.status = appliedFilters.status
      if (appliedFilters.type) queryParams.type = appliedFilters.type
      if (appliedFilters.fromDate) queryParams.fromDate = appliedFilters.fromDate
      if (appliedFilters.toDate) queryParams.toDate = appliedFilters.toDate

      const response = await apiClient.get<ApiResponse<PageResponse<TransactionAdminResponse>>>(
        '/admin/transactions',
        { params: queryParams },
      )
      return unwrapResponse(response)
    },
  })

  const handleFilterSubmit = (values: TransactionFilterFormValues) => {
    const [from, to] = values.dateRange ?? []
    const cleaned: AppliedTransactionFilters = {
      reference: values.reference?.trim() || undefined,
      status: values.status || undefined,
      type: values.type || undefined,
      fromDate: from ? from.startOf('day').toISOString() : undefined,
      toDate: to ? to.endOf('day').toISOString() : undefined,
    }
    setAppliedFilters(cleaned)
    setTableParams({ page: 0 })
  }

  const handleReset = () => {
    form.resetFields()
    setAppliedFilters({})
    setTableParams({ page: 0, sort: 'createdAt,desc' })
  }

  const columns: ColumnsType<TransactionAdminResponse> = [
    {
      title: 'Mã tham chiếu',
      dataIndex: 'referenceCode',
      key: 'referenceCode',
      sorter: true,
      render: (value: string | undefined, record) =>
        record.id ? (
          <Link to={`/transactions/${record.id}`}>{value || record.id}</Link>
        ) : (
          value || '—'
        ),
    },
    {
      title: 'Loại giao dịch',
      dataIndex: 'type',
      key: 'type',
      render: (value: TransactionAdminResponse['type']) =>
        value ? <StatusTag kind="transactionType" value={value} /> : '—',
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      sorter: true,
      render: (value: number | undefined, record) => (
        <MoneyText amount={value} currency={record.currency} />
      ),
    },
    {
      title: 'Ví gửi',
      key: 'fromWallet',
      render: (_, record) =>
        renderWalletParty(record.fromWalletId, record.fromWalletNumber, record.fromOwnerName),
    },
    {
      title: 'Ví nhận',
      key: 'toWallet',
      render: (_, record) =>
        renderWalletParty(record.toWalletId, record.toWalletNumber, record.toOwnerName),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: TransactionAdminResponse['status']) =>
        value ? <StatusTag kind="transactionStatus" value={value} /> : '—',
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      defaultSortOrder: 'descend',
      render: (value: string | undefined) => <DateTimeText value={value} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, record) =>
        record.id ? <Link to={`/transactions/${record.id}`}>Chi tiết</Link> : '—',
    },
  ]

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Giám sát giao dịch
      </Typography.Title>

      <ProCard bordered>
        <Form form={form} layout="vertical" onFinish={handleFilterSubmit}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="reference" label="Mã tham chiếu" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập mã tham chiếu" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="status" label="Trạng thái" style={{ marginBottom: 8 }}>
                <Select
                  placeholder="Tất cả trạng thái"
                  allowClear
                  options={TRANSACTION_STATUS_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="type" label="Loại giao dịch" style={{ marginBottom: 8 }}>
                <Select
                  placeholder="Tất cả loại giao dịch"
                  allowClear
                  options={TRANSACTION_TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="dateRange" label="Khoảng thời gian" style={{ marginBottom: 8 }}>
                <DatePicker.RangePicker
                  format="DD/MM/YYYY"
                  placeholder={['Từ ngày', 'Đến ngày']}
                  style={{ width: '100%' }}
                />
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
          title="Không thể tải danh sách giao dịch"
          description={normalizeError(error).message}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      <ProCard bordered>
        <DataTable<TransactionAdminResponse>
          rowKey="id"
          columns={columns}
          data={data}
          loading={isLoading || isFetching}
        />
      </ProCard>
    </Space>
  )
}
