const { test, expect } = require('@playwright/test');

test.describe('Full Ultimate Tic-Tac-Toe Game', () => {
    let context1, context2, page1, page2, gameId;

    test.beforeEach(async({ browser }) => {
        context1 = await browser.newContext();
        context2 = await browser.newContext();
        page1 = await context1.newPage();
        page2 = await context2.newPage();
    });

    test('should correctly replay the game from the provided log', async() => {
        test.setTimeout(120000); // Increase timeout for the long sequence

        // 1. Setup: 'Alice' creates an Ultimate game, 'Bob' joins
        await page1.goto('http://localhost:8000');
        await page1.fill('#name-input', 'Alice');
        await page1.locator('input[name="game-mode"][value="ultimate"]').check();
        await page1.click('#create-game-button');
        await page1.waitForSelector('#game-id-display');
        const gameIdText = await page1.locator('#game-id-display').textContent();
        gameId = gameIdText.split(': ')[1];
        expect(gameId).toBeTruthy();

        await page2.goto('http://localhost:8000');
        await page2.fill('#name-input', 'Bob');
        await page2.fill('#game-id-input', gameId);
        await page2.click('#join-game-button');
        await page1.waitForSelector('.board.ultimate');
        await expect(page1.locator('div#status')).toHaveText('Your turn');

        // Helper to click a cell by its absolute 0-8 coordinates
        const clickCell = async (page, row, col) => {
            const macro_row = Math.floor(row / 3);
            const macro_col = Math.floor(col / 3);
            const micro_row = row % 3;
            const micro_col = col % 3;
            const microBoard = page.locator('.micro-board').nth(macro_row * 3 + macro_col);
            await microBoard.locator('.cell').nth(micro_row * 3 + micro_col).click();
        };

        // 2. Replay the exact sequence from the log
        await clickCell(page1, 0, 0); // a
        await clickCell(page2, 1, 1); // b
        await clickCell(page1, 3, 5); // a
        await clickCell(page2, 1, 8); // b
        await clickCell(page1, 4, 8); // a
        await clickCell(page2, 4, 7); // b
        await clickCell(page1, 4, 4); // a
        await clickCell(page2, 4, 5); // b
        await clickCell(page1, 3, 6); // a
        await clickCell(page2, 2, 2); // b
        await clickCell(page1, 6, 8); // a
        await clickCell(page2, 1, 7); // b
        await clickCell(page1, 5, 3); // a
        await clickCell(page2, 6, 0); // b
        await clickCell(page1, 1, 0); // a
        await clickCell(page2, 4, 1); // b
        await clickCell(page1, 2, 0); // a
        await clickCell(page2, 7, 0); // b
        await clickCell(page1, 3, 0); // a
        await clickCell(page2, 1, 3); // b
        await clickCell(page1, 4, 0); // a
        await clickCell(page2, 3, 1); // b
        await clickCell(page1, 1, 5); // a
        await clickCell(page2, 4, 6); // b
        await clickCell(page1, 5, 0); // a
        await clickCell(page2, 8, 0); // b
        await clickCell(page1, 6, 6); // a
        await clickCell(page2, 1, 6); // b
        await clickCell(page1, 6, 7); // a

        // 3. Assert the final state
        // After the last move, the game should be won by player 'Alice'
        await expect(page1.locator('div#status')).toHaveText('You win!');
        await expect(page2.locator('div#status')).toHaveText('Alice wins!');
        
        console.log('Game replay completed and winner correctly verified.');
    });
});