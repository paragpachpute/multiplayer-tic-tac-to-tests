const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe Game Refresh', () => {
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
    await context1.tracing.stop({ path: 'trace-refresh1.zip' });
    await context2.tracing.stop({ path: 'trace-refresh2.zip' });
  });

  test('should allow a player to refresh and continue the game', async () => {
    test.setTimeout(60000); // Increase test timeout

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

    // 3. Make two moves each
    // Alice's 1st move
    await page1.locator('.cell[data-row="0"][data-col="0"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    console.log("Alice moved (0,0). It's Bob's turn.");

    // Bob's 1st move
    await page2.locator('.cell[data-row="1"][data-col="0"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    console.log("Bob moved (1,0). It's Alice's turn.");

    // Alice's 2nd move
    await page1.locator('.cell[data-row="0"][data-col="1"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    console.log("Alice moved (0,1). It's Bob's turn.");

    // Bob's 2nd move
    await page2.locator('.cell[data-row="1"][data-col="1"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    console.log("Bob moved (1,1). It's Alice's turn.");

    // 4. Player 1 (Alice) refreshes the page
    console.log('Alice is refreshing the page...');
    await page1.reload();
    console.log('Alice page reloaded.');

    // 5. Verify the game automatically rejoins and restores state
    await page1.waitForSelector('div#board.board');
    console.log('Alice has automatically rejoined the game.');

    // 6. Verify the game state is restored correctly
    await page1.waitForSelector('div#board.board');
    await expect(page1.locator('.cell[data-row="0"][data-col="0"]')).toHaveText('X');
    await expect(page1.locator('.cell[data-row="0"][data-col="1"]')).toHaveText('X');
    await expect(page1.locator('.cell[data-row="1"][data-col="0"]')).toHaveText('O');
    await expect(page1.locator('.cell[data-row="1"][data-col="1"]')).toHaveText('O');
    console.log('Game state is correctly restored for Alice.');

    // Verify it is still Alice's turn
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    console.log("It is correctly Alice's turn after rejoining.");

    // 7. Finish the game
    await page1.locator('.cell[data-row="0"][data-col="2"]').click();
    console.log('Alice makes the winning move (0,2).');

    // 8. Verify the winner
    await expect(page1.locator('div#status')).toHaveText('You win!');
    await expect(page2.locator('div#status')).toHaveText('Alice wins!');
    console.log('Winner verified. Test complete.');
  });
});
