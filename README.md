# MOPIX

Ứng dụng desktop (Electron) tạo và chỉnh sửa ảnh, video bằng AI — chạy trên macOS.

- Tạo ảnh / video bằng MUSE AI và Google Flow (qua cầu nối Chrome "Monday · Flow Local Bridge").
- Workflow dạng node (Text / Image / Video): kéo thả, nối dây, chạy thật.
- Thư viện, Làm phim (Video Studio), Motion, công cụ ảnh, trợ lý viết prompt.
- Mọi tính năng đều mở, không cần token hay gói nâng cấp.

## Cấu trúc

- `electron/main.cjs` — entry Electron.
- `dist/index.html`, `dist/assets/app/` — giao diện.
- `dist/server/` — server nội bộ (Express) phục vụ app và cầu nối Flow.
- `dist/flow-bridge/` — extension Chrome cầu nối Flow (đóng gói sẵn `dist/flow-bridge.zip`).
- `package.json` — `muse-batch-manager` v1.1.0, productName `MOPIX`.

## Lưu ý

- Code trong `dist/` là code chạy thật của app (không có bước build riêng cho frontend).
- App macOS đóng gói sẵn chạy bằng file `app.asar`; sau mỗi lần thay code cần cập nhật hash asar trong `Info.plist` thì app mới mở được.
