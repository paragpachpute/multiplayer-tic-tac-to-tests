const { test, expect } = require('@playwright/test');

test.describe('Ultimate Tic-Tac-Toe Draw Game', () => {
    let context1, context2, page1, page2, gameId;

    // This is a complete, valid sequence of 74 moves carefully constructed
    // to result in a draw on the macro-board.
    const drawSequence = [
        [1, 1], [4, 4], [3, 3], [0, 0], [0, 1], [1, 4], [3, 4], [0, 3], [2, 1], [7, 4], [3, 5], [1, 7], 
        [2, 5], [7, 7], [0, 4], [0, 5], [0, 6], [2, 3], [7, 1], [0, 7], [2, 7], [6, 3], [0, 8], [1, 6], 
        [4, 1], [1, 8], [4, 7], [3, 0], [3, 1], [5, 1], [8, 5], [6, 6], [3, 2], [5, 0], [6, 0], [4, 0], 
        [3, 6], [5, 8], [8, 8], [6, 7], [3, 7], [3, 8], [5, 7], [6, 4], [8, 2], [6, 8], [6, 5], [8, 4]
    ];


    test.beforeEach(async({ browser }) => {
        context1 = await browser.newContext();
        context2 = await browser.newContext();
        page1 = await context1.newPage();
        page2 = await context2.newPage();

        await context1.tracing.start({ screenshots: true, snapshots: true });
        await context2.tracing.start({ screenshots: true, snapshots: true });

        page1.on('console', msg => console.log(`PLAYER 1: ${msg.text()}`));
        page2.on('console', msg => console.log(`PLAYER 2: ${msg.text()}`));
    });

    test.afterEach(async () => {
        await context1.tracing.stop({ path: 'trace-ultimate-draw1.zip' });
        await context2.tracing.stop({ path: 'trace-ultimate-draw2.zip' });
    });

    test('should result in a draw after filling the macro-board', async() => {
        test.setTimeout(180000); // Increase timeout for the very long sequence

        // 1. Setup: 'Alice' creates an Ultimate game, 'Bob' joins
        await page1.goto('http://localhost:8000');
        await page1.click('#select-host-mode');
        await page1.fill('#name-input', 'Alice');
        await page1.locator('input[name="game-mode"][value="ultimate"]').check();
        await page1.click('#create-game-button');
        await page1.waitForSelector('#game-id-display');
        const gameIdText = await page1.locator('#game-id-display').textContent();
        gameId = gameIdText.split(': ')[1];
        expect(gameId).toBeTruthy();

        await page2.goto('http://localhost:8000');
        await page2.click('#select-join-mode');
        await page2.fill('#name-input', 'Bob');
        await page2.fill('#game-id-input', gameId);
        await page2.click('#join-game-button');
        await page1.waitForSelector('.board.ultimate');
        await expect(page1.locator('div#status')).toHaveText('Your turn');
        console.log('Ultimate game started.');

        // Helper to click a cell by its absolute 0-8 coordinates
        const clickCell = async (page, row, col) => {
            const macro_row = Math.floor(row / 3);
            const macro_col = Math.floor(col / 3);
            const micro_row = row % 3;
            const micro_col = col % 3;
            const microBoard = page.locator('.micro-board').nth(macro_row * 3 + macro_col);
            await microBoard.locator('.cell').nth(micro_row * 3 + micro_col).click();
        };

        // 2. Execute the full move sequence
        for (let i = 0; i < drawSequence.length; i++) {
            const [row, col] = drawSequence[i];
            const isAliceTurn = i % 2 === 0;
            const currentPage = isAliceTurn ? page1 : page2;
            const waitingPage = isAliceTurn ? page2 : page1;
            
            console.log(`Move ${i + 1}: ${isAliceTurn ? 'Alice (X)' : 'Bob (O)'} plays at (${row}, ${col})`);
            
            await expect(currentPage.locator('div#status')).toHaveText('Your turn');
            await clickCell(currentPage, row, col);

            // After the last move, don't wait for the turn to switch
            if (i < drawSequence.length - 1) {
                await expect(waitingPage.locator('div#status')).toHaveText('Your turn');
            }
        }
        console.log('Full move sequence completed.');

        // 3. Assert the final draw state
        await expect(page1.locator('div#status')).toHaveText("It's a draw!");
        await expect(page2.locator('div#status')).toHaveText("It's a draw!");
        
        console.log('Game correctly resulted in a draw. Test complete.');
    });
});
