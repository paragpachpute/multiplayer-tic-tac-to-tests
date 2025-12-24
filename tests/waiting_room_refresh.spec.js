const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe Waiting Room Refresh', () => {
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
    await context1.tracing.stop({ path: 'trace-waiting-refresh1.zip' });
    await context2.tracing.stop({ path: 'trace-waiting-refresh2.zip' });
  });

  test('should show waiting state after page refresh, then start game when opponent joins', async () => {
    test.setTimeout(90000); // Increase test timeout

    // 1. Player 1 (Alice) creates a game
    console.log('Player 1 creating game...');
    await page1.goto('http://localhost:8000');
    await page1.waitForSelector('#name-input');
    await page1.fill('#name-input', 'Alice');
    await page1.click('#create-game-button');

    // 2. Verify initial waiting state
    await page1.waitForSelector('#game-id-display');
    const gameIdText = await page1.locator('#game-id-display').textContent();
    gameId = gameIdText.split(': ')[1];
    expect(gameId).toBeTruthy();
    console.log(`Game created with ID: ${gameId}`);

    // Verify we're in waiting state
    await expect(page1.locator('#status')).toHaveText('Waiting for opponent...');

    // Verify board is hidden and timers are hidden
    const boardDisplay = page1.locator('#board');
    await expect(boardDisplay).toHaveCSS('display', 'none');

    const playerXContainer = page1.locator('#player-x-timer-container');
    const playerOContainer = page1.locator('#player-o-timer-container');
    await expect(playerXContainer).toHaveCSS('visibility', 'hidden');
    await expect(playerOContainer).toHaveCSS('visibility', 'hidden');

    console.log('Initial waiting state verified - board and timers hidden');

    // 3. Refresh the page
    console.log('Refreshing page...');
    await page1.reload({ waitUntil: 'networkidle' });

    // 4. Verify reconnection and waiting state persists
    await page1.waitForSelector('#game-id-display');
    const gameIdAfterRefresh = await page1.locator('#game-id-display').textContent();
    expect(gameIdAfterRefresh).toBe(`Game ID: ${gameId}`);

    // Verify still in waiting state
    await expect(page1.locator('#status')).toHaveText('Waiting for opponent...');

    // Verify board is still hidden and timers are still hidden
    await expect(page1.locator('#board')).toHaveCSS('display', 'none');
    await expect(page1.locator('#player-x-timer-container')).toHaveCSS('visibility', 'hidden');
    await expect(page1.locator('#player-o-timer-container')).toHaveCSS('visibility', 'hidden');

    console.log('After refresh - still in waiting state, board and timers still hidden');

    // 5. Verify connection indicator shows connected
    const connectionIndicator = page1.locator('#connection-indicator');
    await expect(connectionIndicator).toHaveClass(/connected/);
    await expect(connectionIndicator.locator('.connection-text')).toHaveText('Connected');

    console.log('Connection indicator shows connected');

    // 6. Player 2 (Bob) joins the game
    console.log('Player 2 joining game...');
    await page2.goto('http://localhost:8000');
    await page2.waitForSelector('#name-input');
    await page2.fill('#name-input', 'Bob');
    await page2.fill('#game-id-input', gameId);
    await page2.click('#join-game-button');

    // 7. Verify both players now see the active game
    console.log('Verifying game started for both players...');

    // Wait for board to become visible and game to start
    await page1.waitForSelector('#board', { state: 'visible' });
    await page2.waitForSelector('#board', { state: 'visible' });

    // Verify board is now visible (not display: none)
    await expect(page1.locator('#board')).not.toHaveCSS('display', 'none');
    await expect(page2.locator('#board')).not.toHaveCSS('display', 'none');

    // Verify timers are now visible
    await expect(page1.locator('#player-x-timer-container')).not.toHaveCSS('visibility', 'hidden');
    await expect(page1.locator('#player-o-timer-container')).not.toHaveCSS('visibility', 'hidden');
    await expect(page2.locator('#player-x-timer-container')).not.toHaveCSS('visibility', 'hidden');
    await expect(page2.locator('#player-o-timer-container')).not.toHaveCSS('visibility', 'hidden');

    // Verify turn status
    await expect(page1.locator('#status')).toHaveText('Your turn');
    await expect(page2.locator('#status')).toHaveText("Alice's turn");

    console.log('Game successfully started after opponent joined');

    // 8. Verify players can make moves (basic game functionality)
    await page1.waitForSelector('.cell[data-row="0"][data-col="0"]:not(.disabled)');
    await page1.locator('.cell[data-row="0"][data-col="0"]').click();

    // Verify move was made and turn switched
    await expect(page1.locator('#status')).toHaveText("Bob's turn");
    await expect(page2.locator('#status')).toHaveText('Your turn');

    console.log('Game functionality verified - moves work correctly');
  });

  test('should handle multiple refreshes while waiting', async () => {
    test.setTimeout(60000);

    // Create game
    await page1.goto('http://localhost:8000');
    await page1.fill('#name-input', 'Alice');
    await page1.click('#create-game-button');

    await page1.waitForSelector('#game-id-display');
    const gameIdText = await page1.locator('#game-id-display').textContent();
    gameId = gameIdText.split(': ')[1];

    // Verify initial waiting state
    await expect(page1.locator('#status')).toHaveText('Waiting for opponent...');
    await expect(page1.locator('#board')).toHaveCSS('display', 'none');

    // Refresh multiple times
    for (let i = 1; i <= 3; i++) {
      console.log(`Refresh ${i}/3...`);
      await page1.reload({ waitUntil: 'networkidle' });

      // Verify state persists
      await page1.waitForSelector('#game-id-display');
      await expect(page1.locator('#game-id-display')).toHaveText(`Game ID: ${gameId}`);
      await expect(page1.locator('#status')).toHaveText('Waiting for opponent...');
      await expect(page1.locator('#board')).toHaveCSS('display', 'none');
      await expect(page1.locator('#connection-indicator')).toHaveClass(/connected/);
    }

    console.log('Multiple refreshes handled correctly');
  });
});