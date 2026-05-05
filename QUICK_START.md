# 快速開始指南 (5 分鐘上手)

## 前提條件

- Node.js 18+ 已安裝
- pnpm 已安裝
- MySQL/TiDB 資料庫已準備好

## 步驟 1：安裝依賴 (1 分鐘)

```bash
cd /home/ubuntu/smart-restaurant-system
pnpm install
```

## 步驟 2：設定資料庫 (2 分鐘)

```bash
# 建立資料庫
mysql -h localhost -u root -p << EOF
CREATE DATABASE smart_restaurant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# 執行遷移
pnpm drizzle-kit migrate
```

## 步驟 3：啟動伺服器 (1 分鐘)

```bash
pnpm dev
```

**預期輸出：**
```
Server running on http://localhost:3000/
```

## 步驟 4：測試功能 (1 分鐘)

在瀏覽器中打開：

| 功能 | URL | 說明 |
|------|-----|------|
| 預約表單 | http://localhost:3000/reserve | 顧客預約入口 |
| 管理後台 | http://localhost:3000/admin | 餐廳管理介面 |
| 首頁 | http://localhost:3000 | 應用首頁 |

### 快速測試預約流程

1. 打開 http://localhost:3000/reserve
2. 填寫表單：
   ```
   姓名：測試用戶
   電話：0912345678
   人數：4
   日期：選擇明天
   時間：19:00
   高椅：1
   備註：靠窗
   ```
3. 點擊「提交預約」
4. 應該看到 QR Code 確認頁面 ✅

### 快速測試管理後台

1. 打開 http://localhost:3000/admin
2. 查看：
   - 候位看板（自動刷新）
   - 桌位狀態（色彩編碼）
   - 今日預約（預約清單）

## 步驟 5：運行測試 (可選)

```bash
pnpm test
```

**預期結果：** 51 個測試通過

## 常見問題

### Q: 連線到資料庫失敗？

A: 檢查 DATABASE_URL 環境變數：
```bash
echo $DATABASE_URL
# 應該類似：mysql://user:password@localhost:3306/smart_restaurant
```

### Q: PORT 3000 已被佔用？

A: 使用不同的 PORT：
```bash
PORT=3001 pnpm dev
```

### Q: 看不到預約確認頁面？

A: 檢查瀏覽器控制台（F12）是否有錯誤訊息。

## 下一步

1. **設定 LINE 整合**：參考 [LINE_SETUP.md](./LINE_SETUP.md)
2. **詳細安裝指南**：參考 [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)
3. **API 文件**：參考 [LINE_ACCOUNT_BINDING.md](./LINE_ACCOUNT_BINDING.md)

## 系統功能清單

- ✅ 顧客預約表單
- ✅ QR Code 生成
- ✅ 管理後台候位看板
- ✅ 桌位視覺化管理
- ✅ EWT 候位時間預估
- ✅ LINE 官方帳號整合
- ✅ LINE 帳號綁定
- ✅ 預約確認推播
- ✅ 候位狀態推播
- ✅ 角色權限控制

---

**提示：** 如需詳細的安裝和配置步驟，請參考 INSTALLATION_GUIDE.md
