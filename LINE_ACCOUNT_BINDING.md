# LINE 帳號綁定指南

## 概述

本系統支援將顧客的 LINE 帳號與系統中的顧客資料進行綁定，實現自動推播預約確認、候位狀態更新等功能。

## 綁定流程

### 1. 顧客關注官方帳號 (Follow Event)

當顧客在 LINE 上關注您的官方帳號時，系統會自動：
- 記錄顧客的 LINE User ID
- 發送歡迎訊息，要求提供電話號碼

**系統流程：**
```
顧客關注 OA → LINE 發送 follow 事件 → 系統記錄 lineUserId
→ 系統發送歡迎訊息 → 顧客回覆電話號碼 → 系統驗證並綁定
```

### 2. 顧客提供電話號碼進行綁定

顧客在 LINE 對話中輸入電話號碼（格式：09xxxxxxxx 或 0xxxxxxxxx）後，系統會：
- 驗證電話號碼格式
- 在系統中查找該電話號碼的顧客記錄
- 將 LINE User ID 綁定到該顧客記錄
- 發送綁定成功或失敗的訊息

**支援的電話格式：**
- 09 開頭的 10 位數字：`09xxxxxxxx`
- 0 開頭的 10-11 位數字：`0xxxxxxxxx` 或 `0xxxxxxxxxx`

### 3. 預約時自動推播

當顧客完成預約後，系統會自動檢查該顧客是否已綁定 LINE 帳號：
- 如果已綁定，系統自動推送預約確認訊息（包含 QR Code）
- 訊息包含：餐廳名稱、人數、預約時間、QR Code 圖片

## API 端點

### tRPC 程序

#### 1. `line.bindByPhone` - 透過電話號碼綁定

```typescript
// 輸入
{
  lineUserId: string;      // LINE User ID
  phone: string;           // 電話號碼
}

// 輸出
{
  success: boolean;        // 綁定是否成功
}
```

#### 2. `line.bindAccount` - 直接綁定 LINE 帳號

```typescript
// 輸入
{
  customerId: number;      // 顧客 ID
  lineUserId: string;      // LINE User ID
}

// 輸出
{
  success: boolean;        // 綁定是否成功
}
```

#### 3. `line.getCustomerByLineId` - 透過 LINE ID 查詢顧客

```typescript
// 輸入
{
  lineUserId: string;      // LINE User ID
}

// 輸出
{
  id: number;
  phone: string;
  name: string;
  email?: string;
  lineUid: string;
  loyaltyScore: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. `line.getBindingStatus` - 查詢綁定狀態

```typescript
// 輸入
{
  customerId: number;      // 顧客 ID
}

// 輸出
{
  isBound: boolean;        // 是否已綁定
  lineUid: string | null;  // LINE User ID（如果已綁定）
}
```

#### 5. `line.unbindAccount` - 解除綁定

```typescript
// 輸入
{
  customerId: number;      // 顧客 ID
}

// 輸出
{
  success: boolean;        // 解除綁定是否成功
}
```

## Webhook 事件處理

### Follow 事件

當顧客關注官方帳號時，系統會：
1. 接收 LINE follow 事件
2. 記錄 LINE User ID
3. 發送歡迎訊息

**歡迎訊息內容：**
```
歡迎！請提供您的電話號碼以完成帳號綁定。
```

### 訊息事件

當顧客發送訊息時，系統會：
1. 檢查訊息是否為有效的電話號碼格式
2. 如果是電話號碼，執行綁定流程
3. 如果不是，檢查是否為候位狀態回應（「我正前往」、「保留 5 分鐘」、「取消候位」）

**電話號碼綁定成功訊息：**
```
✅ 帳號綁定成功！您現在可以透過 LINE 進行預約和查詢候位狀態。
```

**電話號碼綁定失敗訊息：**
```
❌ 找不到該電話號碼的帳號。請確認電話號碼是否正確。
```

## 資料庫欄位

### Customers 表

| 欄位名 | 型別 | 說明 |
|--------|------|------|
| lineUid | VARCHAR(64) | LINE User ID，用於識別 LINE 帳號 |

- `lineUid` 為可選欄位，允許為 NULL
- `lineUid` 具有 UNIQUE 約束，確保一個 LINE 帳號只能綁定一個顧客

## 自動推播流程

### 預約確認推播

當顧客完成預約時：

1. 系統檢查顧客是否有 `lineUid`
2. 如果有，準備預約確認訊息（Flex Message）
3. 非同步推送訊息至顧客的 LINE 帳號
4. 訊息包含：
   - 預約確認標題
   - 餐廳名稱
   - 人數
   - 預約時間
   - QR Code 圖片

### 候位狀態推播

系統支援以下候位狀態推播：

1. **入座通知** - 當輪到顧客入座時
   - 訊息：「[餐廳名稱] 已為您準備好桌位！請問您現在可以入座嗎？」
   - 快速回覆按鈕：「我正前往」、「保留 5 分鐘」、「取消候位」

2. **候位狀態更新** - 定期更新候位位置和預估等待時間
   - 訊息：「[餐廳名稱]\n前方還有 X 組客人\n預估等待時間: Y 分鐘」

## 實作範例

### 前端：預約表單

在預約表單中，可選擇是否綁定 LINE 帳號：

```typescript
// 預約時傳遞 lineUserId（可選）
const response = await trpc.reservation.create.mutate({
  restaurantId: 1,
  phone: "0912345678",
  name: "王小明",
  partySize: 4,
  scheduledAt: new Date("2026-04-20T19:00:00"),
  highChairNeeded: 1,
  specialRequests: "靠窗位置",
  lineUserId: "U1234567890abcdef1234567890abcdef", // 可選
});
```

### 後端：自動推播

```typescript
// 在 reservation.create 中自動檢查並推播
const lineUserIdToNotify = input.lineUserId || customer.lineUid;
if (lineUserIdToNotify) {
  // 自動推送預約確認訊息
  const message = createReservationConfirmationMessage(
    restaurantName,
    partySize,
    scheduledAt,
    qrCodeUrl,
    qrCode
  );
  await pushLineMessage(lineUserIdToNotify, [message]);
}
```

## 安全考量

1. **電話號碼驗證**：系統使用正規表達式驗證電話號碼格式
2. **一對一綁定**：每個 LINE User ID 只能綁定一個顧客記錄
3. **資料隱私**：LINE User ID 儲存在 `customers.lineUid` 欄位中，不會公開
4. **非同步推播**：推播失敗不會影響預約建立流程

## 故障排除

### 綁定失敗

**問題：** 顧客提供電話號碼後收到「找不到該電話號碼的帳號」訊息

**解決方案：**
1. 確認顧客提供的電話號碼是否正確
2. 確認該電話號碼是否已在系統中建立顧客記錄
3. 如果是新顧客，需要先透過預約表單建立顧客記錄

### 推播失敗

**問題：** 預約確認訊息未收到

**解決方案：**
1. 確認顧客已成功綁定 LINE 帳號
2. 檢查 LINE 官方帳號的推播權限
3. 檢查伺服器日誌中的錯誤訊息

### 重複綁定

**問題：** 顧客想要更改綁定的 LINE 帳號

**解決方案：**
1. 使用 `line.unbindAccount` 解除舊的綁定
2. 使用新的 LINE 帳號重新綁定

## 相關文件

- [LINE_SETUP.md](./LINE_SETUP.md) - LINE 官方帳號初始設定
- [server/db-line-binding.ts](./server/db-line-binding.ts) - 綁定函數實作
- [server/routers/line.ts](./server/routers/line.ts) - LINE tRPC 程序
- [server/webhooks/line.ts](./server/webhooks/line.ts) - LINE Webhook 端點
