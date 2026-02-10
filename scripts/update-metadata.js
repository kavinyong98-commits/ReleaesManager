const fs = require('fs');
const path = require('path');

const RELEASES_DIR = 'releases';
const INDEX_PATH = 'releases.json';

// 获取当前日期字符串
const getDateStr = () => {
  return new Date().toISOString().split('T')[0];
};

// 获取当前时间戳
const getTimestamp = () => {
  return new Date().toISOString();
};

// 更新MD文件中的元数据
const updateMdFile = (filePath, updates) => {
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 更新版本号
  if (updates.version) {
    const versionPatterns = [
      /(\*\*版本\*\*:\s*)[\d]+/g,
      /(# Release\s+)[\d]+/g,
      /(# Review\s+)[\d]+/g,
      /(# Test - [^\n]+\n[\s\S]*?\*\*版本\*\*:\s*)[\d]+/g
    ];
    
    for (const pattern of versionPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, `$1${updates.version}`);
        modified = true;
      }
    }
  }

  // 更新时间
  if (updates.date) {
    const datePatterns = [
      /(\*\*创建时间\*\*:\s*)[\d-]+/g,
      /(\*\*更新时间\*\*:\s*)[\d-]+/g
    ];
    
    for (const pattern of datePatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, `$1${updates.date}`);
        modified = true;
      }
    }

    // 如果没有更新时间字段，添加一个
    if (!content.includes('**更新时间**')) {
      content = content.replace(
        /(\*\*创建时间\*\*:\s*[\d-]+)/,
        `$1\n- **更新时间**: ${updates.date}`
      );
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
  }
  
  return modified;
};

// 添加变更记录
const addChangelogEntry = (filePath, entry) => {
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, 'utf8');
  
  // 在变更记录部分添加条目
  const changelogMarker = '## 变更记录';
  const changelogIndex = content.indexOf(changelogMarker);
  
  if (changelogIndex !== -1) {
    const insertPoint = changelogIndex + changelogMarker.length;
    const newEntry = `\n- [${getDateStr()}] ${entry}`;
    content = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
};

// 递归查找所有MD文件
const findMdFiles = (dir) => {
  const mdFiles = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      mdFiles.push(...findMdFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      mdFiles.push(fullPath);
    }
  }
  
  return mdFiles;
};

// 主逻辑
const main = () => {
  const version = process.env.VERSION;
  const newVersion = process.env.NEW_VERSION || '';
  const updateTime = process.env.UPDATE_TIME !== 'false';
  const updateChangelog = process.env.UPDATE_CHANGELOG !== 'false';

  if (!version) {
    console.error('请提供版本号');
    process.exit(1);
  }

  const releaseDir = path.join(RELEASES_DIR, version);
  
  if (!fs.existsSync(releaseDir)) {
    console.error(`版本 ${version} 不存在`);
    process.exit(1);
  }

  const updates = {};
  if (newVersion) {
    updates.version = newVersion;
  }
  if (updateTime) {
    updates.date = getDateStr();
  }

  // 查找并更新所有MD文件
  const mdFiles = findMdFiles(releaseDir);
  let updatedCount = 0;

  for (const mdFile of mdFiles) {
    const wasUpdated = updateMdFile(mdFile, updates);
    if (wasUpdated) {
      updatedCount++;
      console.log(`  更新: ${mdFile}`);
    }
  }

  // 添加变更记录
  if (updateChangelog) {
    const releaseFile = path.join(releaseDir, 'release.md');
    const changeEntry = newVersion 
      ? `元数据更新 - 版本变更为 ${newVersion}`
      : '元数据更新';
    addChangelogEntry(releaseFile, changeEntry);
  }

  // 更新config.json
  const configPath = path.join(releaseDir, 'config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.updatedAt = getTimestamp();
    if (newVersion) {
      config.previousVersion = config.version;
      config.version = newVersion;
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  // 更新索引文件
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const versionIndex = index.versions.findIndex(v => v.version === version);
  if (versionIndex !== -1) {
    index.versions[versionIndex].updatedAt = getTimestamp();
    if (newVersion) {
      index.versions[versionIndex].previousVersion = version;
      index.versions[versionIndex].version = newVersion;
    }
  }
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  // 如果版本号变更，重命名目录
  if (newVersion && newVersion !== version) {
    const newReleaseDir = path.join(RELEASES_DIR, newVersion);
    fs.renameSync(releaseDir, newReleaseDir);
    console.log(`  目录重命名: ${version} -> ${newVersion}`);
  }

  console.log(`✅ 元数据更新完成`);
  console.log(`   版本: ${version}${newVersion ? ` -> ${newVersion}` : ''}`);
  console.log(`   更新文件数: ${updatedCount}`);
};

main();
