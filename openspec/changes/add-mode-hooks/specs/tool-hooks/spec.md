## ADDED Requirements

### Requirement: 系统提示注入 System Prompt Injection
在 opsx 模式下，`before_agent_start` 事件处理函数 SHALL 向系统提示词追加 OpenSpec 工作流管线上下文，包含当前活跃变更名称、当前阶段、11 个 opsx 命令中英双语文档。

#### Scenario: opsx 模式注入
- **WHEN** 当前模式为 opsx 且 `before_agent_start` 事件触发
- **THEN** 系统提示词尾部追加 `## OpenSpec Workflow Pipeline` 区块
- **AND** 包含当前活跃变更名称和当前阶段
- **AND** 包含 11 个命令的中英双语管线
- **AND** 提示 LLM 在每轮回复末尾简短提醒当前阶段

#### Scenario: build 模式不注入
- **WHEN** 当前模式为 build 且 `before_agent_start` 事件触发
- **THEN** 系统提示词不变（不追加任何 OpenSpec 区块）

#### Scenario: opsx 模式但无活跃变更
- **WHEN** 当前模式为 opsx 但没有活跃变更
- **THEN** 仍注入管线上下文，当前阶段标记为"无活跃变更 No active change"

### Requirement: 文件写入软拦截 Soft Write Interception
在 opsx 模式下，`tool_call` 事件处理函数 SHALL 对非 `openspec/changes/` 目录下的 write/edit 操作弹出确认对话框。处于 apply 阶段的变更所涉及的文件写入 SHALL 不弹窗。

#### Scenario: 非 apply 阶段写入源文件弹出确认
- **WHEN** 当前模式为 opsx 且无变更处于 apply 阶段
- **AND** LLM 尝试 write/edit 到 `src/` 或 `lib/` 等非 openspec 目录
- **THEN** 弹出 `ctx.ui.confirm` 对话框询问用户确认
- **AND** 用户确认 → 放行
- **AND** 用户拒绝 → 返回 `{ block: true }`

#### Scenario: apply 阶段写入源文件不放行
- **WHEN** 当前模式为 opsx 且有变更处于 apply 阶段
- **AND** LLM 尝试 write/edit 到源文件
- **THEN** 不放行（不弹窗），静默放行（apply 阶段为合法操作）

#### Scenario: 写入 openspec 目录始终放行
- **WHEN** 当前模式为 opsx
- **AND** LLM 尝试 write/edit 到 `openspec/changes/` 目录
- **THEN** 始终放行，不弹窗

#### Scenario: build 模式不拦截
- **WHEN** 当前模式为 build
- **AND** LLM 尝试任意 write/edit
- **THEN** 不拦截，直接放行

### Requirement: Bash 危险命令硬拦截 Bash Dangerous Command Blocking
无论当前模式（build 或 opsx），`tool_call` 事件处理函数 SHALL 硬拦截特定危险 bash 命令。

#### Scenario: 拦截 git push --force
- **WHEN** LLM 尝试执行包含 `git push` 且包含 `--force` 或 `-f` 的命令
- **THEN** 返回 `{ block: true, reason: "危险命令已阻止: git push --force" }`

#### Scenario: 拦截 git push --delete
- **WHEN** LLM 尝试执行包含 `git push` 且包含 `--delete` 或 `-d` 的命令
- **THEN** 返回 `{ block: true, reason: "危险命令已阻止: git push --delete" }`

#### Scenario: 拦截 rm -rf 根目录
- **WHEN** LLM 尝试执行 `rm -rf /` 或 `rm -rf /*`
- **THEN** 返回 `{ block: true, reason: "危险命令已阻止: rm -rf /" }`

#### Scenario: 正常 bash 命令放行
- **WHEN** LLM 尝试执行不匹配任何危险模式的命令（如 `git status`、`npm test`）
- **THEN** 放行，不拦截
