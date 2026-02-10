const fs = require('fs');
const path = require('path');

// 模板目录
const TEMPLATES_DIR = 'templates';

// 读取模板文件
const readTemplate = (templateName) => {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  if (!fs.existsSync(templatePath)) {
    console.error(`模板文件不存在: ${templatePath}`);
    process.exit(1);
  }
  return fs.readFileSync(templatePath, 'utf8');
};

// 替换模板变量
const renderTemplate = (template, variables) => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
};

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
const dateStr = new Date().toISOString().split('T')[0];

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

// 功能名称映射（小写 -> 显示名称）
const featureDisplayNames = {
  fct: 'FCT',
  welcome: 'Welcome',
  fixture: 'Fixture',
  maintain: 'Maintain'
};

// 创建配置文件
const config = {
  version,
  createdAt: new Date().toISOString(),
  features: enabledFeatures
};
fs.writeFileSync(path.join(releaseDir, 'config.json'), JSON.stringify(config, null, 2));

// 读取模板
const releaseTemplate = readTemplate('release.md');
const reviewTemplate = readTemplate('review.md');
const testTemplate = readTemplate('test.md');

// 生成功能说明部分
const featureSections = enabledFeatures
  .map(f => `### ${featureDisplayNames[f]}\n- [ ] 待填写`)
  .join('\n\n');

// 创建 release.md
const releaseMd = renderTemplate(releaseTemplate, {
  version,
  date: dateStr,
  features: enabledFeatures.map(f => featureDisplayNames[f]).join(', '),
  featureSections
});
fs.writeFileSync(path.join(releaseDir, 'release.md'), releaseMd);

// 创建 review.md
const reviewMd = renderTemplate(reviewTemplate, {
  version
});
fs.writeFileSync(path.join(releaseDir, 'review.md'), reviewMd);

// 为每个功能创建目录和 test.md
for (const feature of enabledFeatures) {
  const featureDir = path.join(releaseDir, feature);
  fs.mkdirSync(featureDir, { recursive: true });
  
  const testMd = renderTemplate(testTemplate, {
    version,
    featureName: featureDisplayNames[feature],
    date: dateStr
  });
  fs.writeFileSync(path.join(featureDir, 'test.md'), testMd);
}

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
