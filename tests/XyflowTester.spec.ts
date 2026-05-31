import { test, expect } from '@playwright/test';
import { XyflowTester } from '../src/index.js';

test.describe('XyflowTester Locators', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a mock React Flow DOM structure into the page
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

  test('getNodeLocator should locate nodes by id', async ({ page }) => {
    const flow = new XyflowTester(page, '.react-flow');
    
    const node1 = flow.getNodeLocator('node-1');
    await expect(node1).toBeVisible();
    await expect(node1).toHaveAttribute('data-id', 'node-1');

    const node2 = flow.getNodeLocator('node-2');
    await expect(node2).toBeVisible();
  });

  test('getHandleLocator should locate handles by node id, type, and handle id', async ({ page }) => {
    const flow = new XyflowTester(page, '.react-flow');
    
    const sourceHandle = flow.getHandleLocator('node-1', 'source', 'source-a');
    await expect(sourceHandle).toBeVisible();
    await expect(sourceHandle).toHaveClass(/react-flow__handle-source/);
    await expect(sourceHandle).toHaveAttribute('data-handleid', 'source-a');

    const targetHandle = flow.getHandleLocator('node-1', 'target', 'target-a');
    await expect(targetHandle).toBeVisible();
    await expect(targetHandle).toHaveClass(/react-flow__handle-target/);
    await expect(targetHandle).toHaveAttribute('data-handleid', 'target-a');

    // Test without handleId
    const targetHandle2 = flow.getHandleLocator('node-2', 'target');
    await expect(targetHandle2).toBeVisible();
    await expect(targetHandle2).toHaveClass(/react-flow__handle-target/);
  });

  test('getEdgeLocator should locate edges by source and target node ids', async ({ page }) => {
    const flow = new XyflowTester(page, '.react-flow');
    
    const edge = flow.getEdgeLocator('node-1', 'node-2');
    await expect(edge).toBeVisible();
    await expect(edge).toHaveClass(/react-flow__edge-path/);
    await expect(edge).toHaveAttribute('data-testid', 'rf__edge-node-1-node-2');
  });

  test('should support svelte-flow prefix', async ({ page }) => {
    // Inject a mock Svelte Flow DOM
    await page.setContent(`
      <div class="my-svelte-flow">
        <div class="svelte-flow__node" data-id="s-node-1" style="width: 50px; height: 50px;"></div>
      </div>
    `);

    const flow = new XyflowTester(page, '.my-svelte-flow', { prefix: 'svelte-flow' });
    const node = flow.getNodeLocator('s-node-1');
    await expect(node).toBeVisible();
  });
});
