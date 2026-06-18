# Copilot Instructions for DriveStorage

## Mục tiêu

Khi làm việc trong repository này, hãy xem đây là một hệ thống **Aggregated Cloud Storage (CongDrive)**: gom nhiều tài khoản Google Drive miễn phí thành một kho lưu trữ tập trung, hỗ trợ upload file lớn bằng cách cắt và phân tán dữ liệu theo kế hoạch được backend cấp phát.

## Quy tắc ưu tiên

1. Luôn đọc [README.md](../README.md) trước khi thay đổi thiết kế, luồng xử lý, schema hoặc API.
2. Giữ nguyên mô hình kiến trúc trong README: **Control Plane** ở backend chỉ quản lý logic, database, phân bổ dung lượng và điều phối; **Data Plane** ở client xử lý file thô và upload trực tiếp.
3. Không tự ý thêm logic làm backend nhận hoặc stream toàn bộ binary upload nếu README đang mô tả upload trực tiếp từ client lên Google Drive.
4. Nếu có tài liệu thiết kế khác trong `.github/` hoặc `backend/docs/`, hãy ưu tiên các tài liệu đó khi có xung đột.
5. Thay đổi nhỏ, đúng phạm vi, không refactor lan rộng nếu user không yêu cầu.

## Cách làm việc

- Bắt đầu từ file hoặc module gần nhất với hành vi cần đổi, thay vì quét toàn bộ repository.
- Khi cần thay đổi behavior, xác định rõ luồng dữ liệu, input, output, và nơi giữ trạng thái trước khi sửa code.
- Ưu tiên sửa ở tầng quyết định hành vi thật sự: service, domain logic, repository, handler, hoặc worker; tránh chỉ sửa wiring nếu nó không phải nơi ra quyết định.
- Nếu cần thêm file mới, đặt tên rõ nghĩa và giữ cấu trúc thư mục nhất quán với phần hiện có.
- Không thêm dependency mới nếu một giải pháp sẵn có trong stack hiện tại đủ dùng.

## Backend

- Backend hiện theo hướng **NestJS + TypeScript**; hãy giữ style, naming, module boundaries và cách tổ chức DTO/entity/service/controller nhất quán với code hiện có.
- Các thực thể chính cần được hiểu đúng theo README:
  - `drive_accounts`: tài khoản Drive, quota, token, trạng thái.
  - `files`: metadata file tổng.
  - `file_chunks`: ánh xạ các mảnh file theo thứ tự và tài khoản Drive.
- Khi làm việc với upload/download, luôn kiểm tra:
  - file có bị chia nhỏ hay không,
  - chunk order có được giữ đúng,
  - trạng thái file và tài khoản có được cập nhật nhất quán,
  - API trả về dữ liệu đủ để client thực hiện phần việc của nó.
- Với logic phân bổ dung lượng, ưu tiên tính đúng trước, rồi mới tối ưu.

## Frontend

- Frontend là nơi chọn file, lấy `file.size`, nhận upload plan và chuyển dữ liệu cho worker nếu có.
- Không đưa xử lý nặng lên main thread nếu README đã mô tả nó phải chạy qua Web Worker.
- Giữ UI và flow đồng bộ với backend contract; nếu đổi payload hoặc endpoint, phải cập nhật cả phía gọi và tài liệu liên quan.

## Chất lượng thay đổi

- Mỗi thay đổi nên đi kèm kiểm tra tối thiểu phù hợp với phạm vi đã sửa.
- Nếu sửa API hoặc schema, cập nhật luôn các phần liên quan trong docs hoặc DTO/entity.
- Không sửa những phần không liên quan chỉ để làm code trông gọn hơn.

## Khi không chắc chắn

- Nếu yêu cầu có thể mâu thuẫn với README, hãy dừng lại và làm rõ trước khi đổi code.
- Nếu cần quyết định kiến trúc mới, bám sát nguyên tắc decoupled architecture trong README và chọn phương án ít phá vỡ nhất.
