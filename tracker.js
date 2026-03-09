const activeWin = require('active-win');

// --- CONFIGURATION ---
const SERVER_URL = 'http://localhost:3000/api/track';
const SECRET_KEY = 'secure_key_123'; // Must match server.js
const USER_ID = 1; // The ID of 'Admin User'
const INTERVAL_MS = 10000; // Check every 10 seconds

console.log("🔴 FocusFlow Tracker Started...");
console.log("Tracking your activity. Press Ctrl+C to stop.");

// Helper: Decide category based on App Name
function getCategory(appName) {
    const appLower = appName.toLowerCase();
    
    // Development
    if (appLower.includes('code') || appLower.includes('visual studio') || appLower.includes('idea')) 
        return 'Development';
    
    // Browsers
    if (appLower.includes('chrome') || appLower.includes('firefox') || appLower.includes('edge')) 
        return 'Browsing';
    
    // Communication
    if (appLower.includes('slack') || appLower.includes('discord') || appLower.includes('teams')) 
        return 'Communication';
        
    // Entertainment
    if (appLower.includes('spotify') || appLower.includes('netflix') || appLower.includes('youtube')) 
        return 'Entertainment';

    return 'Other';
}

async function track() {
    try {
        const window = await activeWin();
        
        if (!window) return;

        const app = window.owner.name;
        const title = window.title;
        const category = getCategory(app);
        
        // Send to Backend
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secretKey: SECRET_KEY,
                userId: USER_ID,
                app: app,
                title: title,
                category: category,
                duration: Math.round(INTERVAL_MS / 1000) // Seconds passed
            })
        });
        
        const data = await response.json();
        if(data.success) {
            console.log(`✅ Logged: ${app} (${category})`);
        }

    } catch (error) {
        console.error("❌ Error sending data:", error.message);
    }
}

// Start the loop
setInterval(track, INTERVAL_MS);
track(); // Run once immediately