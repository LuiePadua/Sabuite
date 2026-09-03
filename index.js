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
    respawn: true // Native client indicator to trigger a core life check
  });

  bot.loadPlugin(pathfinder);

  // --- MOD REJECTION HANDSHAKE FAKER ---
  bot.once('login', () => {
    console.log(`[Bot] Initial login connection succeeded.`);

    const client = bot._client;
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

  // --- CRITICAL AUTO RESPAWN PACKET RECOVERY ---
  bot.on('death', () => {
    console.log(`[Alert] Slobot00 died instantly on spawn! Sending absolute respawn packets...`);
    
    // Fallback Method 1: Trigger the official programmatic API trigger
    setTimeout(() => {
      try {
        if (bot) {
          bot.respawn();
          console.log(`[Recovery] API respawn packet sent.`);
        }
      } catch (e) {
        console.log(`[Error] Core API respawn failed, using network buffer instead.`);
      }
    }, 500);

    // Fallback Method 2: Fire direct client socket data if internal API state gets locked
    setTimeout(() => {
      try {
        if (bot && bot._client) {
          bot._client.write('client_command', { actionId: 0 });
          console.log(`[Recovery] Direct socket network respawn event packet injected.`);
        }
      } catch (err) {
        console.error(`[Fatal Recovery Error] Cannot inject respawn packet: ${err.message}`);
      }
    }, 1000);
  });

  bot.on('spawn', () => {
    console.log(`[Bot] Slobot00 has successfully spawned in the world!`);
    
    bot.clearControlStates();
    bot.setControlState('sneak', true); 
    
    // Send safe chat updates if configured
    setTimeout(() => {
      if (bot && bot.entity) {
        bot.setControlState('sneak', false);
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }
    }, 1500);

    startMovementRoutine();
  });

  bot.on('end', (reason) => {
    console.log(`[Engine] Bot disconnected. Reason: ${reason}`);
    console.log(`[Engine] Scheduling auto-reconnect window...`);
    setTimeout(createBotInstance, 10000); // 10 seconds delay prevents IP pool spam kicks
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
    
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 400);
    
    bot.setControlState('sneak', true);
    setTimeout(() => bot.setControlState('sneak', false), 600);
  }, 15000);
}

// Fire up the bot engine
createBotInstance();
