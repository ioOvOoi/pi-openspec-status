## MODIFIED Requirements

### Requirement: Letter key actions on selected change
用户 SHALL 通过单字母键触发 OpenSpec 操作。现有操作键 (`a` apply, `v` verify, `e` explore, `c` archive, `p` propose) 保持不变，新增 `m` 键用于切换模式 (mode toggle: build ↔ opsx)。

#### Scenario: 按 m 切换模式
- **WHEN** 用户在 overlay 中按下 `m` 键
- **THEN** 当前项目模式在 build 和 opsx 之间切换
- **AND** 模式状态立即写入 `~/.pi/agent/openspec-mode.json`
- **AND** overlay 关闭
- **AND** Widget 立即刷新显示新模式标识

#### Scenario: 按 m 后模式从 build 切换为 opsx
- **WHEN** 当前模式为 build 且用户在 overlay 中按下 `m`
- **THEN** 模式切换为 opsx
- **AND** notify 提示 "模式已切换: OPSX Mode switched: OPSX"

#### Scenario: 按 m 后模式从 opsx 切换为 build
- **WHEN** 当前模式为 opsx 且用户在 overlay 中按下 `m`
- **THEN** 模式切换为 build
- **AND** notify 提示 "模式已切换: BUILD Mode switched: BUILD"

### Requirement: Action hints displayed
提示栏 SHALL 在现有操作键基础上显示 `m` 键的模式切换提示，使用当前模式反义（opsx 时显示 "m build mode"，build 时显示 "m opsx mode"）。

#### Scenario: opsx 模式下的提示栏
- **WHEN** overlay 打开且当前模式为 opsx
- **THEN** 提示栏显示 "a apply · v verify · e explore · c archive · p propose new · m build mode · esc cancel"

#### Scenario: build 模式下的提示栏
- **WHEN** overlay 打开且当前模式为 build
- **THEN** 提示栏显示 "a apply · v verify · e explore · c archive · p propose new · m opsx mode · esc cancel"
