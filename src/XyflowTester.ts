import type { Locator, Page } from "@playwright/test";

export interface XyflowTesterOptions {
	/**
	 * The prefix for the xyflow classes.
	 * By default, it's 'react-flow' for React Flow, and 'svelte-flow' for Svelte Flow.
	 * @default 'react-flow'
	 */
	prefix?: "react-flow" | "svelte-flow" | string;
}

export class XyflowTester {
	private readonly page: Page;
	private readonly containerLocator: Locator;
	private readonly prefix: string;

	constructor(
		page: Page,
		containerSelector: string | Locator,
		options?: XyflowTesterOptions,
	) {
		this.page = page;
		this.containerLocator =
			typeof containerSelector === "string"
				? page.locator(containerSelector)
				: containerSelector;
		this.prefix = options?.prefix ?? "react-flow";
	}

	/**
	 * Gets the locator for a specific node by its ID.
	 * @param nodeId The ID of the node.
	 */
	getNodeLocator(nodeId: string): Locator {
		return this.containerLocator.locator(
			`.${this.prefix}__node[data-id="${nodeId}"]`,
		);
	}

	/**
	 * Gets the locator for a specific edge between two nodes.
	 * @param sourceId The ID of the source node.
	 * @param targetId The ID of the target node.
	 */
	getEdgeLocator(sourceId: string, targetId: string): Locator {
		// Edge structure often contains data-testid with the format `rf__edge-${sourceId}-${targetId}`
		// or we can select it based on the edge classes/attributes.
		return this.containerLocator
			.locator(
				`path.${this.prefix}__edge-path[data-testid*="${sourceId}"][data-testid*="${targetId}"]`,
			)
			.first();
	}

	/**
	 * Gets the locator for a specific handle on a node.
	 * @param nodeId The ID of the node.
	 * @param handleId The optional ID of the handle.
	 * @param type The type of the handle ('source' or 'target').
	 */
	getHandleLocator(
		nodeId: string,
		type: "source" | "target",
		handleId?: string,
	): Locator {
		const node = this.getNodeLocator(nodeId);
		let selector = `.${this.prefix}__handle-${type}`;
		if (handleId) {
			selector += `[data-handleid="${handleId}"]`;
		}
		return node.locator(selector).first();
	}

	/**
	 * Drags a node by a specific delta (x, y) amount.
	 * @param nodeId The ID of the node to move.
	 * @param delta The amount to move the node by (deltaX, deltaY).
	 */
	async dragNode(
		nodeId: string,
		delta: { deltaX: number; deltaY: number },
	): Promise<void> {
		const node = this.getNodeLocator(nodeId);
		await node.waitFor({ state: "visible" });

		const box = await node.boundingBox();
		if (!box) {
			throw new Error(`Node ${nodeId} is not visible or has no bounding box.`);
		}

		const startX = box.x + box.width / 2;
		const startY = box.y + box.height / 2;

		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();

		// Move in small steps to simulate real drag and trigger events properly
		const steps = 5;
		for (let i = 1; i <= steps; i++) {
			await this.page.mouse.move(
				startX + (delta.deltaX * i) / steps,
				startY + (delta.deltaY * i) / steps,
			);
		}

		await this.page.mouse.up();
	}

	/**
	 * Connects two nodes by dragging from a source handle to a target handle.
	 * @param params Connection parameters (source node/handle, target node/handle)
	 */
	async connectNodes(params: {
		sourceNodeId: string;
		sourceHandleId?: string;
		targetNodeId: string;
		targetHandleId?: string;
	}): Promise<void> {
		const sourceHandle = this.getHandleLocator(
			params.sourceNodeId,
			"source",
			params.sourceHandleId,
		);
		const targetHandle = this.getHandleLocator(
			params.targetNodeId,
			"target",
			params.targetHandleId,
		);

		await sourceHandle.waitFor({ state: "visible" });
		await targetHandle.waitFor({ state: "visible" });

		const sourceBox = await sourceHandle.boundingBox();
		const targetBox = await targetHandle.boundingBox();

		if (!sourceBox) {
			throw new Error(
				`Source handle for node ${params.sourceNodeId} not found.`,
			);
		}
		if (!targetBox) {
			throw new Error(
				`Target handle for node ${params.targetNodeId} not found.`,
			);
		}

		const startX = sourceBox.x + sourceBox.width / 2;
		const startY = sourceBox.y + sourceBox.height / 2;

		const endX = targetBox.x + targetBox.width / 2;
		const endY = targetBox.y + targetBox.height / 2;

		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();

		// Move to target
		await this.page.mouse.move(endX, endY, { steps: 5 });

		await this.page.mouse.up();
	}

	/**
	 * Pans the canvas by dragging it.
	 * @param delta The amount to pan (deltaX, deltaY).
	 */
	async panCanvas(delta: { deltaX: number; deltaY: number }): Promise<void> {
		const pane = this.containerLocator.locator(`.${this.prefix}__pane`).first();
		await pane.waitFor({ state: "visible" });

		const box = await pane.boundingBox();
		if (!box) {
			throw new Error("Canvas pane is not visible.");
		}

		// Start near the center of the canvas
		const startX = box.x + box.width / 2;
		const startY = box.y + box.height / 2;

		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();

		await this.page.mouse.move(startX + delta.deltaX, startY + delta.deltaY, {
			steps: 5,
		});

		await this.page.mouse.up();
	}
}
