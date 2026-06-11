/**
 * Pipeline data and rendering for the OpenSpec command workflow.
 *
 * Defines 11 opsx commands (6 core + 5 expanded) with Chinese translations,
 * stage inference from artifact status, and terminal-aware pipeline rendering.
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { ArtifactStatus } from "./types.ts";
import { visibleWidth, truncateToWidth } from "@earendil-works/pi-tui";

// ── Command Definitions ──────────────────────────────────────────────

export interface PipelineCommand {
	cmd: string;
	cn: string;
	en: string;
}

/** Core workflow commands (6) — shown as a horizontal pipeline with arrows */
export const CORE_COMMANDS: PipelineCommand[] = [
	{ cmd: "/opsx:explore", cn: "探索思路", en: "Explore" },
	{ cmd: "/opsx:propose", cn: "提案规划", en: "Propose" },
	{ cmd: "/opsx:apply", cn: "实施任务", en: "Apply" },
	{ cmd: "/opsx:verify", cn: "验证实现", en: "Verify" },
	{ cmd: "/opsx:sync", cn: "同步规格", en: "Sync" },
	{ cmd: "/opsx:archive", cn: "归档变更", en: "Archive" },
];

/** Expanded workflow commands (5) — shown as a secondary row */
export const EXPANDED_COMMANDS: PipelineCommand[] = [
	{ cmd: "/opsx:new", cn: "新建变更", en: "New" },
	{ cmd: "/opsx:continue", cn: "逐步创建", en: "Continue" },
	{ cmd: "/opsx:ff", cn: "快速推进", en: "FF" },
	{ cmd: "/opsx:bulk-archive", cn: "批量归档", en: "Bulk Archive" },
	{ cmd: "/opsx:onboard", cn: "入门教程", en: "Onboard" },
];

// ── Stage Inference ───────────────────────────────────────────────────

/**
 * Infer which pipeline command should be highlighted based on artifact status.
 * Returns the index into CORE_COMMANDS.
 */
export function inferStageIndex(artifacts: ArtifactStatus[]): number {
	if (artifacts.length === 0) return 0; // explore

	const statusMap = new Map(artifacts.map((a) => [a.id, a.status]));

	// proposal not done → explore (or propose if user is creating)
	if (statusMap.get("proposal") !== "done") return 0;

	// All tasks done and change is complete → archive
	const allDone = artifacts.every((a) => a.status === "done");
	if (allDone) return 5; // archive

	// tasks done but other artifacts not all done → verify
	if (statusMap.get("tasks") === "done") return 3; // verify

	// specs or design ready/blocked → propose (still planning)
	const specsStatus = statusMap.get("specs");
	const designStatus = statusMap.get("design");
	const tasksStatus = statusMap.get("tasks");

	if (
		specsStatus === "ready" ||
		specsStatus === "blocked" ||
		designStatus === "ready" ||
		designStatus === "blocked" ||
		tasksStatus === "ready" ||
		tasksStatus === "blocked"
	) {
		return 1; // propose
	}

	// tasks done + proposal done → apply
	if (tasksStatus === "done" && statusMap.get("proposal") === "done") {
		return 2; // apply
	}

	// Default: in proposal/planning stage
	return 1;
}

/**
 * Get the current stage name for display (the highlighted command's cmd).
 */
export function getCurrentStage(artifacts: ArtifactStatus[]): string {
	const idx = inferStageIndex(artifacts);
	return CORE_COMMANDS[idx]!.cmd;
}

// ── Rendering ─────────────────────────────────────────────────────────

/**
 * Format a single pipeline command segment for display.
 * If `isCurrent`, highlight with [brackets] and accent color.
 */
function formatCommand(
	theme: Theme,
	cmd: PipelineCommand,
	isCurrent: boolean,
	showChinese: boolean,
): string {
	if (isCurrent) {
		const text = showChinese ? `[${cmd.cmd}] [${cmd.cn}]` : `[${cmd.cmd}]`;
		return theme.fg("accent", text);
	}
	return theme.fg("dim", showChinese ? `${cmd.cmd} ${cmd.cn}` : cmd.cmd);
}

/**
 * Render the core workflow pipeline line.
 * width < 100: English-only, single line
 * width >= 100: English + Chinese, single line
 */
export function renderCorePipeline(
	theme: Theme,
	stageIndex: number,
	width: number,
): string {
	const showChinese = width >= 100;
	const parts: string[] = [];

	for (let i = 0; i < CORE_COMMANDS.length; i++) {
		const cmd = CORE_COMMANDS[i]!;
		parts.push(formatCommand(theme, cmd, i === stageIndex, showChinese));
		if (i < CORE_COMMANDS.length - 1) {
			parts.push(theme.fg("muted", " → "));
		}
	}

	return parts.join("");
}

/**
 * Render the expanded commands line.
 * width < 100: English-only
 * width >= 100: English + Chinese
 */
export function renderExpandedPipeline(theme: Theme, width: number): string {
	const showChinese = width >= 100;
	const parts: string[] = [];

	for (let i = 0; i < EXPANDED_COMMANDS.length; i++) {
		const cmd = EXPANDED_COMMANDS[i]!;
		if (showChinese) {
			parts.push(theme.fg("muted", `${cmd.cmd} ${cmd.cn}`));
		} else {
			parts.push(theme.fg("muted", cmd.cmd));
		}
		if (i < EXPANDED_COMMANDS.length - 1) {
			parts.push(theme.fg("dim", " · "));
		}
	}

	return parts.join("");
}

/**
 * Build the system prompt injection text for before_agent_start hook.
 */
export function buildPipelinePrompt(
	changeName: string | null,
	stageIndex: number,
): string {
	const currentCmd = CORE_COMMANDS[stageIndex]!;
	const coreLine = CORE_COMMANDS.map((c, i) =>
		i === stageIndex ? `[${c.cmd}]` : c.cmd,
	).join(" → ");

	const coreLineCn = CORE_COMMANDS.map((c, i) =>
		i === stageIndex ? `[${c.cn}]` : c.cn,
	).join(" → ");

	const expandedLine = EXPANDED_COMMANDS.map((c) => c.cmd).join(" · ");
	const expandedLineCn = EXPANDED_COMMANDS.map((c) => c.cn).join(" · ");

	let text = "\n## OpenSpec Workflow Pipeline / OpenSpec 工作流管线\n\n";

	if (changeName) {
		text += `Active Change 当前变更: ${changeName}\n`;
		text += `Current Stage 当前阶段: ${currentCmd.cmd} ${currentCmd.cn}\n\n`;
	} else {
		text += "No active change 无活跃变更\n\n";
	}

	text += `Core Flow 核心流程:\n${coreLine}\n${coreLineCn}\n\n`;
	text += `Expanded 扩展命令:\n${expandedLine}\n${expandedLineCn}\n\n`;
	text +=
		"Please note the current OpenSpec stage at the end of each response.\n";
	text += "请在每轮回复末尾简短提醒当前所处的 OpenSpec 阶段。\n";

	return text;
}
