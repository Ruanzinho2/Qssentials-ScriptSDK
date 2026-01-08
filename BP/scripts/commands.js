/** WIP INPROGGRESS UNOPTIMIZE
Removed Content
*/
// CREATOR: @NPERMA
// ----------------- IMPORT -----------------------------

import { Command, getAllDimension, QuickDB as data, ChestFormData, typeIdToDataId, typeIdToID, number_of_custom_items, custom_content, custom_content_keys, teleportHandle } from './extension/library';
import * as func from './extension/functions.js';
import { config } from './config';
import * as mc from '@minecraft/server';
import * as ui from '@minecraft/server-ui';
import { PROTOCOL, PLUGINS, COMMANDS, lang } from './_loader/lib/PROTO.js';
import { transferPlayer } from '@minecraft/server-admin';
const { system, world, Player, InputPermissionCategory, EquipmentSlot, EnchantmentTypes, ItemStack } = mc,
  { ActionFormData, ModalFormData, MessageFormData } = ui;
import { PlayerDB, ScorehudDB, HomeDB, FactionDB, LandDB, WarpDB, QuestDB } from './_db.js';

// ----------------- VARIABLE&FUNCTION ------------------

function maxHome(player) {
  return PlayerDB.get(player.name)?.limit?.home ?? (player.isOwner ? config.home.limit_owner : player.isAdmin ? config.home.limit_admin : config.home.limit_default);
}

function getHomes(player) {
  return HomeDB.keys().filter((k) => k.startsWith(player.name));
}

function getRandomInRange(value) {
  if (Array.isArray(value)) {
    const [min, max] = value;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return value ?? 1;
}

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function processEnchant(item, enchant, usedIds = new Set()) {
  const enchantable = item.getComponent('enchantable');
  const allEnchantments = EnchantmentTypes.getAll();
  const validEnchantments = enchantable ? allEnchantments.filter((k) => enchantable.canAddEnchantment({ type: EnchantmentTypes.get(k.id), level: 1 })) : allEnchantments;

  function getUniqueRandomEnchant() {
    const available = validEnchantments.filter((k) => !usedIds.has(k.id));
    if (available.length === 0) return null;
    const enchantment = getRandomFromArray(available);
    usedIds.add(enchantment.id);
    return enchantment;
  }

  if (typeof enchant === 'string' && enchant === 'random') {
    const enchantment = getUniqueRandomEnchant();
    if (!enchantment) return null;
    return {
      type: EnchantmentTypes.get(enchantment.id),
      level: getRandomInRange([1, enchantment.maxLevel])
    };
  }

  if (typeof enchant === 'object') {
    let level = enchant.level;
    if (Array.isArray(level)) {
      if (level.includes('max')) {
        const maxLevel = EnchantmentTypes.get(enchant.id)?.maxLevel ?? 1;
        level = getRandomInRange([level[0], maxLevel]);
      } else {
        level = getRandomInRange(level);
      }
    }

    if (enchant.id === 'random') {
      const enchantment = getUniqueRandomEnchant();
      if (!enchantment) return null;
      return {
        type: EnchantmentTypes.get(enchantment.id),
        level
      };
    }

    usedIds.add(enchant.id);
    return {
      type: EnchantmentTypes.get(enchant.id),
      level
    };
  }

  return enchant;
}

function processPrize(player, prize) {
  switch (prize.type) {
    case 'item': {
      const itemType = Array.isArray(prize.item_type) ? getRandomFromArray(prize.item_type) : prize.item_type;
      const amount = getRandomInRange(prize.amount);
      const item = new ItemStack(itemType, amount);

      const usedIds = new Set();
      let enchants = Array.isArray(prize.enchants)
        ? prize.enchants.map((e) => processEnchant(item, e, usedIds)).filter((e) => e) // buang null
        : undefined;

      if (prize?.item_name) item.nameTag = prize.item_name;
      if (enchants?.length) item.getComponent('enchantable').addEnchantments(enchants);

      player.getComponent('inventory').container.addItem(item);
      player.sendMessage(`§a+ ${itemType} : amount ${amount}` + (prize?.item_name ? `\n§6name:§r ${prize.item_name}` : '') + (enchants?.length ? `\n§2enchantments:\n${enchants.map((e) => `§r- §d${e.type.id} §r${e.level}`).join('\n')}` : ''));
      return;
    }

    case 'currency': {
      const value = getRandomInRange(prize.value);
      player.addCurrency(value);
      player.sendMessage(`§a+${value} §emoney`);
      return;
    }

    case 'random': {
      const randomPrize = getRandomFromArray(prize.item);
      return processPrize(player, randomPrize);
    }

    default:
      return null;
  }
}

function processReward(player, rewardData) {
  if (!rewardData) return null;
  const pool = rewardData;
  for (const prize of pool) processPrize(player, prize);
  player.playSound('random.orb');
  return true;
}

// ----------------- COMMANDS ---------------------------

// GENERAL

function getServerTPS(s) {
  return new Promise((resolve, reject) => {
    s.run(() => {
      const tps = (Math.random() * (20 - 16) + 16).toFixed(2);
      resolve(tps);
    });
  });
}

Command.register(
  {
    name: 'tps',
    description: 'ess.cmd.tps.description'
  },
  ({ player }) => {
    return getServerTPS(system)
      .then((tps) => {
        player.sendMessage(`§aTPS: ${tps < 16 ? `§e${tps}` : tps < 5 ? `§c${tps}` : `§a${tps}`}`);
      })
      .catch((err) => {
        console.error('Gagal mengambil TPS:', err);
        player.sendMessage('§cGagal mengambil data TPS.');
      });
  }
);

Command.register(
  {
    name: 'about',
    description: 'ess.cmd.about.description'
  },
  ({ player }) => {
    if (player) return player.sendMessage(`§aABOUT ADDON\n§eNamespace: ${config.namespace} | Version: ${PROTOCOL.split('|')[0]} | Contributors: [Nperma,Fary]`);
  }
);

let _cachedPluginList = null,
  _cachedPluginSignature = '';

const PluginStructure = {
  name: 'plugins',
  description: 'ess.cmd.plugin.description',
  optional: [
    {
      name: 'pluginName',
      type: Command.param.string
    }
  ],
  permission: config.hide_plugin_command_for_member ? Command.param.admin : Command.param.any,
  aliases: ['pl', 'plugin']
};

function PluginFunction({ player }, arg1 = '') {
  if (!player) return;
  if (config.hide_plugin_command_for_member && !player.op) return player.sendMessage(lang('ess.player.dont.have.permission'));

  const [ver, mod] = PROTOCOL.split('|');

  const signature = [...PLUGINS.map((p) => `${p.namespace}|${p.protocol}`).sort(), ...COMMANDS.map(([cmd]) => (cmd.extension.length > 0 ? cmd.extension : []).join(',')).sort()].join(';');

  if (!_cachedPluginList || _cachedPluginSignature !== signature) {
    _cachedPluginSignature = signature;
    let known = new Set(),
      out = [];

    for (const p of PLUGINS) {
      const [pv, pm] = p.protocol.split('|');
      let c = '§2';
      if (pm !== mod && pm.includes('-beta')) c = '§c';
      else if (pv !== ver) c = '§e';
      out.push(c + p.namespace);
      known.add(p.namespace);
    }

    for (const [cmd] of COMMANDS) {
      const ext = cmd.plugins || cmd.extension || [];
      for (const pl of ext) {
        if (!known.has(pl)) {
          out.push('§7' + pl);
          known.add(pl);
        }
      }
    }

    _cachedPluginList = out.join('§r, ') || 'NONE';
  }

  if (!arg1) return player.sendMessage(`Note:\n- Green (support)\n- Yellow (Stable)\n- Red (Outdate)\n- Grey (not installed)\n§aPLUGIN LIST:\n§r  ${_cachedPluginList}`);

  const pl = PLUGINS.find((p) => p.namespace === arg1);
  if (!pl) return player.sendMesaage(lang('ess.cmd.plugin.notfound', arg1));
  const [pv, pm] = pl.protocol.split('|');
  const warn = pm !== mod && pm.includes('-beta') ? ' §c(OUTDATED)' : '';
  return player.sendMessage(`§ePLUGIN INFORMATION:\n§rName: ${pl.namespace}\nVersion: ${pv}${warn}`);
}

Command.register(PluginStructure, PluginFunction);

Command.register(
  {
    name: 'help',
    description: 'ess.cmd.help.description',
    optional: [
      {
        name: 'category',
        type: Command.param.string
      }
    ]
  },
  help
);

function help({ player }, category = '') {
  const cmds = COMMANDS;
  if (!player) return;

  let _std = cmds.map(([command]) => command).filter((cmd) => cmd.alias !== undefined);

  let teks = '';

  if (category) {
    const filtered = _std.filter((cmd) => cmd.category === category.toUpperCase());
    if (!filtered.length) return player.sendMessage(lang('ess.cmd.help.category.notfound', category));

    teks = filtered.map((cmd) => `§2+ /${cmd.name.split(':')[1]} ${cmd.description}`).join('\n');
  } else {
    const grouped = _std.reduce((acc, cmd) => {
      const category = cmd.category;
      (acc[category] = acc[category] || []).push(`§e• /${cmd.name.split(':')[1]} <${cmd.description}>`);
      return acc;
    }, {});

    teks = Object.entries(grouped)
      .map(([category, commands]) => `§2#--- ${category}\n${commands.join('\n')}`)
      .join('\n');
  }

  player.sendMessage({
    rawtext: [{ translate: 'ess.cmd.help.title', with: [category ?? 'HELP'] }, { text: teks }]
  });
}

Command.register(
  {
    name: 'rules',
    description: 'ess.cmd.rules.description'
  },
  ({ player }) => (player.sendMessage(`RULES :\n${config.rules.join('§r\n')}`), system.runTimeout(() => player.playSound('random.pop'), 5))
);

Command.register(
  {
    name: 'news',
    description: 'ess.cmd.news.description'
  },
  (e) => e.player.sendMessage(config.news.join('\n'))
);

Command.register(
  {
    name: 'iditem',
    description: 'ess.cmd.iditem.description'
  },
  ({ player }) => player.sendMessage('§aidItem: ' + player.getItemId())
);

Command.register(
  {
    name: 'back',
    description: 'ess.cmd.back.description'
  },
  ({ player }) => {
    if (!player) return;
    const db = PlayerDB,
      player_data = db.get(player.name);
    if (!player_data?.back_location) return player.sendMessage(lang('ess.cmd.back.failed.undefined'));

    teleportHandle(player, { key: 'back' }, () => {
      const [vector3, dimensionId] = player_data.back_location;
      player.teleport(vector3, {
        dimension: world.getDimension(dimensionId)
      });
      player.sendMessage(lang('ess.cmd.back.success'));
      db.set(player.name, {
        ...player_data,
        back_location: null
      });
    });
  }
);

Command.register(
  {
    name: 'heal',
    description: 'ess.cmd.heal.description',
    tags: ['heal.access', 'dev'],
    cooldown: 10
  },
  ({ player }) => {
    player.health = player.health.maxValue;
    player.sendMessage(lang('ess.cmd.heal.message'));
  }
);

Command.register(
  {
    name: 'feed',
    description: 'ess.cmd.feed.description',
    tags: ['feed.access', 'dev'],
    cooldown: 10
  },
  ({ player }) => ((player.hunger = player.hunger.component.defaultValue), player.sendMessage(lang('ess.cmd.feed.message')))
);

Command.register(
  {
    name: 'gms',
    description: 'ess.cmd.gms.description',
    group: 'mode'
  },
  ({ player }) => (player.setGameMode(mc.GameMode.Survival), player.sendMessage(lang('ess.cmd.gms.message')))
);

Command.register(
  {
    name: 'gmc',
    description: 'ess.cmd.gmc.description',
    group: 'mode',
    permission: Command.permission.admin
  },
  ({ player }) => (player.setGameMode(mc.GameMode.Creative), player.sendMessage(lang('ess.cmd.gmc.message')))
);

Command.register(
  {
    name: 'spectator',
    description: 'ess.cmd.spectator.description',
    group: 'mode'
  },
  ({ player }) => (player.setGameMode(mc.GameMode.Spectator), player.sendMessage(lang('ess.cmd.spectator.message')))
);

Command.register(
  {
    name: 'invis',
    description: 'ess.cmd.invis.description',
    aliases: ['ghost'],
    tags: ['mvp', 'admin', 'dev', 'owner']
  },
  ({ player }) => (!player.hasTag('invisible') ? (player.addTag('invisible'), player.sendMessage(lang('ess.cmd.invis.message.add'))) : (player.removeTag('invisible'), player.sendMessage(lang('ess.cmd.invis.message.remove'))))
);

Command.register(
  {
    name: 'invsee',
    description: 'ess.cmd.invsee.description',
    permission: Command.permission.admin,
    group: 'admin',
    required: [
      {
        type: Command.param.playerSelector,
        name: 'target'
      }
    ]
  },
  ({ player }, tts) => {
    const target = func.findPlayerById(tts);
    if (!target?.isValid) return player.sendMessage(lang('ess.player.undefined'));

    const form = new ChestFormData('large').title(`${target.name} - inventory`);

    const inv = target.inventory,
      container = inv.container,
      equippable = player.getComponent('equippable'),
      EQSlot = Object.values(EquipmentSlot);

    for (let i = 0; i < EQSlot.length; i++) {
      const item = equippable.getEquipment(EQSlot[i]);
      if (!item) continue;

      const componentDurability = item?.getComponent('durability');
      const durability = Math.floor(((componentDurability?.maxDurability - componentDurability?.damage) / componentDurability?.maxDurability) * 99) | 0;

      const name = item.nameTag ?? item.typeId?.replace('minecraft:', '')?.replace('_', ' ');
      const lore = item.getLore() ?? [];
      const enchantments = !!item.getComponent('enchantable')?.getEnchantments()?.length;

      form.button((EQSlot[i] !== 'mainhand' || EQSlot[i] !== 'offhand' ? 45 : 52) + i, name, [item.typeId, ...lore, `§e[equipment: ${EQSlot[i]}]`], item.typeId, item.amount, durability === 99 ? 0 : durability, enchantments);
    }

    for (let i = 0; i <= inv.inventorySize - 1; i += 1) {
      const item = container.getItem(i);
      if (item === undefined) continue;
      const componentDurability = item?.getComponent('durability');
      const durability = Math.floor(((componentDurability?.maxDurability - componentDurability?.damage) / componentDurability?.maxDurability) * 99) | 0;
      form.button(i < 9 ? 27 + i : i - 9, item?.nameTag ?? item.typeId?.replace('minecraft:', '')?.replace('_', ' '), [item.typeId, ...item.getLore(), i < 9 ? `§a[hotbar] slot: ${i}§r` : `§aslot: ${i}§r`], item.typeId, item.amount, durability === 99 ? 0 : durability, !!item?.getComponent('enchantable')?.getEnchantments()?.length);
    }
    form
      .pattern(['_________', '_________', '_________', '_________', 'xxxxxxxxx', '_________'], {
        x: {
          texture: 'minecraft:white_stained_glass',
          itemName: '',
          itemDesc: []
        }
      })
      .show(player);
  }
);

//TPA
let _tpa = {};

Command.register(
  {
    name: 'tpa',
    description: 'ess.cmd.tpa.description',
    group: 'TPA',
    required: [
      {
        name: 'TargetPlayer',
        type: Command.param.playerSelector
      }
    ]
  },
  ({ player }, tts) => {
    const target = func.findPlayerById(tts[0].id);
    if (!target?.isValid) return player.sendMessage(lang('ess.player.offline'));

    const key = `${target.name}::${player.name}`;
    if (key in _tpa) return player.sendMessage(lang('ess.cmd.tpa.inqeue', target.name));

    target.sendMessage(lang('ess.cmd.tpa.request.target', player.name));
    player.sendMessage(lang('ess.cmd.tpa.request.sender', target.name));

    _tpa[key] = {
      tick: mc.system.currentTick,
      runner: mc.system.runInterval(() => {
        const elapsed = mc.system.currentTick - _tpa[key].tick;
        if (elapsed >= 10 * mc.TicksPerSecond) {
          player.sendMessage(lang('ess.cmd.tpa.expired', target.name));
          target.sendMessage(lang('ess.cmd.tpa.expired', player.name));
          mc.system.clearRun(_tpa[key].runner);
          delete _tpa[key];
        }
      })
    };
  }
);

Command.register(
  {
    name: 'tpaaccept',
    group: 'TPA',
    description: 'ess.cmd.tpaaccept.description',
    optional: [
      {
        type: Command.param.playerSelector,
        name: 'player'
      }
    ]
  },
  ({ player }, playerSelector = null) => {
    let key = Object.keys(_tpa).find((k) => k.startsWith(`${player.name}::`));
    if (!!playerSelector) key = Object.keys(_tpa).find((k) => k == `${player.name}::${playerSelector[0].name}`);
    if (!key) return player.sendMessage(lang('ess.cmd.tpa.notfound'));

    const senderName = key.split('::')[1],
      sender = mc.world.getAllPlayers().find((p) => p.name === senderName);

    if (!sender?.isValid) return player.sendMessage(lang('ess.player.offline')), mc.system.clearRun(_tpa[key].runner), delete _tpa[key];

    teleportHandle(player, { key: 'tpa' }, () => {
      sender.teleport(player.location, {
        dimension: mc.world.getDimension(player.dimension.id),
        rotation: player.getRotation()
      });
      sender.sendMessage(lang('ess.cmd.tpaaccept.success', player.name));
      player.sendMessage(lang('ess.cmd.tpaaccept.success', sender.name));
    });

    mc.system.clearRun(_tpa[key].runner);
    delete _tpa[key];
  }
);

Command.register(
  {
    name: 'tpadeny',
    group: 'TPA',
    description: 'ess.cmd.tpadeny.description'
  },
  ({ player }) => {
    let key = Object.keys(_tpa).find((k) => k.startsWith(`${player.name}::`));
    if (!!playerSelector) key = Object.keys(_tpa).find((k) => k == `${player.name}::${playerSelector[0].name}`);

    if (!key) return player.sendMessage(lang('ess.cmd.tpa.notfound'));

    const senderName = key.split('::')[1],
      sender = mc.world.getAllPlayers().find((p) => p.name === senderName);

    if (sender?.isValid) sender.sendMessage(lang('ess.cmd.tpadeny.success', player.name));
    player.sendMessage(lang('ess.cmd.tpadeny.success', senderName));
    mc.system.clearRun(_tpa[key].runner);
    delete _tpa[key];
  }
);

//HOME

Command.register(
  {
    name: 'home',
    description: 'ess.cmd.home.description',
    group: 'HOME',
    optional: [
      {
        type: Command.param.string,
        name: 'homeName'
      }
    ]
  },
  ({ player }, homeName = '') => {
    if (!player) return;
    const db = HomeDB,
      homes = getHomes(player),
      limit = maxHome(player);

    function run(home) {
      teleportHandle(player, { key: 'home' }, () => {
        player.teleport(home.location, {
          dimension: world.getDimension(home.dimension),
          rotation: home.rotation
        });
        system.runTimeout(() => player.playSound('random.levelup'), 5);
        player.sendMessage(lang('ess.cmd.home.success', home.name));
      });
    }

    if (!homeName) {
      const form = new ui.ActionFormData()
        .title(`Home - UI${homes.length > 0 ? '§h§h§0' : '§h§h§0§s'}`)
        .header('HOMES')
        .header(`§elimit: ${homes.length}/${limit}`);
      for (let i = 0; i < homes.length; i++) form.button(`${homes[i].split(':')[1]} | ${db.get(homes[i]).dimension.replace('minecraft:', '')}`, 'textures/items/bed_red');
      form.open(player).then((r) => {
        if (r.canceled) return;

        const home = db.get(homes[r.selection]);

        run(home);
      });
    } else {
      if (!db.has(`${player.name}:${homeName}`)) return player.sendMessage(lang('ess.cmd.home.failed.notfound', homeName));

      run(db.get(`${player.name}:${homeName}`));
    }
  }
);

Command.register(
  {
    name: 'sethome',
    description: 'ess.cmd.sethome.description',
    group: 'HOME',
    required: [
      {
        name: 'homeName',
        type: Command.param.string
      }
    ]
  },
  ({ player }, homeName = '') => {
    if (!player) return;
    homeName = homeName.trim().toLowerCase();
    const db = HomeDB,
      player_db = PlayerDB.get(player.name),
      fkey = `${player.name}:${homeName}`;
    const limit = maxHome(player);

    if (db.has(fkey)) return player.sendMessage(lang('ess.cmd.sethome.failed.defined', homeName));
    const personalLimit = db.keys().filter((k) => k.startsWith(player.name)).length;
    if (homeName < config.home.min) player.sendMessage(lang('ess.cmd.sethome.failed.minimum', config.home.min));
    if (homeName > config.home.max) player.sendMessage(lang('ess.cmd.sethome.failed.maximum', config.home.max));
    if (limit !== 'unli' && personalLimit > limit) return player.sendMessage(lang('ess.cmd.sethome.failed.limit'));

    const format = {
      name: homeName,
      location: Object.fromEntries(Object.entries(player.location).map(([k, v]) => [k, k != 'y' ? v + 0.5 : v])),
      dimension: player.dimension.id,
      rotation: player.getRotation()
    };

    db.set(fkey, format); //defined
    player.sendMessage(lang('ess.cmd.sethome.success', homeName, `${getHomes(player).length}/${limit}`));
  }
);

Command.register(
  {
    name: 'sethomelimit',
    description: 'Sethome limit',
    optional: [
      {
        type: Command.param.integer,
        name: 'limit'
      },
      {
        type: Command.param.string,
        name: 'targetName'
      }
    ],
    group: 'owner'
  },
  ({ player }, limit = 1, target = null) => {
    if (!player) return;
    if (!player.isOwner) return player.sendMessage(lang('player.dont.have.permission'));
    if (!target) target = player.name;
    const db = PlayerDB;

    if (!db.has(target)) return player.sendMessage(lang('player.undefined'));

    if (limit === -1) limit = 'unli';

    const target_db = db.get(target);
    db.set(target, {
      ...target_db,
      limit: { ...target_db.limit, home: limit }
    });
    player.say(`${target} sethomelimit: >> ${limit}`);
  }
);

Command.register(
  {
    name: 'delhome',
    description: 'ess.cmd.delhome.description',
    group: 'HOME',
    required: [
      {
        name: 'homeName',
        type: Command.param.string
      }
    ]
  },
  ({ player }, homeName = '') => {
    if (!player) return;

    const db = HomeDB;
    homeName = homeName.trim().toLowerCase();
    const fkey = `${player.name}:${homeName}`;

    if (!db.has(fkey)) return player.sendMessage(lang('ess.cmd.home.failed.notfound', homeName));

    db.delete(fkey);
    player.sendMessage(lang('ess.cmd.delhome.success', homeName));
  }
);

//ECONOMY

Command.register(
  {
    name: 'money',
    description: 'ess.cmd.money.description',
    group: 'economy'
  },
  ({ player, data }) => {
    if (!player) return;
    player.sendMessage(lang('ess.cmd_money_message', player.getCurrency()));
  }
);

Command.register(
  {
    name: 'setmoney',
    description: 'ess.cmd.setmoney.description',
    group: 'economy',
    tags: ['admin', 'premium'],
    required: [
      {
        name: 'Amount',
        type: Command.param.integer
      }
    ],
    optional: [
      {
        name: 'TargetPlayer',
        type: Command.param.playerSelector
      }
    ]
  },
  ({ player }, iii, tts) => {
    if (!player) return;
    const target = func.findPlayerById(tts);
    const jdkh = !!target && !player.isAdmin;
    if (jdkh) player.sendMessage(lang('player.dont.have.permission'));
    if (!target || jdkh) player.setCurrency(iii);
    else if (!!target && player.isAdmin) {
      if (!target?.isValid) return player.sendMessage(lang('player.offline'));

      target.setCurrency(iii);
      player.say('true');
    }
  }
);

Command.register(
  {
    name: 'topmoney',
    description: 'ess.cmd.topmoney.description',
    group: 'economy'
  },
  ({ player }) =>
    player.sendMessage(
      mc.world.scoreboard
        .getObjective('money')
        .getScores()
        .sort((a, b) => b.score - a.score)
        .map((f, i) => `#${i + 1}. ${f.participant.displayName} ${f.score}`)
        .join('\n')
    )
);

Command.register(
  {
    name: 'pay',
    description: 'ess.cmd.pay.description',
    group: 'economy',
    cooldown: 5,
    required: [
      {
        name: 'TargetPlayer',
        type: Command.param.playerSelector
      },
      {
        name: 'Amount',
        type: Command.param.integer
      }
    ]
  },
  ({ player }, _target, amountValue) => {
    const target = func.findPlayerById(_target),
      payMin = Math.min(Math.max(config.pay.min, 500), 20000);
    if (target?.isValid) return player.sendMessage(lang('player.offline'));

    const pM = player.getCurrency();
    if (pM <= 0 || amountValue > pM) return player.sendMessage(lang('ess.cmd.pay.failed.enough'));
    else if (payMin) return player.sendMessage(lang('ess.cmd.pay.failed.minimum', payMin));
    else {
      player.sendMessage(lang('ess.cmd.pay.success.sender', amountValue, target.name));
      player.addCurrency(-amountValue);
      target.addCurrency(amountValue);
      target.sendMessage(lang('ess.cmd.pay.success.target', amountValue, player.name));
    }
  }
);

//Land

Command.register(
  {
    name: 'land',
    description: 'ess.cmd.land.description',
    required: [
      {
        name: 'land_option',
        type: Command.param.enum,
        options: ['here', 'create', 'sell', 'list']
      }
    ],
    optional: [
      {
        name: 'arg1',
        type: Command.param.integer
      }
    ]
  },
  ({ player }, option, idLand = '') => {
    const db = LandDB,
      { minimumSize, pricePerBlock, percentSell } = config.land,
      min = Math.min(Math.max(minimumSize, 0), 2000),
      pricePer = Math.min(Math.max(pricePerBlock, 100), 20000),
      persenan = Math.min(Math.max(percentSell, 100), 1);

    function landSize(a, b) {
      let w = Math.abs(b.x - a.x) + 1,
        l = Math.abs(b.z - a.z) + 1;
      return w * l;
    }

    function getCenter(a, b) {
      let x = Math.floor((Math.min(a.x, b.x) + Math.max(a.x, b.x)) / 2),
        z = Math.floor((Math.min(a.z, b.z) + Math.max(a.z, b.z)) / 2);
      return { x, z };
    }

    function isOverlap(area, pos) {
      if (!area || !pos) return false;
      let x1 = Math.min(area[0].x, area[1].x),
        x2 = Math.max(area[0].x, area[1].x),
        z1 = Math.min(area[0].z, area[1].z),
        z2 = Math.max(area[0].z, area[1].z);
      return pos.x >= x1 && pos.x <= x2 && pos.z >= z1 && pos.z <= z2;
    }

    function genId() {
      let id;
      do id = ((Math.random() * 9000) | 0) + 1000;
      while (db.has(id.toString()));
      return id.toString();
    }

    if (option === 'here') {
      const pos = player.location;

      if (db.size > 0)
        for (const [id, land] of db.entries()) {
          if (land && isOverlap(land.location, pos) && player.dimension.id === land.dimension) {
            if (land.owner === player.name) return player.sendMessage(lang('ess.cmd.land.here.owner', id));
            else return player.sendMessage(lang('ess.cmd.land.here.not.owner', land.owner));
          }
        }
      return player.sendMessage(lang('ess.cmd.land.here.none'));
    }
    if (option === 'sell') {
      if (!idLand) return player.sendMessage(lang('ess.cmd.land.sell.missing'));
      const land = db.get(idLand.toString());
      if (!land) return player.sendMessage(lang('ess.cmd.land.sell.notfound'));
      if (land.owner !== player.name) return player.sendMessage(lang('ess.cmd.land.sell.not.owner'));

      mc.system.run(async () => {
        const persent = (land.size * pricePer * persenan) / 100;
        const form = new ui.MessageFormData()
          .title(lang('ess.ui.confirmation.title') + '§l§f§f')
          .body(lang('ess.ui.confirmation.body.land.sell', idLand, land.size, persent))
          .button2(lang('ess.ui.confirmation.button.cancel'))
          .button1(lang('ess.ui.confirmation.button.sell'));
        const r = await form.open(player);
        if (r?.selection !== 0) return;
        db.delete(idLand);
        player.sendMessage(lang('ess.cmd.land.sell.success', idLand));
      });
    }
    if (option === 'list') {
      let owned = [];
      for (const [id, land] of db.entries())
        if (land.owner === player.name)
          owned.push({
            id,
            dimension: land.dimension,
            location: land.location,
            center: land.center
          });
      if (owned.length === 0) return player.sendMessage(lang('ess.cmd.land.list.empty'));
      player.sendMessage(`LANDS:\n${owned.map((v, i) => `| ${i}. # ${v.id} : ${v.dimension.replace('minecraft:', '')} : ${Object.entries(v.center).join(', ')}`).join('\n')}`);
    }
    if (option === 'create') {
      let p1 = null,
        busy = false;

      mc.world.beforeEvents.playerInteractWithBlock.subscribe(function ev(e) {
        const p = e.player;
        if (p.name !== player.name || busy) return;
        busy = true;

        let pos = {
          x: e.block.location.x,
          z: e.block.location.z
        };

        if (db.size > 0)
          for (const [id, land] of db.entries()) {
            if (!land || !land.location) continue;
            if (isOverlap(land.location, pos) && player.dimension.id === land.dimension.id) return p.sendMessage(lang('ess.cmd.land.create.overlap', id));
          }

        if (config.lobby_protect.enabled && isOverlap(config.lobby_protect.pos, pos) && player.dimension.id === 'minecraft:overworld') return player.sendMessage("§cYou can't create land in Lobby Protect Area!!");

        if (!p1) {
          p1 = pos;
          p.sendMessage(lang('ess.cmd.land.create.pos1', p1.x, p1.z));
          p.sendMessage(lang('ess.cmd.land.create.pos2'));
        } else {
          let sz = landSize(p1, pos);
          if (sz < min) {
            p.sendMessage(lang('ess.cmd.land.create.toosmall', min));
            p1 = null;
            busy = false;
            return;
          }

          let total = sz * pricePer,
            form = new ui.MessageFormData();
          mc.system.run(() => {
            form
              .title(lang('ess.ui.confirmation.title') + '§l§f§f')
              .body(lang('ess.ui.confirmation.body.land.buy', sz, total))
              .button2(lang('ess.ui.confirmation.button.cancel'))
              .button1(lang('ess.ui.confirmation.button.buy'))
              .open(player)
              .then((r) => {
                if (r.selection == 0) {
                  let money = p.getCurrency();
                  if (money < total) p.sendMessage(lang('ess.cmd.land.create.nomoney', total - money, money));
                  else {
                    p.addCurrency(-total);
                    let id = genId();
                    db.set(id, {
                      owner: p.name,
                      access: [p.name],
                      size: sz,
                      center: getCenter(p1, pos),
                      dimension: p.dimension.id,
                      location: [p1, pos]
                    });
                    p.sendMessage(lang('ess.cmd.land.create.success'));
                    p.sendMessage(lang('ess.cmd.land.create.success.id', id, total));
                  }
                } else p.sendMessage(lang('ess.cmd.land.create.cancel'));
              });
          });

          mc.system.run(() => mc.world.beforeEvents.playerInteractWithBlock.unsubscribe(ev));
        }

        e.cancel = true;
        mc.system.runTimeout(() => (busy = false), 1);
      });
    }
  }
);

Command.register(
  {
    name: 'goto',
    description: 'transfer to other server',
    required: [
      {
        name: 'ip-address',
        type: Command.param.string
      }
    ],
    optional: [
      {
        name: 'port',
        type: Command.param.integer
      }
    ]
  },
  ({ player }, arg1, arg2 = 19132) => {
    const hostname = arg1,
      port = arg2;
    transferPlayer(player, { hostname, port });
  }
);

Command.register(
  {
    name: 'clearchat',
    cooldown: 30,
    description: 'ess.cmd.clearchat.description'
  },
  async ({ player }) => {
    if (!player) return;
    await player.runCommand(`execute as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] as @e[c=2] run tellraw "${player.name}" {"rawtext":[{"text":"clearchat-nperma"}]}`);
    player.sendMessage(lang('ess.cmd.clearchat.success'));
    player.playSound('random.orb');
  }
);

// UNOPTIMIZE
Command.register(
  {
    name: 'scorehud',
    description: 'ess.cmd.scorehud.description'
  },
  ({ player }) => {
    if (!player) return;

    const isEnabled = player.hasTag('enable:scorehud') || (!player.hasTag('disable:scorehud') && !!config.scorehud.enable_by_default);

    if (isEnabled) {
      player.removeTag('enable:scorehud');
      player.addTag('disable:scorehud');
      player.sendMessage(lang('ess.cmd.scorehud.disabled'));
    } else {
      player.removeTag('disable:scorehud');
      player.addTag('enable:scorehud');
      player.sendMessage(lang('ess.cmd.scorehud.enabled'));
    }
  }
);

Command.register(
  {
    name: 'setscorehud',
    description: 'ess.cmd.setscorehud.description',
    permission: Command.permission.admin,
    group: 'admin',
    optional: [
      {
        type: Command.param.string,
        name: 'title'
      },
      {
        type: Command.param.string,
        name: 'body'
      },
      {
        type: Command.param.string,
        name: 'footer'
      }
    ]
  },
  ({ player }, title = '', body = '', footer = '') => {
    if (!player) return;
    const db = ScorehudDB;

    if (!(title && body)) return player.say('Reset Scorehud Template', '§6Scorehud'), db.delete('title'), db.delete('body'), db.delete('footer');

    db.set('title', title);
    if (!!body) db.set('body', body.replace(/\\n/g, '\n').replaceAll(/@ln/g, '\n'));
    if (!!footer) db.set('footer', footer.replace(/\\n/g, '\n').replaceAll(/@ln/g, '\n'));
    player.sendMessage(lang('ess.cmd.setscorehud.message'), '§6Scorehud');
  }
);

Command.register(
  {
    name: 'ctitle',
    description: 'ess.cmd.ctitle.description',
    group: 'admin',
    required: [
      {
        name: 'title-text',
        type: Command.param.string
      }
    ],
    optional: [
      {
        name: 'subtitle-text',
        type: Command.param.string
      },
      {
        name: 'broadcast',
        type: Command.param.boolean
      }
    ]
  },
  ({ player }, titleInput, subtitleInput = '', isBroadcast = false) => {
    if (!player) return;
    if (!player.isAdmin) return player.sendMessage(lang('player.dont.have.permission'));
    const titleformat = titleInput.replace(/\\n/g, '\n').replaceAll('@s', player.name),
      fsubtitle = subtitleInput.replace(/\\n/g, '\n').replaceAll('@s', player.name),
      ftitle = ((txt) => txt.slice(0, 200).padEnd(200, '\t'))(titleformat),
      msg = `§t§i§t§l§e${subtitleInput ? ftitle + fsubtitle : ftitle}`;
    isBroadcast ? world.sendMessage(msg) : player.sendMessage(msg);
  }
);

Command.register(
  {
    name: 'ranklist',
    description: 'ess.cmd.ranklist.description'
  },
  ({ player }) => {
    function adjustLength(text = '', totalLength = 100) {
      return text.slice(0, totalLength).padEnd(totalLength, '\t');
    }
    const form = new ui.ActionFormData()
      .title({ rawtext: [{ translate: 'ess.ui.ranklist.title' }, { text: '§h§h§1' }] })
      .header(lang('ess.ui.ranklist.header1'))
      .header('IMPORTANT MESSAGE')
      .label('we do not allow the sale of unofficial ranks')
      .header(lang('ess.ui.ranklist.header2'))
      .label(lang('ess.ui.ranklist.label'))
      .button(lang('ess.ui.close'));

    for (const [v, rank] of Object.entries(config.ranklist)) form.label(adjustLength(`${v} overview`, 100) + adjustLength(`${rank} ${player.name}`));

    form.open(player);
  }
);

Command.register(
  {
    name: 'clearrank',
    description: 'ess.cmd.clearrank.description',
    cooldown: 30,
    group: 'owner',
    optional: [
      {
        type: Command.param.playerSelector,
        name: 'Target'
      }
    ]
  },
  ({ player }, target = null) => {
    if (!player.isOwner) return player.sendMessage(lang('player.dont.have.permission'));
    if (!target) target = player;
    else target = func.findPlayerById(target);
    const tags = target.getTags().filter((k) => k.startsWith(config.rank_prefix));

    tags.forEach((tag) => target.removeTag(tag));
    target.sendMessage(lang('ess.cmd.clearrank.message', tags.length, target.name));
  }
);

Command.register(
  {
    name: 'csize',
    description: 'ess.cmd.csize.description',
    plugins: ['PlayerExt'],
    optional: [
      {
        type: Command.param.float,
        name: 'value'
      }
    ],
    tags: ['csize.csize', 'dev']
  },
  ({ player }, v) => {
    if (!player) return;

    if (v < 0.3) return player.sendMessage(lang('ess.cmd.csize.minimum'));
    else if (v > 10) return player.sendMessage(lang('ess.cmd.csize.maximum'));
    player.runCommand(`scriptevent n:scale ${v}`);
    player.sendMessage('Change Size to ' + String(v));
  }
);

Command.register(
  {
    name: 'rtp',
    description: 'ess.cmd.rtp.description',
    optional: [
      {
        name: 'dimension',
        type: Command.param.enum,
        options: getAllDimension().map((id) => id.replace('minecraft:', ''))
      }
    ],
    cooldown: 3
  },
  ({ player }, targetDimension = 'overworld') => {
    function rtp(player, dimension) {
      const radius = 2000;
      const startlocation = { x: 0, z: 0 };

      function randomizeCoord() {
        return ((Math.random() * (radius << 1)) | 0) - radius;
      }

      function getRandomLocation() {
        return {
          x: (startlocation?.x | 0) + randomizeCoord(),
          y: Math.min(Math.max(dimension.heightRange.max - 20, -60), 320),
          z: (startlocation?.z | 0) + randomizeCoord()
        };
      }

      const isOnRTP = player.getTags().find((k) => k.startsWith('rtp:'));

      if (!(player instanceof Player) || isOnRTP) return false;

      function repeatChar(char, count) {
        let result = '';
        for (let i = 0; i < count; i++) result += char;
        return result;
      }

      player.addTag('rtp:' + JSON.stringify([player.location, player.dimension.id]));
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.LateralMovement, false);
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, false);
      player.inputPermissions.setPermissionCategory(InputPermissionCategory.Sneak, false);
      let tickNow = system.currentTick,
        rtp_location = getRandomLocation();
      let RTP_INTERVAL = system.runInterval(() => {
        const topBlock = dimension.getTopmostBlock(rtp_location, dimension.heightRange.max - 20);

        const progress = Math.floor(((system.currentTick - tickNow) / 2) % 11);
        const maxProgress = 10;

        const progressBar = repeatChar('§a■', progress) + repeatChar('§7■', maxProgress - progress);

        player.onScreenDisplay.setActionBar(`${progressBar} (${Math.floor((system.currentTick - tickNow) / 20)})`);

        if (topBlock?.isValid && ((topBlock.below()?.typeId !== 'minecraft:bedrock' && topBlock?.typeId !== 'minecraft:bedrock') || (topBlock.below()?.isLiquid && topBlock.below()?.typeId === 'minecraft:water') || (topBlock?.isLiquid && topBlock?.typeId === 'minecraft:water')))
          (rtp_location = Object.fromEntries(Object.entries(rtp_location).map(([k, v]) => [k, k == 'y' ? topBlock.y + 1 : v]))),
            player.teleport(rtp_location),
            player.runCommand(`ctitle "§e[ RTP ]" "${Object.entries(rtp_location).join(' ')}"`),
            system.runTimeout(() => player.playSound('random.levelup'), 5),
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true),
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.LateralMovement, true),
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, true),
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Sneak, true),
            system.clearRun(RTP_INTERVAL),
            player.removeTag(player.getTags().find((k) => k.startsWith('rtp:')));
        else if (Math.floor((system.currentTick - tickNow) / 20) > 5) (rtp_location = getRandomLocation()), (tickNow = system.currentTick);

        player.teleport(rtp_location, {
          dimension
        });
      });

      return true;
    }
    teleportHandle(player, { key: 'rtp' }, () => rtp(player, world.getDimension(targetDimension)));
  }
);

//WIP
if (!!config.faction.enabled)
  Command.register(
    {
      name: 'faction',
      description: 'beta',
      optional: [
        {
          type: Command.param.enum,
          name: 'faction_option',
          options: ['menu', 'create', 'home', 'sethome', 'setwarp', 'warpui', 'chat', 'disband']
        },
        {
          type: Command.param.string,
          name: 'arg1'
        }
      ]
    },
    ({ player }, option = '', arg1 = '') => {
      if (!player) return;
      const db = FactionDB,
        pdb = PlayerDB,
        factionUI = new ui.ActionFormData().title('§lFACTION - UI'),
        factionTitle = '§efaction';

      function createFactionUI(msgError = null, fName = '') {
        new ui.ModalFormData()
          .title('§lFACTION - UI')
          .header('Create Name')
          .label(msgError ?? 'Create A Name for your Faction')
          .textField('factionName', 'example: pdi', {
            defaultValue: fName,
            tooltip: 'nama faksi huruf kecil semua dan tidak berspasi'
          })
          .submitButton('Create')
          .show(player)
          .then((r) => {
            if (r.canceled) return;
            let fk = r.formValues[2];
            const cek = createFaction(fk?.replace(' ', '')?.toLowerCase());
            if (!cek.status) return createFactionUI(cek.msg, fName);
            player.playSound('random.levelup');
            player.say(cek.msg, factionTitle);
          });
      }

      function createFaction(factionName = '') {
        if (db.has(factionName))
          return {
            msg: `Faksi dengan name '${factionName}' sudah pernah dibuat.`,
            status: false
          };

        if (factionName.length < config.faction.min)
          return {
            status: false,
            msg: `nama faksi harus lebih dari ${config.faction.min}`
          };

        if (factionName.length > config.faction.max)
          return {
            status: false,
            msg: `nama faksi tidak boleh lebih dari ${config.faction.max}`
          };

        db.set(factionName.toLowerCase(), {
          leader: player.name,
          date: Date.now(),
          member: [player.name]
        });

        return {
          status: true,
          msg: `Faksi dengan nama '${factionName}' berhasil dibuat`
        };
      }

      if (!player.isInFaction) {
        factionUI.body('Kamu tidak dalam faksi').button('buat');
      } else {
        const fst = player.factionData;
        factionUI.label(`faction: ${fst.id}\nleader: ${fst.leader}\ncreate date: ${new Date(fst.date).toLocaleDateString()}\nmember: ${fst.member.length}/${config.faction.maximum_member}`).divider();

        factionUI.button('chat').button('home').button('warp');

        if (player.factionData.leader === player.name) factionUI.button('kick').button('invite').button('sethome').button('setwarp').button('disband');
      }

      if (!option || option === 'menu')
        factionUI.open(player).then((r) => {
          if (r.canceled) return;
          if (!player.isInFaction) {
            if (r.selection === 0) return createFactionUI();
          } else {
            if (r.selection === 0) return;
            else if (r.selection === 1) return;
            else if (r.selection === 2) return;
            else if (r.selection === 3) return;
            else if (r.selection === 4) return;
            else if (r.selection === 5) return;
            else if (r.selection === 6) return;
            else if (r.selection === 7) return db.delete(player.factionData.id), player.say('faction delete', factionTitle);
          }
        });
      else if (option === 'create') {
        if (player.isInFaction) return player.say('kamu sudah dalam faksi', factionTitle);
        arg1 = arg1?.replace(' ', '')?.toLowerCase();
        const cek = createFaction(arg1);
        if (cek.status) player.playSound('random.levelup');
        return player.say(cek.msg, factionTitle);
      }
    }
  );

// Removed Content:
if (!!config.experimental.cdialog)
  Command.register(
    {
      name: 'cdialog',
      description: 'Custom Dialogue',
      plugins: ['DynamicDialogV2'],
      optional: [
        {
          name: 'text-1',
          type: Command.param.string
        },
        {
          name: 'text-2',
          type: Command.param.string
        },
        {
          name: 'text-3',
          type: Command.param.string
        },
        {
          name: 'background',
          type: Command.param.string
        },
        {
          name: 'avatar',
          type: Command.param.string
        },
        {
          name: 'sound',
          type: Command.param.string
        }
      ]
    },
    (e, text1 = null, text2 = null, text3 = null, background = null, avatar = null, sound = null) => e.player && e.player.runCommand(`scriptevent dialog:text ${!!text1 ? text1 : '|'}${!!text2 ? '|' + text2 : '|'}${!!text3 ? '|' + text3 : '|'}${!!background ? '|' + background : '|textures/dialogue/background'}${!!avatar ? '|' + avatar : '|'}${!!sound ? '|' + sound : ''}`)
  );

Command.register(
  {
    name: 'gamerulesui',
    description: 'GamerulesUI',
    permission: Command.permission.admin,
    group: 'admin'
  },
  ({ player }) => {
    function GameruleUI(player) {
      const form = new ModalFormData().title('GAMERULES - UI§f§0§1');

      const names = Object.getOwnPropertyNames(Object.getPrototypeOf(world.gameRules));
      const gamerules = {};

      for (const rule of names) if (rule !== 'constructor') gamerules[rule] = world.gameRules[rule];

      for (const [key, value] of Object.entries(gamerules)) {
        if (typeof value === 'boolean') {
          form.toggle(`Setting ${key}\n§7navigation boolean`, { defaultValue: value });
        } else if (typeof value === 'number') {
          form.textField(`${key}§n§u§m`, `value: ${value}`, { defaultValue: String(value) });
        }
      }

      form
        .submitButton('update')
        .show(player)
        .then((res) => {
          if (res.canceled) return;

          Object.keys(gamerules).forEach((rule, index) => {
            const input = res.formValues[index];
            const current = gamerules[rule];

            if (typeof current === 'number') {
              if (isNaN(input)) {
                return player.say(`gamerule "${rule}" only supports number`);
              }
              const num = Number(input);
              if (num !== current) {
                player.say(`§eupdate §6"${rule}" §7from ${world.gameRules[rule]} to §a${num}`);
                world.gameRules[rule] = num;
              }
            }

            if (typeof current === 'boolean') {
              if (input !== current) {
                player.say(`§eupdate §6"${rule}" §7from ${world.gameRules[rule]} to §a${input}`);
                world.gameRules[rule] = input;
              }
            }
          });
        });
    }

    GameruleUI(player);
  }
);

Command.register(
  {
    name: 'fly',
    description: 'ess.cmd.fly.description',
    tags: ['fly.access']
  },
  ({ player }) => {
    player.runCommand(`/ability @s mayfly true`);
    player.sendMessage('Fly actived');
  }
);

//refs gt system /roles
Command.register(
  {
    name: 'quest',
    description: 'beta',
    aliases: ['roles']
  },
  ({ player, e = {} }) => {
    if (!player) return;
    const player_data = PlayerDB.get(player.name)?.roles,
      data = {
        Farmer: player_data?.farmer ?? 0,
        Builder: player_data?.builder ?? 0,
        Fishing: player_data?.fishing ?? 0,
        Miner: player_data?.miner ?? 0
      };
    const form = new ActonFormData().title('QUEST - UI').body('Quest per Role').divider();
    for (const [role, lvl] of Object.entries(data)) (e.form = form.header(`${role}`).label(`${role} lvl: ${lvl}`).button('select quest').button('see reward')), role !== 'Miner' ? e.form.divider() : e.form;

    form.open(player);
  }
);

if (!!config.experimental.daily)
  (function () {
    Command.register(
      {
        name: 'daily',
        description: 'ess.cmd.daily.description'
      },
      ({ player }) => {
        if (!player) return;
        const dateNow = new Date(Date.now());
        const timeToday = dateNow.getDay();
        const today = dateNow.toLocaleDateString(undefined, { weekday: 'long' });
        const data = config.daily?.[timeToday];
        const key_daily = `daily.cd.${timeToday}:`;
        const isInCooldown = player.getTags().find((k) => k.startsWith(key_daily));
        if (!data) return player.sendMessage(lang('ess.cmd.daily.failed.notfound.message', today));

        if (isInCooldown && Number(isInCooldown.slice(key_daily.length)) > Date.now()) return player.sendMessage(lang('ess.cmd.daily.failed.cooldown.message', today, new Date(Number(isInCooldown.slice(key_daily.length))).toLocaleString()));

        const nextCd = Date.now() + 86400000;
        player.sendMessage(lang('ess.cmd.daily.success', today, new Date(nextCd).toLocaleString()));

        processReward(player, data);

        if (isInCooldown) player.removeTag(isInCooldown);
        player.addTag(key_daily + nextCd.toString());
        return; //done
      }
    );

    Command.register(
      {
        name: 'dailyreset',
        description: 'Reset Daily Cooldown',
        group: 'owner'
      },
      ({ player }) => {
        if (!player?.isOwner) return player.sendMessage(lang('ess.player.dont.have.permission'));
        const tags = player.getTags().filter((t) => t.startsWith('daily.cd.'));
        tags.forEach((t) => player.removeTag(t));
        player.say('§aDaily cooldown has been reset!');
      }
    );
  })();
if (!!config.experimental.weekly)
  (function () {
    Command.register(
      {
        name: 'weekly',
        description: 'ess.cmd.weekly.description',
        optional: [
          {
            type: Command.param.enum,
            name: 'weekly_option',
            options: Object.keys(config.weekly)
          }
        ]
      },
      ({ player }, option = 'free') => {
        if (!player) return;
        option = option?.toLowerCase();
        const data = config.weekly?.[option],
          key_weekly = `weekly.cd.${option}:`,
          isInCooldown = player.getTags().find((k) => k.startsWith(key_weekly)),
          title = '§6Weekly Reward';

        if (!data) return player.sendMessage(lang('ess.cmd.weekly.failed.notfound.message', option));

        if (option !== 'free' && !!data?.permission && !player?.hasTag(data?.permission)) return player.sendMessage(lang('ess.player.dont.have.permission'));

        if (isInCooldown && Number(isInCooldown.slice(key_weekly.length)) > Date.now()) return player.sendMessage(lang('ess.cmd.weekly.failed.cooldown.message', option, new Date(Number(isInCooldown.slice(key_weekly.length))).toLocaleString()));
        else
          return (
            player.sendMessage(lang('ess.cmd.weekly.success', option, new Date(Date.now() + 604800000).toLocaleDateString())),
            processReward(player, data.prize),
            (function () {
              if (!!isInCooldown && player.hasTag(isInCooldown)) player.removeTag(isInCooldown);
              const nextCd = Date.now() + 604800000;
              player.addTag(key_weekly + nextCd.toString());
            })()
          );
      } //done
    );

    Command.register(
      {
        name: 'weeklyreset',
        description: 'Reset Weekly Cooldown',
        group: 'owner'
      },
      ({ player }) => {
        if (!player?.isOwner) return player.sendMessage(lang('ess.player.dont.have.permission'));
        const tags = player.getTags().filter((t) => t.startsWith('weekly.cd.'));
        tags.forEach((t) => player.removeTag(t));
        player.say('§aWeekly cooldown has been reset!');
      }
    );
  })();
