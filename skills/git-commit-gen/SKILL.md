---
name: git-commit-gen
description: 自動生成符合 Conventional Commits 規範的 Git Commit 訊息。當使用者完成開發並準備提交變更時觸發。
---

# Git Commit 生成器

你的任務是分析目前的程式碼變更（git diff），並生成高品質、專業且易於理解的 Commit 訊息。

## 格式標準

採用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：
`<type>(<scope>): <description>`

### 類型 (Type)
- `feat`: 新功能
- `fix`: 修補 Bug
- `docs`: 文件變更
- `style`: 不影響程式邏輯的格式更動 (空白字元、格式化等)
- `refactor`: 重構（既非修正 Bug 也非新增功能的內容變更）
- `perf`: 效能優化
- `test`: 新增或修正測試
- `chore`: 建置程序或輔助工具的變動（如調整 npm 依賴）

## 撰寫規則

1. **語言**：標題與內容皆使用 **繁體中文**。
2. **標題**：首行不超過 50 個字元，不加句號。
3. **內文 (Body)**：如果變更複雜，請在空一行後提供詳細描述，解釋「為什麼」要這樣改，而非僅描述改了什麼。
4. **範圍 (Scope)**：如果變更侷限於特定模組（如 `client`, `server`, `db`），請註明。

## 範例

```
feat(client): 新增餐廳預約頁面的表單驗證

- 實作了電話號碼格式檢查
- 整合了 sonner 套件顯示錯誤提示
- 優化了行動裝置上的輸入體驗
```
