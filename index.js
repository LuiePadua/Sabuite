"use strict";

const mineflayer = require("mineflayer");
const { pathfinder } = require("mineflayer-pathfinder");
const config = require("./settings.json");
const express = require("express");

// ============================================================
// EXPRESS BACKEND - Bypasses Render/Railway Idle Sleep
// ============================================================
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send(`<h1>Bot Status Dashboard</h1><p>Target Node: ${config.server.ip}</p>`);
});

app.listen(PORT, () => {
  console.log(`[Dashboard] Keep-alive pipeline open on port ${PORT}`);
});

// ============================================================
// STABLE RECONNECTING BOT LIFECYCLE ENGINE
// ============================================================
let bot = null;
let movementInterval = null;

function startBotLifecycle() {
  // CLEANUP STEP: Prevent reference leaks by destroying previous loops completely
  if (bot) {
    try { bot.removeAllListeners(); } catch (e) {}
    bot = null;
  }
  if (movementInterval) {
    clearInterval(movementInterval);
    movementInterval = null;
  }

  console.log(`[Engine] Initiating clean connection frame to ${config.server.ip}:${config.server.port}`);
  
  const botInstance = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config["bot-account"].username,
    version: config.server.version,
    auth: config["bot-account"].type,
    brand: "vanilla",
    respawn: true,
    physicsEnabled: false // Lock processing states until fully spawned inside dimension
  });

  // Attach core modular routing layout plugins
  botInstance.loadPlugin(pathfinder);

  // --- STABLE LIVE PACKET MANIPULATION HANDLER ---
  botInstance.once('login', () => {
    console.log(`[Network Layer] Handshake established. Intercepting registry channels...`);
    
    const client = botInstance._client;
    if (client) {
      client.on('custom_payload', (packet) => {
        if (packet.channel === 'minecraft:register' || packet.channel === 'fabric:registry/sync' || packet.channel === 'fml:handshake') {
          try {
            client.write('custom_payload', {
              channel: packet.channel,
              data: Buffer.alloc(0)
            });
            console.log(`[Bypass Layer] Verified custom payload sync match: ${packet.channel}`);
          } catch (err) {
            console.error(`[Bypass Error] Failed packet response payload generation`);
          }
        }
      });
    }
  });

  botInstance.on('spawn', () => {
    console.log(`[Lifecycle] ${config["bot-account"].username} successfully localized inside chunks.`);
    
    botInstance.physicsEnabled = true; // Unlock tracking engine maps safely
    botInstance.clearControlStates();
    botInstance.setControlState('sneak', true); 
    
    setTimeout(() => {
      if (botInstance && botInstance.entity) {
        botInstance.setControlState('sneak', false);
        botInstance.setControlState('jump', true);
        setTimeout(() => botInstance.setControlState('jump', false), 300);
      }
    }, 1500);

    triggerRecurrentMovementLoop(botInstance);
  });

  botInstance.on('death', () => {
    console.log(`[Alert] Critical player death registered. Pushing automated revival task...`);
    setTimeout(() => {
      if (botInstance && typeof botInstance.respawn === 'function') {
        try { botInstance.respawn(); } catch(e) {}
      }
    }, 1000);
  });

  // --- RECONNECTION ATTACHMENT FIX ---
  botInstance.once('end', (reason) => {
    console.log(`[Engine Connection Dropped] Context: ${reason}`);
    console.log(`[Engine Cycle] Purging old references and calling standard cooldown...`);
    
    // Hard cooldown stops IP slot spamming penalties from the hosting panel
    setTimeout(startBotLifecycle, 15000); 
  });

  botInstance.on('error', (err) => {
    console.error(`[Runtime Network Exception] ${err.message}`);
  });

  // Save instance global assignment cleanly
  bot = botInstance;
}

function triggerRecurrentMovementLoop(activeBot) {
  if (movementInterval) clearInterval(movementInterval);

  movementInterval = setInterval(() => {
    if (!activeBot || !activeBot.entity || !activeBot.physicsEnabled) return;
    
    try {
      activeBot.setControlState('jump', true);
      setTimeout(() => { if (activeBot) activeBot.setControlState('jump', false); }, 400);
      
      activeBot.setControlState('sneak', true);
      setTimeout(() => { if (activeBot) activeBot.setControlState('sneak', false); }, 600);
    } catch (e) {
      console.log(`[Loop Notice] Movement assignment skipped due to unstable process thread`);
    }
  }, 20000); // 20-second layout increments reduces frame calculation lags on Orca server slots
}

// Fire up deployment sequence
startBotLifecycle();
