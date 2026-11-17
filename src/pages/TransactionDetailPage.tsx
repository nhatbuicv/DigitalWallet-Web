import { ArrowLeftOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Col, Descriptions, Row, Space, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type {
  ApiResponse,
  LedgerEntryAdminResponse,
  TransactionAdminDetailResponse,
} from '@/api/types'
import { DateTimeText } from '@/components/DateTimeText'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'

function renderWalletPartyDetail(walletId?: string, walletNumber?: string, ownerName?: string) {
  if (!walletId && !walletNumber && !ownerName) {
    return '—'
  }
  const label = walletNumber || walletId || ''
  return (
    <Space size={6} wrap>
      {walletId ? <Link to={`/wallets/${walletId}`}>{label}</Link> : <span>{label}</span>}
      {ownerName && <Typography.Text type="secondary">({ownerName})</Typography.Text>}
    </Space>
  )
}

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    data: transaction,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'transactions', 'detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TransactionAdminDetailResponse>>(
        `/admin/transactions/${id}`,
      )
      return unwrapResponse(response)
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isError || !transaction) {
    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/transactions')}>
          Quay lại danh sách
        </Button>
        <Alert
          type="error"
          showIcon
          title="Không thể tải thông tin giao dịch"
          description={error ? normalizeError(error).message : 'Không tìm thấy giao dịch.'}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      </Space>
    )
  }

  const ledgerColumns: ColumnsType<LedgerEntryAdminResponse> = [
    {
      title: 'Số ví',
      dataIndex: 'walletNumber',
      key: 'walletNumber',
      render: (value: string | undefined, record) =>
        record.walletId ? (
          <Link to={`/wallets/${record.walletId}`}>{value || record.walletId}</Link>
        ) : (
          value || '—'
        ),
    },
    {
      title: 'Loại bút toán',
      dataIndex: 'entryType',
      key: 'entryType',
      render: (value: LedgerEntryAdminResponse['entryType']) =>
        value ? <StatusTag kind="entryType" value={value} /> : '—',
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (value: number | undefined, record) => (
        <MoneyText amount={value} currency={transaction.currency} entryType={record.entryType} />
      ),
    },
    {
      title: 'Số dư trước',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      align: 'right',
      render: (value: number | undefined) => (
        <MoneyText amount={value} currency={transaction.currency} />
      ),
    },
    {
      title: 'Số dư sau',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      align: 'right',
      render: (value: number | undefined) => (
        <MoneyText amount={value} currency={transaction.currency} />
      ),
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string | undefined) => <DateTimeText value={value} />,
    },
  ]

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Space wrap align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/transactions')}>
              Quay lại
            </Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Giao dịch {transaction.referenceCode || transaction.id}
            </Typography.Title>
            {transaction.type && <StatusTag kind="transactionType" value={transaction.type} />}
            {transaction.status && (
              <StatusTag kind="transactionStatus" value={transaction.status} />
            )}
          </Space>
        </Col>
      </Row>

      <ProCard title="Thông tin giao dịch" bordered>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Mã tham chiếu (Reference Code)">
            {transaction.referenceCode ? (
              <Typography.Text copyable strong>
                {transaction.referenceCode}
              </Typography.Text>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Idempotency Key">
            {transaction.idempotencyKey ? (
              <Typography.Text code copyable>
                {transaction.idempotencyKey}
              </Typography.Text>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="ID giao dịch">
            {transaction.id ? <Typography.Text copyable>{transaction.id}</Typography.Text> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Số tiền">
            <MoneyText
              amount={transaction.amount}
              currency={transaction.currency}
              style={{ fontWeight: 600, fontSize: 16 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Ví gửi">
            {renderWalletPartyDetail(
              transaction.fromWalletId,
              transaction.fromWalletNumber,
              transaction.fromOwnerName,
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Ví nhận">
            {renderWalletPartyDetail(
              transaction.toWalletId,
              transaction.toWalletNumber,
              transaction.toOwnerName,
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian tạo">
            <DateTimeText value={transaction.createdAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian hoàn tất">
            <DateTimeText value={transaction.completedAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả" span={2}>
            {transaction.description || '—'}
          </Descriptions.Item>
        </Descriptions>
      </ProCard>

      <ProCard title="Sổ cái kép (Double-Entry Ledger)" bordered>
        <Table<LedgerEntryAdminResponse>
          rowKey={(record) =>
            record.id ?? `${record.walletNumber}-${record.entryType}-${record.createdAt}`
          }
          size="middle"
          scroll={{ x: 'max-content' }}
          pagination={false}
          columns={ledgerColumns}
          dataSource={transaction.ledgerEntries ?? []}
          locale={{ emptyText: 'Chưa có bút toán sổ cái nào' }}
        />
      </ProCard>
    </Space>
  )
}
