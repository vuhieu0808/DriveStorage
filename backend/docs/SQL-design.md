Chào bạn, việc chuyển sang sử dụng **PostgreSQL** là một lựa chọn rất sáng suốt cho project này. Bản chất của hệ thống quản lý file và thư mục (File Manager) là một cấu trúc phân cấp dạng cây (Tree Structure). PostgreSQL hỗ trợ cực kỳ mạnh mẽ việc này nhờ vào các tính năng như **Mảng (Array Data Type)** và **Truy vấn đệ quy (Recursive CTE)**.

Dưới đây là thiết kế Database hoàn chỉnh được chuẩn hóa (Database Schema) bằng PostgreSQL, bổ sung bảng `users` và tối ưu hóa cấu trúc để bạn có thể làm các tính năng: **Tạo thư mục**, **Di chuyển (Cut)**, **Sao chép (Copy)**, và **Tự động sắp xếp**.

## 1. Sơ Đồ Thiết Kế Database (Entity-Relationship Blueprint)

Để đáp ứng các tính năng trên, chúng ta cần liên kết các thực thể theo logic: Một `User` có nhiều `DriveAccount` và sở hữu một cây thư mục/file (`Folders` & `Files`).

### Bảng 1: `users` (Quản lý người dùng hệ thống)

<span style="color: rgb(255, 255, 255);">SQL</span>

```
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng 2: `drive_accounts` (Tài khoản Google Drive của từng User)

_Mỗi user có thể kết nối nhiều tài khoản Drive miễn phí của họ._

<span style="color: rgb(255, 255, 255);">SQL</span>

```
CREATE TABLE drive_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    total_space BIGINT DEFAULT 16106127360, -- 15GB tính bằng Byte
    used_space BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, full, error
    UNIQUE(user_id, email) -- Một user không add trùng 1 email 2 lần
);
```

### Bảng 3: `folders` (Cấu trúc thư mục dạng cây)

_Để làm tính năng Tạo folder, Move (Cut), và Copy, chúng ta dùng kỹ thuật_ `parent_id` _tự tham chiếu (Self-Referencing)._

<span style="color: rgb(255, 255, 255);">SQL</span>

```
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES folders(id) ON DELETE CASCADE, -- Thư mục cha, NULL nếu là thư mục gốc (Root)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng 4: `files` (Quản lý File tổng hợp)

_File phải thuộc về một_ `user_id` _và nằm trong một_ `folder_id` _nào đó._

<span style="color: rgb(255, 255, 255);">SQL</span>

```
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    folder_id INT REFERENCES folders(id) ON DELETE SET NULL, -- NULL nếu nằm ở ngoài cùng (Root)
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    is_splitted BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'uploading', -- uploading, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng 5: `file_chunks` (Bản đồ mảnh cắt - Giữ nguyên từ thiết kế trước)

<span style="color: rgb(255, 255, 255);">SQL</span>

```
CREATE TABLE file_chunks (
    id SERIAL PRIMARY KEY,
    file_id INT REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    start_byte BIGINT NOT NULL,
    end_byte BIGINT NOT NULL,
    google_file_id VARCHAR(255) NOT NULL,
    drive_account_id INT REFERENCES drive_accounts(id) ON DELETE CASCADE
);
```

### Bảng 6: `sessions` (Quản lý session của bảng users)

<span style="color: rgb(255, 255, 255);">SQL</span>

```
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id) ON DELETE CASCADE, -- Khóa ngoại liên kết tới bảng users
    refresh_token TEXT NOT NULL,
    expired_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Giải pháp Logic cho các tính năng nâng cao

Dựa vào cấu trúc Database trên, đây là cách bạn sẽ viết code để xử lý các tính năng:

### Chức năng: CUT (Di chuyển File/Folder)

Trong hệ thống file, "Cut" thực chất chỉ là **thay đổi thuộc tính cha** của đối tượng đó chứ không dịch chuyển dữ liệu vật lý trên Google Drive. Việc này diễn ra trong 1 phần nghìn giây.

- **Với File:** Bạn chỉ cần chạy lệnh `UPDATE files SET folder_id = [ID_FOLDER_MỚI] WHERE id = [ID_FILE]`.

- **Với Folder:** Bạn thay đổi `parent_id` của folder đó sang id của folder mới: `UPDATE folders SET parent_id = [ID_FOLDER_MỚI] WHERE id = [ID_FOLDER_BỊ_CUT]`. Toàn bộ các folder con và file bên trong nó sẽ tự động "đi theo" nhờ mối quan hệ phân cấp.

### Chức năng: COPY (Sao chép)

Khác với Cut, Copy yêu cầu bạn nhân bản dữ liệu.

- **Trên Database:** Bạn thực hiện câu lệnh `INSERT` một dòng mới vào bảng `files` (hoặc `folders`) với thông tin sao chép y hệt, chỉ khác `folder_id` mới.

- **Trên Google Drive:** Bạn **không cần** bảo người dùng upload lại. Google Drive API có sẵn hàm `Drive.Files.Copy`. Bạn chỉ cần gọi API bảo Google nhân bản `google_file_id` đó ra một bản sao ngay trên đám mây của họ, cực kỳ nhanh và tiết kiệm băng thông.

### Chức năng: TỰ ĐỘNG SẮP XẾP (Auto-Organization)

Để làm tính năng tự động gom file (Ví dụ: File `.mp4`, `.mkv` tự vào thư mục "Videos"; File `.zip`, `.rar` tự vào thư mục "Compressed"), bạn sẽ xử lý ở tầng **Backend Trigger/Hook** trước khi khởi tạo upload.

**Luồng xử lý (Kịch bản code):**

1. Khi Client gửi thông tin file lên (Ví dụ: `tailieu.zip`), Backend kiểm tra đuôi mở rộng hoặc `mime_type` (ở đây là `application/zip`).

2. Backend quét bảng `folders` của User đó xem đã có thư mục tên là "Compressed" chưa.
   - Nếu chưa có <span style="color: rgb(31, 31, 31);">$\\rightarrow$</span> Tự động chạy lệnh tạo folder "Compressed" và lưu `id` của folder này lại.

   - Nếu đã có <span style="color: rgb(31, 31, 31);">$\\rightarrow$</span> Lấy `id` của folder đó.

3. Backend áp `folder_id` này vào file `tailieu.zip` trước khi tiến hành tạo kịch bản upload. Khi upload xong, file sẽ tự động hiển thị gọn gàng trong folder tương ứng trên giao diện của người dùng.

## 3. Mẹo PostgreSQL cho bạn khi code

Khi làm tính năng hiển thị cây thư mục (ví dụ người dùng bấm vào một folder cha, bạn muốn hiển thị đường dẫn "Root &gt; Movies &gt; Action"), bạn hãy tìm hiểu kỹ thuật **Recursive CTE (Truy vấn đệ quy)** của PostgreSQL.

Nó cho phép bạn chỉ cần truyền vào `folder_id` hiện tại, PostgreSQL sẽ tự động "leo" ngược lên các `parent_id` để trả về toàn bộ chuỗi đường dẫn (Breadcrumb) chỉ trong 1 câu lệnh SQL duy nhất:

<span style="color: rgb(255, 255, 255);">SQL</span>

```
WITH RECURSIVE folder_path AS (
    SELECT id, name, parent_id FROM folders WHERE id = [ID_FOLDER_HIỆN_TẠI]
    UNION ALL
    SELECT f.id, f.name, f.parent_id FROM folders f
    JOIN folder_path fp ON f.id = fp.parent_id
)
SELECT * FROM folder_path;
```

Cấu trúc database này đã rất đầy đủ và sẵn sàng để bạn thiết kế một ứng dụng quản lý file chuyên nghiệp. Bước tiếp theo, bạn có thể cài đặt PostgreSQL và tạo các bảng này để chạy thử nhé!
