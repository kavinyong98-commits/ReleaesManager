const fs = require('fs');
const path = require('path');

const version = process.env.VERSION;
if (!version) {
  console.error('请提供版本号');
  process.exit(1);
}

const getFeatures = () => ({
  fct: process.env.FCT !== 'false',
  welcome: process.env.WELCOME !== 'false',
  fixture: process.env.FIXTURE !== 'false',
  maintain: process.env.MAINTAIN !== 'false'
});

const releaseDir = path.join('releases', version);

// 检查版本是否存在
if (!fs.existsSync(releaseDir)) {
  console.error(`版本 ${version} 不存在`);
  process.exit(1);
}

const features = getFeatures();
const enabledFeatures = Object.entries(features)
  .filter(([_, enabled]) => enabled)
  .map(([name]) => name);

// 更新配置文件
const configPath = path.join(releaseDir, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.features = enabledFeatures;
config.updatedAt = new Date().toISOString();
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// 更新中心索引
const indexPath = 'releases.json';
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const versionIndex = index.versions.findIndex(v => v.version === version);
if (versionIndex !== -1) {
  index.versions[versionIndex].features = enabledFeatures;
  index.versions[versionIndex].updatedAt = config.updatedAt;
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

console.log(`✅ 版本 ${version} 更新成功`);
console.log(`   功能: ${enabledFeatures.join(', ')}`);
