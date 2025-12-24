const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe Full Game Flow', () => {
  let browser, context1, context2, page1, page2, gameId;

  test.beforeEach(async ({ browser: browserInstance }) => {
    browser = browserInstance;
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Start tracing
    await context1.tracing.start({ screenshots: true, snapshots: true });
    await context2.tracing.start({ screenshots: true, snapshots: true });

    // Capture and forward browser console logs
    page1.on('console', msg => console.log(`PAGE 1 LOG: ${msg.text()}`));
    page2.on('console', msg => console.log(`PAGE 2 LOG: ${msg.text()}`));
  });

  test.afterEach(async () => {
    // Stop tracing and save the trace file
    await context1.tracing.stop({ path: 'trace-full-game1.zip' });
    await context2.tracing.stop({ path: 'trace-full-game2.zip' });
  });

  test('should allow two players to complete a game', async () => {
    test.setTimeout(60000); // Increase test timeout to 60 seconds
    try {
      
      // Player 1 (Alice) creates a game
      console.log('Navigating Player 1 to http://localhost:8000...');
      await page1.goto('http://localhost:8000', { timeout: 30000 }); // Increase navigation timeout
      console.log('Player 1 navigation complete.');
      await page1.waitForSelector('#name-input');
      console.log('Player 1 found name input.');
      await page1.fill('#name-input', 'Alice');
      await page1.click('#create-game-button');
      await page1.waitForSelector('#game-id-display');
      const gameIdText = await page1.locator('#game-id-display').textContent();
      gameId = gameIdText.split(': ')[1];
      expect(gameId).not.toBe('');
      console.log(`Game created with ID: ${gameId}`);

      // Player 2 (Bob) joins the game
      console.log('Navigating Player 2 to http://localhost:8000...');
      await page2.goto('http://localhost:8000', { timeout: 30000 });
      console.log('Player 2 navigation complete.');
      await page2.waitForSelector('#name-input');
      console.log('Player 2 found name input.');
      await page2.fill('#name-input', 'Bob');
      await page2.fill('#game-id-input', gameId);
      await page2.click('#join-game-button');

      // Wait for game to start and for it to be Player 1's turn
      await page1.waitForSelector('div#board.board');
      await page2.waitForSelector('div#board.board');
      await page1.waitForSelector('div#status:has-text("Your turn")');
      console.log('Game board is visible and it is Player 1\'s turn.');

      // Make moves
      await page1.waitForSelector('.cell[data-row="0"][data-col="0"]:not(.disabled)');
      await page1.locator('.cell[data-row="0"][data-col="0"]').click();
      
      await page2.waitForSelector('.cell[data-row="1"][data-col="0"]:not(.disabled)');
      await page2.locator('.cell[data-row="1"][data-col="0"]').click();

      await page1.waitForSelector('.cell[data-row="0"][data-col="1"]:not(.disabled)');
      await page1.locator('.cell[data-row="0"][data-col="1"]').click();

      await page2.waitForSelector('.cell[data-row="1"][data-col="1"]:not(.disabled)');
      await page2.locator('.cell[data-row="1"][data-col="1"]').click();

      await page1.waitForSelector('.cell[data-row="0"][data-col="2"]:not(.disabled)');
      await page1.locator('.cell[data-row="0"][data-col="2"]').click();
      console.log('All moves made.');

      // Verify winner
      // Alice's page (page1) should say "You win!"
      await page1.waitForSelector('div#status:has-text("You win!")');
      const status1 = await page1.locator('div#status').textContent();
      expect(status1).toBe('You win!');

      // Bob's page (page2) should say "Alice wins!"
      await page2.waitForSelector('div#status:has-text("Alice wins!")');
      const status2 = await page2.locator('div#status').textContent();
      expect(status2).toBe('Alice wins!');
      console.log('Winner verified.');
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
});
