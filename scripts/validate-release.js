const fs = require('fs');
const path = require('path');

const RELEASES_DIR = 'releases';
const INDEX_PATH = 'releases.json';
const REPORT_PATH = 'validation-report.md';

// 验证结果收集器
class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.passed = [];
  }

  addError(version, message) {
    this.errors.push({ version, message });
  }

  addWarning(version, message) {
    this.warnings.push({ version, message });
  }

  addInfo(version, message) {
    this.info.push({ version, message });
  }

  addPassed(version, message) {
    this.passed.push({ version, message });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  generateReport() {
    const lines = [];
    
    lines.push(`### 验证时间: ${new Date().toISOString()}`);
    lines.push('');
    
    // 总览
    lines.push('### 📊 总览');
    lines.push(`- ✅ 通过: ${this.passed.length}`);
    lines.push(`- ❌ 错误: ${this.errors.length}`);
    lines.push(`- ⚠️ 警告: ${this.warnings.length}`);
    lines.push(`- ℹ️ 信息: ${this.info.length}`);
    lines.push('');

    // 错误详情
    if (this.errors.length > 0) {
      lines.push('### ❌ 错误');
      for (const item of this.errors) {
        lines.push(`- **[${item.version}]** ${item.message}`);
      }
      lines.push('');
    }

    // 警告详情
    if (this.warnings.length > 0) {
      lines.push('### ⚠️ 警告');
      for (const item of this.warnings) {
        lines.push(`- **[${item.version}]** ${item.message}`);
      }
      lines.push('');
    }

    // 信息
    if (this.info.length > 0) {
      lines.push('### ℹ️ 信息');
      for (const item of this.info) {
        lines.push(`- **[${item.version}]** ${item.message}`);
      }
      lines.push('');
    }

    // 通过项目
    if (this.passed.length > 0) {
      lines.push('### ✅ 通过');
      for (const item of this.passed) {
        lines.push(`- **[${item.version}]** ${item.message}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// 验证规则定义
const validators = {
  // 检查必需文件
  checkRequiredFiles: (version, releaseDir, result) => {
    const requiredFiles = ['config.json', 'release.md', 'review.md'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(releaseDir, file);
      if (fs.existsSync(filePath)) {
        result.addPassed(version, `必需文件存在: ${file}`);
      } else {
        result.addError(version, `缺少必需文件: ${file}`);
      }
    }
  },

  // 检查config.json结构
  checkConfigStructure: (version, releaseDir, result) => {
    const configPath = path.join(releaseDir, 'config.json');
    if (!fs.existsSync(configPath)) return;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // 必需字段
      const requiredFields = ['version', 'createdAt', 'features'];
      for (const field of requiredFields) {
        if (config[field] === undefined) {
          result.addError(version, `config.json 缺少必需字段: ${field}`);
        }
      }

      // 版本号一致性
      if (config.version && config.version !== version && !config.isLatest) {
        result.addWarning(version, `config.json 中的版本号 (${config.version}) 与目录名不一致`);
      }

      // 时间格式验证
      if (config.createdAt && isNaN(Date.parse(config.createdAt))) {
        result.addError(version, `config.json 中的 createdAt 时间格式无效`);
      }

      result.addPassed(version, 'config.json 结构验证通过');
    } catch (e) {
      result.addError(version, `config.json 解析失败: ${e.message}`);
    }
  },

  // 检查功能文件夹完整性
  checkFeatureFolders: (version, releaseDir, result) => {
    const configPath = path.join(releaseDir, 'config.json');
    if (!fs.existsSync(configPath)) return;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const features = config.features || [];

      for (const feature of features) {
        const featureDir = path.join(releaseDir, feature);
        if (fs.existsSync(featureDir)) {
          // 检查功能目录下的test.md
          const testMdPath = path.join(featureDir, 'test.md');
          if (fs.existsSync(testMdPath)) {
            result.addPassed(version, `功能 ${feature} 包含 test.md`);
          } else {
            result.addWarning(version, `功能 ${feature} 缺少 test.md`);
          }
        } else {
          result.addError(version, `配置中声明的功能文件夹不存在: ${feature}`);
        }
      }
    } catch (e) {
      // 已在checkConfigStructure中处理
    }
  },

  // 检查MD文件内容完整性
  checkMdContent: (version, releaseDir, result) => {
    const mdFiles = ['release.md', 'review.md'];
    
    for (const mdFile of mdFiles) {
      const filePath = path.join(releaseDir, mdFile);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否有未填写的占位符
      if (content.includes('待填写') || content.includes('{{ }}')) {
        result.addWarning(version, `${mdFile} 包含未填写的占位内容`);
      }

      // 检查版本号引用
      if (!content.includes(version) && version !== 'latest') {
        result.addWarning(version, `${mdFile} 中未找到版本号引用`);
      }
    }
  },

  // 检查可追溯性（变更记录）
  checkTraceability: (version, releaseDir, result) => {
    const releaseFile = path.join(releaseDir, 'release.md');
    if (!fs.existsSync(releaseFile)) return;

    const content = fs.readFileSync(releaseFile, 'utf8');
    
    // 检查是否有变更记录
    if (content.includes('## 变更记录')) {
      const changelogSection = content.split('## 变更记录')[1];
      if (changelogSection && changelogSection.trim().length > 50) {
        result.addPassed(version, '包含变更记录');
      } else {
        result.addInfo(version, '变更记录为空或内容过少');
      }
    } else {
      result.addWarning(version, '缺少变更记录部分');
    }
  },

  // 检查索引一致性
  checkIndexConsistency: (version, releaseDir, result, index) => {
    const versionInIndex = index.versions.find(v => v.version === version);
    
    if (!versionInIndex && version !== 'latest') {
      result.addError(version, '版本未在 releases.json 中注册');
      return;
    }

    if (versionInIndex) {
      const configPath = path.join(releaseDir, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // 检查功能列表一致性
        const indexFeatures = (versionInIndex.features || []).sort().join(',');
        const configFeatures = (config.features || []).sort().join(',');
        
        if (indexFeatures !== configFeatures) {
          result.addWarning(version, `releases.json 与 config.json 中的功能列表不一致`);
        } else {
          result.addPassed(version, '索引与配置一致');
        }
      }
    }
  }
};

// 验证单个版本
const validateVersion = (version, result, index) => {
  const releaseDir = path.join(RELEASES_DIR, version);
  
  if (!fs.existsSync(releaseDir)) {
    result.addError(version, '版本目录不存在');
    return;
  }

  result.addInfo(version, '开始验证...');

  // 运行所有验证器
  for (const [name, validator] of Object.entries(validators)) {
    try {
      validator(version, releaseDir, result, index);
    } catch (e) {
      result.addError(version, `验证器 ${name} 执行失败: ${e.message}`);
    }
  }
};

// 主逻辑
const main = () => {
  const targetVersion = process.env.VERSION;
  const strictMode = process.env.STRICT === 'true';
  
  const result = new ValidationResult();

  // 加载索引文件
  let index = { versions: [] };
  if (fs.existsSync(INDEX_PATH)) {
    try {
      index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    } catch (e) {
      result.addError('global', `releases.json 解析失败: ${e.message}`);
    }
  } else {
    result.addError('global', 'releases.json 不存在');
  }

  // 确定要验证的版本
  let versionsToValidate = [];
  
  if (targetVersion) {
    versionsToValidate = [targetVersion];
  } else {
    // 验证所有版本
    if (fs.existsSync(RELEASES_DIR)) {
      versionsToValidate = fs.readdirSync(RELEASES_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    }
  }

  console.log(`开始验证 ${versionsToValidate.length} 个版本...`);

  // 执行验证
  for (const version of versionsToValidate) {
    validateVersion(version, result, index);
  }

  // 检查索引中的版本是否都存在对应目录
  for (const indexVersion of index.versions) {
    const versionDir = path.join(RELEASES_DIR, indexVersion.version);
    if (!fs.existsSync(versionDir)) {
      result.addError(indexVersion.version, 'releases.json 中注册的版本目录不存在');
    }
  }

  // 生成报告
  const report = result.generateReport();
  fs.writeFileSync(REPORT_PATH, report);
  console.log(report);

  // 设置输出变量
  const envFile = process.env.GITHUB_OUTPUT;
  if (envFile) {
    fs.appendFileSync(envFile, `has_errors=${result.hasErrors()}\n`);
  }

  // 打印总结
  console.log('\n========================================');
  if (result.hasErrors()) {
    console.log('❌ 验证完成，发现错误');
    if (strictMode) {
      process.exit(1);
    }
  } else if (result.warnings.length > 0) {
    console.log('⚠️ 验证完成，存在警告');
  } else {
    console.log('✅ 验证通过');
  }
};

main();
