# GitHub Actions Workflow Documentation

## Automated APK Build and Release

This repository includes an automated GitHub Actions workflow that builds and releases Android APKs whenever code is pushed to the main branch.

### 🚀 How It Works

The workflow (`build-apk.yml`) automatically:

1. **Triggers on:**
   - Push to `main` branch
   - Pull requests to `main` branch  
   - Manual workflow dispatch
   - GitHub releases

2. **Build Process:**
   - Sets up Node.js 20 and Java 21
   - Installs Android SDK
   - Installs npm dependencies
   - Builds the web application with Vite
   - Syncs web assets to Capacitor
   - Builds Android debug APK
   - Creates timestamped release

3. **Outputs:**
   - APK artifact uploaded to GitHub Actions
   - Automatic GitHub release created (on main branch pushes)
   - APK attached to release with descriptive filename

### 📱 APK Naming Convention

APKs are automatically named with timestamp and commit hash:
```
99Names-YYYY-MM-DD_HH-MM-COMMIT_HASH.apk
```

Example: `99Names-2025-09-22_00-48-a1b2c3d.apk`

### 🔄 Workflow Triggers

| Trigger | Action | Release Created |
|---------|--------|----------------|
| Push to main | Build APK + Create release | ✅ Yes |
| Pull Request | Build APK only | ❌ No |
| Manual dispatch | Build APK + Create release | ✅ Yes |
| GitHub release | Build APK + Attach to release | ✅ Yes |

### 📦 Accessing Built APKs

**Method 1: GitHub Releases**
1. Go to the [Releases page](../../releases)
2. Download the latest APK from the release assets

**Method 2: GitHub Actions Artifacts**
1. Go to the [Actions tab](../../actions)
2. Click on the latest workflow run
3. Download the APK from the artifacts section

### 🛠️ Manual Workflow Execution

You can manually trigger the workflow:

1. Go to the [Actions tab](../../actions)
2. Select "Build and Release APK" workflow
3. Click "Run workflow"
4. Choose the branch (usually `main`)
5. Click "Run workflow"

### 🔧 Workflow Configuration

The workflow uses these key components:

- **Node.js 20**: For building the web application
- **Java 21**: Required for Android builds
- **Android SDK**: For Capacitor Android builds
- **Ubuntu Latest**: GitHub-hosted runner

### 📋 Build Steps Detail

1. **Checkout**: Gets the latest code
2. **Setup Environment**: Installs Node.js, Java, Android SDK
3. **Install Dependencies**: Runs `npm ci`
4. **Build Web App**: Runs `npm run build`
5. **Sync Capacitor**: Runs `npx cap sync android`
6. **Build APK**: Runs `./gradlew assembleDebug`
7. **Create Release**: Automatically creates GitHub release

### 🚨 Troubleshooting

**Common Issues:**

1. **Build Fails on Dependencies**
   - Check if `package-lock.json` is committed
   - Ensure all dependencies are properly listed

2. **Android Build Fails**
   - Verify `android/` directory is committed
   - Check Capacitor configuration

3. **Release Creation Fails (403 Error)**
   - The workflow includes `permissions: contents: write` to handle this
   - If releases still fail, APK artifacts are still available in Actions tab
   - Release creation failure won't stop APK building (uses `continue-on-error`)
   - Repository owner may need to enable Actions permissions in Settings > Actions

4. **Permissions Issues**
   - Go to repository Settings > Actions > General
   - Ensure "Read and write permissions" is selected for GITHUB_TOKEN

**Viewing Build Logs:**
1. Go to Actions tab
2. Click on failed workflow run
3. Expand the failed step to see detailed logs

### 🔐 Security Notes

- Uses `GITHUB_TOKEN` (automatically provided)
- Builds debug APKs (no signing keys required)
- All builds run in isolated GitHub-hosted runners
- No sensitive data is exposed in logs

### 🎯 Future Enhancements

Potential improvements:
- Add release APK builds with proper signing
- Implement version bumping
- Add automated testing before builds
- Include build notifications
- Add iOS builds when needed

---

*This workflow ensures every code change automatically produces a testable APK, streamlining the development and testing process.*
