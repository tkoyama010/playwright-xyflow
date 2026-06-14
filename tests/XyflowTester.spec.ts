import { expect, test } from "@playwright/test";
import { XyflowTester } from "../src/index.js";

/**
 * XyflowTester Locators
 *
 * - Inject a mock React Flow DOM structure into the page
 * - Test without handleId
 * - Inject a mock Svelte Flow DOM
 */
test.describe("XyflowTester Locators", () => {
	test.beforeEach(async ({ page }) => {
		await page.setContent(`
      <div class="react-flow">
        <div class="react-flow__renderer">
          <div class="react-flow__pane"></div>
          <div class="react-flow__nodes">
            <div class="react-flow__node" data-id="node-1" style="width: 100px; height: 50px;">
              <div class="react-flow__handle-source react-flow__handle" data-handleid="source-a" style="width: 10px; height: 10px;"></div>
              <div class="react-flow__handle-target react-flow__handle" data-handleid="target-a" style="width: 10px; height: 10px;"></div>
            </div>
            <div class="react-flow__node" data-id="node-2" style="width: 100px; height: 50px;">
              <div class="react-flow__handle-target react-flow__handle" style="width: 10px; height: 10px;"></div>
            </div>
          </div>
          <svg class="react-flow__edges" style="width: 100px; height: 100px;">
            <path class="react-flow__edge-path" data-testid="rf__edge-node-1-node-2" d="M10,10 L90,90" style="stroke: black; stroke-width: 2px;"></path>
          </svg>
        </div>
      </div>
    `);
	});

	test("getNodeLocator should locate nodes by id", async ({ page }) => {
		const flow = new XyflowTester(page, ".react-flow");

		const node1 = flow.getNodeLocator("node-1");
		await expect(node1).toBeVisible();
		await expect(node1).toHaveAttribute("data-id", "node-1");

		const node2 = flow.getNodeLocator("node-2");
		await expect(node2).toBeVisible();
	});

	test("getHandleLocator should locate handles by node id, type, and handle id", async ({
		page,
	}) => {
		const flow = new XyflowTester(page, ".react-flow");

		const sourceHandle = flow.getHandleLocator("node-1", "source", "source-a");
		await expect(sourceHandle).toBeVisible();
		await expect(sourceHandle).toHaveClass(/react-flow__handle-source/u);
		await expect(sourceHandle).toHaveAttribute("data-handleid", "source-a");

		const targetHandle = flow.getHandleLocator("node-1", "target", "target-a");
		await expect(targetHandle).toBeVisible();
		await expect(targetHandle).toHaveClass(/react-flow__handle-target/u);
		await expect(targetHandle).toHaveAttribute("data-handleid", "target-a");

		const targetHandle2 = flow.getHandleLocator("node-2", "target");
		await expect(targetHandle2).toBeVisible();
		await expect(targetHandle2).toHaveClass(/react-flow__handle-target/u);
	});

	test("getEdgeLocator should locate edges by source and target node ids", async ({
		page,
	}) => {
		const flow = new XyflowTester(page, ".react-flow");

		const edge = flow.getEdgeLocator("node-1", "node-2");
		await expect(edge).toBeVisible();
		await expect(edge).toHaveClass(/react-flow__edge-path/u);
		await expect(edge).toHaveAttribute("data-testid", "rf__edge-node-1-node-2");
	});

	test("should support svelte-flow prefix", async ({ page }) => {
		await page.setContent(`
      <div class="my-svelte-flow">
        <div class="svelte-flow__node" data-id="s-node-1" style="width: 50px; height: 50px;"></div>
      </div>
    `);

		const flow = new XyflowTester(page, ".my-svelte-flow", {
			prefix: "svelte-flow",
		});
		const node = flow.getNodeLocator("s-node-1");
		await expect(node).toBeVisible();
	});
});

async function setupDragTracking(page: Page, nodeId: string): Promise<void> {
	await page.evaluate((id) => {
		const node = document.querySelector(`[data-id="${id}"]`);
		if (!node) {
			return;
		}
		const g = globalThis as unknown as { mouseEvents: unknown[] };
		g.mouseEvents = [];
		node.addEventListener("mousedown", (e) => {
			const me = e as MouseEvent;
			g.mouseEvents.push({ type: "mousedown", x: me.clientX, y: me.clientY });
		});
		const move = (e: Event): void => {
			const me = e as MouseEvent;
			if (g.mouseEvents.length > 0) {
				g.mouseEvents.push({ type: "mousemove", x: me.clientX, y: me.clientY });
			}
		};
		globalThis.addEventListener("mousemove", move);
		globalThis.addEventListener(
			"mouseup",
			(e) => {
				const me = e as MouseEvent;
				g.mouseEvents.push({ type: "mouseup", x: me.clientX, y: me.clientY });
			},
			{ once: true },
		);
	}, nodeId);
}

test.describe("XyflowTester Actions", () => {
	test.beforeEach(async ({ page }) => {
		await page.setContent(
			'<div class="react-flow" style="width: 500px; height: 500px;"><div class="react-flow__renderer"><div class="react-flow__pane"></div><div class="react-flow__nodes"><div class="react-flow__node" data-id="node-1" style="position: absolute; left: 100px; top: 100px; width: 100px; height: 50px;"></div></div></div></div>',
		);
	});

	test("dragNode should simulate dragging a node", async ({ page }) => {
		const flow = new XyflowTester(page, ".react-flow");
		const nodeId = "node-1";

		await setupDragTracking(page, nodeId);

		await flow.dragNode(nodeId, { deltaX: 50, deltaY: 50 });
		const events = await page.evaluate(
			() =>
				(globalThis as unknown as { mouseEvents: Record<string, unknown>[] })
					.mouseEvents,
		);

		expect(events[0].type).toBe("mousedown");
		expect(events.some((e) => e.type === "mousemove")).toBe(true);
		expect(events.at(-1)?.type).toBe("mouseup");

		const expectedStartX = 150;
		const expectedStartY = 125;
		const expectedEndX = 200;
		const expectedEndY = 175;

		expect(events[0].x).toBe(expectedStartX);
		expect(events[0].y).toBe(expectedStartY);
		expect(events.at(-1)?.x).toBe(expectedEndX);
		expect(events.at(-1)?.y).toBe(expectedEndY);
	});
});
