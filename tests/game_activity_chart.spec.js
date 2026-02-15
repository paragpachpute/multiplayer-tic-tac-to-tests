const { test, expect } = require('@playwright/test');

test.describe('Game Activity Chart', () => {
  test('should display chart with formatted date labels', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('http://localhost:8000');
    await page.waitForSelector('#game-activity-chart');

    // Wait for chart to initialize
    await page.waitForTimeout(1000);

    // Verify chart labels are not in YYYY-MM-DD format
    const labels = await page.evaluate(() => {
      const chartInstance = Chart.instances[Object.keys(Chart.instances)[0]];
      return chartInstance ? chartInstance.data.labels : [];
    });

    expect(labels.length).toBeGreaterThan(0);

    // No label should match the raw ISO date pattern YYYY-MM-DD
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const label of labels) {
      expect(label).not.toMatch(isoDatePattern);
    }
  });

  test('should update chart when range buttons are clicked', async ({ page }) => {
    test.setTimeout(30000);

    await page.goto('http://localhost:8000');
    await page.waitForSelector('#game-activity-chart');

    // Wait for initial chart load
    await page.waitForTimeout(1000);

    // Click "Last 30 Days" button
    await page.click('button[data-range="month"]');
    await expect(page.locator('button[data-range="month"]')).toHaveClass(/active/);

    // Wait for chart update
    await page.waitForTimeout(500);

    // Verify labels are still formatted
    const monthLabels = await page.evaluate(() => {
      const chartInstance = Chart.instances[Object.keys(Chart.instances)[0]];
      return chartInstance ? chartInstance.data.labels : [];
    });

    expect(monthLabels.length).toBeGreaterThan(0);
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const label of monthLabels) {
      expect(label).not.toMatch(isoDatePattern);
    }

    // Click "Last Year" button
    await page.click('button[data-range="year"]');
    await expect(page.locator('button[data-range="year"]')).toHaveClass(/active/);
  });
});
