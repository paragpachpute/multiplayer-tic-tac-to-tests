const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe Leaderboard', () => {
  let context1, context2, page1, page2, gameId;

  // Helper function to get leaderboard data from the leaderboard
  const getLeaderboardData = async (page) => {
    await page.waitForSelector('#show-leaderboard-button');
    await page.click('#show-leaderboard-button');
    await page.waitForSelector('#leaderboard-modal:not(.hidden)');
    const playerData = {};
    const rows = await page.locator('#leaderboard-table-container table tr').all();
    // Skip header row by starting loop at 1 if it exists
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = await row.locator('td').nth(1).textContent();
      const wins = parseInt(await row.locator('td').nth(2).textContent(), 10);
      const losses = parseInt(await row.locator('td').nth(3).textContent(), 10);
      const draws = parseInt(await row.locator('td').nth(4).textContent(), 10);
      const winPercentageText = await row.locator('td').nth(5).textContent();
      const winPercentage = parseFloat(winPercentageText.replace('%', ''));
      const lastPlayed = await row.locator('td').nth(6).textContent();
      if (name) {
        playerData[name] = { wins, losses, draws, winPercentage, lastPlayed };
      }
    }
    await page.click('#leaderboard-modal .btn-close');
    return playerData;
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
      const apiResponse = await page.request.get('http://localhost:5123/leaderboard');
      expect(apiResponse.ok()).toBeTruthy();
      console.log('API server is responsive.');
    } catch (error) {
      console.error('API server check failed. Make sure the API server is running on http://localhost:5123.', error);
      throw new Error('API server is not accessible.');
    }

    // 2. Go to the page and get initial leaderboard data
    await page1.goto('http://localhost:8000');
    await page1.waitForSelector('#select-host-mode'); // Wait for lobby to be ready
    console.log('Getting initial leaderboard data...');
    const initialData = await getLeaderboardData(page1);

    const aliceInitial = initialData[aliceName] || { wins: 0, losses: 0, winPercentage: 0.0 };
    const bobInitial = initialData[bobName] || { wins: 0, losses: 0, winPercentage: 0.0 };
    console.log(`Initial Data - Alice: ${JSON.stringify(aliceInitial)}, Bob: ${JSON.stringify(bobInitial)}`);

    // 3. Player 1 (Alice) creates a game
    await page1.click('#select-host-mode');
    await page1.fill('#name-input', aliceName);
    await page1.click('#create-game-button');
    await page1.waitForSelector('#game-id-display');
    const gameIdText = await page1.locator('#game-id-display').textContent();
    gameId = gameIdText.split(': ')[1];
    expect(gameId).toBeTruthy();
    console.log(`Game created with ID: ${gameId}`);

    // 4. Player 2 (Bob) joins the game
    await page2.goto('http://localhost:8000');
    await page2.click('#select-join-mode');
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

    // 8. Get final leaderboard data and verify the update
    console.log('Getting final leaderboard data...');
    const finalData = await getLeaderboardData(page1);

    const aliceFinal = finalData[aliceName];
    const bobFinal = finalData[bobName];
    console.log(`Final Data - Alice: ${JSON.stringify(aliceFinal)}, Bob: ${JSON.stringify(bobFinal)}`);

    // 9. Assert Bob has one more win (Bob should be in top 10 with 100% win rate)
    expect(bobFinal).toBeDefined();
    expect(bobFinal.wins).toBe(bobInitial.wins + 1);

    // 10. Verify Bob's win percentage is calculated correctly
    const bobTotalGames = bobFinal.wins + bobFinal.losses;
    const expectedBobWinPct = (bobFinal.wins / bobTotalGames) * 100;
    expect(bobFinal.winPercentage).toBeCloseTo(expectedBobWinPct, 2);

    // 11. If Alice is in the top 10, verify her stats
    if (aliceFinal) {
      expect(aliceFinal.losses).toBe(aliceInitial.losses + 1);
      const aliceTotalGames = aliceFinal.wins + aliceFinal.losses;
      const expectedAliceWinPct = (aliceFinal.wins / aliceTotalGames) * 100;
      expect(aliceFinal.winPercentage).toBeCloseTo(expectedAliceWinPct, 2);
      console.log('Alice is in top 10 and her stats are correct.');
    } else {
      console.log('Alice is not in top 10 (has 0% win rate and there are many other players).');
    }

    console.log('Leaderboard data updated correctly. Test complete.');
  });

  test('should display all required columns', async ({ page }) => {
    test.setTimeout(30000);

    // Navigate to the page
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#show-leaderboard-button');

    // Open leaderboard
    await page.click('#show-leaderboard-button');
    await page.waitForSelector('#leaderboard-modal:not(.hidden)');

    // Verify table headers
    const headers = await page.locator('#leaderboard-table-container table thead th').allTextContents();
    expect(headers).toEqual(['Rank', 'Name', 'Wins', 'Losses', 'Draws', 'Win %', 'Last Played']);

    // Close leaderboard
    await page.click('#leaderboard-modal .btn-close');
    console.log('All required columns are displayed correctly.');
  });

  test('should sort players by wins, draws, then losses (all descending)', async ({ page }) => {
    test.setTimeout(30000);

    // Navigate to the page
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#show-leaderboard-button');

    // Open leaderboard
    await page.click('#show-leaderboard-button');
    await page.waitForSelector('#leaderboard-modal:not(.hidden)');

    // Get all player stats
    const rows = await page.locator('#leaderboard-table-container table tbody tr').all();
    const playerStats = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const wins = parseInt(await row.locator('td').nth(2).textContent(), 10);
      const losses = parseInt(await row.locator('td').nth(3).textContent(), 10);
      const draws = parseInt(await row.locator('td').nth(4).textContent(), 10);
      playerStats.push({ wins, draws, losses });
    }

    // Verify sorting order: wins (desc), then draws (desc), then losses (desc)
    for (let i = 0; i < playerStats.length - 1; i++) {
      const current = playerStats[i];
      const next = playerStats[i + 1];

      // First, compare by wins (descending)
      if (current.wins !== next.wins) {
        expect(current.wins).toBeGreaterThan(next.wins);
      } else if (current.draws !== next.draws) {
        // If wins are equal, compare by draws (descending)
        expect(current.draws).toBeGreaterThan(next.draws);
      } else {
        // If wins and draws are equal, compare by losses (descending)
        expect(current.losses).toBeGreaterThanOrEqual(next.losses);
      }
    }

    // Close leaderboard
    await page.click('#leaderboard-modal .btn-close');
    console.log('Players are sorted by wins, then draws, then losses (all descending).');
  });

  test('should display only top 10 players', async ({ page }) => {
    test.setTimeout(30000);

    // Navigate to the page
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#show-leaderboard-button');

    // Open leaderboard
    await page.click('#show-leaderboard-button');
    await page.waitForSelector('#leaderboard-modal:not(.hidden)');

    // Count the number of rows (excluding header)
    const rows = await page.locator('#leaderboard-table-container table tbody tr').all();
    expect(rows.length).toBeLessThanOrEqual(10);

    // Close leaderboard
    await page.click('#leaderboard-modal .btn-close');
    console.log('Leaderboard displays at most 10 players.');
  });
});
