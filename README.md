# Release Manager

通过 GitHub Actions 自动化管理发布版本。

## 目录结构

```
├── releases.json          # 中心化版本索引
├── releases/
│   └── 20260210/          # 版本目录 (YYYYMMDD)
│       ├── config.json    # 版本配置
│       ├── release.md     # 发布文档
│       └── review.md      # 审核文档
└── .github/workflows/
    ├── create-release.yml # 创建版本
    └── update-release.yml # 更新版本
```

## 使用方法

### 创建新版本

1. 进入 GitHub 仓库 → Actions → **Create Release**
2. 点击 **Run workflow**
3. 填写参数：
   - `version`: 版本号 (YYYYMMDD 格式，留空使用今天日期)
   - `fct/welcome/fixture/maintain`: 选择要包含的功能模块

### 更新版本

1. 进入 GitHub 仓库 → Actions → **Update Release**
2. 点击 **Run workflow**
3. 填写要更新的版本号和新的功能配置

## 功能模块

| 模块 | 说明 |
|------|------|
| fct | FCT 功能 |
| welcome | Welcome 功能 |
| fixture | Fixture 功能 |
| maintain | Maintain 功能 |

## 版本索引

`releases.json` 作为中心化索引，记录所有版本信息：

```json
{
  "versions": [
    {
      "version": "20260210",
      "createdAt": "2026-02-10T00:00:00.000Z",
      "features": ["fct", "welcome", "fixture", "maintain"]
    }
  ]
}
```
