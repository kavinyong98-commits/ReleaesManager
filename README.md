# Release Manager

通过 GitHub Actions 自动化管理发布版本，支持完整的发布生命周期管理和可追溯性。

## 目录结构

```
├── releases.json          # 中心化版本索引
├── releases/
│   ├── latest/            # 最新版本快照 (自动同步)
│   └── 20260210/          # 版本目录 (YYYYMMDD)
│       ├── config.json    # 版本配置
│       ├── release.md     # 发布文档
│       ├── review.md      # 审核文档
│       └── fct/           # 功能模块目录
│           └── test.md    # 测试文档
├── scripts/               # 自动化脚本
└── .github/workflows/     # GitHub Actions
```

## GitHub Actions

### 1. Create Release - 创建版本
创建新的发布版本，自动生成目录结构和模板文件。

**触发**: 手动 (workflow_dispatch)

**参数**:
- `version`: 版本号 (YYYYMMDD 格式，留空使用今天日期)
- `fct/welcome/fixture/maintain`: 选择要包含的功能模块

### 2. Update Release - 更新版本
更新现有版本的功能模块配置。

**触发**: 手动 (workflow_dispatch)

**参数**:
- `version`: 要更新的版本号 (必填)
- `fct/welcome/fixture/maintain`: 新的功能模块配置

### 3. Sync Latest - 同步最新版本
将指定版本或最新版本同步到 `releases/latest` 目录，确保始终有一个稳定的最新版本引用。

**触发**:
- 手动 (workflow_dispatch)
- 自动 (releases/**/config.json 变更时)

**参数**:
- `version`: 指定同步的版本号 (留空则自动使用最新版本)

### 4. Download Release - 下载发布包
生成可下载的发布包 Artifact，支持选择性包含功能模块。

**触发**: 手动 (workflow_dispatch)

**参数**:
- `version`: 版本号或 "latest"
- `include_fct/welcome/fixture/maintain`: 选择要包含的功能文件夹
- `include_docs`: 是否包含文档文件

**输出**: 在 Actions 的 Artifacts 区域可下载打包文件

### 5. Update Metadata - 更新元数据
批量更新指定版本下所有 MD 文件的时间戳和版本号。

**触发**: 手动 (workflow_dispatch)

**参数**:
- `version`: 要更新的版本号 (必填)
- `new_version`: 新版本号 (可选，用于版本号迁移)
- `update_time`: 是否更新时间戳
- `update_changelog`: 是否在变更记录中添加条目

### 6. Validate Release - 验证发布
自动化检查发布完整性、一致性和可追溯性。

**触发**:
- 手动 (workflow_dispatch)
- 自动 (PR 或 Push 涉及 releases/ 目录时)

**参数**:
- `version`: 要验证的版本号 (留空验证所有版本)
- `strict`: 严格模式 (发现错误时失败构建)

**验证项目**:
- ✅ 必需文件存在性 (config.json, release.md, review.md)
- ✅ config.json 结构和字段完整性
- ✅ 功能文件夹与配置一致性
- ✅ MD 文件内容完整性 (占位符检查)
- ✅ 变更记录可追溯性
- ✅ releases.json 索引一致性

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
  ],
  "latest": {
    "version": "20260210",
    "syncedAt": "2026-02-10T00:00:00.000Z"
  },
  "metadata": {
    "lastUpdated": "2026-02-10T00:00:00.000Z",
    "totalVersions": 1
  }
}
```

## 发布流程建议

1. **创建版本**: 运行 Create Release 创建新版本
2. **填写内容**: 编辑生成的 MD 文件，填写功能说明和测试用例
3. **验证发布**: 运行 Validate Release 检查完整性
4. **同步最新**: 运行 Sync Latest 更新 latest 目录
5. **下载分发**: 运行 Download Release 生成分发包
