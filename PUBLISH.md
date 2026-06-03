# Publishing to npm (公网)

This package is ready to publish but the build agent has no npm
credentials. The repo owner must run these steps locally.

> **⚠️ Registry 注意**：你本机的 `~/.npmrc` 指向
> `https://npm.corp.kuaishou.com`（快手内网镜像）。`package.json` 已
> 加了 `"publishConfig": { "registry": "https://registry.npmjs.org/" }`，
> **只影响 publish**，不影响 `npm install`。所以下面的步骤能直接跑。

## 0. 先在公网 npmjs.org 注册账号

如果还没有，去 <https://www.npmjs.com/signup> 注册。
- 用户名建议和你 GitHub 一致（这里是 `AMark-CS`）
- **必须开启 2FA**（npmjs.org 现在强制）：下载 Authy / 1Password / Google Authenticator
- 验证邮箱后才能 publish

## 1. 登录公网 npm

```bash
npm login --registry=https://registry.npmjs.org/
# Username: amark-cs   (或你注册时填的)
# Password: ********
# Email:    (your-email)
# OTP:      (2FA 验证码)
```

确认登录的是**公网**：

```bash
npm whoami --registry=https://registry.npmjs.org/
```

应该输出你的公网用户名。

## 2. 检查包名是否被占

```bash
npm view opencode-buddy --registry=https://registry.npmjs.org/
```

- 如果返回 404：名字可用 ✓
- 如果返回版本号：被占 ✗ → 改用 scoped 名字（见末尾"名字冲突"）

## 3. Dry run 看会发什么

```bash
cd ~/code/opencode-buddy
npm pack --dry-run
```

应该看到 12 个文件（bin + src + README + LICENSE + package.json），不包含 `node_modules/` 或 `package-lock.json`。

## 4. 发布

```bash
npm publish
```

你会看到类似：

```
npm notice 📦  opencode-buddy@0.2.0
+ opencode-buddy@0.2.0
```

`publishConfig` 让这一步自动走公网 registry，不影响你内网 `npm install`。

## 5. 验证

```bash
# 1. 在 npmjs.org 上能看到
open https://www.npmjs.com/package/opencode-buddy

# 2. 在一个干净目录装一下试试
mkdir /tmp/buddy-test && cd /tmp/buddy-test
npm install opencode-buddy
npx opencode-buddy install   # 这一步是写到 ~/.config/opencode/，不污染项目
# 重启 opencode
# /buddy
```

## 6. 同步 git tag

```bash
git push --follow-tags
```

之前 v0.2.0 tag 已经推过了，这条只是确保没漏。

## 名字冲突怎么办

`opencode-buddy` 这个名很通用，公网上很可能被占。如果被占，几个备选：

```bash
# 方案 A: 改用 scoped 包（推荐）
# 改 package.json:
#   "name": "@amark-cs/opencode-buddy",
#   "publishConfig": { "registry": "...", "access": "public" }
# 然后:
npm publish --access public

# 方案 B: 加前缀
#   "name": "amark-opencode-buddy",
#   或 "opencode-buddy-amark"
```

## 常见问题

### Q: 报 `ENEEDAUTH` / 401
没登录或登录到了内网。重新跑 `npm login --registry=https://registry.npmjs.org/`。

### Q: 报 `EOTP` / 需要 OTP
公网 2FA 强制。装 Authy 扫 npmjs.org 设置页的 QR 码。publish 时它会要求输入 6 位码。

### Q: 报包名已存在
见上面"名字冲突"。

### Q: 报 `payment required` / 私有包错误
scoped 包默认私有。必须加 `--access public` 或者 `publishConfig.access: "public"`（已加）。

### Q: 内网同事 install 不到公网包？
- 公司内网 registry 通常**会代理公网**，所以 `npm install opencode-buddy` 仍然能装到
- 装到的还是公网版本（因为 `publishConfig` 只影响 publish）
- 验证：`npm view opencode-buddy version --registry=https://npm.corp.kuaishou.com`

## 未来版本

```bash
npm version patch   # 0.2.0 -> 0.2.1
npm version minor   # 0.2.0 -> 0.3.0
npm version major   # 0.2.0 -> 1.0.0
npm publish
git push --follow-tags
```

`npm version` 也自动创建 git tag。
