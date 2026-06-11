## 1. Pipeline Data & Stage Inference

- [ ] 1.1 Create `pipeline.ts` — 11 opsx 命令常量数组（cmd/cn/en/group），包含核心流程 6 个和扩展命令 5 个
- [ ] 1.2 Implement `inferStage(artifacts: ArtifactStatus[]): string` — 基于 artifacts 状态推断当前高亮命令 ID
- [ ] 1.3 Implement `renderPipelineLines(theme, stage, width): string[]` — 返回中英双语管线行（核心 + 扩展两行），当前阶段高亮，支持窄终端省略中文
- [ ] 1.4 Add pipeline rendering to `renderSingleChange()` / `renderWidget()` — opsx 模式下追加管线行到 Widget 输出

## 2. Mode State Management

- [ ] 2.1 Add `ModeState` / `ModeConfig` types to `types.ts`
- [ ] 2.2 Create `mode.ts` — `loadModeConfig()` / `saveModeConfig()` 读写 `~/.pi/agent/openspec-mode.json`，含 try-catch 容错
- [ ] 2.3 Implement `getMode(projectPath): "build" | "opsx"` — 从 config 读取，默认 build
- [ ] 2.4 Register `/opsx` command — 切换为 opsx 模式，保存 config，刷新 Widget
- [ ] 2.5 Register `/build` command — 切换为 build 模式，保存 config，刷新 Widget
- [ ] 2.6 Wire mode restore in `session_start` — 启动时读取 config 恢复模式

## 3. Hooks Implementation

- [ ] 3.1 Create `hooks.ts` with `registerHooks(pi, getState)` — 注册三个事件处理函数
- [ ] 3.2 Implement `before_agent_start` hook — opsx 模式下注入 OpenSpec 工作流管线上下文到系统提示词
- [ ] 3.3 Implement bash dangerous command blocking — 始终拦截 `git push --force/--delete`、`rm -rf /`
- [ ] 3.4 Implement write/edit soft interception — opsx 模式下非 apply 阶段 + 非 openspec 目录 → confirm 弹窗
- [ ] 3.5 Wire `isApplying()` helper — 根据当前变更 artifacts 全 done 判定是否在 apply 阶段

## 4. Widget Mode Indicator & Overlay Update

- [ ] 4.1 Add mode badge to widget title line — `[OPSX]` (FG_ACCENT) or `[BUILD]` (FG_MUTED)
- [ ] 4.2 Pass mode state to widget render functions (modify `updateWidget()` signature)
- [ ] 4.3 Add `m` key handler in overlay — toggle mode, notify user, close overlay
- [ ] 4.4 Update overlay hint bar — show "m opsx mode" (in build) or "m build mode" (in opsx)
- [ ] 4.5 Update `OverlayAction` type — add `{ type: "mode-toggle" }`

## 5. Integration & Testing

- [ ] 5.1 Wire all new modules in `index.ts` — import pipeline, mode, hooks; call in appropriate events
- [ ] 5.2 Verify multi-change mode fallback — when multiple changes exist, widget uses existing compact layout (no pipeline lines)
- [ ] 5.3 Verify build mode — pipeline not shown, hooks not active, widget unchanged from before
- [ ] 5.4 Verify opsx mode with no active changes — widget shows pipeline but marks stage as "No active change"
- [ ] 5.5 Verify mode persistence across session restart — close pi, reopen, mode restored
- [ ] 5.6 Verify confirm dialog on non-openspec write in opsx mode (non-apply stage)
- [ ] 5.7 Verify bash dangerous commands blocked in all modes
