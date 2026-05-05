# LINE 官方帳號整合設定指南

本文件說明如何設定 LINE 官方帳號與智慧餐廳系統的整合。

## 前置準備

1. **建立 LINE 官方帳號**
   - 登入 [LINE Developers Console](https://developers.line.biz/)
   - 建立新的 Channel（應用程式）
   - 選擇 "Messaging API" 作為 Channel Type

2. **取得認證資訊**
   - Channel ID：在 Channel Settings 中找到
   - Channel Secret：在 Channel Settings 中找到
   - Channel Access Token：在 Messaging API 設定中產生

## 環境變數設定

將以下環境變數設定到您的 Manus 專案：

```env
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
```

## Webhook 設定

1. **設定 Webhook URL**
   - 在 LINE Developers Console 中，找到 "Messaging API" 設定
   - 在 "Webhook settings" 中設定 Webhook URL：
     ```
     https://your-domain.manus.space/api/line/webhook
     ```
   - 啟用 "Use webhook"

2. **驗證 Webhook**
   - LINE 會發送驗證請求到您的 Webhook URL
   - 系統會自動驗證簽名並回應 200 OK

## Rich Menu 設定

Rich Menu 是 LINE 官方帳號下方的快速選單，提供用戶快速存取主要功能。

### 上傳 Rich Menu

使用 LINE Developers Console 或 API 上傳 Rich Menu：

```bash
curl -X POST https://api.line.biz/v2/bot/richmenu \
  -H "Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @server/line-rich-menu.json
```

### Rich Menu 按鈕功能

- **Make Reservation**：引導用戶進入預約表單
- **Check Waitlist**：查詢候位狀態
- **My Reservations**：查看用戶的預約紀錄
- **Contact Us**：聯繫餐廳客服

## 功能流程

### 1. 用戶關注帳號

當用戶關注您的 LINE 官方帳號時：
- 系統自動發送歡迎訊息
- 用戶可以開始使用 Rich Menu 功能

### 2. 建立預約

用戶點選 "Make Reservation" 後：
- 系統發送預約表單連結（LIFF）
- 用戶填寫預約資訊
- 預約完成後自動推送 QR Code 確認憑證

### 3. 查詢候位狀態

用戶點選 "Check Waitlist" 後：
- 系統發送候位狀態查詢介面
- 顯示前方隊伍人數和預估等待時間

### 4. 入座通知

當輪到用戶入座時：
- 系統自動推送入座通知
- 用戶可以回應「我正前往」、「保留 5 分鐘」或「取消候位」
- 系統根據回應更新候位狀態

## 訊息類型

系統支援以下 LINE 訊息類型：

### 文字訊息
簡單的文字通知，用於確認和狀態更新。

### Flex Message（彈性訊息）
富文本格式訊息，用於：
- 預約確認（包含 QR Code）
- 候位狀態更新
- 訂單詳情

### Quick Reply（快速回覆）
提供用戶快速選項的訊息，用於：
- 入座通知時的回應選項
- 預約確認選項

## 測試

### 測試 Webhook

使用以下命令測試 Webhook 連線：

```bash
curl -X POST https://your-domain.manus.space/api/line/webhook \
  -H "X-Line-Signature: test-signature" \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

### 測試訊息推播

使用 tRPC 客戶端測試訊息推播：

```typescript
await trpc.line.sendWaitlistUpdate.mutate({
  lineUserId: "U1234567890abcdef1234567890abcdef",
  queuePosition: 2,
  ewt: 45,
  restaurantName: "My Restaurant"
});
```

## 常見問題

### Q: 如何獲得用戶的 LINE User ID？

A: 當用戶關注帳號或發送訊息時，系統會自動記錄其 LINE User ID。

### Q: 如何測試推播通知？

A: 在管理後台中，可以使用「發送通知」功能測試推播。

### Q: 推播訊息失敗怎麼辦？

A: 檢查以下項目：
1. Channel Access Token 是否正確
2. 用戶是否仍然關注帳號
3. 訊息格式是否正確

## 進階設定

### 自訂 Rich Menu 圖片

Rich Menu 可以包含背景圖片以提升視覺效果。編輯 `line-rich-menu.json` 並上傳圖片。

### 整合 LIFF（LINE Front-end Framework）

LIFF 允許在 LINE 內嵌入 Web 應用程式。可以用於：
- 預約表單
- 候位狀態查詢
- 用戶帳號管理

### 使用 LINE Bot SDK

可以使用官方 SDK 簡化開發：

```bash
npm install @line/bot-sdk
```

## 支援

如有問題，請聯繫：
- LINE Developers 文件：https://developers.line.biz/
- 系統技術支援：support@example.com
