# VSCode扩展发布指南

本指南将帮助您将SillyTavern预设编辑器扩展发布到VSCode扩展商店（Visual Studio Marketplace）。

## 📋 发布前检查清单

### ✅ 必需文件已创建
- [x] `LICENSE` - MIT许可证文件
- [x] `CHANGELOG.md` - 变更日志
- [x] `README.md` - 项目说明文档
- [x] `package.json` - 扩展清单文件
- [ ] 扩展图标文件（推荐128x128像素的PNG文件）

### ⚠️ 需要更新的信息

在发布前，您需要在 `package.json` 中更新以下信息：

1. **publisher**: 您的发布者名称
2. **author**: 您的姓名和邮箱
3. **repository**: GitHub仓库地址
4. **homepage**: 项目主页地址
5. **bugs**: 问题反馈地址

## 🚀 发布步骤

### 第一步：安装发布工具

首先安装Visual Studio Code Extension Manager (vsce)：

```bash
npm install -g vsce
```

### 第二步：创建Azure DevOps账户

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 使用Microsoft账户注册或登录
3. 创建一个新的组织（如果还没有）

### 第三步：获取个人访问令牌

1. 在Azure DevOps中，点击右上角的用户设置
2. 选择"Personal access tokens"
3. 点击"New Token"
4. 配置令牌：
   - **Name**: VSCode扩展发布
   - **Organization**: 选择您的组织
   - **Expiration**: 设置过期时间
   - **Scopes**: 选择"Marketplace" > "Manage"
5. 点击"Create"并保存生成的令牌

### 第四步：创建发布者账户

1. 访问 [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. 点击"Create publisher"
3. 填写发布者信息：
   - **ID**: 发布者标识符（用于package.json中的publisher字段）
   - **Display name**: 显示名称
   - **Description**: 描述
4. 完成创建

### 第五步：更新package.json

更新 `package.json` 中的 `publisher` 字段为您刚创建的发布者ID：

```json
{
  "publisher": "your-actual-publisher-id"
}
```

### 第六步：添加扩展图标（可选但推荐）

1. 创建一个128x128像素的PNG图标文件，命名为 `icon.png`
2. 将图标文件放在项目根目录
3. 在 `package.json` 中添加图标引用：

```json
{
  "icon": "icon.png"
}
```

### 第七步：编译和测试

确保扩展可以正常编译和运行：

```bash
# 安装依赖
npm install

# 编译TypeScript
npm run compile

# 在VS Code中测试扩展（按F5启动调试）
```

### 第八步：打包扩展

```bash
# 打包为.vsix文件
npm run package
```

这将生成一个 `.vsix` 文件，您可以用它进行本地测试或手动安装。

### 第九步：登录vsce

使用您的个人访问令牌登录：

```bash
vsce login your-publisher-id
```

输入您在第三步获取的个人访问令牌。

### 第十步：发布扩展

```bash
# 发布到扩展商店
npm run publish
```

或者使用vsce直接发布：

```bash
vsce publish
```

## 🔄 更新扩展

当您需要发布新版本时：

1. 更新 `CHANGELOG.md` 文件
2. 更新 `package.json` 中的版本号
3. 编译和测试更改
4. 运行发布命令：

```bash
# 自动增加补丁版本号并发布
vsce publish patch

# 自动增加次版本号并发布
vsce publish minor

# 自动增加主版本号并发布
vsce publish major

# 发布指定版本
vsce publish 1.0.1
```

## 📊 监控扩展

发布后，您可以在以下地方监控扩展：

1. **Marketplace管理页面**: https://marketplace.visualstudio.com/manage
2. **扩展页面**: https://marketplace.visualstudio.com/items?itemName=your-publisher-id.ai-preset-editor
3. **下载统计**: 在管理页面查看安装和下载数据

## ⚠️ 注意事项

1. **版本控制**: 一旦发布版本，就不能删除或修改。确保版本号正确。
2. **内容审核**: Microsoft会审核扩展内容，确保符合政策。
3. **更新频率**: 避免频繁发布小更新，建议积累多个改进后再发布。
4. **用户反馈**: 关注扩展页面的评论和评分，及时回应用户反馈。

## 🆘 故障排除

### 常见错误及解决方案

1. **"Publisher not found"**
   - 确保在package.json中使用正确的发布者ID
   - 确保已经创建了发布者账户

2. **"Personal access token is invalid"**
   - 检查令牌是否过期
   - 确保令牌有"Marketplace Manage"权限

3. **"Extension validation failed"**
   - 检查package.json格式是否正确
   - 确保所有必需字段都已填写

4. **编译错误**
   - 运行 `npm run compile` 检查TypeScript编译错误
   - 确保所有依赖都已安装

## 📞 获取帮助

如果遇到问题，可以：

1. 查看 [vsce官方文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
2. 访问 [VS Code扩展开发指南](https://code.visualstudio.com/api)
3. 在 [GitHub Issues](https://github.com/Microsoft/vscode-vsce/issues) 中搜索相关问题

祝您发布成功！🎉 