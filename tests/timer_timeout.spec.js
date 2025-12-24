const { test, expect } = require('@playwright/test');

test.describe('Timer and Timeout Behavior', () => {
  let browser, context1, context2, page1, page2;

  test.beforeEach(async ({ browser: browserInstance }) => {
    browser = browserInstance;
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Start tracing for both contexts
    await context1.tracing.start({ screenshots: true, snapshots: true, sources: true });
    await context2.tracing.start({ screenshots: true, snapshots: true, sources: true });

    // Optional: Forward console logs for debugging
    page1.on('console', msg => console.log(`ALICE PAGE LOG: ${msg.text()}`));
    page2.on('console', msg => console.log(`BOB PAGE LOG: ${msg.text()}`));
  });

  test.afterEach(async () => {
    // Stop tracing and save the files unconditionally.
    // This is the correct pattern to ensure traces are saved on failure.
    await context1.tracing.stop({ path: 'trace-timer-alice.zip' });
    await context2.tracing.stop({ path: 'trace-timer-bob.zip' });
    
    await context1.close();
    await context2.close();
  });

  test('player who runs out of time in a standard game should lose', async () => {
    test.setTimeout(45000); // Set a generous timeout

    // Player 1 (Alice) creates a game
    console.log("Alice: Navigating to page...");
    await page1.goto('http://localhost:8000', { timeout: 15000 });
    await page1.waitForSelector('#name-input');
    console.log("Alice: Filling name and creating game...");
    await page1.fill('#name-input', 'Alice');
    await page1.check('input[value="standard"]');
    await page1.click('#create-game-button');
    
    // Get the Game ID from Alice's page
    await page1.waitForSelector('#game-id-display');
    const gameIdText = await page1.locator('#game-id-display').textContent();
    const gameId = gameIdText.split(': ')[1];
    expect(gameId).toBeTruthy();
    console.log(`Game created with ID: ${gameId}`);

    // Player 2 (Bob) joins the game
    console.log("Bob: Navigating to page...");
    await page2.goto('http://localhost:8000', { timeout: 15000 });
    await page2.waitForSelector('#name-input');
    console.log("Bob: Filling name and joining game...");
    await page2.fill('#name-input', 'Bob');
    await page2.fill('#game-id-input', gameId);
    await page2.click('#join-game-button');

    // Wait for the game to start for both players
    console.log("Waiting for game to start for both players...");
    await page1.waitForSelector('div#status:has-text("Your turn")');
    await page2.waitForSelector("div#status:has-text(\"Alice's turn\")");
    console.log("Game started. It is Alice's turn.");

    // We wait for 6 seconds, which is longer than the configured 5-second timeout
    console.log("Waiting for 6 seconds for Alice to time out...");
    await page1.waitForTimeout(6000);

    console.log("Alice attempts to make a move after her time is up...");
    // This click will prompt the server to check the timer.
    await page1.locator('.cell[data-row="0"][data-col="0"]').click();

    // --- Assertions ---
    console.log("Checking for timeout status...");
    
    // Alice's page should say "Bob wins!"
    await page1.waitForSelector('div#status:has-text("Bob wins!")');
    const aliceStatus = await page1.locator('div#status').textContent();
    expect(aliceStatus).toBe('Bob wins!');

    // Bob's page should say "You win!"
    await page2.waitForSelector('div#status:has-text("You win!")');
    const bobStatus = await page2.locator('div#status').textContent();
    expect(bobStatus).toBe('You win!');
    console.log("Timeout status verified successfully.");

    // Check that the restart button is now visible for both players
    await expect(page1.locator('#restart-button')).toBeVisible();
    await expect(page2.locator('#restart-button')).toBeVisible();
    console.log("Restart buttons are visible.");
  });

  test('player who runs out of time in an ultimate game should lose', async () => {
    test.setTimeout(45000);

    // Player 1 (Alice) creates an ultimate game
    console.log("Alice: Navigating for ultimate game...");
    await page1.goto('http://localhost:8000', { timeout: 15000 });
    await page1.waitForSelector('#name-input');
    console.log("Alice: Filling name and creating ultimate game...");
    await page1.fill('#name-input', 'Alice');
    await page1.check('input[value="ultimate"]'); // Select ultimate mode
    await page1.click('#create-game-button');
    
    // Get the Game ID
    await page1.waitForSelector('#game-id-display');
    const gameIdText = await page1.locator('#game-id-display').textContent();
    const gameId = gameIdText.split(': ')[1];
    expect(gameId).toBeTruthy();
    console.log(`Ultimate game created with ID: ${gameId}`);

    // Player 2 (Bob) joins the game
    console.log("Bob: Navigating for ultimate game...");
    await page2.goto('http://localhost:8000', { timeout: 15000 });
    await page2.waitForSelector('#name-input');
    console.log("Bob: Filling name and joining ultimate game...");
    await page2.fill('#name-input', 'Bob');
    await page2.fill('#game-id-input', gameId);
    await page2.click('#join-game-button');

    // Wait for the game to start
    console.log("Waiting for ultimate game to start...");
    await page1.waitForSelector('div#status:has-text("Your turn")');
    await page2.waitForSelector("div#status:has-text(\"Alice's turn\")");
    console.log("Ultimate game started. It is Alice's turn.");

    // --- The Core Test Logic ---
    // We wait for 41 seconds, which is longer than the configured 40-second ultimate timeout
    console.log("Waiting for 41 seconds for Alice to time out in ultimate game...");
    await page1.waitForTimeout(41000);

    console.log("Alice attempts to make a move after her time is up...");
    // Click a valid cell to trigger the server-side check
    await page1.locator('.cell[data-abs-row="0"][data-abs-col="0"]').click();

    // --- Assertions ---
    console.log("Checking for timeout status in ultimate game...");
    
    // Alice's page should say "Bob wins!"
    await page1.waitForSelector('div#status:has-text("Bob wins!")');
    const aliceStatus = await page1.locator('div#status').textContent();
    expect(aliceStatus).toBe('Bob wins!');

    // Bob's page should say "You win!"
    await page2.waitForSelector('div#status:has-text("You win!")');
    const bobStatus = await page2.locator('div#status').textContent();
    expect(bobStatus).toBe('You win!');
    console.log("Ultimate game timeout status verified successfully.");

    // Check that the restart button is visible
    await expect(page1.locator('#restart-button')).toBeVisible();
    await expect(page2.locator('#restart-button')).toBeVisible();
    console.log("Restart buttons are visible in ultimate game.");
  });
});