# DriveStorage Frontend

Frontend cho hệ thống Aggregated Cloud Storage (DriveStorage).

## Tech Stack

- React 19 + TypeScript
- Vite 8
- TailwindCSS 4
- React Router DOM
- Axios

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run development server

```bash
pnpm dev
```

Frontend sẽ chạy tại: http://localhost:5173

## Features

- **Login/Register**: Xác thực người dùng
- **Google Drive OAuth**: Kết nối tài khoản Google Drive
- **Account Management**: Xem danh sách, quota và quản lý các tài khoản Drive đã kết nối

## Project Structure

```
src/
├── components/
│   └── GoogleDriveLoginButton.tsx  # Button kết nối Google Drive
├── pages/
│   ├── LoginPage.tsx               # Trang đăng nhập
│   └── DriveAccountsPage.tsx       # Trang quản lý tài khoản Drive
├── services/
│   └── api.ts                      # API client (axios)
├── App.tsx                         # Router setup
└── main.tsx                        # Entry point
```

## API Proxy

Tất cả requests tới `/api/*` sẽ được proxy sang backend `http://localhost:3000` (xem `vite.config.ts`)

## OAuth Flow

1. User click "Connect Google Drive"
2. Frontend gọi `GET /api/drive-accounts/oauth/url` để lấy authorization URL
3. Redirect user đến Google consent screen
4. Google callback về `http://localhost:3000/api/drive-accounts/oauth/callback`
5. Backend xử lý, lưu tokens, redirect về frontend `/accounts?success=true`
6. Frontend load lại danh sách accounts

## Notes

- Access token được lưu trong `localStorage`
- Khi 401, user sẽ tự động logout và redirect về `/login`
- UI sử dụng TailwindCSS utility classes, đơn giản và responsive
