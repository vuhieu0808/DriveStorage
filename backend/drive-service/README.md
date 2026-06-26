# DriveStorage Backend - Drive Service

Backend service cho hệ thống Aggregated Cloud Storage.

## Tech Stack

- NestJS 11 + TypeScript
- TypeORM (PostgreSQL/MongoDB compatible)
- Google APIs (googleapis)
- JWT Authentication
- Passport

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Setup database

Tạo database PostgreSQL:

```sql
CREATE DATABASE drive_service;
```

### 3. Configure environment variables

Tạo file `.env` trong thư mục `backend/drive-service`:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=drive_service
DATABASE_SYNC=true

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=604800

# OAuth
OAUTH_REDIRECT_URI=http://localhost:3000/api/drive-accounts/oauth/callback
FRONTEND_URL=http://localhost:5173
```

### 4. Run development server

```bash
pnpm start:dev
```

Backend sẽ chạy tại: http://localhost:3000

## Module Structure

### drive-accounts/

Module quản lý tài khoản Google Drive:

**Services:**
- `GoogleOAuthService`: Xử lý OAuth2 flow với Google
  - `getAuthUrl()`: Tạo authorization URL
  - `exchangeCode()`: Đổi authorization code lấy tokens
  - `refreshAccessToken()`: Refresh expired token
  - `revokeToken()`: Revoke token khi xóa account

- `GoogleDriveClientService`: Interact với Google Drive API
  - `getStorageQuota()`: Lấy thông tin quota và email
  - `uploadFile()`: Upload file lên Drive
  - `deleteFile()`: Xóa file
  - `getFileMetadata()`: Lấy metadata
  - `createResumableUploadUrl()`: Tạo resumable upload URL

- `DriveAccountsService`: Business logic
  - `getAuthUrl()`: Khởi tạo OAuth flow
  - `handleOAuthCallback()`: Xử lý callback, lưu tokens
  - `findAllByUserId()`: Lấy danh sách accounts của user
  - `refreshQuota()`: Cập nhật quota từ Google
  - `remove()`: Xóa account và revoke token

**API Endpoints:**
- `GET /api/drive-accounts/oauth/url` - Lấy Google OAuth URL (protected)
- `GET /api/drive-accounts/oauth/callback` - OAuth callback handler (public)
- `GET /api/drive-accounts` - List accounts của user (protected)
- `GET /api/drive-accounts/:id` - Chi tiết 1 account (protected)
- `POST /api/drive-accounts/:id/refresh` - Refresh quota (protected)
- `DELETE /api/drive-accounts/:id` - Xóa account (protected)

## OAuth Configuration

File `backend/config/DriveStorageSecret.json` chứa OAuth credentials từ Google Cloud Console:

```json
{
  "web": {
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "redirect_uris": ["http://localhost:3000/api/drive-accounts/oauth/callback"]
  }
}
```

**Lưu ý:** File này không nên commit lên Git. Thêm vào `.gitignore`.

## Google Cloud Setup

1. Tạo project tại [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Drive API
3. Tạo OAuth 2.0 Client ID (Web application)
4. Thêm Authorized redirect URIs:
   - `http://localhost:3000/api/drive-accounts/oauth/callback`
5. Download credentials và lưu vào `backend/config/DriveStorageSecret.json`

## Database Schema

Entity `DriveAccount`:

```typescript
{
  id: string (uuid)
  userId: string (uuid, foreign key)
  email: string
  accessToken: string (nullable)
  refreshToken: string
  totalSpace: string (bigint)
  usedSpace: string (bigint)
  status: string (online/offline/full/error)
}
```

Unique constraint: `(userId, email)` - Một user không thể add trùng email.

## Testing

Run unit tests:

```bash
pnpm test
```

Run e2e tests:

```bash
pnpm test:e2e
```

## Next Steps

- [ ] Implement upload/download file modules
- [ ] Add file chunking logic
- [ ] Implement space allocation algorithm
- [ ] Add queue for background token refresh
- [ ] Add rate limiting for Google API calls
