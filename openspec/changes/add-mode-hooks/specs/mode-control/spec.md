## ADDED Requirements

### Requirement: 模式切换命令 Mode Switch Commands
系统 SHALL 注册 `/opsx` 和 `/build` 两个 slash 命令。`/opsx` 将当前项目切换为严格 OpenSpec 模式，`/build` 切换为自由开发模式。

#### Scenario: 切换到 opsx 模式
- **WHEN** 用户在 TUI 中输入 `/opsx`
- **THEN** 模式状态写入 `~/.pi/agent/openspec-mode.json`，当前项目路径映射为 `"opsx"`
- **AND** Widget 右上角显示 `[OPSX]` 标识
- **AND** `before_agent_start` hook 开始注入 OpenSpec 工作流上下文

#### Scenario: 切换到 build 模式
- **WHEN** 用户在 TUI 中输入 `/build`
- **THEN** 模式状态写入 `~/.pi/agent/openspec-mode.json`，当前项目路径映射为 `"build"`
- **AND** Widget 右上角显示 `[BUILD]` 标识
- **AND** 所有 hooks 停止生效（不注入、不拦截）

#### Scenario: 未指定项目时默认 build 模式
- **WHEN** pi 在项目中启动且该项目的模式从未设置过
- **THEN** 默认使用 `build` 模式（与现有行为一致）

### Requirement: 模式状态持久化 Mode State Persistence
模式状态 SHALL 持久化到 `~/.pi/agent/openspec-mode.json` 文件中，按项目路径索引。

#### Scenario: 跨会话恢复模式
- **WHEN** 用户在项目 A 中切换到 opsx 模式后关闭 pi
- **AND** 重新在项目 A 中启动 pi
- **THEN** `session_start` 事件处理函数读取 `openspec-mode.json`，恢复为 opsx 模式

#### Scenario: 不同项目独立模式
- **WHEN** 项目 A 设置为 opsx，项目 B 从未设置
- **THEN** 在项目 A 中模式为 opsx，在项目 B 中模式为 build（默认）

### Requirement: Widget 模式标识 Widget Mode Indicator
Widget SHALL 在右上角显示当前模式标识。opsx 模式显示 `[OPSX]`（FG_ACCENT 色），build 模式显示 `[BUILD]`（FG_MUTED 色）。

#### Scenario: opsx 模式标识
- **WHEN** 当前模式为 opsx
- **THEN** Widget 标题栏右侧显示高亮的 `[OPSX]`

#### Scenario: build 模式标识
- **WHEN** 当前模式为 build
- **THEN** Widget 标题栏右侧显示暗色的 `[BUILD]`
