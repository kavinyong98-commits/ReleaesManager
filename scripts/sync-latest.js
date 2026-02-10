const fs = require('fs');
const path = require('path');

const RELEASES_DIR = 'releases';
const LATEST_DIR = path.join(RELEASES_DIR, 'latest');
const INDEX_PATH = 'releases.json';

// 递归复制目录
const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// 递归删除目录
const removeDir = (dir) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

// 获取最新版本
const getLatestVersion = () => {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const versions = index.versions
    .filter(v => v.version !== 'latest')
    .sort((a, b) => b.version.localeCompare(a.version));
  
  if (versions.length === 0) {
    console.error('没有找到任何版本');
    process.exit(1);
  }
  
  return versions[0].version;
};

// 主逻辑
const main = () => {
  let version = process.env.VERSION;
  
  if (!version) {
    version = getLatestVersion();
    console.log(`自动检测最新版本: ${version}`);
  }

  const sourceDir = path.join(RELEASES_DIR, version);
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`版本 ${version} 不存在`);
    process.exit(1);
  }

  // 清理并重建latest目录
  removeDir(LATEST_DIR);
  copyDir(sourceDir, LATEST_DIR);

  // 创建latest的元数据文件
  const sourceConfig = JSON.parse(fs.readFileSync(path.join(sourceDir, 'config.json'), 'utf8'));
  const latestConfig = {
    ...sourceConfig,
    isLatest: true,
    sourceVersion: version,
    syncedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(LATEST_DIR, 'config.json'), JSON.stringify(latestConfig, null, 2));

  // 更新索引文件
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  index.latest = {
    version: version,
    syncedAt: latestConfig.syncedAt,
    features: sourceConfig.features
  };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  // 设置环境变量
  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `SYNCED_VERSION=${version}\n`);
  }

  console.log(`✅ 已将版本 ${version} 同步到 latest`);
  console.log(`   功能: ${sourceConfig.features.join(', ')}`);
};

main();
