## Why

当前 pi-openspec-status 扩展是被动展示型 widget——仅显示变更状态，不参与流程控制。用户在使用中容易偏离 OpenSpec 工作流（直接修改源码、跳过产物创建、忘记验证等）。需要一个模式系统让用户可以在"自由开发"(build) 和"严格 OpenSpec"(opsx) 之间切换，在 opsx 模式下通过 hooks 机制确保项目开发始终走在 OpenSpec 流程中。

## What Changes

- 新增 **build / opsx 双模式**，通过 `/opsx` 和 `/build` 命令切换
- 模式状态轻量持久化到 `~/.pi/agent/openspec-mode.json`（按项目路径索引）
- opsx 模式下启用三层 hooks：
  1. **`before_agent_start`** 注入 —— 每轮对话前注入 OpenSpec 工作流管线上下文，引导 LLM 行为
  2. **`tool_call` 软拦截** —— write/edit 操作在非 apply 阶段弹出 confirm 确认，不硬 block
  3. **bash 危险命令硬拦截** —— `git push --force`、`git push --delete` 等始终阻止
- Widget 增强：新增 **工作流命令管线**（11 个 opsx 命令中英双语展示），高亮当前阶段
- 覆盖现有 `status-widget` 的渲染逻辑（新增管线行）和 `widget-interaction` 的 overlay（新增模式切换入口）

## Capabilities

### New Capabilities
- `mode-control`: 模式状态管理 —— `/opsx` `/build` 命令注册、`~/.pi/agent/openspec-mode.json` 读写、Widget 右上角模式标识 [OPSX]/[BUILD]
- `tool-hooks`: 工具调用拦截 —— `tool_call` 事件软拦截（confirm）、bash 危险命令硬拦截、`before_agent_start` 系统提示注入

### Modified Capabilities
- `status-widget`: 在单变更模式下新增"核心流程 Core Flow"管线行（6 个核心命令）和"扩展命令 Expanded"行（5 个扩展命令），中英双语展示，当前阶段高亮
- `widget-interaction`: overlay 新增模式切换快捷键（`m` 键 toggle build/opsx），overlay hint bar 增加对应提示

## Impact

- `extension/index.ts` — 新增事件注册（mode、hooks 模块集成）
- `extension/widget.ts` — 管线渲染函数
- `extension/types.ts` — ModeState、ModeConfig 类型
- `extension/mode.ts` — 新文件：模式管理
- `extension/hooks.ts` — 新文件：三层 hooks 实现
- `extension/pipeline.ts` — 新文件：管线数据 + 阶段推断
- `extension/overlay.ts` — 新增模式切换入口
- `extension/interaction.ts` — 新增模式相关 action
- 外部依赖：无新依赖，使用 `@earendil-works/pi-coding-agent` 现有 API
