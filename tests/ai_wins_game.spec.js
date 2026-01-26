const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe vs. Computer (AI Wins)', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8000');
  });

  test('should result in a win for the computer when the human makes a mistake', async () => {
    console.log('Starting AI wins test...');

    // 1. Start a game against the computer
    await page.click('#select-ai-mode');
    await page.fill('#name-input', 'Human Player');
    await page.click('#create-ai-game-button');
    console.log('AI game created.');

    // 2. Wait for the game to start
    await page.waitForSelector('#board .cell');
    await expect(page.locator('#status')).toHaveText('Your turn');
    console.log("Game started. It's the human's turn.");

    // 3. Play a sequence where the human makes a mistake
    // Human plays at (0, 0)
    await page.locator('.cell[data-row="0"][data-col="0"]').click();
    // Wait for AI's move (AI should take the center at 1,1)
    await expect(page.locator('.cell[data-row="1"][data-col="1"]')).toHaveText('O');
    console.log('Human played at (0,0), AI responded at (1,1).');

    // Human plays at (0, 2)
    await page.locator('.cell[data-row="0"][data-col="2"]').click();
    // Wait for AI's move (AI should block at 0,1)
    await expect(page.locator('.cell[data-row="0"][data-col="1"]')).toHaveText('O');
    console.log('Human played at (0,2), AI responded at (0,1).');

    // Human makes a mistake, playing at (2, 2) instead of blocking the AI's diagonal
    await page.locator('.cell[data-row="2"][data-col="2"]').click();
    console.log('Human made a mistake at (2,2).');

    // 4. Verify that the status updates to show the AI has won
    await expect(page.locator('#status')).toHaveText('Computer wins!');
    console.log('AI made the winning move. Status verified.');

    // 5. Verify the restart button is visible
    await expect(page.locator('#restart-button')).toBeVisible();
    console.log('Test complete.');
  });
});
