## MODIFIED Requirements

### Requirement: Single change display
当只有一个活跃变更时，Widget SHALL 渲染五行动态布局：1) 标题 + 模式标识 2) 变更名 + 进度 3) artifact 状态 4) 核心流程管线 5) 扩展命令管线。原有三行布局被扩展为五行以容纳命令管线信息。

#### Scenario: 单变更 opsx 模式完整显示
- **WHEN** 一个活跃变更存在且当前模式为 opsx
- **THEN** 第 1 行显示标题 "OpenSpec" 和 `[OPSX]` 标识
- **AND** 第 2 行显示变更名称、schema 名称、状态图标、任务计数
- **AND** 第 3 行显示 artifact 状态（proposal● design○ specs◌ tasks○）
- **AND** 第 4 行显示核心流程管线（中英双语，当前阶段高亮）：`/opsx:explore → /opsx:propose → /opsx:apply → /opsx:verify → /opsx:sync → /opsx:archive / 探索思路 → 提案规划 → 实施任务 → 验证实现 → 同步规格 → 归档变更`
- **AND** 第 5 行显示扩展命令（中英双语）：`/opsx:new · /opsx:continue · /opsx:ff · /opsx:bulk-archive · /opsx:onboard / 新建变更 · 逐步创建 · 快速推进 · 批量归档 · 入门教程`

#### Scenario: 单变更 build 模式不显示管线
- **WHEN** 一个活跃变更存在且当前模式为 build
- **THEN** Widget 恢复原有三行布局（变更信息 + artifact + 任务进度）
- **AND** 不显示管线行
- **AND** 右上角显示 `[BUILD]` 标识

#### Scenario: 管线中当前阶段高亮
- **WHEN** 变更 proposal 完成、specs 待创建、其余产物 blocked
- **THEN** `propose` 命令和中文以 FG_DIM 灰色显示（已完成）
- **AND** `apply` 命令和中文以 FG_ACCENT 高亮 + 方括号显示（当前阶段，因为 specs blocked 但用户需要知道下一个动作）
- **AND** 其他命令以 FG_MUTED 暗色显示

## ADDED Requirements

### Requirement: 命令管线显示 Command Pipeline Display
Widget SHALL 在 opsx 单变更模式下显示完整的 OpenSpec 命令管线。核心流程（6 个命令）和扩展命令（5 个命令）各占一行，中英双语并排展示。

#### Scenario: 管线内容完整性
- **WHEN** Widget 渲染 opsx 模式下的命令管线
- **THEN** 核心流程行包含 6 个命令及其中文翻译
- **AND** 扩展命令行包含 5 个命令及其中文翻译
- **AND** 命令之间用 `→`（核心流程）和 `·`（扩展命令）分隔

#### Scenario: 窄终端管线适配
- **WHEN** 终端宽度低于 100 列
- **THEN** 管线行英文命令名保留，中文翻译省略（仅英文行）
- **AND** 核心流程行和扩展命令行合并为一行，用 `|` 分隔
