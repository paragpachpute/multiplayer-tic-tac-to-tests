const { test, expect } = require('@playwright/test');

test.describe('Ultimate Tic-Tac-Toe vs. AI', () => {
  let page;
  let context;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    // Start tracing
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    // Optional: Forward console logs for easier debugging
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
  });

  test.afterEach(async () => {
    // Stop tracing and save the file
    await context.tracing.stop({ path: 'trace-ultimate-ai.zip' });
    await context.close();
  });

  test('AI should consistently play in the correct micro-board for 50 moves', async () => {
    test.setTimeout(120000); // Set a generous 2-minute timeout for this long test

    // 1. Start an Ultimate AI Game
    await page.goto('http://localhost:8000');
    await page.waitForSelector('#name-input');
    await page.fill('#name-input', 'E2E Tester');
    await page.check('input[value="ultimate"]');
    await page.click('#create-ai-game-button');
    await page.waitForSelector('.board.ultimate');
    console.log('Ultimate AI game started.');

    // --- Helper Functions ---
    const getBoardState = () => page.evaluate(() => {
        const state = { cells: [], activeBoards: [], macroBoard: [] };
        const microBoards = document.querySelectorAll('.micro-board');
        microBoards.forEach((board, boardIndex) => {
            if (board.classList.contains('active')) {
                state.activeBoards.push(boardIndex);
            }
            const winnerOverlay = board.querySelector('.winner-overlay');
            state.macroBoard.push(winnerOverlay ? winnerOverlay.textContent : null);
            
            const cells = board.querySelectorAll('.cell');
            cells.forEach(cell => {
                state.cells.push(cell.textContent);
            });
        });
        return state;
    });

    const getGameStatus = () => page.locator('#status').textContent();

    // --- Main Test Loop ---
    for (let i = 0; i < 25; i++) { // 25 human moves + 25 AI moves = 50 total
        console.log(`\n--- Turn ${i + 1} ---`);

        // Check if game is over before starting the turn
        const status = await getGameStatus();
        if (status.includes('wins') || status.includes('draw')) {
            console.log(`Game ended early: ${status}. Test passed.`);
            return;
        }

        await expect(page.locator('#status')).toHaveText('Your turn');
        
        const boardStateBefore = await getBoardState();
        const activeBoards = boardStateBefore.activeBoards;
        
        // Find the first legal move for the human
        let moveIndex = -1;
        if (activeBoards.length === 1) { // Forced move
            const boardIndex = activeBoards[0];
            const startIndex = boardIndex * 9;
            moveIndex = boardStateBefore.cells.findIndex((cell, idx) => idx >= startIndex && idx < startIndex + 9 && cell === '');
            console.log(`Human is forced to play in micro-board ${boardIndex}.`);
        } else { // Free move - use a smarter strategy
            console.log('Human has a free move.');
            // Find the first micro-board that is not yet won or drawn
            const firstPlayableBoardIndex = boardStateBefore.macroBoard.findIndex(status => status === null);
            
            if (firstPlayableBoardIndex !== -1) {
                const startIndex = firstPlayableBoardIndex * 9;
                // Find the first empty cell within that playable board
                moveIndex = boardStateBefore.cells.findIndex((cell, idx) => idx >= startIndex && idx < startIndex + 9 && cell === '');
                console.log(`Strategically choosing to play in the first available board: ${firstPlayableBoardIndex}.`);
            } else {
                // Fallback if all boards are somehow won but the game isn't over
                moveIndex = boardStateBefore.cells.findIndex(cell => cell === '');
            }
        }

        if (moveIndex === -1) {
            console.log('No legal moves found for human. Ending test.');
            break;
        }

        // Make the human move
        const humanMoveCoords = { row: Math.floor(moveIndex / 9), col: moveIndex % 9 };
        await page.locator('.cell').nth(moveIndex).click();
        console.log(`Human plays at absolute index ${moveIndex}.`);

        // The human's move inside their micro-board determines the AI's next board
        const microBoardRow = Math.floor(moveIndex / 3) % 3;
        const microBoardCol = (moveIndex % 3);
        const expectedAiBoardIndex = microBoardRow * 3 + microBoardCol;
        console.log(`This move should send the AI to micro-board ${expectedAiBoardIndex}.`);

        // Wait for the AI to make a move by checking for an increase in piece count
        await expect(async () => {
            const newBoardState = await getBoardState();
            const piecesBefore = boardStateBefore.cells.filter(c => c).length;
            const piecesAfter = newBoardState.cells.filter(c => c).length;
            // Expect one move from human and one from AI
            expect(piecesAfter).toBe(piecesBefore + 2);
        }).toPass({ timeout: 10000 });
        
        const boardStateAfter = await getBoardState();

        // Find the AI's move
        let aiMoveIndex = -1;
        for (let j = 0; j < boardStateAfter.cells.length; j++) {
            if (boardStateAfter.cells[j] === 'O' && boardStateBefore.cells[j] !== 'O') {
                aiMoveIndex = j;
                break;
            }
        }
        
        expect(aiMoveIndex).not.toBe(-1);
        const aiBoardIndex = Math.floor(aiMoveIndex / 9);
        console.log(`AI responded at absolute index ${aiMoveIndex}, which is in micro-board ${aiBoardIndex}.`);

        // --- Core Assertion ---
        // Check if the AI was sent to a board that was already won/full
        const expectedBoardIsWon = page.locator('.micro-board').nth(expectedAiBoardIndex).locator('.winner-overlay');
        if (await expectedBoardIsWon.isVisible()) {
            console.log(`AI was sent to a completed board (${expectedAiBoardIndex}), so it had a free move. Skipping assertion for this turn.`);
        } else {
            expect(aiBoardIndex).toBe(expectedAiBoardIndex);
            console.log(`SUCCESS: AI correctly played in board ${aiBoardIndex}.`);
        }
    }
  });
});
