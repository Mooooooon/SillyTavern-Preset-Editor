# 快速安装和使用指南

## 🚀 快速开始

### 1. 开发环境测试

如果您想在开发环境中测试这个扩展：

1. 在VS Code中打开此项目文件夹
2. 按 `F5` 键启动扩展开发宿主窗口
3. 在新窗口中打开包含您的预设JSON文件的文件夹
4. 右键点击任意`.json`文件，选择"打开预设编辑器"

### 2. 手动安装扩展

1. 复制整个项目文件夹到您的VS Code扩展目录：
   ```
   Windows: %USERPROFILE%\.vscode\extensions\ai-preset-editor
   macOS: ~/.vscode/extensions/ai-preset-editor
   Linux: ~/.vscode/extensions/ai-preset-editor
   ```

2. 重启VS Code

3. 确保扩展已激活（查看扩展面板）

### 3. 使用扩展

1. **打开预设文件**：
   - 在资源管理器中右键点击`.json`文件
   - 选择"打开预设编辑器"

2. **编辑配置**：
   - 使用可视化界面编辑各种配置项
   - 在"提示词配置"部分管理提示词
   - 修改基本参数如temperature、top_p等

3. **保存更改**：
   - 点击"保存"按钮保存所有更改
   - 或使用"重新加载"恢复原始内容

## 📝 支持的文件格式

此扩展专为SillyTavern AI对话系统的预设文件设计，支持包含以下结构的JSON文件：

- `temperature`, `frequency_penalty`, `presence_penalty` 等基本参数
- `prompts` 数组包含提示词配置
- `prompt_order` 数组定义提示词顺序
- 各种对话相关的配置项

## 🔧 故障排除

**问题**: 扩展没有出现在右键菜单中
**解决**: 确保文件扩展名是`.json`且扩展已正确安装

**问题**: 无法保存更改
**解决**: 检查文件权限和JSON格式是否正确

**问题**: UI界面显示异常
**解决**: 尝试重新加载窗口或重启VS Code

## 📧 反馈

如果您遇到任何问题或有改进建议，欢迎：
- 创建Issue报告问题
- 提交Pull Request贡献代码
- 通过邮件联系开发者

## 🎉 享受使用

现在您可以通过直观的界面轻松编辑复杂的AI预设文件，无需直接编辑JSON代码！ 