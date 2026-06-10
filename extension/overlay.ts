/**
 * OpenSpec Overlay Components
 *
 * Self-contained TUI components for the interactive overlay.
 * Each component exposes render(), handleInput(), invalidate() for use with ctx.ui.custom().
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, Key, truncateToWidth, visibleWidth, type TUI } from "@earendil-works/pi-tui";
import type { ChangeSummary, ChangeDetail, TaskGroup, OverlayAction } from "./types.ts";
import {
	changeStatusIcon,
	renderArtifactPart,
	progressBar,
	schemaLabel,
} from "./render-utils.ts";

// ── OpenSpecOverlay Component ──────────────────────────────────────────────────

export class OpenSpecOverlay {
	private changes: ChangeSummary[];
	private details: Map<string, ChangeDetail>;
	private taskGroups: Map<string, TaskGroup[]>;
	private selectedIndex: number;
	private theme: Theme;
	private onAction: (action: OverlayAction) => void;
	private error: string | null;
	private hasVerify: boolean;

	// Render cache
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(
		changes: ChangeSummary[],
		details: Map<string, ChangeDetail>,
		taskGroups: Map<string, TaskGroup[]>,
		theme: Theme,
		onAction: (action: OverlayAction) => void,
		error: string | null,
		hasVerify: boolean,
	) {
		this.changes = changes;
		this.details = details;
		this.taskGroups = taskGroups;
		this.theme = theme;
		this.onAction = onAction;
		this.error = error;
		this.hasVerify = hasVerify;
		this.selectedIndex = changes.length > 1 ? 0 : 0;
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.up)) {
			if (this.changes.length > 1 && this.selectedIndex > 0) {
				this.selectedIndex--;
				this.invalidate();
			}
		} else if (matchesKey(data, Key.down)) {
			if (this.changes.length > 1 && this.selectedIndex < this.changes.length - 1) {
				this.selectedIndex++;
				this.invalidate();
			}
		} else if (data === "a" && this.changes.length > 0) {
			this.onAction({ type: "apply", changeName: this.changes[this.selectedIndex]!.name });
		} else if (data === "v" && this.hasVerify && this.changes.length > 0) {
			this.onAction({ type: "verify", changeName: this.changes[this.selectedIndex]!.name });
		} else if (data === "e" && this.changes.length > 0) {
			this.onAction({ type: "explore", changeName: this.changes[this.selectedIndex]!.name });
		} else if (data === "c" && this.changes.length > 0) {
			this.onAction({ type: "archive", changeName: this.changes[this.selectedIndex]!.name });
		} else if (data === "p") {
			this.onAction({ type: "propose" });
		} else if (matchesKey(data, Key.escape)) {
			this.onAction({ type: "cancel" });
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const th = this.theme;
		const innerW = Math.max(1, width - 2);
		const lines: string[] = [];

		lines.push(this.renderTopBorder(innerW, th));

		if (this.error && this.changes.length === 0) {
			lines.push(this.renderLine(th.fg("warning", `⚠ ${this.error}`), innerW, th));
		} else if (this.changes.length === 0) {
			lines.push(this.renderLine(th.fg("muted", "暂无活跃 OpenSpec 变更"), innerW, th));
			lines.push(this.renderLine("", innerW, th));
		} else {
			lines.push(this.renderLine(th.fg("muted", " 变更"), innerW, th));
			for (let i = 0; i < this.changes.length; i++) {
				lines.push(this.renderChangeRow(i, innerW, th));
			}

			const selectedChange = this.changes[this.selectedIndex];
			const selectedDetail = selectedChange ? this.details.get(selectedChange.name) : undefined;
			if (selectedChange && selectedDetail) {
				lines.push(this.renderLine("", innerW, th));
				lines.push(this.renderLine(th.fg("muted", " 预览"), innerW, th));
				lines.push(...this.renderPreviewPane(selectedChange, selectedDetail, innerW, th));
			}
		}

		lines.push(this.renderLine("", innerW, th));
		lines.push(this.renderLine(this.renderHintBar(th), innerW, th));

		lines.push(th.fg("border", `╰${"─".repeat(innerW)}╯`));

		this.cachedLines = lines;
		this.cachedWidth = width;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	private renderTopBorder(innerW: number, th: Theme): string {
		const title = "OpenSpec 操作";
		const titleStr = truncateToWidth(` ${title} `, innerW);
		const titleW = visibleWidth(titleStr);
		const leftDash = Math.floor((innerW - titleW) / 2);
		const rightDash = Math.max(0, innerW - titleW - leftDash);
		return (
			th.fg("border", `╭${"─".repeat(leftDash)}`) +
			th.fg("accent", titleStr) +
			th.fg("border", `${"─".repeat(rightDash)}╮`)
		);
	}

	private renderLine(content: string, innerW: number, th: Theme): string {
		return th.fg("border", "│") + truncateToWidth(content, innerW, "…", true) + th.fg("border", "│");
	}

	private renderChangeRow(index: number, innerW: number, th: Theme): string {
		const change = this.changes[index]!;
		const detail = this.details.get(change.name);
		const isSelected = index === this.selectedIndex;

		const prefix = isSelected ? th.fg("accent", "> ") : "  ";
		const statusIcon = changeStatusIcon(th, change, detail);

		const maxNameWidth = Math.max(10, Math.floor(innerW * 0.25));
		const truncatedName = truncateToWidth(change.name, maxNameWidth, "…");

		let artifactStr = "";
		if (detail) {
			artifactStr = renderArtifactPart(th, detail, false);
		}

		const taskCounter = th.fg("text", `${change.completedTasks}/${change.totalTasks}`);

		let blockedHint = "";
		if (detail && !detail.isComplete) {
			const blockedArtifacts = detail.artifacts.filter((a) => a.status === "blocked");
			if (blockedArtifacts.length > 0) {
				blockedHint = ` ${th.fg("warning", `(等待: ${blockedArtifacts.map((a) => a.id).join(", ")})`)}`;
			}
		}

		const row = `${prefix}${statusIcon} ${truncatedName}  ${artifactStr}  ${taskCounter}${blockedHint}`;
		return this.renderLine(row, innerW, th);
	}

	private renderPreviewPane(change: ChangeSummary, detail: ChangeDetail, innerW: number, th: Theme): string[] {
		const lines: string[] = [];

		const statusIcon = changeStatusIcon(th, change, detail);
		const nameLine = `${statusIcon} ${th.fg("text", change.name)} ${th.fg("muted", `(${schemaLabel(detail.schemaName)})`)}`;
		lines.push(this.renderLine(nameLine, innerW, th));

		const artifactStr = renderArtifactPart(th, detail, true);
		lines.push(this.renderLine(th.fg("muted", "工件: ") + artifactStr, innerW, th));

		const groups = this.taskGroups.get(change.name);
		if (groups && groups.length > 0) {
			lines.push(this.renderLine(th.fg("muted", "任务:"), innerW, th));
			lines.push(...this.renderTaskGroups(th, groups, innerW));
		} else {
			const taskBar = progressBar(th, change.completedTasks, change.totalTasks);
			lines.push(this.renderLine(th.fg("muted", "任务: ") + taskBar, innerW, th));
		}

		return lines;
	}

	private renderTaskGroups(th: Theme, groups: TaskGroup[], innerW: number): string[] {
		const lines: string[] = [];

		for (const group of groups) {
			let icon: string;
			switch (group.status) {
				case "complete":
					icon = th.fg("success", "●");
					break;
				case "partial":
					icon = th.fg("accent", "◷");
					break;
				case "none":
					icon = th.fg("muted", "○");
					break;
				case "empty":
					icon = th.fg("muted", "—");
					break;
			}

			let counter: string;
			if (group.status === "empty") {
				counter = th.fg("muted", "— 无任务");
			} else {
				counter = th.fg("text", `${group.completed}/${group.total}`);
			}

			const line = `  ${icon} ${group.name}: ${counter}`;
			lines.push(this.renderLine(line, innerW, th));
		}

		return lines;
	}

	private renderHintBar(th: Theme): string {
		const hasChanges = this.changes.length > 0;
		const parts: string[] = [];

		if (hasChanges) {
			parts.push(th.fg("accent", "a") + th.fg("dim", " 实施"));
			if (this.hasVerify) {
				parts.push(th.fg("accent", "v") + th.fg("dim", " 验证"));
			}
			parts.push(th.fg("accent", "e") + th.fg("dim", " 探索"));
			parts.push(th.fg("accent", "c") + th.fg("dim", " 归档"));
		} else {
			const mutedActions = ["a 实施", "e 探索", "c 归档"];
			if (this.hasVerify) {
				mutedActions.splice(1, 0, "v 验证");
			}
			parts.push(th.fg("muted", mutedActions.join(" · ")));
		}
		parts.push(th.fg("accent", "p") + th.fg("dim", " 新建提案"));
		parts.push(th.fg("accent", "esc") + th.fg("dim", " 取消"));

		return parts.join(th.fg("dim", " · "));
	}
}

// ── LoadingOverlay Component ────────────────────────────────────────────────────

export class LoadingOverlay {
	private tui: TUI;
	private theme: Theme;
	private message: string;
	private frame = 0;
	private interval: ReturnType<typeof setInterval> | null = null;
	private abortController: AbortController;
	private onAbortCb?: () => void;
	private cachedWidth?: number;
	private cachedLines?: string[];

	get signal(): AbortSignal {
		return this.abortController.signal;
	}

	set onAbort(fn: (() => void) | undefined) {
		this.onAbortCb = fn;
	}

	constructor(tui: TUI, theme: Theme, message: string) {
		this.tui = tui;
		this.theme = theme;
		this.message = message;
		this.abortController = new AbortController();
		this.startAnimation();
	}

	private startAnimation(): void {
		this.interval = setInterval(() => {
			this.frame++;
			this.invalidate();
			this.tui.requestRender();
		}, 150);
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape)) {
			this.abortController.abort();
			this.onAbortCb?.();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const th = this.theme;
		const innerW = Math.max(1, width - 2);
		const spinChars = ["◐", "◓", "◑", "◒"];
		const spin = spinChars[this.frame % spinChars.length]!;

		const lines: string[] = [];

		lines.push(th.fg("border", "╭" + "─".repeat(innerW) + "╮"));
		lines.push(th.fg("border", "│") + truncateToWidth("", innerW, "…", true) + th.fg("border", "│"));
		lines.push(th.fg("border", "│") + truncateToWidth(` ${th.fg("accent", spin)} ${this.message}`, innerW, "…", true) + th.fg("border", "│"));
		lines.push(th.fg("border", "│") + truncateToWidth("", innerW, "…", true) + th.fg("border", "│"));
		lines.push(th.fg("border", "│") + truncateToWidth(th.fg("dim", " esc 取消"), innerW, "…", true) + th.fg("border", "│"));
		lines.push(th.fg("border", "│") + truncateToWidth("", innerW, "…", true) + th.fg("border", "│"));
		lines.push(th.fg("border", "╰" + "─".repeat(innerW) + "╯"));

		this.cachedLines = lines;
		this.cachedWidth = width;
		return lines;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	dispose(): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}
}
