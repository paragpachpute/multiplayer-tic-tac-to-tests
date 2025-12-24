const { test, expect } = require('@playwright/test');

test.describe('Tic-Tac-Toe Game Restart', () => {
    let context1, context2, page1, page2, gameId;

    test.beforeEach(async({ browser }) => {
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
        await context1.tracing.stop({ path: 'trace-restart1.zip' });
        await context2.tracing.stop({ path: 'trace-restart2.zip' });
    });

    test('should allow players to restart after a game ends', async() => {
        test.setTimeout(60000);

        // 1. Setup: Alice creates a game, Bob joins
        await page1.goto('http://localhost:8000');
        await page1.fill('#name-input', 'Alice');
        await page1.click('#create-game-button');
        await page1.waitForSelector('#game-id-display');
        const gameIdText = await page1.locator('#game-id-display').textContent();
        gameId = gameIdText.split(': ')[1];
        expect(gameId).toBeTruthy();

        await page2.goto('http://localhost:8000');
        await page2.fill('#name-input', 'Bob');
        await page2.fill('#game-id-input', gameId);
        await page2.click('#join-game-button');

        await page1.waitForSelector('div#board.board');
        await expect(page1.locator('div#status')).toHaveText('Your turn');
        console.log('Game 1 started.');

        // 2. Game 1: Play to a draw
        await page1.locator('.cell[data-row="0"][data-col="0"]').click(); // X
        await page2.locator('.cell[data-row="0"][data-col="1"]').click(); // O
        await page1.locator('.cell[data-row="0"][data-col="2"]').click(); // X
        await page2.locator('.cell[data-row="1"][data-col="1"]').click(); // O
        await page1.locator('.cell[data-row="1"][data-col="0"]').click(); // X
        await page2.locator('.cell[data-row="2"][data-col="0"]').click(); // O
        await page1.locator('.cell[data-row="1"][data-col="2"]').click(); // X
        await page2.locator('.cell[data-row="2"][data-col="2"]').click(); // O
        await page1.locator('.cell[data-row="2"][data-col="1"]').click(); // X (Draw)
        console.log('Game 1 finished as a draw.');

        // 3. Verify draw and restart button
        await expect(page1.locator('div#status')).toHaveText("It's a draw!");
        await expect(page2.locator('div#status')).toHaveText("It's a draw!");
        await expect(page1.locator('#restart-button')).toBeVisible();
        await expect(page2.locator('#restart-button')).toBeVisible();
        console.log('Draw status and restart button verified.');

        // 4. Alice clicks restart
        await page1.click('#restart-button');
        console.log('Restart initiated.');

        // 5. Verify Game 2 starts correctly
        await expect(page1.locator('div#status')).toHaveText('Your turn');
        await expect(page2.locator('div#status')).toHaveText("Alice's turn");
        const cells = await page1.locator('.cell').all();
        for (const cell of cells) {
            await expect(cell).toHaveText('');
        }
        console.log('Game 2 started, board is clear, and it is Alice\'s turn.');

        // 6. Game 2: Play until Bob wins
        await page1.locator('.cell[data-row="0"][data-col="0"]').click(); // X
        await page2.locator('.cell[data-row="1"][data-col="0"]').click(); // O
        await page1.locator('.cell[data-row="0"][data-col="1"]').click(); // X
        await page2.locator('.cell[data-row="1"][data-col="1"]').click(); // O
        await page1.locator('.cell[data-row="2"][data-col="2"]').click(); // X
        await page2.locator('.cell[data-row="1"][data-col="2"]').click(); // O (Win)
        console.log('Game 2 finished, Bob wins.');

        // 7. Verify winner
        await expect(page1.locator('div#status')).toHaveText('Bob wins!');
        await expect(page2.locator('div#status')).toHaveText('You win!');
        await expect(page1.locator('#restart-button')).toBeVisible();
        console.log('Winner verified. Test complete.');
    });
});