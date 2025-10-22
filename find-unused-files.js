const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const excludeDirs = new Set([
  'node_modules',
  '.next',
  '.git',
  'build',
  'dist',
  'coverage',
  '.firebase',
  'functions/node_modules',
]);

// File extensions to analyze
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const allExtensions = new Set([...codeExtensions, '.css', '.json', '.md']);

// Files that are entry points or config files (should never be marked as unused)
const entryPointPatterns = [
  /^package\.json$/,
  /^package-lock\.json$/,
  /^tsconfig\.json$/,
  /^next\.config\.(ts|js|mjs)$/,
  /^tailwind\.config\.(ts|js|mjs)$/,
  /^postcss\.config\.(ts|js|mjs)$/,
  /^firebase\.json$/,
  /^\.firebaserc$/,
  /^firestore\.(indexes|rules)\.json$/,
  /^\.gitignore$/,
  /^\.env/,
  /^README\.md$/,
  /^app\/.*layout\.tsx$/,
  /^app\/globals\.css$/,
  /^app\/.*page\.tsx$/,  // All Next.js pages are entry points
  /app\/api\/.*\/route\.(ts|js)$/, // API routes
  /^functions\/index\.ts$/,
  /^functions\/package\.json$/,
  /^functions\/\.eslintrc\.js$/,
  /^middleware\.(ts|js)$/,
];

// Get all files recursively
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(rootDir, filePath);

    // Skip excluded directories
    if (excludeDirs.has(file) || relativePath.split(path.sep).some(part => excludeDirs.has(part))) {
      return;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (allExtensions.has(ext)) {
        fileList.push(relativePath);
      }
    }
  });

  return fileList;
}

// Check if file is an entry point
function isEntryPoint(filePath) {
  return entryPointPatterns.some(pattern => pattern.test(filePath));
}

// Extract all import/require paths from a file
function extractImports(content, filePath) {
  const imports = new Set();

  // ES6 imports: import ... from 'path' or import('path')
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
  // Dynamic imports: import('path')
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  // CommonJS require: require('path')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  // Next.js Image imports
  const nextImageRegex = /src=\{([^}]+)\}|src=['"]([^'"]+)['"]/g;

  let match;

  [importRegex, dynamicImportRegex, requireRegex].forEach(regex => {
    while ((match = regex.exec(content)) !== null) {
      imports.add(match[1]);
    }
  });

  return Array.from(imports);
}

// Resolve import path to actual file path
function resolveImportPath(importPath, fromFile) {
  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@/')) {
    return null;
  }

  // Handle @/ alias (maps to root)
  if (importPath.startsWith('@/')) {
    importPath = importPath.substring(2);
  }

  const fromDir = path.dirname(fromFile);
  let resolved = importPath.startsWith('.')
    ? path.normalize(path.join(fromDir, importPath))
    : importPath;

  // Try different extensions if no extension provided
  const possiblePaths = [];
  if (!path.extname(resolved)) {
    codeExtensions.forEach(ext => {
      possiblePaths.push(resolved + ext);
      possiblePaths.push(path.join(resolved, 'index' + ext));
    });
  } else {
    possiblePaths.push(resolved);
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(rootDir, p))) {
      return p;
    }
  }

  return null;
}

// Main analysis
console.log('Scanning for unused files...\n');

const allFiles = getAllFiles(rootDir);
console.log(`Found ${allFiles.length} files to analyze\n`);

const referencedFiles = new Set();
const entryPoints = [];

// Mark entry points
allFiles.forEach(file => {
  if (isEntryPoint(file)) {
    entryPoints.push(file);
    referencedFiles.add(file);
  }
});

// Analyze imports from all files
allFiles.forEach(file => {
  if (!codeExtensions.has(path.extname(file))) {
    return;
  }

  try {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const imports = extractImports(content, file);

    imports.forEach(importPath => {
      const resolved = resolveImportPath(importPath, file);
      if (resolved) {
        referencedFiles.add(resolved);
      }
    });
  } catch (error) {
    // Skip files that can't be read
  }
});

// Find unused files
const unusedFiles = allFiles.filter(file => {
  // Don't mark entry points as unused
  if (isEntryPoint(file)) return false;

  // Don't mark public assets as unused
  if (file.startsWith('public/')) return false;

  // Check if file is referenced
  return !referencedFiles.has(file);
});

// Group by directory
const byDirectory = {};
unusedFiles.forEach(file => {
  const dir = path.dirname(file);
  if (!byDirectory[dir]) {
    byDirectory[dir] = [];
  }
  byDirectory[dir].push(path.basename(file));
});

// Output results
console.log(`\n===== UNUSED FILES ANALYSIS =====\n`);
console.log(`Total files analyzed: ${allFiles.length}`);
console.log(`Entry points identified: ${entryPoints.length}`);
console.log(`Referenced files: ${referencedFiles.size}`);
console.log(`Potentially unused files: ${unusedFiles.length}\n`);

if (unusedFiles.length > 0) {
  console.log('===== UNUSED FILES BY DIRECTORY =====\n');

  Object.keys(byDirectory).sort().forEach(dir => {
    console.log(`\n${dir}/`);
    byDirectory[dir].sort().forEach(file => {
      console.log(`  - ${file}`);
    });
  });

  console.log('\n\n===== FULL LIST =====\n');
  unusedFiles.sort().forEach(file => {
    console.log(file);
  });
} else {
  console.log('No unused files found!');
}

// Write to file
const outputPath = path.join(rootDir, 'unused-files-report.txt');
const report = [
  '===== UNUSED FILES ANALYSIS =====\n',
  `Total files analyzed: ${allFiles.length}`,
  `Entry points identified: ${entryPoints.length}`,
  `Referenced files: ${referencedFiles.size}`,
  `Potentially unused files: ${unusedFiles.length}\n`,
  '\n===== UNUSED FILES BY DIRECTORY =====\n',
];

Object.keys(byDirectory).sort().forEach(dir => {
  report.push(`\n${dir}/`);
  byDirectory[dir].sort().forEach(file => {
    report.push(`  - ${file}`);
  });
});

report.push('\n\n===== FULL LIST =====\n');
unusedFiles.sort().forEach(file => {
  report.push(file);
});

fs.writeFileSync(outputPath, report.join('\n'));
console.log(`\n\nReport saved to: ${outputPath}`);
