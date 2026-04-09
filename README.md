# Nexus-Studio
一个专为 AI 绘画（基于 ComfyUI）打造的现代化、商业级桌面客户端。

很多人在使用 ComfyUI 时都会遇到同一个痛点：虽然节点系统无比强大、自由度极高，但对于日常的“角色产出”和“灵感生成”来说，每次都要在一堆面条连线中修改提示词、切换 LoRA、调整分辨率，实在太影响体验了。

**Nexus Studio** 就是为了解决这个问题而诞生的。

它完全屏蔽了底层的节点连线，将最核心的绘画管理流程抽象成了一个具有极佳交互体验的独立桌面级应用。你依然享受着 ComfyUI 强大的生图能力，但现在，你拥有了一个漂亮得多的工作台。

---

## ✨ 核心特性重点解析

### 1. 🎭 角色档案库 (Character Vault)
- **自定义角色管理**：再也不用依靠大脑记忆不同角色的名字和来源了。内置的可视化“角色库”支持分类、搜索、隐藏，添加新角色。
- **神级交互的封面设置**：为角色设置头像不仅可以点击选择文件，还可以直接在区域内 **`Ctrl+V` 粘贴剪贴板的图片**，极其丝滑。
- **状态联动**：勾选角色时，相关的设定和头像会以小组件 Tag 的形式直接显示在生图面板旁，支持一键移除。
  <img width="2413" height="1440" alt="image" src="https://github.com/user-attachments/assets/3853f97b-d8ef-47dc-b6e3-719ce9307aed" />


### 2. 🔗 专属 LoRA 与触发词绑定 (Trigger Words & Smart LoRA)
这可能是这个项目最实用的功能之一：
- **记忆绑定**：你可以为任何一个角色绑定一个或**多个特定的 LoRA**，并调好权重。
- **专属触发咒语**：支持给角色打上多组“触发提示词”（带开关控制）。
- **自动化挂载**：当你在一侧面板勾选了该角色（比如 “申鹤”），系统会自动在底层的工作流中挂载她专属的衣物、人物 LoRA，并将对应触发词塞到你的核心提示词前——这一切无需你手动干预。
  <img width="2412" height="1440" alt="image" src="https://github.com/user-attachments/assets/871bd116-5c2c-4302-8d04-7f78d9b2af3c" />


### 3. 📝 双排提示词引擎与预设库
- 把正向（Positive）和负向（Negative）提示词区域做了严格的双分屏，自带微光环境边框（正向绿/负向红），非常直观。
- **完整的预设流**：旁边就是“保存预设”和“预设库”按钮，调好的绝佳配方一键存入库中，随时读取。
  <img width="471" height="1354" alt="image" src="https://github.com/user-attachments/assets/32efcf33-f0a7-432d-8e1a-58acead568dc" />


### 4. ⚡️ 不阻塞的多任务队列 (Job Queue)
- 传统的生图界面在“生成中”通常会锁死界面，只能傻等。
- 我们实现了**队列系统**：你完全可以在生上一张图的过程中，继续修改提示词并点击“生成”。任务会自动压入右侧隐藏面板的“队列中”标签页，排队进行。
- 支持随时终止当前任务，或从队列中剔除排队项目。
  <img width="2414" height="1440" alt="image" src="https://github.com/user-attachments/assets/b93fc8b9-750b-4be3-92bc-20de2e6299ad" />
  <img width="2411" height="1439" alt="image" src="https://github.com/user-attachments/assets/1225f7d7-b579-4895-abd9-188f567ce049" />



### 5. 🎨 沉浸式图库与画板体验
- **无限右边栏**：生图完成后的作品会自动以瀑布流形式落在右侧边栏。
- **照片查看器**：点击任意图片进入画板模式，持原生鼠标滚轮平滑缩放、拖拽。**双击画板**立刻一键居中复原尺寸。
- **信息浮层**：在图库悬浮查看之前的生图参数（Seed值、全部 Prompt）并支持任意框选文字右键复制。
- **撤销误删**：加入了类似操作系统级的容错，手滑删除了好图？直接 `Ctrl+Z` 无缝恢复。
<img width="2403" height="1440" alt="image" src="https://github.com/user-attachments/assets/f859a6fa-5f73-46e4-b4f0-8b29e50e7207" />


---

## 🛠️ 安装与使用方法

本项目基于 **Electron + React + Vite + TailwindCSS** 打造，如果你想在本地跑起来：

### 前置准备
你需要有一个正在运行的 **ComfyUI** 后端。因为 Nexus Studio 主要是做前端交互和请求组装，实际的生图运算依然要依靠你的本地核心引擎。

### 开发与构建
```bash
# 1. 克隆代码到本地
git clone https://github.com/your-username/nexus-studio.git
cd nexus-studio

# 2. 安装依赖包
npm install

# 3. 启动开发服务器 (会自动唤出 Electron 的无边框 UI 界面)
npm run dev
```

如果你想将它打包成一个随用随开的 `.exe` 独立可执行程序发给朋友：
```bash
# 执行打包命令
npm run build
# 执行完毕后，你可以在 release 文件夹中找到编译好的安装包。
```

---

## 💡 开发相关细节

- **状态管理**：重度使用 `zustand` 并且深度结合了 `persist` 中间件，你的所有操作习惯、角色库、最近配置甚至窗口拖拽位置，都会被自动持久化保存在本地文件里。
- **IPC 桥接**：在安全的前端环境下，通过 electron preload 提供了诸如剪贴板读取原生文件、缩略图动态计算与缓存、多目录穿透解析等原生级能力。
- **注意**：zimage工作流仍在开发中......

欢迎提出 Issue ，也希望它能让你的 AI 绘画体验变得真正优雅起来！享受它吧！
