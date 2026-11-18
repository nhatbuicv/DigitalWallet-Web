import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, unwrapResponse } from '@/api/client'
import { normalizeError } from '@/api/errorHandler'
import type {
  ApiResponse,
  AuditAction,
  AuditLogResponse,
  AuditTargetType,
  PageResponse,
} from '@/api/types'
import { DataTable } from '@/components/DataTable'
import { DateTimeText } from '@/components/DateTimeText'
import { StatusTag } from '@/components/StatusTag'
import { useTableParams } from '@/hooks/useTableParams'
import { AUDIT_ACTION_OPTIONS, AUDIT_TARGET_TYPE_OPTIONS } from '@/lib/auditOptions'

interface AuditLogFilterFormValues {
  actorUid?: string
  action?: AuditAction
  targetType?: AuditTargetType
  targetUid?: string
  dateRange?: [Dayjs | null, Dayjs | null] | null
}

interface AppliedAuditLogFilters {
  actorUid?: string
  action?: AuditAction
  targetType?: AuditTargetType
  targetUid?: string
  fromDate?: string
  toDate?: string
}

const TARGET_TYPE_META: Record<AuditTargetType, { color: string; label: string }> = {
  USER: { color: 'blue', label: 'Người dùng' },
  WALLET: { color: 'cyan', label: 'Ví điện tử' },
}

function renderTargetLink(record: AuditLogResponse) {
  const { targetType, targetUid, targetIdentifier } = record
  if (!targetUid && !targetIdentifier) {
    return '—'
  }

  const label = targetIdentifier || targetUid || ''
  const targetPath =
    targetUid && targetType === 'USER'
      ? `/users/${targetUid}`
      : targetUid && targetType === 'WALLET'
        ? `/wallets/${targetUid}`
        : undefined

  return (
    <Space orientation="vertical" size={0}>
      {targetPath ? <Link to={targetPath}>{label}</Link> : <span>{label}</span>}
      {targetIdentifier && targetUid && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {targetUid}
        </Typography.Text>
      )}
    </Space>
  )
}

export function AuditLogsPage() {
  const [form] = Form.useForm<AuditLogFilterFormValues>()
  const [appliedFilters, setAppliedFilters] = useState<AppliedAuditLogFilters>({})
  const { params, setTableParams } = useTableParams({
    defaultPage: 0,
    defaultSize: 20,
    defaultSort: 'createdAt,desc',
  })

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      'admin',
      'audit-logs',
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
      if (appliedFilters.actorUid) queryParams.actorUid = appliedFilters.actorUid
      if (appliedFilters.action) queryParams.action = appliedFilters.action
      if (appliedFilters.targetType) queryParams.targetType = appliedFilters.targetType
      if (appliedFilters.targetUid) queryParams.targetUid = appliedFilters.targetUid
      if (appliedFilters.fromDate) queryParams.fromDate = appliedFilters.fromDate
      if (appliedFilters.toDate) queryParams.toDate = appliedFilters.toDate

      const response = await apiClient.get<ApiResponse<PageResponse<AuditLogResponse>>>(
        '/admin/audit-logs',
        { params: queryParams },
      )
      return unwrapResponse(response)
    },
  })

  const handleFilterSubmit = (values: AuditLogFilterFormValues) => {
    const [from, to] = values.dateRange ?? []
    const cleaned: AppliedAuditLogFilters = {
      actorUid: values.actorUid?.trim() || undefined,
      action: values.action || undefined,
      targetType: values.targetType || undefined,
      targetUid: values.targetUid?.trim() || undefined,
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

  const columns: ColumnsType<AuditLogResponse> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      defaultSortOrder: 'descend',
      render: (value: string | undefined) => <DateTimeText value={value} />,
    },
    {
      title: 'Người thực hiện',
      key: 'actor',
      render: (_, record) => {
        if (!record.actorName && !record.actorUid) {
          return '—'
        }
        return (
          <Space orientation="vertical" size={0}>
            {record.actorUid ? (
              <Link to={`/users/${record.actorUid}`}>{record.actorName || record.actorUid}</Link>
            ) : (
              <span>{record.actorName}</span>
            )}
            {record.actorName && record.actorUid && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.actorUid}
              </Typography.Text>
            )}
          </Space>
        )
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      render: (value: AuditAction | undefined) =>
        value ? <StatusTag kind="auditAction" value={value} /> : '—',
    },
    {
      title: 'Loại đối tượng',
      dataIndex: 'targetType',
      key: 'targetType',
      render: (value: AuditTargetType | undefined) => {
        if (!value) return '—'
        const meta = TARGET_TYPE_META[value]
        return meta ? <Tag color={meta.color}>{meta.label}</Tag> : <Tag>{value}</Tag>
      },
    },
    {
      title: 'Đối tượng',
      key: 'target',
      render: (_, record) => renderTargetLink(record),
    },
    {
      title: 'Chi tiết',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (value: string | undefined) => value || '—',
    },
  ]

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Nhật ký kiểm toán
      </Typography.Title>

      <ProCard bordered>
        <Form form={form} layout="vertical" onFinish={handleFilterSubmit}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="actorUid" label="UID người thực hiện" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập UID người thực hiện" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Form.Item name="action" label="Hành động" style={{ marginBottom: 8 }}>
                <Select placeholder="Tất cả hành động" allowClear options={AUDIT_ACTION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="targetType" label="Loại đối tượng" style={{ marginBottom: 8 }}>
                <Select
                  placeholder="Tất cả loại đối tượng"
                  allowClear
                  options={AUDIT_TARGET_TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12} lg={5}>
              <Form.Item name="targetUid" label="UID đối tượng" style={{ marginBottom: 8 }}>
                <Input placeholder="Nhập UID đối tượng" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12} lg={6}>
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
          title="Không thể tải nhật ký kiểm toán"
          description={normalizeError(error).message}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      <ProCard bordered>
        <DataTable<AuditLogResponse>
          rowKey="uid"
          columns={columns}
          data={data}
          loading={isLoading || isFetching}
        />
      </ProCard>
    </Space>
  )
}
