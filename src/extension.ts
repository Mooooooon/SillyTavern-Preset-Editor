import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface PresetData {
  temperature: number;
  frequency_penalty: number;
  presence_penalty: number;
  top_p: number;
  top_k: number;
  top_a: number;
  min_p: number;
  repetition_penalty: number;
  openai_max_context: number;
  openai_max_tokens: number;
  wrap_in_quotes: boolean;
  names_behavior: number;
  send_if_empty: string;
  impersonation_prompt: string;
  new_chat_prompt: string;
  new_group_chat_prompt: string;
  new_example_chat_prompt: string;
  continue_nudge_prompt: string;
  bias_preset_selected: string;
  max_context_unlocked: boolean;
  wi_format: string;
  scenario_format: string;
  personality_format: string;
  group_nudge_prompt: string;
  stream_openai: boolean;
  prompts: Prompt[];
  prompt_order: PromptOrder[];
  assistant_prefill: string;
  assistant_impersonation: string;
  claude_use_sysprompt: boolean;
  use_makersuite_sysprompt: boolean;
  squash_system_messages: boolean;
  image_inlining: boolean;
  inline_image_quality: string;
  continue_prefill: boolean;
  continue_postfix: string;
  function_calling: boolean;
  show_thoughts: boolean;
  reasoning_effort: string;
  enable_web_search: boolean;
  request_images: boolean;
  seed: number;
  n: number;
}

interface Prompt {
  identifier: string;
  name: string;
  system_prompt: boolean;
  role: string;
  content: string;
  enabled?: boolean; // 在prompt对象中的enabled字段（通常由prompt_order管理）
  marker?: boolean;
  injection_position?: number;
  injection_depth?: number;
  injection_order?: number;
  forbid_overrides?: boolean;
}

interface PromptOrder {
  character_id: number;
  order: Array<{
    identifier: string;
    enabled: boolean;
  }>;
}

interface PresetNavigationItem {
  label: string;
  sectionId: string;
  type: 'section' | 'prompt';
  promptIndex?: number;
}

class PresetNavigationProvider
  implements vscode.TreeDataProvider<PresetNavigationItem>, vscode.TreeDragAndDropController<PresetNavigationItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<PresetNavigationItem | undefined | null | void> =
    new vscode.EventEmitter<PresetNavigationItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<PresetNavigationItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private data: PresetNavigationItem[] = [];
  private activeFilePath: string = '';
  private presetData: PresetData | null = null;
  private panelMap: Map<string, vscode.WebviewPanel> | null = null;

  // 支持的拖放类型
  dropMimeTypes = ['application/vnd.code.tree.presetNavigator'];
  dragMimeTypes = ['application/vnd.code.tree.presetNavigator'];

  setPanelMap(panelMap: Map<string, vscode.WebviewPanel>): void {
    this.panelMap = panelMap;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateData(presetData: PresetData | null, filePath: string): void {
    this.activeFilePath = filePath;
    this.presetData = presetData;
    this.data = presetData ? this.generateNavigationItems(presetData) : [];
    this.refresh();
  }

  private generateNavigationItems(presetData: PresetData): PresetNavigationItem[] {
    // 如果没有数据，返回空数组
    if (!presetData || (!presetData.prompts && !presetData.prompt_order)) {
      return [];
    }

    const items: PresetNavigationItem[] = [
      { label: '📊 基本配置', sectionId: 'basic-config', type: 'section' },
      { label: '💬 对话配置', sectionId: 'chat-config', type: 'section' },
      { label: '⚙️ 其他设置', sectionId: 'other-settings', type: 'section' },
      { label: '📝 提示词配置', sectionId: 'prompts-config', type: 'section' },
    ];

    // 跟踪已经添加到导航的提示词
    const addedPromptIdentifiers = new Set<string>();

    // 根据 character_id: 100001 的排序来显示提示词
    if (presetData.prompts && presetData.prompt_order) {
      // 找到真正的排序配置 (character_id: 100001)
      const actualOrder = presetData.prompt_order.find(order => order.character_id === 100001);

      if (actualOrder && actualOrder.order) {
        // 创建提示词映射，便于快速查找
        const promptMap = new Map();
        presetData.prompts.forEach((prompt, index) => {
          promptMap.set(prompt.identifier, { prompt, originalIndex: index });
        });

        // 按照实际顺序添加已插入的提示词
        actualOrder.order.forEach((orderItem, orderIndex) => {
          const promptData = promptMap.get(orderItem.identifier);
          if (promptData) {
            const { prompt, originalIndex } = promptData;
            const enabledIcon = orderItem.enabled ? '✅' : '⭕';
            const label = `  ${enabledIcon} ${prompt.name || '未命名提示词'}`;

            items.push({
              label: label,
              sectionId: `prompt-${originalIndex}`,
              type: 'prompt',
              promptIndex: originalIndex,
            });

            // 记录已添加的提示词
            addedPromptIdentifiers.add(prompt.identifier);
          }
        });

        // 查找未插入的提示词
        const uninsertedPrompts: Array<{ prompt: any; originalIndex: number }> = [];
        presetData.prompts.forEach((prompt, index) => {
          if (!addedPromptIdentifiers.has(prompt.identifier)) {
            uninsertedPrompts.push({ prompt, originalIndex: index });
          }
        });

        // 如果有未插入的提示词，添加分隔符和未插入的条目
        if (uninsertedPrompts.length > 0) {
          items.push({
            label: '❌ 未插入条目',
            sectionId: 'uninserted-prompts',
            type: 'section',
          });

          uninsertedPrompts.forEach(({ prompt, originalIndex }) => {
            items.push({
              label: `  🔸 ${prompt.name || '未命名提示词'}`,
              sectionId: `prompt-${originalIndex}`,
              type: 'prompt',
              promptIndex: originalIndex,
            });
          });
        }
      } else {
        // 如果找不到 character_id: 100001，回退到原始顺序
        presetData.prompts.forEach((prompt, index) => {
          items.push({
            label: `  └ ${prompt.name || '未命名提示词'}`,
            sectionId: `prompt-${index}`,
            type: 'prompt',
            promptIndex: index,
          });
        });
      }
    }

    return items;
  }

  getTreeItem(element: PresetNavigationItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);

    item.command = {
      command: 'presetEditor.jumpToSection',
      title: '跳转到配置项',
      arguments: [element.sectionId, this.activeFilePath],
    };

    if (element.type === 'section') {
      item.iconPath = new vscode.ThemeIcon('gear');
    } else {
      item.iconPath = new vscode.ThemeIcon('comment');
    }

    return item;
  }

  getChildren(element?: PresetNavigationItem): Thenable<PresetNavigationItem[]> {
    if (!element) {
      return Promise.resolve(this.data);
    }
    return Promise.resolve([]);
  }

  // 处理拖拽开始
  async handleDrag(
    source: PresetNavigationItem[],
    treeDataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken,
  ): Promise<void> {
    // 只允许拖拽提示词类型的项目，且必须是已插入的（不是未插入分组中的）
    const draggableItems = source.filter(
      item => item.type === 'prompt' && item.promptIndex !== undefined && this.isPromptInOrder(item.promptIndex),
    );

    if (draggableItems.length > 0) {
      treeDataTransfer.set('application/vnd.code.tree.presetNavigator', new vscode.DataTransferItem(draggableItems));
    }
  }

  // 处理拖拽放置
  async handleDrop(
    target: PresetNavigationItem | undefined,
    sources: vscode.DataTransfer,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const transferItem = sources.get('application/vnd.code.tree.presetNavigator');
    if (!transferItem || !this.presetData) {
      return;
    }

    const draggedItems = transferItem.value as PresetNavigationItem[];
    if (draggedItems.length === 0) {
      return;
    }

    // 只处理提示词的重新排序
    const draggedPromptItem = draggedItems[0];
    if (draggedPromptItem.type !== 'prompt' || draggedPromptItem.promptIndex === undefined) {
      return;
    }

    // 获取被拖拽的提示词
    const draggedPrompt = this.presetData.prompts[draggedPromptItem.promptIndex];
    if (!draggedPrompt) {
      return;
    }

    // 找到prompt_order
    let actualOrder = this.presetData.prompt_order?.find(order => order.character_id === 100001);
    if (!actualOrder) {
      return;
    }

    // 找到被拖拽项目在order中的索引
    const draggedOrderIndex = actualOrder.order.findIndex(item => item.identifier === draggedPrompt.identifier);
    if (draggedOrderIndex === -1) {
      return;
    }

    let targetOrderIndex = 0; // 默认放到开头

    // 如果有目标项目，计算插入位置
    if (target && target.type === 'prompt' && target.promptIndex !== undefined) {
      const targetPrompt = this.presetData.prompts[target.promptIndex];
      if (targetPrompt) {
        const targetOrderIndexInArray = actualOrder.order.findIndex(
          item => item.identifier === targetPrompt.identifier,
        );
        if (targetOrderIndexInArray !== -1) {
          targetOrderIndex = targetOrderIndexInArray;
        }
      }
    }

    // 执行重新排序
    const draggedOrderItem = actualOrder.order.splice(draggedOrderIndex, 1)[0];

    // 调整插入位置（如果目标在被拖拽项目之后，需要减1）
    if (targetOrderIndex > draggedOrderIndex) {
      targetOrderIndex--;
    }

    actualOrder.order.splice(targetOrderIndex, 0, draggedOrderItem);

    // 刷新导航和通知webview
    this.updateData(this.presetData, this.activeFilePath);
    this.notifyWebviewOfChanges();

    // 自动保存更改到文件
    this.saveChangesToFile();

    vscode.window.showInformationMessage(`"${draggedPrompt.name}" 已重新排序`);
  }

  // 检查提示词是否在order中
  private isPromptInOrder(promptIndex: number): boolean {
    if (!this.presetData || !this.presetData.prompts[promptIndex] || !this.presetData.prompt_order) {
      return false;
    }

    const prompt = this.presetData.prompts[promptIndex];
    const actualOrder = this.presetData.prompt_order.find(order => order.character_id === 100001);

    return actualOrder?.order.some(item => item.identifier === prompt.identifier) || false;
  }

  // 通知webview数据已更改
  private notifyWebviewOfChanges(): void {
    if (!this.presetData || !this.activeFilePath || !this.panelMap) {
      return;
    }

    // 找到对应的webview panel并发送更新消息
    const panel = this.panelMap.get(this.activeFilePath);
    if (panel) {
      panel.webview.postMessage({
        command: 'loadData',
        data: this.presetData,
        filePath: this.activeFilePath,
      });
    }
  }

  // 保存更改到文件
  private saveChangesToFile(): void {
    if (!this.presetData || !this.activeFilePath) {
      return;
    }

    try {
      const jsonString = JSON.stringify(this.presetData, null, 4);
      const fs = require('fs');
      fs.writeFileSync(this.activeFilePath, jsonString, 'utf8');
    } catch (error) {
      vscode.window.showErrorMessage(`保存文件失败: ${error}`);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  // 使用Map来存储多个panel，key为文件路径
  const panelMap: Map<string, vscode.WebviewPanel> = new Map();

  // 创建导航提供程序
  const navigationProvider = new PresetNavigationProvider();
  navigationProvider.setPanelMap(panelMap);

  const treeView = vscode.window.createTreeView('presetNavigator', {
    treeDataProvider: navigationProvider,
    dragAndDropController: navigationProvider,
  });

  // 设置上下文变量来控制侧边栏显示
  vscode.commands.executeCommand('setContext', 'presetEditor.active', false);

  // 监听文档保存事件，用于同步临时文件的修改
  const saveWatcher = vscode.workspace.onDidSaveTextDocument(document => {
    const filePath = document.fileName;
    const mapping = tempFileMap.get(filePath);

    console.log('Document saved:', filePath);
    console.log('Mapping found:', !!mapping);

    if (mapping) {
      syncTempFileToOriginal(document, mapping, navigationProvider);
    }
  });

  // 监听文档关闭事件，清理临时文件
  const closeWatcher = vscode.workspace.onDidCloseTextDocument(document => {
    const filePath = document.fileName;
    const mapping = tempFileMap.get(filePath);

    if (mapping) {
      // 清理映射关系
      tempFileMap.delete(filePath);

      // 删除临时文件
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // 忽略删除错误
        console.log('删除临时文件失败:', error);
      }
    }
  });

  const disposable = vscode.commands.registerCommand('presetEditor.openEditor', (uri?: vscode.Uri) => {
    let filePath: string;

    if (uri) {
      filePath = uri.fsPath;
    } else {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage('请先选择一个JSON文件');
        return;
      }
      filePath = activeEditor.document.fileName;
    }

    if (!filePath.endsWith('.json')) {
      vscode.window.showErrorMessage('请选择一个JSON文件');
      return;
    }

    // 从文件路径提取文件名（不含扩展名）
    const fileName = filePath.split(/[/\\]/).pop()?.replace('.json', '') || 'AI预设编辑器';

    // 检查是否已经有该文件的panel打开
    const existingPanel = panelMap.get(filePath);
    if (existingPanel) {
      // 如果已存在，直接切换到该panel
      existingPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    // 创建新的panel
    const panel = vscode.window.createWebviewPanel('presetEditor', fileName, vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });

    // 将新panel添加到Map中
    panelMap.set(filePath, panel);

    // 监听 panel 的视图状态变化
    panel.onDidChangeViewState(
      e => {
        if (e.webviewPanel.active) {
          updateActivePanel(e.webviewPanel);
        }
      },
      null,
      context.subscriptions,
    );

    panel.onDidDispose(
      () => {
        // panel关闭时从Map中删除
        panelMap.delete(filePath);

        // 如果没有剩余的预设编辑器，清空导航并隐藏侧边栏
        if (panelMap.size === 0) {
          navigationProvider.updateData(null, '');
          vscode.commands.executeCommand('setContext', 'presetEditor.active', false);
        }
      },
      null,
      context.subscriptions,
    );

    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'save':
            savePreset(filePath, message.data);
            // 保存后刷新导航面板
            if (navigationProvider) {
              loadPreset(filePath, panel, navigationProvider);
            }
            return;
          case 'load':
            loadPreset(filePath, panel, navigationProvider);
            return;
          case 'openPromptInEditor':
            openPromptInSeparateEditor(message, filePath, panel);
            return;
          case 'autoSave':
            // 新增：自动保存命令，用于插入、启用等操作后的自动保存
            savePreset(filePath, message.data);
            // 自动保存后也要刷新导航面板
            if (navigationProvider) {
              loadPreset(filePath, panel, navigationProvider);
            }
            return;
        }
      },
      undefined,
      context.subscriptions,
    );

    panel.webview.html = getWebviewContent();
    loadPreset(filePath, panel, navigationProvider);

    // 设置为当前活动panel
    updateActivePanel(panel);
  });

  // 注册跳转命令
  const jumpCommand = vscode.commands.registerCommand(
    'presetEditor.jumpToSection',
    (sectionId: string, filePath: string) => {
      const panel = panelMap.get(filePath);
      if (panel) {
        panel.reveal(vscode.ViewColumn.One);
        panel.webview.postMessage({
          command: 'jumpToSection',
          sectionId: sectionId,
        });
      }
    },
  );

  // 手动清理临时文件的命令
  const cleanupCommand = vscode.commands.registerCommand('presetEditor.cleanupTempFiles', () => {
    cleanupTempFiles();
    vscode.window.showInformationMessage('临时文件清理完成');
  });

  // 监听webview panel状态变化
  let currentActivePanel: vscode.WebviewPanel | undefined;

  const updateActivePanel = (activePanel?: vscode.WebviewPanel) => {
    currentActivePanel = activePanel;
    if (activePanel && activePanel.viewType === 'presetEditor') {
      // 找到对应的文件路径
      for (const [filePath, storedPanel] of panelMap.entries()) {
        if (storedPanel === activePanel) {
          // 重新加载该文件的数据并更新导航
          loadPreset(filePath, activePanel, navigationProvider);
          break;
        }
      }
    } else {
      // 如果没有激活的预设编辑器，清空导航并隐藏侧边栏
      navigationProvider.updateData(null, '');
      vscode.commands.executeCommand('setContext', 'presetEditor.active', false);
    }
  };

  // 添加文档关闭监听器，触发清理
  const documentCloseWatcher = vscode.workspace.onDidCloseTextDocument(document => {
    const filePath = document.uri.fsPath;

    // 如果关闭的是临时文件，从映射中移除
    if (tempFileMap.has(filePath)) {
      console.log('临时文件已关闭:', filePath);
      // 不立即删除文件，让定时清理处理
    }

    // 每次有文档关闭时，触发一次清理（延迟执行）
    setTimeout(() => {
      cleanupTempFiles();
    }, 1000);
  });

  context.subscriptions.push(
    treeView,
    disposable,
    jumpCommand,
    cleanupCommand,
    saveWatcher,
    closeWatcher,
    documentCloseWatcher,
  );

  // 启动清理功能
  console.log('AI预设编辑器已激活，启动临时文件清理功能');

  // 执行初始清理
  setTimeout(() => {
    cleanupTempFiles();
  }, 2000);

  // 启动定时清理
  startCleanupTimer();
}

// 用于跟踪临时文件和原始数据的映射
const tempFileMap: Map<
  string,
  {
    originalFilePath: string;
    promptIndex: number;
    panel: vscode.WebviewPanel;
  }
> = new Map();

// 清理定时器
let cleanupTimer: NodeJS.Timeout | undefined;

// 清理临时文件的函数
function cleanupTempFiles() {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return;
    }

    const tempDir = path.join(workspaceFolder, 'temp');
    if (!fs.existsSync(tempDir)) {
      return;
    }

    console.log('开始清理临时文件...');
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30分钟
    let cleanedCount = 0;

    // 获取当前在VS Code中打开的所有文件路径
    const openFilePaths = new Set<string>();
    vscode.workspace.textDocuments.forEach(doc => {
      openFilePaths.add(doc.uri.fsPath);
    });

    // 检查temp文件夹中的所有文件
    const tempFiles = fs.readdirSync(tempDir);

    tempFiles.forEach(fileName => {
      const filePath = path.join(tempDir, fileName);

      // 检查文件统计信息
      try {
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtime.getTime();
        const isFileOpen = openFilePaths.has(filePath);
        const isInTempMap = tempFileMap.has(filePath);

        // 删除条件：
        // 1. 文件超过最大年龄（30分钟）且未在编辑器中打开
        // 2. 或者文件不在tempFileMap中且未打开（孤儿文件）
        const shouldDelete =
          (fileAge > maxAge && !isFileOpen) || (!isInTempMap && !isFileOpen && fileAge > 5 * 60 * 1000); // 5分钟后清理孤儿文件

        if (shouldDelete) {
          fs.unlinkSync(filePath);
          tempFileMap.delete(filePath);
          cleanedCount++;
          console.log(
            `删除临时文件: ${fileName} (年龄: ${Math.round(fileAge / 1000 / 60)}分钟, 已打开: ${isFileOpen})`,
          );
        }
      } catch (error) {
        console.log(`检查文件 ${fileName} 时出错:`, error);
      }
    });

    // 清理tempFileMap中指向已删除文件的条目
    for (const [filePath] of tempFileMap) {
      if (!fs.existsSync(filePath)) {
        tempFileMap.delete(filePath);
      }
    }

    if (cleanedCount > 0) {
      console.log(`清理完成，删除了 ${cleanedCount} 个临时文件`);
      console.log(`tempFileMap 当前大小: ${tempFileMap.size}`);
    }
  } catch (error) {
    console.error('清理临时文件时出错:', error);
  }
}

// 启动定时清理
function startCleanupTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }

  // 每10分钟清理一次
  cleanupTimer = setInterval(() => {
    cleanupTempFiles();
  }, 10 * 60 * 1000);

  console.log('临时文件清理定时器已启动（每10分钟清理一次）');
}

// 停止定时清理
function stopCleanupTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = undefined;
    console.log('临时文件清理定时器已停止');
  }
}

async function openPromptInSeparateEditor(message: any, originalFilePath: string, panel: vscode.WebviewPanel) {
  try {
    // 允许多个实例同时打开，不进行重复检查

    // 创建临时文件在工作区的temp目录下
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('未找到工作区文件夹');
      return;
    }

    // 创建temp文件夹
    const tempDir = path.join(workspaceFolder, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 从原始文件路径获取预设名
    const presetName = path.basename(originalFilePath, '.json');

    // 清理文件名中的特殊字符
    const safePromptName = message.promptName.replace(/[<>:"/\\|?*]/g, '_');

    // 添加时间戳确保文件名唯一，允许同时打开多个相同名称的提示词
    const timestamp = Date.now();
    const tempFileName = `${presetName}-${safePromptName}-${timestamp}.md`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // 写入提示词内容到临时文件
    const content = `# ${message.promptName}\n\n${message.content || ''}`;
    fs.writeFileSync(tempFilePath, content, 'utf8');

    // 确保 .gitignore 包含临时文件夹
    const gitignorePath = path.join(workspaceFolder, '.gitignore');
    const tempDirPattern = 'temp/';

    try {
      let gitignoreContent = '';
      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      }

      if (!gitignoreContent.includes(tempDirPattern)) {
        gitignoreContent += gitignoreContent.endsWith('\n') ? '' : '\n';
        gitignoreContent += `# AI预设编辑器临时文件夹\n${tempDirPattern}\n`;
        fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
      }
    } catch (error) {
      // 忽略 gitignore 更新错误
      console.log('更新 .gitignore 失败:', error);
    }

    // 记录映射关系
    console.log('创建临时文件:', tempFilePath);
    console.log('原始文件路径:', originalFilePath);
    console.log('提示词索引:', message.promptIndex);

    tempFileMap.set(tempFilePath, {
      originalFilePath: originalFilePath,
      promptIndex: message.promptIndex,
      panel: panel,
    });

    console.log('tempFileMap 当前大小:', tempFileMap.size);

    // 在VS Code中打开临时文件，所有临时文件都在同一个编辑器组中
    const document = await vscode.workspace.openTextDocument(tempFilePath);
    await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: false,
      preview: false, // 禁用预览模式，确保文件在新标签页中打开
    });

    // 确保文件被标记为已修改状态，防止被后续文件覆盖
    setTimeout(async () => {
      try {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.fsPath === tempFilePath) {
          // 在文件末尾添加一个不可见的修改，然后立即撤销
          const lastLine = editor.document.lineCount - 1;
          const lastCharacter = editor.document.lineAt(lastLine).text.length;
          const position = new vscode.Position(lastLine, lastCharacter);

          await editor.edit(editBuilder => {
            editBuilder.insert(position, ' ');
          });

          // 立即撤销这个修改，但文件仍会被标记为"活跃"状态
          await vscode.commands.executeCommand('undo');
        }
      } catch (error) {
        console.log('标记文件活跃状态失败:', error);
      }
    }, 100);

    vscode.window.showInformationMessage('提示词已在新编辑器中打开，保存文件时会自动同步回预设');
  } catch (error) {
    vscode.window.showErrorMessage(`打开编辑器失败: ${error}`);
  }
}

function syncTempFileToOriginal(
  document: vscode.TextDocument,
  mapping: {
    originalFilePath: string;
    promptIndex: number;
    panel: vscode.WebviewPanel;
  },
  navigationProvider?: PresetNavigationProvider,
) {
  try {
    console.log('开始同步文件，原始文件路径:', mapping.originalFilePath);
    console.log('提示词索引:', mapping.promptIndex);

    // 读取临时文件内容
    const tempContent = document.getText();
    console.log('临时文件内容长度:', tempContent.length);
    console.log('临时文件前100个字符:', tempContent.substring(0, 100));

    // 去掉markdown标题，提取实际内容
    const lines = tempContent.split('\n');
    let contentStartIndex = 0;

    // 跳过markdown标题行和空行
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() !== '' && !lines[i].startsWith('#')) {
        contentStartIndex = i;
        break;
      }
      if (lines[i].trim() === '' && i > 0 && lines[i - 1].startsWith('#')) {
        contentStartIndex = i + 1;
        break;
      }
    }

    const promptContent = lines.slice(contentStartIndex).join('\n').trimEnd();
    console.log('提取的提示词内容长度:', promptContent.length);

    // 读取原始JSON文件
    const originalContent = fs.readFileSync(mapping.originalFilePath, 'utf8');
    const presetData: PresetData = JSON.parse(originalContent);
    console.log('成功读取原始JSON文件');

    // 更新对应的提示词内容
    if (presetData.prompts && presetData.prompts[mapping.promptIndex]) {
      console.log('更新前的内容长度:', presetData.prompts[mapping.promptIndex].content?.length || 0);
      presetData.prompts[mapping.promptIndex].content = promptContent;
      console.log('更新后的内容长度:', presetData.prompts[mapping.promptIndex].content?.length || 0);

      // 保存更新后的JSON文件
      const jsonString = JSON.stringify(presetData, null, 4);
      fs.writeFileSync(mapping.originalFilePath, jsonString, 'utf8');
      console.log('JSON文件已保存');

      // 通知webview重新加载数据
      mapping.panel.webview.postMessage({
        command: 'loadData',
        data: presetData,
        filePath: mapping.originalFilePath,
      });
      console.log('已通知webview重新加载');

      // 更新导航侧边栏
      if (navigationProvider) {
        navigationProvider.updateData(presetData, mapping.originalFilePath);
      }

      vscode.window.showInformationMessage('提示词内容已同步到预设文件');
    } else {
      console.error('找不到对应的提示词:', mapping.promptIndex);
      console.error('prompts数组长度:', presetData.prompts?.length || 0);
      vscode.window.showErrorMessage('找不到对应的提示词');
    }
  } catch (error) {
    console.error('同步文件失败:', error);
    vscode.window.showErrorMessage(`同步文件失败: ${error}`);
  }
}

function loadPreset(filePath: string, panel: vscode.WebviewPanel, navigationProvider?: PresetNavigationProvider) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const presetData: PresetData = JSON.parse(fileContent);

    panel.webview.postMessage({
      command: 'loadData',
      data: presetData,
      filePath: filePath,
    });

    // 更新导航侧边栏
    if (navigationProvider) {
      navigationProvider.updateData(presetData, filePath);
      vscode.commands.executeCommand('setContext', 'presetEditor.active', true);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`加载文件失败: ${error}`);
  }
}

function savePreset(filePath: string, data: PresetData) {
  try {
    const jsonString = JSON.stringify(data, null, 4);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    vscode.window.showInformationMessage('预设文件已保存');
  } catch (error) {
    vscode.window.showErrorMessage(`保存文件失败: ${error}`);
  }
}

function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI预设编辑器</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--vscode-widget-border); }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid var(--vscode-widget-border); border-radius: 5px; background-color: var(--vscode-editor-background); }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--vscode-textLink-foreground); }
        .form-group { margin-bottom: 15px; }
        .form-row { display: flex; gap: 20px; margin-bottom: 15px; }
        .form-col { flex: 1; }
        label { display: block; margin-bottom: 5px; font-weight: 500; color: var(--vscode-foreground); }
        input, textarea, select { width: 100%; padding: 8px 12px; border: 1px solid var(--vscode-input-border); background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px; font-size: 14px; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: var(--vscode-focusBorder); }
        textarea { min-height: 100px; resize: vertical; }
        .checkbox-group { display: flex; align-items: center; gap: 8px; }
        .checkbox-group input[type="checkbox"] { width: auto; }
        .checkbox-group input[type="checkbox"]:disabled { opacity: 0.6; cursor: not-allowed; }
        .checkbox-group input[type="checkbox"]:disabled + label { opacity: 0.6; cursor: not-allowed; }
        .button-group { display: flex; gap: 10px; margin-top: 20px; }
        button { padding: 10px 20px; border: 1px solid var(--vscode-button-border); background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 3px; cursor: pointer; font-size: 14px; }
        button:hover { background-color: var(--vscode-button-hoverBackground); }
        .primary-button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); }
        .secondary-button { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
        .prompt-item { border: 1px solid var(--vscode-widget-border); padding: 15px; margin-bottom: 15px; border-radius: 5px; background-color: var(--vscode-editor-background); }
        .prompt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .prompt-name { font-weight: bold; color: var(--vscode-textLink-foreground); }
        .prompt-actions { display: flex; gap: 10px; }
        .delete-button { background-color: var(--vscode-errorForeground); color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; }
        .add-button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 1px solid var(--vscode-button-border); padding: 10px 15px; border-radius: 3px; cursor: pointer; margin-bottom: 15px; }
        .collapsible { cursor: pointer; user-select: none; }
        .collapsible:before { content: '▼ '; margin-right: 5px; }
        .collapsible.collapsed:before { content: '▶ '; }
        .collapsible-content { margin-top: 15px; }
        .collapsible-content.hidden { display: none; }
        .file-path { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 10px; }
        .placeholder-notice { 
            padding: 12px; 
            background-color: var(--vscode-textBlockQuote-background); 
            border-left: 4px solid var(--vscode-textBlockQuote-border); 
            color: var(--vscode-descriptionForeground); 
            font-style: italic; 
            border-radius: 3px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI预设编辑器</h1>
            <div class="file-path" id="filePath">未选择文件</div>
            <div class="button-group">
                <button class="primary-button" onclick="saveData()">保存 (Ctrl+S)</button>
                <button class="secondary-button" onclick="loadData()">重新加载</button>
            </div>
        </div>

        <div class="section">
            <div class="section-title collapsible" onclick="toggleSection(this)">基本配置</div>
            <div class="collapsible-content" id="basic-config">
                <div class="form-row">
                    <div class="form-col">
                        <label for="temperature">Temperature:</label>
                        <input type="number" id="temperature" step="0.1" min="0" max="2">
                    </div>
                    <div class="form-col">
                        <label for="frequency_penalty">Frequency Penalty:</label>
                        <input type="number" id="frequency_penalty" step="0.1" min="-2" max="2">
                    </div>
                    <div class="form-col">
                        <label for="presence_penalty">Presence Penalty:</label>
                        <input type="number" id="presence_penalty" step="0.1" min="-2" max="2">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label for="top_p">Top P:</label>
                        <input type="number" id="top_p" step="0.1" min="0" max="1">
                    </div>
                    <div class="form-col">
                        <label for="top_k">Top K:</label>
                        <input type="number" id="top_k" min="0">
                    </div>
                    <div class="form-col">
                        <label for="repetition_penalty">Repetition Penalty:</label>
                        <input type="number" id="repetition_penalty" step="0.1" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label for="openai_max_context">Max Context:</label>
                        <input type="number" id="openai_max_context" min="1">
                    </div>
                    <div class="form-col">
                        <label for="openai_max_tokens">Max Tokens:</label>
                        <input type="number" id="openai_max_tokens" min="1">
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title collapsible" onclick="toggleSection(this)">提示词配置</div>
            <div class="collapsible-content" id="prompts-config">
                <button class="add-button" onclick="addPrompt()">添加新提示词</button>
                <div id="prompts-container"></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title collapsible" onclick="toggleSection(this)">对话配置</div>
            <div class="collapsible-content" id="chat-config">
                <div class="form-group">
                    <label for="impersonation_prompt">模拟提示词:</label>
                    <textarea id="impersonation_prompt"></textarea>
                </div>
                <div class="form-group">
                    <label for="new_chat_prompt">新对话提示词:</label>
                    <textarea id="new_chat_prompt"></textarea>
                </div>
                <div class="form-group">
                    <label for="continue_nudge_prompt">继续提示词:</label>
                    <textarea id="continue_nudge_prompt"></textarea>
                </div>
                <div class="form-group">
                    <label for="group_nudge_prompt">群组提示词:</label>
                    <textarea id="group_nudge_prompt"></textarea>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title collapsible" onclick="toggleSection(this)">其他设置</div>
            <div class="collapsible-content" id="other-settings">
                <div class="form-row">
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" id="wrap_in_quotes">
                            <label for="wrap_in_quotes">引号包装</label>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" id="max_context_unlocked">
                            <label for="max_context_unlocked">解锁最大上下文</label>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" id="stream_openai">
                            <label for="stream_openai">流式输出</label>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" id="function_calling">
                            <label for="function_calling">函数调用</label>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" id="enable_web_search">
                            <label for="enable_web_search">启用网络搜索</label>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" id="show_thoughts">
                            <label for="show_thoughts">显示思考过程</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentData = null;
        let currentFilePath = '';

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'loadData':
                    currentData = message.data;
                    currentFilePath = message.filePath;
                    populateForm(message.data);
                    updateFilePath(message.filePath);
                    break;
                case 'jumpToSection':
                    jumpToSection(message.sectionId);
                    break;
            }
        });

        function updateFilePath(filePath) {
            document.getElementById('filePath').textContent = filePath;
        }

        function jumpToSection(sectionId) {
            if (sectionId.startsWith('prompt-')) {
                // 跳转到具体的提示词
                const promptIndex = parseInt(sectionId.replace('prompt-', ''));
                const promptElements = document.querySelectorAll('.prompt-item');
                if (promptElements[promptIndex]) {
                    promptElements[promptIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // 高亮显示
                    promptElements[promptIndex].style.boxShadow = '0 0 10px var(--vscode-focusBorder)';
                    setTimeout(() => {
                        promptElements[promptIndex].style.boxShadow = '';
                    }, 2000);
                }
            } else {
                // 跳转到配置区域
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // 如果区域是折叠的，展开它
                    const sectionTitle = element.previousElementSibling;
                    if (sectionTitle && sectionTitle.classList.contains('collapsed')) {
                        toggleSection(sectionTitle);
                    }
                    // 高亮显示区域标题
                    if (sectionTitle) {
                        sectionTitle.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                        setTimeout(() => {
                            sectionTitle.style.backgroundColor = '';
                        }, 1500);
                    }
                }
            }
        }

        function populateForm(data) {
            document.getElementById('temperature').value = data.temperature || 1;
            document.getElementById('frequency_penalty').value = data.frequency_penalty || 0;
            document.getElementById('presence_penalty').value = data.presence_penalty || 0;
            document.getElementById('top_p').value = data.top_p || 1;
            document.getElementById('top_k').value = data.top_k || 0;
            document.getElementById('repetition_penalty').value = data.repetition_penalty || 1;
            document.getElementById('openai_max_context').value = data.openai_max_context || 200000;
            document.getElementById('openai_max_tokens').value = data.openai_max_tokens || 30000;
            
            document.getElementById('impersonation_prompt').value = data.impersonation_prompt || '';
            document.getElementById('new_chat_prompt').value = data.new_chat_prompt || '';
            document.getElementById('continue_nudge_prompt').value = data.continue_nudge_prompt || '';
            document.getElementById('group_nudge_prompt').value = data.group_nudge_prompt || '';
            
            document.getElementById('wrap_in_quotes').checked = data.wrap_in_quotes || false;
            document.getElementById('max_context_unlocked').checked = data.max_context_unlocked || false;
            document.getElementById('stream_openai').checked = data.stream_openai || false;
            document.getElementById('function_calling').checked = data.function_calling || false;
            document.getElementById('enable_web_search').checked = data.enable_web_search || false;
            document.getElementById('show_thoughts').checked = data.show_thoughts || false;
            
            populatePrompts(data.prompts || []);
        }

        function populatePrompts(prompts) {
            const container = document.getElementById('prompts-container');
            container.innerHTML = '';
            
            prompts.forEach((prompt, index) => {
                const promptDiv = createPromptElement(prompt, index);
                container.appendChild(promptDiv);
            });
        }

        // 辅助函数：从 prompt_order 中获取 enabled 状态
        function getPromptEnabledStatus(identifier) {
            if (!currentData || !currentData.prompt_order) return false;
            
            // 找到 character_id: 100001 的配置
            const actualOrder = currentData.prompt_order.find(order => order.character_id === 100001);
            if (!actualOrder || !actualOrder.order) return false;
            
            const orderItem = actualOrder.order.find(item => item.identifier === identifier);
            return orderItem ? orderItem.enabled : false;
        }

        // 辅助函数：更新 prompt_order 中的 enabled 状态
        function setPromptEnabledStatus(identifier, enabled) {
            if (!currentData || !currentData.prompt_order) return;
            
            // 找到 character_id: 100001 的配置
            let actualOrder = currentData.prompt_order.find(order => order.character_id === 100001);
            if (!actualOrder) {
                // 如果不存在，创建一个
                actualOrder = { character_id: 100001, order: [] };
                currentData.prompt_order.push(actualOrder);
            }
            
            // 找到对应的 order item
            let orderItem = actualOrder.order.find(item => item.identifier === identifier);
            if (!orderItem) {
                // 如果不存在，创建一个
                orderItem = { identifier: identifier, enabled: enabled };
                actualOrder.order.push(orderItem);
            } else {
                orderItem.enabled = enabled;
            }
        }
        
        // 辅助函数：检查 prompt 是否在 order 中
        function isPromptInOrder(identifier) {
            if (!currentData || !currentData.prompt_order) return false;
            
            const actualOrder = currentData.prompt_order.find(order => order.character_id === 100001);
            if (!actualOrder || !actualOrder.order) return false;
            
            return actualOrder.order.some(item => item.identifier === identifier);
        }
        
        // 插入 prompt 到 order（符合SillyTavern逻辑）
        function appendToOrder(identifier) {
            if (!currentData) return;
            
            // 确保 prompt_order 存在
            if (!currentData.prompt_order) {
                currentData.prompt_order = [];
            }
            
            // 找到或创建 character_id: 100001 的 order
            let actualOrder = currentData.prompt_order.find(order => order.character_id === 100001);
            if (!actualOrder) {
                actualOrder = { character_id: 100001, order: [] };
                currentData.prompt_order.push(actualOrder);
            }
            
            // 检查是否已存在
            const exists = actualOrder.order.some(item => item.identifier === identifier);
            if (!exists) {
                // 插入到开头，默认未启用（符合SillyTavern逻辑）
                actualOrder.order.unshift({ identifier: identifier, enabled: false });
                
                // 找到对应的prompt名称用于提示
                const prompt = currentData.prompts.find(p => p.identifier === identifier);
                const promptName = prompt ? prompt.name : '提示词';
                
                // 自动保存并刷新
                autoSave();
                
                                 // 通过postMessage显示消息
                 window.setTimeout(() => {
                     alert(\`"\${promptName}" 已插入（默认未启用）\`);
                 }, 100);
            }
        }
        
        // 从 order 中移除 prompt
        function removeFromOrder(identifier) {
            if (!currentData || !currentData.prompt_order) return;
            
            const actualOrder = currentData.prompt_order.find(order => order.character_id === 100001);
            if (!actualOrder || !actualOrder.order) return;
            
            const index = actualOrder.order.findIndex(item => item.identifier === identifier);
            if (index !== -1) {
                actualOrder.order.splice(index, 1);
                
                // 找到对应的prompt名称用于提示
                const prompt = currentData.prompts.find(p => p.identifier === identifier);
                const promptName = prompt ? prompt.name : '提示词';
                
                // 自动保存并刷新
                autoSave();
                
                                 // 通过alert显示消息
                 window.setTimeout(() => {
                     alert(\`"\${promptName}" 已移除\`);
                 }, 100);
            }
        }

        function createPromptElement(prompt, index) {
            const div = document.createElement('div');
            div.className = 'prompt-item';
            const isEnabled = getPromptEnabledStatus(prompt.identifier);
            const isInOrder = isPromptInOrder(prompt.identifier);
            
            // 为未排序的项目添加特殊样式
            if (!isInOrder) {
                div.style.border = '1px dashed var(--vscode-widget-border)';
                div.style.opacity = '0.8';
            }
            
            div.innerHTML = \`
                <div class="prompt-header">
                    <div class="prompt-name">
                        \${prompt.name || '未命名提示词'}
                        <span class="prompt-status" style="margin-left: 8px; font-size: 12px; padding: 2px 6px; border-radius: 3px; \${isInOrder ? 'background-color: var(--vscode-statusBarItem-prominentBackground); color: var(--vscode-statusBarItem-prominentForeground);' : 'background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground);'}">
                            \${isInOrder ? '已插入' : '未插入'}
                        </span>
                    </div>
                    <div class="prompt-actions">
                        \${isInOrder ? \`<button class="secondary-button" onclick="removeFromOrder('\${prompt.identifier}')" style="margin-right: 10px;">移除</button>\` : \`<button class="secondary-button" onclick="appendToOrder('\${prompt.identifier}')" style="margin-right: 10px;">插入</button>\`}
                        \${prompt.marker !== true ? \`<button class="secondary-button" onclick="openInEditor(\${index})" style="margin-right: 10px;">在编辑器中打开</button>\` : ''}
                        <button class="delete-button" onclick="deletePrompt(\${index})">删除</button>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label>提示词名称:</label>
                        <input type="text" data-field="name" data-index="\${index}" value="\${prompt.name || ''}" onchange="updatePrompt(this)">
                    </div>
                    <div class="form-col">
                        <label>标识符 (只读):</label>
                        <input type="text" value="\${prompt.identifier || ''}" disabled style="opacity: 0.6;">
                    </div>
                    <div class="form-col">
                        <label>角色:</label>
                        <select data-field="role" data-index="\${index}" onchange="updatePrompt(this)">
                            <option value="system" \${prompt.role === 'system' ? 'selected' : ''}>system</option>
                            <option value="user" \${prompt.role === 'user' ? 'selected' : ''}>user</option>
                            <option value="assistant" \${prompt.role === 'assistant' ? 'selected' : ''}>assistant</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" data-field="system_prompt" data-index="\${index}" \${prompt.system_prompt ? 'checked' : ''} disabled>
                            <label>系统提示词 (只读)</label>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" data-field="enabled" data-index="\${index}" \${isEnabled ? 'checked' : ''} \${!isInOrder ? 'disabled' : ''} onchange="updatePromptEnabled(this)">
                            <label>启用\${!isInOrder ? ' (需先插入)' : ''}</label>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="checkbox-group">
                            <input type="checkbox" data-field="forbid_overrides" data-index="\${index}" \${prompt.forbid_overrides ? 'checked' : ''} onchange="updatePrompt(this)">
                            <label>禁止覆盖</label>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label>注入位置:</label>
                        <select data-field="injection_position" data-index="\${index}" onchange="updatePrompt(this)">
                            <option value="0" \${(prompt.injection_position || 0) === 0 ? 'selected' : ''}>相对</option>
                            <option value="1" \${(prompt.injection_position || 0) === 1 ? 'selected' : ''}>聊天中</option>
                        </select>
                    </div>
                    <div class="form-col">
                        <label>注入深度:</label>
                        <input type="number" data-field="injection_depth" data-index="\${index}" value="\${prompt.injection_depth || 4}" min="0" onchange="updatePrompt(this)">
                    </div>
                    <div class="form-col">
                        <label>注入顺序:</label>
                        <input type="number" data-field="injection_order" data-index="\${index}" value="\${prompt.injection_order || 100}" min="0" onchange="updatePrompt(this)">
                    </div>
                </div>
                \${prompt.marker === true ? \`
                    <div class="form-group">
                        <label>内容:</label>
                        <div class="placeholder-notice">此提示词为占位符，内容由软件自动填充</div>
                    </div>
                \` : \`
                    <div class="form-group">
                        <label>内容:</label>
                        <textarea data-field="content" data-index="\${index}" onchange="updatePrompt(this)">\${prompt.content || ''}</textarea>
                    </div>
                \`}
            \`;
            return div;
        }

        // 生成UUID v4（按照SillyTavern的方式）
        function getUuidv4() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function addPrompt() {
            if (!currentData) return;
            
            const identifier = getUuidv4();  // 使用标准UUID v4
            const newPrompt = {
                identifier: identifier,           // uuid
                system_prompt: false,            // 非系统内置
                enabled: false,                  // 未启用
                marker: false,                   // 不是 marker
                name: '新提示词',                 // 用户填写
                role: 'system',                  // 默认系统角色
                content: '',                     // 用户填写
                injection_position: 0,           // RELATIVE 相对插入
                injection_depth: 4,              // 默认插入深度
                injection_order: 100,            // 默认插入顺序
                forbid_overrides: false          // 允许被覆盖
            };
            
            currentData.prompts.push(newPrompt);
            
            // 新建的prompt不自动加入order，需要用户手动插入
            // setPromptEnabledStatus(identifier, true);  // 移除自动加入逻辑
            
            // 自动保存并刷新
            autoSave();
        }

        function deletePrompt(index) {
            if (!currentData) return;
            
            const prompt = currentData.prompts[index];
            if (prompt && prompt.identifier) {
                // 从 prompt_order 中移除对应条目
                if (currentData.prompt_order) {
                    const actualOrder = currentData.prompt_order.find(order => order.character_id === 100001);
                    if (actualOrder && actualOrder.order) {
                        const itemIndex = actualOrder.order.findIndex(item => item.identifier === prompt.identifier);
                        if (itemIndex !== -1) {
                            actualOrder.order.splice(itemIndex, 1);
                        }
                    }
                }
            }
            
            currentData.prompts.splice(index, 1);
            
            // 自动保存并刷新
            autoSave();
        }

        function updatePrompt(element) {
            if (!currentData) return;
            
            const index = parseInt(element.dataset.index);
            const field = element.dataset.field;
            
            // 不处理 enabled 字段，它由 updatePromptEnabled 函数处理
            if (field === 'enabled') return;
            
            if (element.type === 'checkbox') {
                currentData.prompts[index][field] = element.checked;
            } else if (element.type === 'number') {
                // 处理数字字段
                const value = parseInt(element.value);
                currentData.prompts[index][field] = isNaN(value) ? (field === 'injection_order' ? 100 : 4) : value;
            } else if (field === 'injection_position') {
                // 特殊处理 injection_position，确保为数字类型
                currentData.prompts[index][field] = parseInt(element.value);
            } else {
                currentData.prompts[index][field] = element.value;
            }
            
            // 自动保存并刷新
            autoSave();
        }

        function updatePromptEnabled(element) {
            if (!currentData) return;
            
            const index = parseInt(element.dataset.index);
            const prompt = currentData.prompts[index];
            if (!prompt) return;
            
            // 更新 prompt_order 中的 enabled 状态
            setPromptEnabledStatus(prompt.identifier, element.checked);
            
            // 自动保存并刷新
            autoSave();
        }

        function openInEditor(index) {
            if (!currentData) return;
            
            const prompt = currentData.prompts[index];
            if (!prompt) return;
            
            vscode.postMessage({
                command: 'openPromptInEditor',
                promptIndex: index,
                promptName: prompt.name || '未命名提示词',
                content: prompt.content || '',
                filePath: currentFilePath
            });
        }

        // 自动保存函数 - 用于按钮操作后的自动保存
        function autoSave() {
            if (!currentData) return;
            
            vscode.postMessage({
                command: 'autoSave',
                data: currentData
            });
        }

        function saveData() {
            if (!currentData) return;
            
            currentData.temperature = parseFloat(document.getElementById('temperature').value);
            currentData.frequency_penalty = parseFloat(document.getElementById('frequency_penalty').value);
            currentData.presence_penalty = parseFloat(document.getElementById('presence_penalty').value);
            currentData.top_p = parseFloat(document.getElementById('top_p').value);
            currentData.top_k = parseInt(document.getElementById('top_k').value);
            currentData.repetition_penalty = parseFloat(document.getElementById('repetition_penalty').value);
            currentData.openai_max_context = parseInt(document.getElementById('openai_max_context').value);
            currentData.openai_max_tokens = parseInt(document.getElementById('openai_max_tokens').value);
            
            currentData.impersonation_prompt = document.getElementById('impersonation_prompt').value;
            currentData.new_chat_prompt = document.getElementById('new_chat_prompt').value;
            currentData.continue_nudge_prompt = document.getElementById('continue_nudge_prompt').value;
            currentData.group_nudge_prompt = document.getElementById('group_nudge_prompt').value;
            
            currentData.wrap_in_quotes = document.getElementById('wrap_in_quotes').checked;
            currentData.max_context_unlocked = document.getElementById('max_context_unlocked').checked;
            currentData.stream_openai = document.getElementById('stream_openai').checked;
            currentData.function_calling = document.getElementById('function_calling').checked;
            currentData.enable_web_search = document.getElementById('enable_web_search').checked;
            currentData.show_thoughts = document.getElementById('show_thoughts').checked;
            
            vscode.postMessage({
                command: 'save',
                data: currentData
            });
        }

        function loadData() {
            vscode.postMessage({
                command: 'load'
            });
        }

        function toggleSection(element) {
            element.classList.toggle('collapsed');
            const content = element.nextElementSibling;
            content.classList.toggle('hidden');
        }

        document.addEventListener('DOMContentLoaded', function() {
            const otherSettings = document.querySelector('#other-settings').previousElementSibling;
            if (otherSettings) {
                toggleSection(otherSettings);
            }
            
            // 添加快捷键监听器
            document.addEventListener('keydown', function(event) {
                // Ctrl+S 保存
                if (event.ctrlKey && event.key === 's') {
                    event.preventDefault(); // 阻止浏览器默认的保存行为
                    
                    // 添加视觉反馈
                    const saveButton = document.querySelector('.primary-button');
                    if (saveButton) {
                        saveButton.style.transform = 'scale(0.98)';
                        saveButton.style.opacity = '0.8';
                        setTimeout(() => {
                            saveButton.style.transform = '';
                            saveButton.style.opacity = '';
                        }, 150);
                    }
                    
                    saveData();
                }
            });
        });
    </script>
</body>
</html>`;
}

export function deactivate() {
  // 停止清理定时器
  stopCleanupTimer();
  console.log('AI预设编辑器已停用，清理功能已关闭');
}
