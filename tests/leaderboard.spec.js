const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe Leaderboard', () => {
  let context1, context2, page1, page2, gameId;

  // Helper function to get scores from the leaderboard
  const getScores = async (page) => {
    await page.waitForSelector('#show-leaderboard-button');
    await page.click('#show-leaderboard-button');
    await page.waitForSelector('#leaderboard-modal:not(.hidden)');
    const scores = {};
    const rows = await page.locator('#leaderboard-table-container table tr').all();
    // Skip header row by starting loop at 1 if it exists
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = await row.locator('td').nth(1).textContent();
      const score = parseInt(await row.locator('td').nth(4).textContent(), 10);
      if (name) {
        scores[name] = score;
      }
    }
    await page.click('#leaderboard-modal .btn-close');
    return scores;
  };

  test.beforeEach(async ({ browser }) => {
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Start tracing
    await context1.tracing.start({ screenshots: true, snapshots: true });
    await context2.tracing.start({ screenshots: true, snapshots: true });

    page1.on('console', msg => console.log(`PLAYER 1: ${msg.text()}`));
    page2.on('console', msg => console.log(`PLAYER 2: ${msg.text()}`));
  });

  test.afterEach(async () => {
    // Stop tracing and save the trace file
    await context1.tracing.stop({ path: 'trace-leaderboard1.zip' });
    await context2.tracing.stop({ path: 'trace-leaderboard2.zip' });
  });

  test('should update the leaderboard after a game', async ({ page }) => {
    test.setTimeout(60000);

    const aliceName = 'Alice_' + Math.random().toString(36).substring(7);
    const bobName = 'Bob_' + Math.random().toString(36).substring(7);

    // 1. Pre-flight check to ensure the API server is running
    console.log('Pre-flight check: Verifying API server is accessible...');
    try {
      const apiResponse = await page.request.get('http://localhost:5000/leaderboard');
      expect(apiResponse.ok()).toBeTruthy();
      console.log('API server is responsive.');
    } catch (error) {
      console.error('API server check failed. Make sure the API server is running on http://localhost:5000.', error);
      throw new Error('API server is not accessible.');
    }

    // 2. Go to the page and get initial scores
    await page1.goto('http://localhost:8000');
    await page1.waitForSelector('#name-input'); // Wait for lobby to be ready
    console.log('Getting initial scores...');
    const initialScores = await getScores(page1);

    const aliceInitialScore = initialScores[aliceName] || 0;
    const bobInitialScore = initialScores[bobName] || 0;
    console.log(`Initial Scores - Alice: ${aliceInitialScore}, Bob: ${bobInitialScore}`);

    // 3. Player 1 (Alice) creates a game

    await page1.fill('#name-input', aliceName);
    await page1.click('#create-game-button');
    await page1.waitForSelector('#game-id-display');
    const gameIdText = await page1.locator('#game-id-display').textContent();
    gameId = gameIdText.split(': ')[1];
    expect(gameId).toBeTruthy();
    console.log(`Game created with ID: ${gameId}`);

    // 4. Player 2 (Bob) joins the game
    await page2.goto('http://localhost:8000');

    await page2.fill('#name-input', bobName);
    await page2.fill('#game-id-input', gameId);
    await page2.click('#join-game-button');

    // Wait for the game to start
    await page1.waitForSelector('div#board.board');
    await page2.waitForSelector('div#board.board');
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    console.log("Game started. It's Alice's turn.");

    // 5. Play a game where Bob wins
    // Alice
    await page1.locator('.cell[data-row="0"][data-col="0"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    // Bob
    await page2.locator('.cell[data-row="1"][data-col="0"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    // Alice
    await page1.locator('.cell[data-row="0"][data-col="1"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    // Bob
    await page2.locator('.cell[data-row="1"][data-col="1"]').click();
    await expect(page1.locator('div#status')).toHaveText('Your turn');
    // Alice
    await page1.locator('.cell[data-row="2"][data-col="0"]').click();
    await expect(page2.locator('div#status')).toHaveText('Your turn');
    // Bob wins
    await page2.locator('.cell[data-row="1"][data-col="2"]').click();
    console.log('Bob makes the winning move.');

    // 6. Verify the win message
    await expect(page1.locator('div#status')).toHaveText(`${bobName} wins!`);
    await expect(page2.locator('div#status')).toHaveText('You win!');
    console.log('Win message verified.');

    // 7. Leave the game to return to the lobby
    console.log('Leaving game to return to lobby...');
    await page1.click('button:has-text("Leave Game")');
    await page1.waitForSelector('#lobby-container:not(.hidden)');
    console.log('Returned to lobby.');

    // 8. Get final scores and verify the update
    console.log('Getting final scores...');
    const finalScores = await getScores(page1);

    const aliceFinalScore = finalScores[aliceName] || 0;
    const bobFinalScore = finalScores[bobName] || 0;
    console.log(`Final Scores - Alice: ${aliceFinalScore}, Bob: ${bobFinalScore}`);

    // 9. Assert the scores
    expect(aliceFinalScore).toBe(aliceInitialScore);
    expect(bobFinalScore).toBe(bobInitialScore + 3);
    console.log('Leaderboard scores updated correctly. Test complete.');
  });
});
