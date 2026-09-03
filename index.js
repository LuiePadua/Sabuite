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
    auth: config["bot-account"].type,
    brand: "vanilla",
    respawn: true // Forces automatic packet tracking if killed
  });

  bot.loadPlugin(pathfinder);

  // --- MOD REJECTION HANDSHAKE FAKER ---
  bot.once('login', () => {
    console.log(`[Bot] Initial login connection succeeded.`);

    const client = bot._client;
    
    // Inject faked packets directly into incoming stream to hit before the kick register
    client.on('custom_payload', (packet) => {
      if (packet.channel === 'minecraft:register' || packet.channel === 'fabric:registry/sync' || packet.channel === 'fml:handshake') {
        client.write('custom_payload', {
          channel: packet.channel,
          data: Buffer.alloc(0)
        });
        console.log(`[Bypass] Successfully faked channel validation: ${packet.channel}`);
      }
    });
  });

  bot.on('spawn', () => {
    console.log(`[Bot] Slobot00 has successfully spawned in the world!`);
    
    // INSTANT GRAVITY STABILIZATION: Bypasses automatic flying/hover kicks on modded instances
    bot.clearControlStates();
    bot.setControlState('sneak', true); 
    
    // Force a micro physical packet update immediately so the server registers a real player link
    setTimeout(() => {
      if (bot && bot.entity) {
        bot.setControlState('sneak', false);
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }
    }, 500);

    startMovementRoutine();
  });

  bot.on('end', (reason) => {
    console.log(`[Engine] Bot disconnected. Reason: ${reason}`);
    console.log(`[Engine] Scheduling auto-reconnect window...`);
    
    // Slow down reconnection frequency slightly to stop the server from throttling IP slots
    setTimeout(createBotInstance, 8000);
  });

  bot.on('error', (err) => {
    console.error(`[Internal Error] ${err.message}`);
  });
}

let movementInterval;
function startMovementRoutine() {
  if (movementInterval) clearInterval(movementInterval);

  movementInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    
    // Active physics update blocks
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 400);
    
    bot.setControlState('sneak', true);
    setTimeout(() => bot.setControlState('sneak', false), 600);
  }, 12000);
}

// Fire up the bot engine
createBotInstance();
