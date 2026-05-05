# 智慧餐廳預約與候位系統 - 本地安裝與測試指南

## 系統需求

- **Node.js**: 18.0 以上
- **pnpm**: 10.0 以上（包管理工具）
- **MySQL/TiDB**: 資料庫連線
- **LINE 官方帳號**: 用於 LINE 整合

## 第一步：環境準備

### 1.1 安裝依賴

```bash
# 進入專案目錄
cd /home/ubuntu/smart-restaurant-system

# 安裝所有依賴
pnpm install

# 驗證安裝成功
pnpm --version
node --version
```

### 1.2 設定環境變數

系統使用以下環境變數（由 Manus 平台自動注入）：

```bash
# 資料庫連線
DATABASE_URL=mysql://user:password@host:3306/smart_restaurant

# OAuth 認證
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# LINE 整合（需要您提供）
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token

# 其他配置
JWT_SECRET=your_jwt_secret
OWNER_OPEN_ID=your_owner_id
OWNER_NAME=your_name
```

**重要：** 在 Manus 平台的「設定 → 密鑰」頁面設定 LINE 相關的環境變數。

## 第二步：資料庫初始化

### 2.1 建立資料庫

```bash
# 使用 MySQL 客戶端連線到您的資料庫
mysql -h localhost -u root -p

# 在 MySQL 中執行
CREATE DATABASE smart_restaurant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_restaurant;
```

### 2.2 執行遷移

```bash
# 生成遷移檔案（如果尚未生成）
pnpm drizzle-kit generate

# 執行遷移
pnpm drizzle-kit migrate
```

**預期結果：** 系統會建立以下 6 張表格：
- `customers` - 顧客資訊
- `restaurants` - 餐廳分店
- `tables` - 桌位配置
- `waitlist` - 候位隊列
- `reservations` - 預約紀錄
- `notificationLog` - 通知歷史

### 2.3 驗證資料庫

```bash
# 連線到資料庫並檢查表格
mysql -h localhost -u root -p smart_restaurant

# 在 MySQL 中執行
SHOW TABLES;
DESCRIBE customers;
```

## 第三步：啟動開發伺服器

### 3.1 啟動伺服器

```bash
# 在專案根目錄執行
pnpm dev
```

**預期輸出：**
```
[2026-04-15T10:30:00.000Z] Server running on http://localhost:3000/
```

### 3.2 訪問應用

在瀏覽器中打開：
- **前端應用**: http://localhost:3000
- **管理後台**: http://localhost:3000/admin
- **預約表單**: http://localhost:3000/reserve

## 第四步：功能測試

### 4.1 測試預約表單

**步驟：**
1. 打開 http://localhost:3000/reserve
2. 填寫預約表單：
   - 姓名：王小明
   - 電話：0912345678
   - 人數：4
   - 日期：選擇未來日期
   - 時間：19:00
   - 高椅需求：1
   - 特殊備註：靠窗位置
3. 點擊「提交預約」
4. 應該看到 QR Code 確認頁面

**驗證點：**
- ✅ 表單驗證正常
- ✅ QR Code 成功生成
- ✅ 預約資訊正確顯示

### 4.2 測試管理後台

**步驟：**
1. 打開 http://localhost:3000/admin
2. 查看以下內容：
   - 候位看板：顯示所有候位顧客
   - 桌位狀態：色彩編碼的桌位網格
   - 今日預約：預約清單

**驗證點：**
- ✅ 候位看板自動刷新（每 5 秒）
- ✅ 桌位狀態色彩正確（綠=空、紅=佔用、藍=預訂、黃=清潔）
- ✅ 預約清單顯示正確資訊

### 4.3 測試 LINE 整合

#### 4.3.1 設定 LINE Webhook

1. 在 LINE Developers 控制台中：
   - 進入您的 Channel
   - 設定 → Webhook 設定
   - Webhook URL：`https://your-domain.com/api/line/webhook`
   - 啟用 Webhook

2. 驗證 Webhook 連線：
```bash
# 在終端執行（使用您的實際 URL）
curl -X POST https://your-domain.com/api/line/webhook \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: test-signature" \
  -d '{"events":[]}'
```

#### 4.3.2 測試 LINE Follow 事件

1. 在 LINE 上關注您的官方帳號
2. 應該收到歡迎訊息：
   ```
   歡迎！請提供您的電話號碼以完成帳號綁定。
   ```

#### 4.3.3 測試帳號綁定

1. 在 LINE 對話中回覆電話號碼（例如：0912345678）
2. 如果系統中存在該電話號碼的顧客，應該收到：
   ```
   ✅ 帳號綁定成功！您現在可以透過 LINE 進行預約和查詢候位狀態。
   ```
3. 如果不存在，應該收到：
   ```
   ❌ 找不到該電話號碼的帳號。請確認電話號碼是否正確。
   ```

#### 4.3.4 測試預約推播

1. 使用已綁定的電話號碼進行預約
2. 應該在 LINE 上收到預約確認訊息，包含：
   - 預約確認標題
   - 餐廳名稱
   - 人數
   - 預約時間
   - QR Code 圖片

## 第五步：單元測試

### 5.1 運行所有測試

```bash
# 執行所有測試
pnpm test

# 預期輸出
# Test Files  5 passed (5)
#      Tests  50 passed | 1 skipped (51)
```

### 5.2 測試覆蓋範圍

| 模組 | 測試數 | 說明 |
|------|--------|------|
| EWT 演算法 | 17 | 候位時間預估演算法 |
| LINE 整合 | 10 | LINE 訊息推播與事件處理 |
| LINE 帳號綁定 | 18 | 帳號綁定流程 |
| LINE 認證 | 5 | 認證令牌驗證 |
| 登出功能 | 1 | 使用者登出 |

### 5.3 運行特定測試

```bash
# 只運行 EWT 演算法測試
pnpm test algorithms

# 只運行 LINE 整合測試
pnpm test line

# 只運行綁定測試
pnpm test binding
```

## 第六步：API 測試

### 6.1 使用 tRPC 客戶端測試

```typescript
// 在瀏覽器控制台執行（開發者工具 F12）

// 1. 建立預約
const reservation = await trpc.reservation.create.mutate({
  restaurantId: 1,
  phone: "0912345678",
  name: "王小明",
  partySize: 4,
  scheduledAt: new Date("2026-04-20T19:00:00"),
  highChairNeeded: 1,
  specialRequests: "靠窗位置",
});
console.log("預約 ID:", reservation.id);
console.log("QR Code:", reservation.qrCode);

// 2. 查詢預約清單
const reservations = await trpc.reservation.list.query({ restaurantId: 1 });
console.log("預約清單:", reservations);

// 3. 查詢候位狀態
const waitlist = await trpc.waitlist.getStatus.query({ restaurantId: 1 });
console.log("候位狀態:", waitlist);

// 4. 查詢 LINE 綁定狀態
const bindingStatus = await trpc.line.getBindingStatus.query({ customerId: 1 });
console.log("綁定狀態:", bindingStatus);
```

### 6.2 使用 cURL 測試 REST API

```bash
# 測試 LINE Webhook（需要有效的簽名）
curl -X POST http://localhost:3000/api/line/webhook \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: $(echo -n '{}' | openssl dgst -sha256 -hmac 'YOUR_CHANNEL_SECRET' -binary | base64)" \
  -d '{"events":[]}'
```

## 第七步：故障排除

### 問題 1：資料庫連線失敗

**症狀：** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解決方案：**
```bash
# 檢查 MySQL 是否運行
mysql -h localhost -u root -p -e "SELECT 1"

# 驗證 DATABASE_URL 環境變數
echo $DATABASE_URL

# 確保資料庫存在
mysql -h localhost -u root -p -e "SHOW DATABASES LIKE 'smart_restaurant'"
```

### 問題 2：PORT 3000 已被佔用

**症狀：** `Error: listen EADDRINUSE :::3000`

**解決方案：**
```bash
# 查找佔用 PORT 3000 的程序
lsof -i :3000

# 終止該程序（macOS/Linux）
kill -9 <PID>

# 或使用不同的 PORT
PORT=3001 pnpm dev
```

### 問題 3：LINE Webhook 簽名驗證失敗

**症狀：** `401 Unauthorized - Invalid signature`

**解決方案：**
1. 確認 `LINE_CHANNEL_SECRET` 設定正確
2. 檢查 Webhook URL 是否正確
3. 確保 Webhook 使用 HTTPS（生產環境）

### 問題 4：QR Code 生成失敗

**症狀：** 預約後未顯示 QR Code

**解決方案：**
```bash
# 檢查 qrcode 套件是否已安裝
npm list qrcode

# 如果未安裝，執行
pnpm add qrcode
pnpm add -D @types/qrcode
```

## 第八步：部署準備

### 8.1 構建生產版本

```bash
# 構建前端和後端
pnpm build

# 驗證構建成功
ls -la dist/
```

### 8.2 啟動生產伺服器

```bash
# 啟動生產伺服器
pnpm start

# 預期輸出
# Server running on http://localhost:3000/
```

### 8.3 環境變數檢查清單

在部署前，確保以下環境變數已設定：

- [ ] `DATABASE_URL` - 資料庫連線字串
- [ ] `LINE_CHANNEL_ID` - LINE Channel ID
- [ ] `LINE_CHANNEL_SECRET` - LINE Channel Secret
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` - LINE Access Token
- [ ] `JWT_SECRET` - JWT 簽名密鑰
- [ ] `VITE_APP_ID` - OAuth App ID
- [ ] `OAUTH_SERVER_URL` - OAuth 伺服器 URL
- [ ] `OWNER_OPEN_ID` - 餐廳所有者 ID
- [ ] `OWNER_NAME` - 餐廳所有者名稱

## 第九步：監控與日誌

### 9.1 查看伺服器日誌

```bash
# 在 .manus-logs 目錄中查看日誌
ls -la .manus-logs/

# 查看最新的伺服器日誌
tail -f .manus-logs/devserver.log

# 查看客戶端控制台日誌
tail -f .manus-logs/browserConsole.log

# 查看網路請求日誌
tail -f .manus-logs/networkRequests.log
```

### 9.2 監控資料庫

```bash
# 查看資料庫中的預約
mysql -h localhost -u root -p smart_restaurant -e "SELECT * FROM reservations;"

# 查看候位隊列
mysql -h localhost -u root -p smart_restaurant -e "SELECT * FROM waitlist;"

# 查看顧客綁定狀態
mysql -h localhost -u root -p smart_restaurant -e "SELECT id, phone, name, lineUid FROM customers;"
```

## 常用命令速查表

```bash
# 開發
pnpm dev              # 啟動開發伺服器
pnpm test             # 運行所有測試
pnpm build            # 構建生產版本
pnpm start            # 啟動生產伺服器

# 資料庫
pnpm drizzle-kit generate   # 生成遷移檔案
pnpm drizzle-kit migrate    # 執行遷移

# 程式碼品質
pnpm check            # TypeScript 型別檢查
pnpm format           # 格式化程式碼
```

## 系統架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                    客戶端 (React 19)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 預約表單     │  │ 管理後台     │  │ 候位追蹤     │      │
│  │ /reserve     │  │ /admin       │  │ /waitlist    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │ tRPC + WebSocket
┌──────────────────────┴──────────────────────────────────────┐
│              後端 (Express 4 + tRPC 11)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ tRPC 路由器                                          │  │
│  │ ├─ reservation (create, list, updateStatus)        │  │
│  │ ├─ waitlist (create, getStatus, updateStatus)      │  │
│  │ ├─ restaurant (getStatus, getTables)               │  │
│  │ ├─ line (webhook, binding, notifications)          │  │
│  │ └─ auth (me, logout)                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 業務邏輯                                             │  │
│  │ ├─ EWT 演算法 (calculateComprehensiveEWT)          │  │
│  │ ├─ QR Code 生成 (generateQRCode)                   │  │
│  │ ├─ LINE 推播 (pushLineMessage)                     │  │
│  │ └─ 帳號綁定 (bindLineUserByPhone)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ LINE Webhook 端點 (/api/line/webhook)              │  │
│  │ ├─ Follow 事件 → 發送歡迎訊息                      │  │
│  │ ├─ 訊息事件 → 帳號綁定或候位回應                  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL
┌──────────────────────┴──────────────────────────────────────┐
│              資料庫 (MySQL/TiDB)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ customers    │  │ reservations │  │ waitlist     │      │
│  │ (lineUid)    │  │ (qrCode)     │  │ (ewt)        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ restaurants  │  │ tables       │  │ notifications│      │
│  │ (ast, peak)  │  │ (status)     │  │ (log)        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                       │ Messaging API
┌──────────────────────┴──────────────────────────────────────┐
│              LINE 官方帳號                                  │
│  ├─ 推播通知 (預約確認、候位更新、入座通知)               │
│  ├─ 快速回覆 (我正前往、保留 5 分鐘、取消候位)           │
│  └─ Rich Menu (預約、查詢、帳號綁定)                       │
└─────────────────────────────────────────────────────────────┘
```

## 下一步

1. **設定 LINE 官方帳號**：參考 [LINE_SETUP.md](./LINE_SETUP.md)
2. **瞭解帳號綁定流程**：參考 [LINE_ACCOUNT_BINDING.md](./LINE_ACCOUNT_BINDING.md)
3. **自訂餐廳配置**：在管理後台設定餐廳、桌位、營運參數
4. **部署到生產環境**：使用 Manus 平台的發佈功能

## 支援與反饋

如有任何問題或建議，請聯繫開發團隊或提交 Issue。

---

**最後更新：** 2026-04-15
**版本：** 1.0.0
