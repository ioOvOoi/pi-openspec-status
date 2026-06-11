## Context

当前 `pi-openspec-status` 扩展的职责是数据获取 + Widget 渲染 + 交互 overlay，是一个纯展示层。要加入模式控制和 hooks，需要在现有事件处理管道中插入新的逻辑层而不破坏现有功能。

约束：
- 必须使用 `@earendil-works/pi-coding-agent` 现有 API（`pi.on()`、`pi.registerCommand()`、`ctx.ui.confirm()` 等）
- 必须兼容 Windows（路径分隔符、openspec.cmd）
- 不引入新 npm 依赖

## Goals / Non-Goals

**Goals:**
- 在 opsx 模式下通过注入、拦截、确认三层机制引导开发流程
- 模式状态轻量持久化，跨会话恢复
- Widget 中英双语展示完整 11 命令管线
- overlay 一键切换模式

**Non-Goals:**
- 不限死操作（不硬 block 文件写入，仅软确认）
- 不自动推进阶段（agent 提醒，用户决定）
- 不涉及 CLI 修改

## Decisions

### 1. 模块拆分：mode.ts + hooks.ts + pipeline.ts

决定将模式管理、hooks 实现、管线数据拆为三个独立模块，而非全部塞进 index.ts：

- **mode.ts**：纯数据层——读写 `openspec-mode.json`、注册 `/opsx` `/build` 命令、导出 `getMode()` / `setMode()`
- **hooks.ts**：事件处理层——`registerHooks(pi, getState)` 注册三个事件处理函数
- **pipeline.ts**：纯函数——11 命令数据常量、`inferStage(artifacts)` 阶段推断、`renderPipeline(theme, stage, width)` 渲染

理由：index.ts 已经 ~240 行，再加会失控。每个新模块职责单一、可独立测试。

替代方案：全放 index.ts → 拒绝（可维护性差）

### 2. 模式存储：JSON 文件 vs ctx_memory vs appendEntry

选择 JSON 文件 `~/.pi/agent/openspec-mode.json`：

- **JSON 文件** → 采纳：简单、人类可读、可手动编辑、按项目路径索引
- **ctx_memory** → 拒绝：magic-context 跨项目共享，不适合 per-project 状态；搜索语义不匹配
- **appendEntry** → 拒绝：session 级别，切换 session 后丢失

数据格式：
```json
{
  "defaultMode": "build",
  "projects": {
    "/home/user/proj-a": "opsx",
    "C:\\Users\\X\\proj-b": "build"
  }
}
```

### 3. 管线阶段推断：基于 artifacts 状态

`openspec status --json` 返回 artifacts 数组，每个有 `id` 和 `status`（done/ready/blocked）。

推断逻辑：
```
proposal ready/blocked  → stage = "explore" (提示用户先探索)
proposal done, specs ready      → stage = "propose"
specs done, design ready        → stage = "propose" (仍在此阶段)
design done, tasks ready        → stage = "propose"
tasks done                      → stage = "apply"
applyRequires 全 done + 未归档   → stage = "verify"
全部 done + 已 sync              → stage = "archive"
```

### 4. 工具拦截策略：isToolCallEventType

使用 pi 内置的 `isToolCallEventType` 获取类型安全的事件输入：

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  // Bash 硬拦截（始终生效）
  if (isToolCallEventType("bash", event)) {
    if (isDangerousCommand(event.input.command)) {
      return { block: true, reason: "..." };
    }
  }
  
  // write/edit 软拦截（仅 opsx 模式）
  if (mode !== "opsx") return;
  if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
    const path = event.input.path;
    if (!isInOpenSpecDir(path) && !isApplying(activeChange)) {
      const ok = await ctx.ui.confirm("OpenSpec OPSX", "非 apply 阶段...");
      if (!ok) return { block: true };
    }
  }
});
```

### 5. Widget 渲染：新增管线行 + 模式标识

现有 `renderSingleChange()` 返回 3 行。修改为返回 3-5 行（opsx 多 2 行管线）。

opsx 模式下：
- 第 1 行标题：追加模式标识 `[OPSX]` (FG_ACCENT)
- 第 4 行：核心管线（6 命令中英双语）
- 第 5 行：扩展命令（5 命令中英双语）

build 模式下：保持 3 行原样，标题追加 `[BUILD]` (FG_MUTED)

## Risks / Trade-offs

- **confirm 对话框打断流程** → 风险低，只有非 apply 阶段才弹，且用户可直接确认
- **`openspec-mode.json` 文件冲突** → 风险低，每次读写均用 try-catch，损坏则重建
- **管线行终端宽度不足** → 中文翻译可在 < 100 列时省略，仅保留英文命令名
- **扩展命令 disabled 时仍显示** → 不需要过滤，显示全量命令有教育意义，用户知道存在哪些命令可选

## Open Questions

- 是否需要添加 `/opsx-status` 命令单独展示管线？（当前设计已融入 Widget，暂不需要）
