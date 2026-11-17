import type { components, operations } from './schema'

/** Generic envelope returned by every backend endpoint. */
export interface ApiResponse<T> {
  code: number
  success: boolean
  message?: string
  data?: T
}

/** Generic paged payload (mirrors backend `PageResponse<T>`). */
export interface PageResponse<T> {
  currentPage?: number
  totalPage?: number
  pageSize?: number
  totalElements?: number
  data?: T[]
}

export type Schemas = components['schemas']

// ---- DTOs: requests ----
export type PasswordLoginRequest = Schemas['PasswordLoginRequest']
export type QuickLoginRequest = Schemas['QuickLoginRequest']
export type RefreshTokenRequest = Schemas['RefreshTokenRequest']
export type SendOtpRequest = Schemas['SendOtpRequest']
export type VerifyOtpRequest = Schemas['VerifyOtpRequest']
export type ForgotPasswordRequest = Schemas['ForgotPasswordRequest']
export type ResetPasswordRequest = Schemas['ResetPasswordRequest']
export type ChangePasswordRequest = Schemas['ChangePasswordRequest']
export type CreateUserRequest = Schemas['CreateUserRequest']
export type UpdateProfileRequest = Schemas['UpdateProfileRequest']
export type CreateWalletRequest = Schemas['CreateWalletRequest']
export type WalletStatusRequest = Schemas['WalletStatusRequest']
export type DepositRequest = Schemas['DepositRequest']
export type WithdrawRequest = Schemas['WithdrawRequest']
export type TransferRequest = Schemas['TransferRequest']
export type Pageable = Schemas['Pageable']

// ---- DTOs: responses ----
export type UserLoginResponse = Schemas['UserLoginResponse']
export type TokenRefreshResponse = Schemas['TokenRefreshResponse']
export type RegisterResponse = Schemas['RegisterResponse']
export type UserProfileResponse = Schemas['UserProfileResponse']
export type ProvinceResponse = Schemas['ProvinceResponse']
export type UserAdminResponse = Schemas['UserAdminResponse']
export type WalletResponse = Schemas['WalletResponse']
export type WalletAdminResponse = Schemas['WalletAdminResponse']
export type WalletSummaryResponse = Schemas['WalletSummaryResponse']
export type BalanceResponse = Schemas['BalanceResponse']
export type TransferResponse = Schemas['TransferResponse']
export type TransactionHistoryResponse = Schemas['TransactionHistoryResponse']
export type TransactionDetailResponse = Schemas['TransactionDetailResponse']
export type TransactionAdminResponse = Schemas['TransactionAdminResponse']
export type TransactionAdminDetailResponse = Schemas['TransactionAdminDetailResponse']
export type LedgerEntryAdminResponse = Schemas['LedgerEntryAdminResponse']
export type DeviceSessionResponse = Schemas['DeviceSessionResponse']
export type AuditLogResponse = Schemas['AuditLogResponse']

// ---- Enums (derived from the schema's string unions) ----
export type WalletType = NonNullable<Schemas['CreateWalletRequest']['walletType']>
export type Currency = NonNullable<Schemas['WalletResponse']['currency']>
export type CurrencyCode = Currency
export type WalletStatus = NonNullable<Schemas['WalletResponse']['status']>
export type TransactionType = NonNullable<Schemas['TransactionDetailResponse']['type']>
export type TransactionStatus = NonNullable<Schemas['TransactionDetailResponse']['status']>
export type LedgerEntryType = NonNullable<Schemas['LedgerEntryAdminResponse']['entryType']>
export type EntryType = LedgerEntryType
export type UserStatus = NonNullable<operations['getUsers']['parameters']['query']['status']>
export type UserRole = NonNullable<operations['getUsers']['parameters']['query']['role']>
export type AuditAction = NonNullable<Schemas['AuditLogResponse']['action']>
export type AuditTargetType = NonNullable<Schemas['AuditLogResponse']['targetType']>
export type ClientType = Schemas['PasswordLoginRequest']['clientType']
