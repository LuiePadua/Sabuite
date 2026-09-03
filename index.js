"use strict";

const mineflayer = require("mineflayer");
const { Movements, pathfinder, goals } = require("mineflayer-pathfinder");
const config = require("./settings.json");
const express = require("express");

// ============================================================
// EXPRESS BACKEND - Bypasses Render/Railway Idle Sleep
// ============================================================
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send(`<h1>Bot is Running</h1><p>Target: ${config.server.ip}</p>`);
});

app.listen(PORT, () => {
  console.log(`[Dashboard] Keep-alive pipeline open on port ${PORT}`);
});

// ============================================================
// CORE BOT INITIALIZATION
// ============================================================
let bot;

function createBotInstance() {
  console.log(`[Engine] Attempting connection to ${config.server.ip}:${config.server.port}`);
  
  bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config["bot-account"].username,
    version: config.server.version,
    auth: config["bot-account"].type
  });

  bot.loadPlugin(pathfinder);

  // --- MOD REJECTION HANDSHAKE FAKER ---
  bot.once('login', () => {
    console.log(`[Bot] Initial login connection succeeded.`);

    const client = bot._client;
    client.on('custom_payload', (packet) => {
      // Intercepts mod checks so Fabric/Quilt doesn't kick the bot
      if (packet.channel === 'minecraft:register' || packet.channel === 'fabric:registry/sync') {
        client.write('custom_payload', {
          channel: packet.channel,
          data: Buffer.alloc(0)
        });
        console.log(`[Bypass] Answered registry channel check: ${packet.channel}`);
      }
    });
  });

  bot.on('spawn', () => {
    console.log(`[Bot] Slobot00 has successfully spawned in the world!`);
    startMovementRoutine();
  });

  bot.on('end', (reason) => {
    console.log(`[Engine] Bot disconnected. Reason: ${reason}`);
    console.log(`[Engine] Scheduling auto-reconnect window...`);
    setTimeout(createBotInstance, 5000);
  });

  bot.on('error', (err) => {
    console.error(`[Internal Error] ${err.message}`);
  });
}

function startMovementRoutine() {
  setInterval(() => {
    if (!bot || !bot.entity) return;
    
    // Simple anti-AFK random tasks
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 500);
    
    bot.setControlState('sneak', true);
    setTimeout(() => bot.setControlState('sneak', false), 800);
  }, 10000);
}

// Fire up the bot engine
createBotInstance();
