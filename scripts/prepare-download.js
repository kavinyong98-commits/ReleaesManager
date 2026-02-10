const fs = require('fs');
const path = require('path');

const RELEASES_DIR = 'releases';
const DOWNLOAD_DIR = 'download-package';
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

// 统计文件数量
const countFiles = (dir) => {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
};

// 获取实际版本号（处理latest）
const resolveVersion = (version) => {
  if (version === 'latest') {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    if (index.latest && index.latest.version) {
      return index.latest.version;
    }
    // 如果没有latest记录，获取最新版本
    const versions = index.versions
      .filter(v => v.version !== 'latest')
      .sort((a, b) => b.version.localeCompare(a.version));
    if (versions.length === 0) {
      console.error('没有找到任何版本');
      process.exit(1);
    }
    return versions[0].version;
  }
  return version;
};

// 主逻辑
const main = () => {
  const inputVersion = process.env.VERSION || 'latest';
  const version = resolveVersion(inputVersion);
  
  const releaseDir = path.join(RELEASES_DIR, version);
  
  if (!fs.existsSync(releaseDir)) {
    console.error(`版本 ${version} 不存在`);
    process.exit(1);
  }

  // 解析包含选项
  const includeOptions = {
    fct: process.env.INCLUDE_FCT !== 'false',
    welcome: process.env.INCLUDE_WELCOME !== 'false',
    fixture: process.env.INCLUDE_FIXTURE !== 'false',
    maintain: process.env.INCLUDE_MAINTAIN !== 'false',
    docs: process.env.INCLUDE_DOCS !== 'false'
  };

  // 创建下载目录
  if (fs.existsSync(DOWNLOAD_DIR)) {
    fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const includedFeatures = [];

  // 复制功能文件夹
  const featureFolders = ['fct', 'welcome', 'fixture', 'maintain'];
  for (const feature of featureFolders) {
    if (includeOptions[feature]) {
      const featureDir = path.join(releaseDir, feature);
      if (fs.existsSync(featureDir)) {
        copyDir(featureDir, path.join(DOWNLOAD_DIR, feature));
        includedFeatures.push(feature);
      }
    }
  }

  // 复制文档文件
  if (includeOptions.docs) {
    const docFiles = ['release.md', 'review.md', 'config.json'];
    for (const docFile of docFiles) {
      const docPath = path.join(releaseDir, docFile);
      if (fs.existsSync(docPath)) {
        fs.copyFileSync(docPath, path.join(DOWNLOAD_DIR, docFile));
      }
    }
    includedFeatures.push('docs');
  }

  // 创建下载清单
  const manifest = {
    version,
    downloadedAt: new Date().toISOString(),
    includedFeatures: includedFeatures,
    sourceVersion: inputVersion === 'latest' ? `latest -> ${version}` : version
  };
  fs.writeFileSync(path.join(DOWNLOAD_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const fileCount = countFiles(DOWNLOAD_DIR);

  // 设置环境变量
  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `ACTUAL_VERSION=${version}\n`);
    fs.appendFileSync(envFile, `INCLUDED_FEATURES=${includedFeatures.join(', ')}\n`);
    fs.appendFileSync(envFile, `FILE_COUNT=${fileCount}\n`);
  }

  console.log(`✅ 下载包准备完成`);
  console.log(`   版本: ${version}`);
  console.log(`   包含: ${includedFeatures.join(', ')}`);
  console.log(`   文件数: ${fileCount}`);
};

main();
