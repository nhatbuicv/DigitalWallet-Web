import { SwapOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, Row, Space, Statistic, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type {
  ApiResponse,
  PageResponse,
  TransactionAdminResponse,
  UserAdminResponse,
  WalletAdminResponse,
} from '@/api/types'
import { DateTimeText } from '@/components/DateTimeText'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'

function formatWalletParty(walletNumber?: string, ownerName?: string): string {
  if (!walletNumber && !ownerName) return '—'
  if (walletNumber && ownerName) return `${walletNumber} (${ownerName})`
  return walletNumber || ownerName || '—'
}

export function DashboardPage() {
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'count'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PageResponse<UserAdminResponse>>>(
        '/admin/users',
        { params: { page: 0, size: 1 } },
      )
      return unwrapResponse(response)
    },
  })

  const walletsQuery = useQuery({
    queryKey: ['admin', 'wallets', 'count'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PageResponse<WalletAdminResponse>>>(
        '/admin/wallets',
        { params: { page: 0, size: 1 } },
      )
      return unwrapResponse(response)
    },
  })

  const transactionsQuery = useQuery({
    queryKey: ['admin', 'transactions', 'recent'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PageResponse<TransactionAdminResponse>>>(
        '/admin/transactions',
        { params: { page: 0, size: 5, sort: 'createdAt,desc' } },
      )
      return unwrapResponse(response)
    },
  })

  const firstError = usersQuery.error ?? walletsQuery.error ?? transactionsQuery.error

  const handleRetry = () => {
    void usersQuery.refetch()
    void walletsQuery.refetch()
    void transactionsQuery.refetch()
  }

  const columns: ColumnsType<TransactionAdminResponse> = [
    {
      title: 'Mã tham chiếu',
      dataIndex: 'referenceCode',
      key: 'referenceCode',
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
      render: (value: number | undefined, record) => (
        <MoneyText amount={value} currency={record.currency} />
      ),
    },
    {
      title: 'Ví nguồn',
      key: 'fromWallet',
      render: (_, record) => formatWalletParty(record.fromWalletNumber, record.fromOwnerName),
    },
    {
      title: 'Ví đích',
      key: 'toWallet',
      render: (_, record) => formatWalletParty(record.toWalletNumber, record.toOwnerName),
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
      render: (value: string | undefined) => <DateTimeText value={value} />,
    },
  ]

  const recentTransactions = transactionsQuery.data?.data ?? []

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Tổng quan hệ thống
      </Typography.Title>

      {firstError && (
        <Alert
          type="error"
          showIcon
          title="Không thể tải dữ liệu tổng quan"
          description={normalizeError(firstError).message}
          action={
            <Button size="small" onClick={handleRetry}>
              Thử lại
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <ProCard bordered loading={usersQuery.isLoading}>
            <Statistic
              title="Tổng người dùng"
              value={usersQuery.data?.totalElements ?? 0}
              prefix={<TeamOutlined />}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard bordered loading={walletsQuery.isLoading}>
            <Statistic
              title="Tổng ví điện tử"
              value={walletsQuery.data?.totalElements ?? 0}
              prefix={<WalletOutlined />}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard bordered loading={transactionsQuery.isLoading}>
            <Statistic
              title="Tổng giao dịch"
              value={transactionsQuery.data?.totalElements ?? 0}
              prefix={<SwapOutlined />}
            />
          </ProCard>
        </Col>
      </Row>

      <ProCard
        title="Giao dịch gần đây"
        bordered
        extra={<Link to="/transactions">Xem tất cả</Link>}
      >
        <Table<TransactionAdminResponse>
          rowKey={(record) => record.id ?? record.referenceCode ?? ''}
          columns={columns}
          dataSource={recentTransactions}
          loading={transactionsQuery.isLoading}
          pagination={false}
          scroll={{ x: 800 }}
        />
      </ProCard>
    </Space>
  )
}
