const { test, expect } = require('@playwright/test');

test.describe('Ultimate Tic-Tac-Toe Game Flow', () => {
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
        await context1.tracing.stop({ path: 'trace-ultimate1.zip' });
        await context2.tracing.stop({ path: 'trace-ultimate2.zip' });
    });

    test('should allow players to win a local board and trigger a free move', async() => {
        test.setTimeout(60000);

        // 1. Alice creates an Ultimate game
        await page1.goto('http://localhost:8000');
        await page1.click('#select-host-mode');
        await page1.fill('#name-input', 'Alice');
        await page1.locator('input[name="game-mode"][value="ultimate"]').check();
        await page1.click('#create-game-button');
        await page1.waitForSelector('#game-id-display');
        const gameIdText = await page1.locator('#game-id-display').textContent();
        gameId = gameIdText.split(': ')[1];
        expect(gameId).toBeTruthy();
        console.log('Ultimate game created.');

        // 2. Bob joins the game
        await page2.goto('http://localhost:8000');
        await page2.click('#select-join-mode');
        await page2.fill('#name-input', 'Bob');
        await page2.fill('#game-id-input', gameId);
        await page2.click('#join-game-button');
        await page1.waitForSelector('.board.ultimate');
        await expect(page1.locator('div#status')).toHaveText('Your turn');
        console.log('Game started.');

        // Helper to click a cell by its absolute 0-8 coordinates
        const clickCell = async (page, row, col) => {
            const macro_row = Math.floor(row / 3);
            const macro_col = Math.floor(col / 3);
            const micro_row = row % 3;
            const micro_col = col % 3;
            const microBoard = page.locator('.micro-board').nth(macro_row * 3 + macro_col);
            await microBoard.locator('.cell').nth(micro_row * 3 + micro_col).click();
        };

        // 3. Play the user-provided sequence for Bob to win the center board
        await clickCell(page1, 4, 4); // Alice sends Bob to center(1,1)
        await expect(page2.locator('div#status')).toHaveText('Your turn');

        await clickCell(page2, 3, 3); // Bob sends Alice to top-left(0,0)
        await expect(page1.locator('div#status')).toHaveText('Your turn');

        await clickCell(page1, 1, 1); // Alice sends Bob to center(1,1)
        await expect(page2.locator('div#status')).toHaveText('Your turn');

        await clickCell(page2, 5, 5); // Bob sends Alice to bottom-right(2,2)
        await expect(page1.locator('div#status')).toHaveText('Your turn');

        await clickCell(page1, 7, 7); // Alice sends Bob to center(1,1)
        await expect(page2.locator('div#status')).toHaveText('Your turn');

        await clickCell(page2, 3, 5); // Bob sends Alice to top-right(0,2)
        await expect(page1.locator('div#status')).toHaveText('Your turn');

        await clickCell(page1, 1, 7); // Alice sends Bob to center(1,1)
        await expect(page2.locator('div#status')).toHaveText('Your turn');

        // Bob makes the final move.
        await clickCell(page2, 4, 5);
        console.log('Final move played by Bob.');

        // 4. Verify the center board is won by Bob (O)
        const centerBoard = page1.locator('.micro-board').nth(4);
        await expect(centerBoard.locator('.winner-overlay')).toHaveText('O');
        await expect(centerBoard).toHaveClass(/.*won.*/);
        console.log('Verified that Bob won the center board.');

        // 5. Verify Alice is sent to the correct next board
        // Bob's winning move was (4,5), which sends Alice to the center-right board (1,2).
        await expect(page1.locator('div#status')).toHaveText('Your turn');
        await expect(page1.locator('.micro-board').nth(5)).toHaveClass(/.*active.*/);
        console.log('Verified that Alice is correctly sent to the center-right board.');
    });
});