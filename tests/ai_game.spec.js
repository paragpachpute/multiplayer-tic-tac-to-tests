const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe vs. Computer', () => {
  let page;
  let context;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    await context.tracing.start({ screenshots: true, snapshots: true });
    page = await context.newPage();
    await page.goto('http://localhost:8000');
  });

  test.afterEach(async () => {
    await context.tracing.stop({ path: 'trace-ai-game.zip' });
  });

  test('should allow a user to play a full game against the computer', async () => {
    console.log('Starting AI game test...');

    // 1. Start a game against the computer
    await page.fill('#name-input', 'Human Player');
    await page.click('#create-ai-game-button');
    console.log('AI game created.');

    // 2. Wait for the game to start and verify the initial state
    await page.waitForSelector('#board .cell');
    await expect(page.locator('#status')).toHaveText('Your turn');
    console.log("Game started. It's the human's turn.");

    // Helper function to get the text content of all cells
    const getBoardState = async () => {
      return await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('#board .cell'));
        return cells.map(cell => cell.textContent);
      });
    };

    // 3. Make the first move
    await page.locator('.cell[data-row="0"][data-col="0"]').click();
    console.log('Human played at (0, 0).');

    // 4. Wait for the AI's counter-move and verify the board state
    // The AI should respond, so we expect two pieces on the board.
    await expect(async () => {
      const pieces = (await getBoardState()).filter(Boolean);
      expect(pieces.length).toBe(2);
    }).toPass();
    console.log('AI has made its move.');

    // 5. Verify it's the human's turn again
    await expect(page.locator('#status')).toHaveText('Your turn');

    // 6. Play through to a draw
    // This is a valid sequence of moves that will result in a draw against a perfect AI
    await page.locator('.cell[data-row="0"][data-col="2"]').click(); // Human's 2nd move
    await expect(async () => expect((await getBoardState()).filter(Boolean).length).toBe(4)).toPass();

    await page.locator('.cell[data-row="2"][data-col="1"]').click(); // Human's 3rd move
    await expect(async () => expect((await getBoardState()).filter(Boolean).length).toBe(6)).toPass();
    
    await page.locator('.cell[data-row="1"][data-col="2"]').click(); // Human's 4th move
    await expect(async () => expect((await getBoardState()).filter(Boolean).length).toBe(8)).toPass();

    // Final human move to fill the board
    await page.locator('.cell[data-row="2"][data-col="0"]').click();
    console.log('Final move played.');

    // 7. Verify the final game state
    await expect(page.locator('#status')).toHaveText("It's a draw!");
    console.log('Draw status verified.');
    
    // 8. Verify the restart button is visible
    await expect(page.locator('#restart-button')).toBeVisible();
    console.log('Test complete.');
  });
});
