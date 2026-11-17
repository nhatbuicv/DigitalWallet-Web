import { ArrowLeftOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type { ApiResponse, WalletAdminResponse, WalletStatusRequest } from '@/api/types'
import { DateTimeText } from '@/components/DateTimeText'
import { MoneyText } from '@/components/MoneyText'
import { StatusTag } from '@/components/StatusTag'
import { decodeJwt } from '@/lib/jwt'
import { useAuthStore } from '@/stores/authStore'

type WalletFreezeAction = 'freeze' | 'unfreeze'

interface ReasonFormValues {
  reason: string
}

export function WalletDetailPage() {
  const { walletUid } = useParams<{ walletUid: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [reasonForm] = Form.useForm<ReasonFormValues>()

  const authUser = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const currentRole = authUser?.role ?? decodeJwt(accessToken)?.role
  const canFreezeOrUnfreeze = currentRole === 'ADMIN' || currentRole === 'MANAGER'

  const [modalAction, setModalAction] = useState<WalletFreezeAction | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const {
    data: wallet,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'wallets', 'detail', walletUid],
    enabled: Boolean(walletUid),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<WalletAdminResponse>>(
        `/admin/wallets/${walletUid}`,
      )
      return unwrapResponse(response)
    },
  })

  const freezeMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: WalletFreezeAction; reason: string }) => {
      const payload: WalletStatusRequest = { reason }
      const response = await apiClient.patch<ApiResponse<WalletAdminResponse>>(
        `/admin/wallets/${walletUid}/${action}`,
        payload,
      )
      return unwrapResponse(response)
    },
    onSuccess: async (_, variables) => {
      setModalAction(null)
      setModalError(null)
      reasonForm.resetFields()
      setActionFeedback({
        type: 'success',
        message:
          variables.action === 'freeze'
            ? 'Đóng băng ví thành công.'
            : 'Mở đóng băng ví thành công.',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'wallets'] })
    },
    onError: (err) => {
      setModalError(normalizeError(err).message)
    },
  })

  const openModal = (action: WalletFreezeAction) => {
    setModalError(null)
    reasonForm.resetFields()
    setModalAction(action)
  }

  const closeModal = () => {
    if (freezeMutation.isPending) return
    setModalAction(null)
    setModalError(null)
    reasonForm.resetFields()
  }

  const handleModalSubmit = async () => {
    if (!modalAction) return
    let values: ReasonFormValues
    try {
      values = await reasonForm.validateFields()
    } catch {
      return
    }
    setModalError(null)
    freezeMutation.mutate({ action: modalAction, reason: values.reason.trim() })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isError || !wallet) {
    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wallets')}>
          Quay lại danh sách
        </Button>
        <Alert
          type="error"
          showIcon
          title="Không thể tải thông tin ví"
          description={error ? normalizeError(error).message : 'Không tìm thấy ví.'}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      </Space>
    )
  }

  const isFrozen = wallet.status === 'FROZEN'

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Space wrap align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wallets')}>
              Quay lại
            </Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Ví {wallet.walletNumber || wallet.uid}
            </Typography.Title>
            {wallet.walletType && <Tag>{wallet.walletType}</Tag>}
            {wallet.status && <StatusTag kind="walletStatus" value={wallet.status} />}
          </Space>
        </Col>
        {canFreezeOrUnfreeze && (
          <Col>
            {isFrozen ? (
              <Button
                type="primary"
                icon={<UnlockOutlined />}
                onClick={() => openModal('unfreeze')}
              >
                Mở đóng băng ví
              </Button>
            ) : (
              <Button
                danger
                type="primary"
                icon={<LockOutlined />}
                disabled={wallet.status === 'CLOSED'}
                onClick={() => openModal('freeze')}
              >
                Đóng băng ví
              </Button>
            )}
          </Col>
        )}
      </Row>

      {actionFeedback && (
        <Alert
          type={actionFeedback.type}
          showIcon
          closable
          title={actionFeedback.message}
          onClose={() => setActionFeedback(null)}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <ProCard bordered>
            <Statistic
              title="Số dư hiện tại"
              valueRender={() => (
                <MoneyText
                  amount={wallet.balance}
                  currency={wallet.currency}
                  style={{ fontSize: 24, fontWeight: 600 }}
                />
              )}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard bordered>
            <Statistic
              title="Số dư khả dụng"
              valueRender={() => (
                <MoneyText
                  amount={wallet.availableBalance}
                  currency={wallet.currency}
                  style={{ fontSize: 24, fontWeight: 600, color: '#389e0d' }}
                />
              )}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={8}>
          <ProCard bordered>
            <Statistic
              title="Số dư bị phong tỏa"
              valueRender={() => (
                <MoneyText
                  amount={wallet.blockedBalance}
                  currency={wallet.currency}
                  style={{ fontSize: 24, fontWeight: 600, color: '#cf1322' }}
                />
              )}
            />
          </ProCard>
        </Col>
      </Row>

      <ProCard title="Thông tin ví & Chi nhánh" bordered>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="UID">{wallet.uid || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số ví">{wallet.walletNumber || '—'}</Descriptions.Item>
          <Descriptions.Item label="Tên ví">{wallet.walletName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Loại ví">{wallet.walletType || '—'}</Descriptions.Item>
          <Descriptions.Item label="Tiền tệ">{wallet.currency || '—'}</Descriptions.Item>
          <Descriptions.Item label="Phiên bản (version)">{wallet.version ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Mã chi nhánh">{wallet.branchCode || '—'}</Descriptions.Item>
          <Descriptions.Item label="Tên chi nhánh">{wallet.branchName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Ngày mở ví">
            <DateTimeText value={wallet.openedAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Ngày đóng ví">
            <DateTimeText value={wallet.closedAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Lý do đóng ví" span={2}>
            {wallet.closedReason || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            <DateTimeText value={wallet.createdAt} />
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật lần cuối">
            <DateTimeText value={wallet.updatedAt} />
          </Descriptions.Item>
        </Descriptions>
      </ProCard>

      <ProCard title="Hạn mức giao dịch" bordered>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Hạn mức thấu chi (overdraftLimit)">
            <MoneyText amount={wallet.overdraftLimit} currency={wallet.currency} />
          </Descriptions.Item>
          <Descriptions.Item label="Số dư tối thiểu (minimumBalance)">
            <MoneyText amount={wallet.minimumBalance} currency={wallet.currency} />
          </Descriptions.Item>
          <Descriptions.Item label="Hạn mức mỗi giao dịch (singleTransactionLimit)">
            <MoneyText amount={wallet.singleTransactionLimit} currency={wallet.currency} />
          </Descriptions.Item>
          <Descriptions.Item label="Hạn mức ngày (dailyLimit)">
            <MoneyText amount={wallet.dailyLimit} currency={wallet.currency} />
          </Descriptions.Item>
          <Descriptions.Item label="Hạn mức tháng (monthlyLimit)">
            <MoneyText amount={wallet.monthlyLimit} currency={wallet.currency} />
          </Descriptions.Item>
        </Descriptions>
      </ProCard>

      <ProCard title="Thông tin chủ ví" bordered>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="UID chủ ví">
            {wallet.userUid ? <Link to={`/users/${wallet.userUid}`}>{wallet.userUid}</Link> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Họ và tên">{wallet.userFullName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{wallet.userPhone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{wallet.userEmail || '—'}</Descriptions.Item>
        </Descriptions>
      </ProCard>

      <Modal
        open={modalAction !== null}
        title={modalAction === 'freeze' ? 'Đóng băng ví' : 'Mở đóng băng ví'}
        okText={modalAction === 'freeze' ? 'Xác nhận đóng băng' : 'Xác nhận mở đóng băng'}
        cancelText="Hủy"
        okButtonProps={{
          danger: modalAction === 'freeze',
          loading: freezeMutation.isPending,
        }}
        cancelButtonProps={{ disabled: freezeMutation.isPending }}
        onOk={() => void handleModalSubmit()}
        onCancel={closeModal}
        destroyOnHidden
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          {modalError && <Alert type="error" showIcon title={modalError} />}
          <Form form={reasonForm} layout="vertical">
            <Form.Item
              name="reason"
              label="Lý do thực hiện"
              rules={[
                {
                  validator: (_, value: string | undefined) => {
                    const trimmed = value?.trim() ?? ''
                    if (trimmed.length < 1) {
                      return Promise.reject(new Error('Vui lòng nhập lý do (từ 1 đến 500 ký tự).'))
                    }
                    if (trimmed.length > 500) {
                      return Promise.reject(new Error('Lý do không được vượt quá 500 ký tự.'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                maxLength={500}
                showCount
                placeholder="Nhập lý do (1–500 ký tự)"
              />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </Space>
  )
}
