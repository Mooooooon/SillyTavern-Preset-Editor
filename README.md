# AI预设编辑器

一个专为编辑AI对话预设文件设计的VS Code/Cursor扩展，提供直观的可视化界面来替代直接编辑JSON文件。

## 功能特性

- 📝 **可视化编辑**: 通过友好的UI界面编辑复杂的预设文件
- 🎯 **分类管理**: 配置项按功能分组，便于查找和管理
- ⚡ **实时保存**: 支持实时保存更改到JSON文件
- 🔧 **提示词管理**: 轻松添加、编辑和删除提示词
- 🎨 **主题适配**: 完美适配VS Code的深色和浅色主题
- 📁 **文件支持**: 支持右键菜单和快捷键启动

## 安装方法

### 开发环境安装

1. 克隆或下载此项目到本地
2. 在项目根目录运行以下命令安装依赖：
   ```bash
   npm install
   ```
3. 编译TypeScript代码：
   ```bash
   npm run compile
   ```
4. 在VS Code中打开项目文件夹
5. 按 `F5` 启动扩展开发宿主窗口

### 手动安装

1. 将整个项目文件夹复制到VS Code扩展目录：
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS: `~/.vscode/extensions`
   - Linux: `~/.vscode/extensions`
2. 重启VS Code

## 使用方法

### 打开编辑器

有多种方式可以打开AI预设编辑器：

1. **右键菜单**: 在资源管理器中右键点击`.json`文件，选择"打开预设编辑器"
2. **编辑器菜单**: 在JSON文件编辑器中右键，选择"打开预设编辑器"
3. **命令面板**: 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`），搜索"打开预设编辑器"
4. **快捷键**: 在JSON文件中按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）

### 编辑配置

编辑器界面分为以下几个部分：

#### 基本配置
- **Temperature**: 控制输出的随机性
- **Frequency Penalty**: 频率惩罚
- **Presence Penalty**: 存在惩罚
- **Top P**: 核采样参数
- **Top K**: K值采样
- **Repetition Penalty**: 重复惩罚
- **Max Context**: 最大上下文长度
- **Max Tokens**: 最大令牌数

#### 提示词配置
- 查看所有现有提示词
- 添加新的提示词
- 编辑提示词内容、名称和属性
- 删除不需要的提示词
- 设置提示词的角色（system/user/assistant）
- 启用/禁用提示词

#### 对话配置
- **模拟提示词**: 用户模拟的提示词
- **新对话提示词**: 开始新对话时的提示词
- **继续提示词**: 继续对话时的提示词
- **群组提示词**: 群组对话的提示词

#### 其他设置
- 各种开关选项，如引号包装、函数调用、网络搜索等

### 保存更改

- 点击界面顶部的"保存"按钮保存所有更改
- 使用"重新加载"按钮恢复文件的原始内容

## 支持的文件格式

此扩展专为以下格式的AI预设文件设计：

```json
{
  "temperature": 1,
  "frequency_penalty": 0,
  "prompts": [
    {
      "name": "Main Prompt",
      "system_prompt": true,
      "role": "system",
      "content": "...",
      "identifier": "main"
    }
  ],
  // ... 其他配置项
}
```

## 开发说明

### 项目结构

```
├── package.json          # 扩展清单文件
├── tsconfig.json         # TypeScript配置
├── src/
│   └── extension.ts      # 主要扩展逻辑
└── README.md            # 说明文档
```

### 构建命令

- `npm run compile`: 编译TypeScript代码
- `npm run watch`: 监听模式编译

### 技术栈

- **TypeScript**: 主要开发语言
- **VS Code API**: 扩展开发框架
- **Webview**: UI界面实现

## 贡献指南

欢迎提交Issues和Pull Requests来改进这个扩展：

1. Fork此项目
2. 创建特性分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -am '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建Pull Request

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的预设文件编辑功能
- 提供完整的UI界面
- 支持提示词管理

## 常见问题

### Q: 扩展不能正常工作怎么办？
A: 请确保：
1. JSON文件格式正确
2. 已正确安装扩展
3. VS Code版本不低于1.74.0

### Q: 如何备份我的预设文件？
A: 建议在编辑前先备份原始JSON文件，或者使用版本控制系统。

### Q: 支持哪些文件格式？
A: 目前只支持`.json`格式的预设文件。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建GitHub Issue
- 发送邮件 