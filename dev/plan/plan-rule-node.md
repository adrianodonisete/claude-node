# Node.js LTS Requirement Plan

## Context
This project uses modern Node.js features including:
- Native `fetch` API (used in Yahoo Finance requests)
- ES modules and CommonJS interop (`"type": "commonjs"`)
- Modern async/await patterns

To ensure compatibility and best practices, the project should specify the required Node.js LTS version.

## Implementation Plan

### 1. Verify current Node.js version
```bash
node --version
```

### 2. Add `.nvmrc` file
Create `.nvmrc` with the minimum Node.js LTS version (currently 20.x).

### 3. Update `package.json` with `engines` field
```json
"engines": {
  "node": ">=20.0.0"
}
```

### 4. Add package-lock version specification
Update to include package-lock version for reproducibility.

## Verification
After changes, verify with:
```bash
npm install
# Should validate Node.js version requirement
```

## Files to Modify
- `D:\Developer\work\apps\calc-node\package.json` - Add engines field
- `D:\Developer\work\apps\calc-node\.nvmrc` - New file with version number
