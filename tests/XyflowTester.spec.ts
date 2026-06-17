import type { Page } from "@playwright/test";
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

test.describe("XyflowTester Interactions", () => {
	test.beforeEach(async ({ page }) => {
		await page.setContent(`
      <style>
        body { margin: 0; padding: 0; }
      </style>
      <div class="react-flow" style="width: 500px; height: 500px;">
        <div class="react-flow__renderer">
          <div class="react-flow__pane" style="width: 500px; height: 500px;"></div>
          <div class="react-flow__nodes">
            <div class="react-flow__node" data-id="node-1" style="position: absolute; left: 0px; top: 0px; width: 100px; height: 50px;">
              <div class="react-flow__handle-source react-flow__handle" data-handleid="source-a" style="position: absolute; right: 0px; top: 20px; width: 10px; height: 10px;"></div>
            </div>
            <div class="react-flow__node" data-id="node-2" style="position: absolute; left: 200px; top: 200px; width: 100px; height: 50px;">
              <div class="react-flow__handle-target react-flow__handle" style="position: absolute; left: 0px; top: 20px; width: 10px; height: 10px;"></div>
            </div>
          </div>
        </div>
      </div>
    `);
	});

	test("connectNodes should simulate connection between handles", async ({
		page,
	}) => {
		const flow = new XyflowTester(page, ".react-flow");

		// Track mouse events to verify interactions
		await page.evaluate(() => {
			const events: any[] = [];
			window.addEventListener("mousedown", (e) =>
				events.push({ type: "mousedown", x: e.clientX, y: e.clientY }),
			);
			window.addEventListener("mouseup", (e) =>
				events.push({ type: "mouseup", x: e.clientX, y: e.clientY }),
			);
			(window as any)._events = events;
		});

		await flow.connectNodes({
			sourceNodeId: "node-1",
			sourceHandleId: "source-a",
			targetNodeId: "node-2",
		});

		const capturedEvents = await page.evaluate(() => (window as any)._events);

		// We expect at least mousedown and mouseup
		const mouseDown = capturedEvents.find((e: any) => e.type === "mousedown");
		const mouseUp = capturedEvents.find((e: any) => e.type === "mouseup");

		expect(mouseDown).toBeDefined();
		expect(mouseUp).toBeDefined();

		// Node 1 is at 0,0, size 100x50. Source handle is at right:0, top:20, size 10px x 10px.
		// So source handle is at x=90 to 100, y=20 to 30. Center is (95, 25).
		expect(mouseDown.x).toBeCloseTo(95, 0);
		expect(mouseDown.y).toBeCloseTo(25, 0);

		// Node 2 is at 200,200, size 100x50. Target handle is at left:0, top:20, size 10px x 10px.
		// So target handle is at x=200 to 210, y=220 to 230. Center is (205, 225).
		expect(mouseUp.x).toBeCloseTo(205, 0);
		expect(mouseUp.y).toBeCloseTo(225, 0);
	});

	test("dragNode should simulate dragging a node", async ({ page }) => {
		const flow = new XyflowTester(page, ".react-flow");
		const nodeId = "node-1";

		await setupDragTracking(page, nodeId);

		await flow.dragNode(nodeId, { deltaX: 100, deltaY: 100 });

		const events = await page.evaluate(
			() =>
				(globalThis as unknown as { mouseEvents: Record<string, unknown>[] })
					.mouseEvents,
		);

		expect(events[0].type).toBe("mousedown");
		expect(events.some((e) => e.type === "mousemove")).toBe(true);
		expect(events.at(-1)?.type).toBe("mouseup");

		// Node 1 is at (0,0) with size 100x50. Center is (50, 25).
		expect(events[0].x).toBeCloseTo(50, 0);
		expect(events[0].y).toBeCloseTo(25, 0);

		// Dragged by (100, 100). End center should be (150, 125).
		expect(events.at(-1)?.x).toBeCloseTo(150, 0);
		expect(events.at(-1)?.y).toBeCloseTo(125, 0);
	});

	test("panCanvas should simulate panning the canvas", async ({ page }) => {
		const flow = new XyflowTester(page, ".react-flow");

		await page.evaluate(() => {
			const events: any[] = [];
			window.addEventListener("mousedown", (e) =>
				events.push({ type: "mousedown", x: e.clientX, y: e.clientY }),
			);
			window.addEventListener("mouseup", (e) =>
				events.push({ type: "mouseup", x: e.clientX, y: e.clientY }),
			);
			(window as any)._events = events;
		});

		await flow.panCanvas({ deltaX: 50, deltaY: 50 });

		const capturedEvents = await page.evaluate(() => (window as any)._events);

		const mouseDown = capturedEvents.find((e: any) => e.type === "mousedown");
		const mouseUp = capturedEvents.find((e: any) => e.type === "mouseup");

		// Pane is 500x500 at (0,0). Center is (250, 250).
		expect(mouseDown.x).toBeCloseTo(250, 0);
		expect(mouseDown.y).toBeCloseTo(250, 0);

		// Panned by (50, 50). End center should be (300, 300).
		expect(mouseUp.x).toBeCloseTo(300, 0);
		expect(mouseUp.y).toBeCloseTo(300, 0);
	});
});
