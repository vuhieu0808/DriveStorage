# TÀI LIỆU THIẾT KẾ HỆ THỐNG: AGGREGATED CLOUD STORAGE (DriveStorage)

**Mục tiêu:** Gộp **N** tài khoản Google Drive Miễn phí (<span style="color: rgb(31, 31, 31);">**15GB**</span>) thành một kho lưu trữ tập trung, hỗ trợ upload file lớn bằng cách tự động cắt/phân tán dữ liệu trực tiếp từ Client.

## 1. Kiến Trúc Tổng Tổng Quan (High-Level Architecture)

Hệ thống được thiết kế theo mô hình **Decoupled Architecture** (Tách biệt luồng điều khiển và luồng dữ liệu):

- **Control Plane (Backend Server):** Chỉ quản lý logic, cơ sở dữ liệu, phân bổ dung lượng và điều phối. Không xử lý truyền tải file (Binary Data).

- **Data Plane (Client & Google API):** Client chịu trách nhiệm xử lý file thô, tự cắt nhỏ và upload trực tiếp đến máy chủ Google Drive thông qua URL được cấp phát.

## 2. Thiết Kế Cơ Sở Dữ Liệu (Database Design)

Xem thêm ở file D:\\Hieu\\university\\project\\DriveStorage\\backend\\docs\\SQL-design.md

## 3. Luồng Nghiệp Vụ Chi Tiết (Detailed Workflows)

### Luồng 1: Tải Lên File (Upload Workflow)

#### Giai đoạn 1: Khởi tạo (Handshake)

1. Người dùng chọn file trên giao diện (Frontend).

2. Frontend lấy `file_name` và `file_size` ngay lập tức (bằng thuộc tính `.size`).

3. Frontend gửi một request `POST /api/upload/init` kèm `file_size` lên Backend.

4. **Backend chạy thuật toán phân bổ:**

   - Quét bảng `drive_accounts`.

   - **Trường hợp 1:** Có tài khoản còn trống <span style="color: rgb(31, 31, 31);">$\\ge$</span> `file_size` <span style="color: rgb(31, 31, 31);">$\\rightarrow$</span> Chọn tài khoản đó. Đánh dấu `is_splitted = false`.

   - **Trường hợp 2:** Không tài khoản nào đủ <span style="color: rgb(31, 31, 31);">$\\rightarrow$</span> Tính toán chia nhỏ file theo dung lượng trống khả dụng của các tài khoản từ lớn đến nhỏ. Đánh dấu `is_splitted = true`.

5. Backend gọi API sang Google Drive để xin **Resumable Upload URL** cho (các) phần dữ liệu tương ứng.

6. Backend trả về cho Frontend danh sách các URL kèm "Kịch bản upload" (Upload Plan).

#### Giai đoạn 2: Xử lý tại Client (Thực thi ngầm)

1. Frontend nhận kế hoạch, lập tức khởi tạo một **Web Worker** chạy ngầm và chuyển giao kế hoạch này.

2. Web Worker sử dụng hàm `file.slice(start_byte, end_byte)` để trích xuất khối dữ liệu cần thiết.

3. Web Worker thực hiện request HTTP `PUT` để đẩy khối dữ liệu này **thẳng lên Google Drive URL** nhận được từ Backend.

4. Giao diện chính (Main Thread) hoàn toàn rảnh rỗi, người dùng có thể thực hiện sửa, xóa, xem folder khác.

```
[Frontend UI]           [Backend Server]          [Google Drive API]
     │                          │                         │
     ├─ 1. Gửi file_size ──────>│                         │
     │                          ├─ 2. Tính toán phân bổ   │
     │                          ├─ 3. Xin Upload URL ────>│
     │                          │<─ 4. Trả về URL ────────┤
     │<─ 5. Trả về Kịch bản ────┤                         │
     │                          │                         │
     │── 6. Chuyển cho Worker ──┐                         │
     │                          │                         │
     │ [Web Worker Chạy Ngầm]   │                         │
     │   └─ 7. Cắt file & PUT ──┼────────────────────────>│ (Upload thẳng)
```

### Luồng 2: Tải Xuống File (Download Workflow)

Khi người dùng bấm "Download", hệ thống phải xử lý dựa trên trạng thái của file:

#### Trường hợp 1: File không bị cắt (`is_splitted = false`)

- Backend chỉ cần gọi API Google Drive để lấy đường dẫn **Direct Download Link** (đường dẫn tải trực tiếp) của file đó.

- Backend trả link này về cho Frontend hoặc tự động chuyển hướng (Redirect). Người dùng sẽ download trực tiếp từ máy chủ Google, tốc độ tối đa, không tốn tài nguyên của bạn.

#### Trường hợp 2: File bị cắt (`is_splitted = true`)

- Trình duyệt không thể tự ghép nhiều link tải thành một file lưu vào ổ cứng một cách mượt mà (nếu file quá lớn). Lúc này **Backend bắt buộc phải làm Proxy trung gian**.

- Khi người dùng gọi `GET /api/download/:file_id`:

  1. Backend đọc bảng `file_chunks` để lấy danh sách các mảnh theo đúng thứ tự `chunk_index` (0, 1, 2...).

  2. Backend thiết lập HTTP Response Header: `Content-Disposition: attachment; filename="ten_file.mp4"`.

  3. Backend khởi tạo một **Readable Stream** kết nối tới các mảnh trên các tài khoản Google Drive tương ứng.

  4. Backend đọc mảnh 0 (Stream dữ liệu về) <span style="color: rgb(31, 31, 31);">$\\rightarrow$</span> ghi ngay lập tức vào Response trả về cho Client (Pipe Stream) <span style="color: rgb(31, 31, 31);">$\\rightarrow$</span> Đọc tiếp mảnh 1 <span style="color: rgb(31, 31, 31);">$\\rightarrow$</span> Ghi tiếp...

  5. *Lưu ý kỹ thuật:* Dữ liệu đi qua RAM của Server theo dạng "cuốn chiếu" (Stream) nên Server không bị hết RAM, nhưng sẽ tốn băng thông truyền tải (Bandwidth Out).

## 4. Công Nghệ Đề Xuất (Suggested Tech Stack)

Để hiện thực hóa tài liệu này một cách dễ dàng nhất, bạn nên chọn các công nghệ hỗ trợ Stream và Xử lý bất đồng bộ tốt:

- **Frontend:**

  - **Framework:** React.js hoặc Vue.js (Để làm Single Page Application - SPA).
  - **State Management:** Zustand (React) hoặc Pinia (Vue) để quản lý hàng đợi upload toàn cục.
  - **Core API:** `Web Workers API` (Chạy ngầm), `File.slice()` (Cắt file nhị phân).

- **Backend:**

  - **Ngôn ngữ/Framework:** **Node.js (Express/NestJS)** hoặc **Golang**. Đây là hai ngôn ngữ xử lý Stream (Luồng dữ liệu) cực kỳ mạnh mẽ và tiết kiệm tài nguyên, rất phù hợp cho luồng Download Proxy.

  - **Database:** MongoDB (Vì cấu trúc cây thư mục và danh sách chunks lưu dạng mảng JSON rất trực quan) hoặc PostgreSQL.

  - **Google SDK:** `@googleapis/drive` (Dành cho Node.js).