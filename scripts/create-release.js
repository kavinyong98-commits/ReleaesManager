const fs = require('fs');
const path = require('path');

// 获取环境变量
const getVersion = () => {
  if (process.env.VERSION) return process.env.VERSION;
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};

const getFeatures = () => ({
  fct: process.env.FCT !== 'false',
  welcome: process.env.WELCOME !== 'false',
  fixture: process.env.FIXTURE !== 'false',
  maintain: process.env.MAINTAIN !== 'false'
});

const version = getVersion();
const features = getFeatures();
const releaseDir = path.join('releases', version);

// 检查版本是否已存在
if (fs.existsSync(releaseDir)) {
  console.error(`版本 ${version} 已存在`);
  process.exit(1);
}

// 创建版本目录
fs.mkdirSync(releaseDir, { recursive: true });

// 生成功能列表
const enabledFeatures = Object.entries(features)
  .filter(([_, enabled]) => enabled)
  .map(([name]) => name);

// 创建配置文件
const config = {
  version,
  createdAt: new Date().toISOString(),
  features: enabledFeatures
};
fs.writeFileSync(path.join(releaseDir, 'config.json'), JSON.stringify(config, null, 2));

// 创建 release.md
const releaseMd = `# Release ${version}

## 发布信息
- **版本**: ${version}
- **创建时间**: ${new Date().toISOString().split('T')[0]}
- **功能模块**: ${enabledFeatures.join(', ')}

## 功能说明
${enabledFeatures.includes('fct') ? '### FCT\n- [ ] 待填写\n' : ''}
${enabledFeatures.includes('welcome') ? '### Welcome\n- [ ] 待填写\n' : ''}
${enabledFeatures.includes('fixture') ? '### Fixture\n- [ ] 待填写\n' : ''}
${enabledFeatures.includes('maintain') ? '### Maintain\n- [ ] 待填写\n' : ''}

## 变更记录
<!-- 在此添加变更内容 -->

`;
fs.writeFileSync(path.join(releaseDir, 'release.md'), releaseMd);

// 创建 review.md
const reviewMd = `# Review ${version}

## 审核信息
- **版本**: ${version}
- **审核状态**: 待审核

## 审核清单
- [ ] 功能完整性
- [ ] 代码质量
- [ ] 测试覆盖
- [ ] 文档完善

## 审核意见
<!-- 在此添加审核意见 -->

## 审核历史
| 日期 | 审核人 | 结果 | 备注 |
|------|--------|------|------|
| | | | |

`;
fs.writeFileSync(path.join(releaseDir, 'review.md'), reviewMd);

// 更新中心索引
const indexPath = 'releases.json';
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
index.versions.unshift({
  version,
  createdAt: config.createdAt,
  features: enabledFeatures
});
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

// 设置环境变量供后续步骤使用
const envFile = process.env.GITHUB_ENV;
if (envFile) {
  fs.appendFileSync(envFile, `RELEASE_VERSION=${version}\n`);
}

console.log(`✅ 版本 ${version} 创建成功`);
console.log(`   功能: ${enabledFeatures.join(', ')}`);
