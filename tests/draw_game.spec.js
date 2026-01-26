const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe Draw Game', () => {
  let context1, context2, page1, page2, gameId;

  test.beforeEach(async ({ browser }) => {
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Start tracing
    await context1.tracing.start({ screenshots: true, snapshots: true });
    await context2.tracing.start({ screenshots: true, snapshots: true });

    // Capture and forward browser console logs for debugging
    page1.on('console', msg => console.log(`PLAYER 1: ${msg.text()}`));
    page2.on('console', msg => console.log(`PLAYER 2: ${msg.text()}`));
  });

  test.afterEach(async () => {
    // Stop tracing and save the trace file
    await context1.tracing.stop({ path: 'trace-draw1.zip' });
    await context2.tracing.stop({ path: 'trace-draw2.zip' });
  });

  test('should result in a draw when the board is full', async () => {
    test.setTimeout(60000);

    // 1. Player 1 (Alice) creates a game
    await page1.goto('http://localhost:8000');
    await page1.click('#select-host-mode');
    await page1.fill('#name-input', 'Alice');
    await page1.click('#create-game-button');
    await page1.waitForSelector('#game-id-display');
    const gameIdText = await page1.locator('#game-id-display').textContent();
    gameId = gameIdText.split(': ')[1];
    expect(gameId).toBeTruthy();
    console.log(`Game created with ID: ${gameId}`);

    // 2. Player 2 (Bob) joins the game
    await page2.goto('http://localhost:8000');
    await page2.click('#select-join-mode');
    await page2.fill('#name-input', 'Bob');
    await page2.fill('#game-id-input', gameId);
    await page2.click('#join-game-button');

    // Wait for the game to start
    await page1.waitForSelector('div#board.board');
    await page2.waitForSelector('div#board.board');
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    console.log("Game started. It's Alice's turn.");

    // 3. Make moves to fill the board in a draw sequence
    // Move 1 (X)
    await page1.locator('.cell[data-row="0"][data-col="0"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    // Move 2 (O)
    await page2.locator('.cell[data-row="0"][data-col="1"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    // Move 3 (X)
    await page1.locator('.cell[data-row="0"][data-col="2"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    // Move 4 (O)
    await page2.locator('.cell[data-row="1"][data-col="1"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    // Move 5 (X)
    await page1.locator('.cell[data-row="1"][data-col="0"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    // Move 6 (O)
    await page2.locator('.cell[data-row="2"][data-col="0"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    // Move 7 (X)
    await page1.locator('.cell[data-row="1"][data-col="2"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    // Move 8 (O)
    await page2.locator('.cell[data-row="2"][data-col="2"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    // Move 9 (X) - Final move
    await page1.locator('.cell[data-row="2"][data-col="1"]').click();
    console.log('All moves made, board is full.');

    // 4. Verify the draw status
    await expect(page1.locator('div#status')).toHaveText("It's a draw!");
    await expect(page2.locator('div#status')).toHaveText("It's a draw!");
    console.log('Draw status verified. Test complete.');
  });
});
