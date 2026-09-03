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
    respawn: true,
    // --- FIX FOR 1.21 FABRIC PROTOCOL CRASH ---
    // Forces the physics engine to stay completely frozen during configuration
    physicsEnabled: false 
  });

  bot.loadPlugin(pathfinder);

  // --- MOD REJECTION HANDSHAKE FAKER ---
  bot.once('login', () => {
    console.log(`[Bot] Initial login network handshake established.`);

    const client = bot._client;
    client.on('custom_payload', (packet) => {
      if (packet.channel === 'minecraft:register' || packet.channel === 'fabric:registry/sync' || packet.channel === 'fml:handshake') {
        client.write('custom_payload', {
          channel: packet.channel,
          data: Buffer.alloc(0)
        });
        console.log(`[Bypass] Successfully bypassed channel sync: ${packet.channel}`);
      }
    });
  });

  // --- SAFE AWAKENING (TURNS ON PHYSICS SAFELY AFTER SPAWN) ---
  bot.on('spawn', () => {
    console.log(`[Bot] Slobot00 has successfully materialized inside world chunks.`);
    
    // Now that the configuration phase is safe, we wake up gravity and tracking maps safely
    bot.physicsEnabled = true; 
    
    bot.clearControlStates();
    bot.setControlState('sneak', true); 
    
    setTimeout(() => {
      if (bot && bot.entity) {
        bot.setControlState('sneak', false);
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }
    }, 1500);

    startMovementRoutine();
  });

  bot.on('death', () => {
    console.log(`[Alert] Death event recorded. Resolving revival sequences...`);
    setTimeout(() => {
      if (bot) bot.respawn();
    }, 1000);
  });

  bot.on('end', (reason) => {
    console.log(`[Engine] Bot disconnected. Reason: ${reason}`);
    console.log(`[Engine] Scheduling auto-reconnect window...`);
    setTimeout(createBotInstance, 10000); 
  });

  bot.on('error', (err) => {
    console.error(`[Internal Error] ${err.message}`);
  });
}

let movementInterval;
function startMovementRoutine() {
  if (movementInterval) clearInterval(movementInterval);

  movementInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot.physicsEnabled) return;
    
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 400);
    
    bot.setControlState('sneak', true);
    setTimeout(() => bot.setControlState('sneak', false), 600);
  }, 15000);
}

// Fire up the bot engine
createBotInstance();
