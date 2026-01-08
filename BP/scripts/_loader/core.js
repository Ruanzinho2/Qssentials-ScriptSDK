/** @format */

import {
  world,
  ItemStack,
  Player,
  system,
  CustomCommandStatus
} from '@minecraft/server';
import { QuickDB as bb } from '../extension/quick-db.js';
import * as mc from '@minecraft/server';
import * as ui from '@minecraft/server-ui';
import { config } from '../config';
import * as func from '../extension/functions.js';
import {
  PROTOCOL,
  PLUGINS,
  COMMANDS,
  lang
} from './lib/PROTO';
import { custom_content_keys,typeIdToID,typeIdToDataId} from "../extension/library.js"
import { PlayerDB, ScorehudDB, HomeDB, FactionDB, LandDB, WarpDB } from '../_db.js';

let server;

world.afterEvents.worldLoad.subscribe(
  function init() {
    server = world.getDimension('overworld');
    if (![])
      world.sendMessage(
        '[EsPlugin] >> World Has Been Load. All Temporary System will Reset (etc., tpa request, e.g.)'
      );

    Object.defineProperties(Player.prototype, {
      say: {
        value(
          text,
          prefix = '',
          usePrefix = true
        ) {
          this.sendMessage(
            (usePrefix
              ? prefix
                ? `§7§l[§r${prefix}§r§7§l]§r `
                : `§7§l[§r§6SYSTEM§r§7§l]§r `
              : '') + `§7» §r${text}`
          );
        }
      },
      broadcast: {
        value(text) {
          for (const p of world.getAllPlayers()) {
            if (p.name !== this.name)
              p.sendMessage(`§7» §r${text}`);
          }
          return this;
        }
      },
      sound: {
        value(soundId) {
          this.playSound(soundId);
          return this;
        }
      },
      getScore: {
        value(objective) {
          const obj =
            world.scoreboard?.getObjective(
              objective
            );
          return obj.hasParticipant(this)
            ? obj?.getScore(this)
            : 0;
        }
      },
      setScore: {
        value(objective, value) {
          if (typeof value !== 'number')
            return false;
          world.scoreboard
            .getObjective(objective)
            .setScore(this, value);
          return true;
        }
      },
      addScore: {
        value(objective, value) {
          if (typeof value !== 'number')
            return false;
          world.scoreboard
            .getObjective(objective)
            .addScore(this, value);
          return true;
        }
      },
      op: {
        get() {
          return this.playerPermissionLevel > 1;
        }
      },
      isOp: {
        get() {
          return this.op;
        }
      },
      isCreative: {
        get() {
          return (
            this.getGameMode() === 'creative'
          );
        }
      },
      isOwner: {
        get() {
          return config.owners.includes(
            this.name
          );
        }
      },
      isAdmin: {
        get() {
          return (
            this.isOwner ||
            this.isOp ||
            this.hasTag('Admin')
          );
        }
      },
      gamemode: {
        get() {
          return this.getGameMode();
        },
        set(gamemode) {
          const modes = [
            'survival',
            'adventure',
            'creative'
          ];
          this.setGameMode(
            modes[gamemode] ?? 'survival'
          );
        }
      },
      inventory: {
        get() {
          return this.getComponent('inventory');
        }
      },
      health: {
        get() {
          return this.getComponent('health')
            .currentValue;
        },
        set(value) {
          const health =
            this.getComponent('health');
          health.setCurrentValue(
            !isNaN(value)
              ? value
              : health.currentValue
          );
        }
      },
      rotation: {
        get() {
          return this.getRotation();
        }
      },
      feed: {
        value(
          itemStack = new ItemStack(
            'minecraft:apple',
            1
          )
        ) {
          this.eatItem(itemStack);
        }
      },
      hunger: {
        get() {
          const p = this.getComponent(
            'minecraft:player.hunger'
          );
          return {
            current: p.currentValue,
            component: p
          };
        },
        set(v) {
          return this.getComponent(
            'minecraft:player.hunger'
          ).setCurrentValue(v);
        }
      },
      velocity: {
        get() {
          return this.getVelocity();
        }
      },
      getCurrency: {
        value() {
          return this.getScore('money');
        }
      },
      setCurrency: {
        value(integer) {
          if (
            typeof integer !== 'number' ||
            isNaN(integer)
          )
            return false;

          this.setScore('money', integer);
          return true;
        }
      },
      addCurrency: {
        value(integer) {
          this.setCurrency(
            this.getCurrency() + integer
          );
        }
      },
      addRank: {
        value(rankName) {
          if (
            this.hasTag(
              `${config.rank_prefix}${rankName}`
            )
          )
            return this.sendMessage(
              `§cAlready have Tag ${rankName}`
            );

          this.addTag(
            `${config.rank_prefix}${rankName}`
          );
        }
      },
      getRank: {
        value() {
          const q = this.getTags()
            .filter((k) =>
              k.startsWith(config.rank_prefix)
            )
            .at(-1);
          return (
            q?.slice(config.rank_prefix.length) ??
            config.rank_default
          );
        }
      },
      isMoving: {
        get() {
          function MathRound(x) {
            return Math.round(x * 1000) / 1000;
          }

          function isMoving(entity) {
            if (
              !(entity instanceof Player) &&
              !(entity instanceof Entity)
            )
              throw new TypeError(
                'Parameter is not Entity or Player'
              );

            /**
             * @type {import("@minecraft/server").Vector3}
             */
            const vector = {
              x: MathRound(
                entity.getVelocity().x
              ),
              y: MathRound(
                entity.getVelocity().y
              ),
              z: MathRound(entity.getVelocity().z)
            };

            if (
              vector.x === 0 &&
              vector.y === 0 &&
              vector.z === 0
            )
              return false;
            else return true;
          }
          return isMoving(this);
        }
      },
      lang: {
        //useless
        get() {
          return (
            PlayerDB.get(this.name)
              ?.language || config?.language
          );
        }
      },
      isInFaction: {
        get() {
          const db = FactionDB
          return db
            .values()
            .some(
              (f) =>
                Array.isArray(f?.member) &&
                f.member.includes(this.name)
            );
        }
      },
      getItemId: {
        value(itemStack) {
          const typeId =
            itemStack?.typeId ??
            this.inventory.container.getItem(
              this.selectedSlotIndex
            )?.typeId;
          const targetTexture =
            custom_content_keys.has(typeId)
              ? custom_content[typeId]?.texture
              : typeId;
          const ID =
            typeIdToDataId.get(targetTexture) ??
            typeIdToID.get(targetTexture);
          return (ID ?? 0).toString();
        }
      },
      factionData: {
        get() {
          const db = FactionDB
          const entry = db
            .entries()
            .find(
              ([_, v]) =>
                Array.isArray(v?.member) &&
                v.member.includes(this.name)
            );
          return entry
            ? { id: entry[0], ...entry[1] }
            : null;
        }
      },
      isFactionLeader: {
        get() {
          const data = this.factionData;
          return (
            !!data && data.leader === this.name
          );
        }
      },
      data: {
        get() {
          return (
            PlayerDB.get(this.name) ||
            {}
          );
        }
      }
    });

    ui.ActionFormData.prototype.open =
      async function (player) {
        return await func.forceOpen(player, this);
      };

    ui.ModalFormData.prototype.open =
      async function (player) {
        return await func.forceOpen(player, this);
      };

    ui.MessageFormData.prototype.open =
      async function (player) {
        return await func.forceOpen(player, this);
      };

    import('../index.js');

    const players = mc.world.getAllPlayers(),
      whileRTP = players.filter((p) =>
        p
          .getTags()
          .find((k) => k.startsWith('rtp:'))
      );
    if (whileRTP.length > 0)
      for (const rtpPlayer of whileRTP) {
        const [loc, dim] = JSON.parse(
          rtpPlayer
            .getTags()
            .find((k) => k.startsWith('rtp:'))
            .split('rtp:')[1]
        );
        rtpPlayer.teleport(loc, {
          dimension: mc.world.getDimension(dim)
        });
        rtpPlayer.removeTag(
          rtpPlayer
            .getTags()
            .find((k) => k.startsWith('rtp:'))
        );
        rtpPlayer.inputPermissions.setPermissionCategory(
          mc.InputPermissionCategory.Camera,
          true
        );
        rtpPlayer.inputPermissions.setPermissionCategory(
          mc.InputPermissionCategory
            .LateralMovement,
          true
        );
        rtpPlayer.inputPermissions.setPermissionCategory(
          mc.InputPermissionCategory.Jump,
          true
        );
        rtpPlayer.inputPermissions.setPermissionCategory(
          mc.InputPermissionCategory.Sneak,
          true
        );
        rtpPlayer.sendMessage(
          lang("ess.cmd.rtp.failed.reload")
        );
      }
  }
);

import '../commands.js';

system.afterEvents.scriptEventReceive.subscribe(
  (ev) => {
    if (ev.id === 'register:plugin') {
      const {
        namespace,
        protocol,
        description = ''
      } = JSON.parse(ev.message);
      console.warn(`Register ${namespace}`);
      PLUGINS.push({
        namespace,
        protocol,
        description
      });
    }
  }
);

import {
  Command
} from '../extension/cc-handler.js';

let _cmd_cd = {},
  _pl = 0,
  dst = Date.now();

system.beforeEvents.startup.subscribe((ev) => {
  for (const [structure, callback] of COMMANDS) {
    const extList = structure.extension ?? [];
    const optionals =
      structure.optionalParameters ?? [];
    const mandatories =
      structure.mandatoryParameters ?? [];

    const enums = [
      ...optionals.filter(
        (k) =>
          k.type === Command.param.enum &&
          Array.isArray(k.options) &&
          k.options.length > 0
      ),
      ...mandatories.filter(
        (k) =>
          k.type === Command.param.enum &&
          Array.isArray(k.options) &&
          k.options.length > 0
      )
    ];

    const seen = new Set();
    for (const enumParam of enums) {
      if (seen.has(enumParam.name)) continue;
      seen.add(enumParam.name);
      ev.customCommandRegistry.registerEnum(
        enumParam.name,
        enumParam.options
      );
    }

    try {
      ev.customCommandRegistry.registerCommand(
        structure,
        (origin, ...args) => {
          const source =
            origin.sourceType === 'Server'
              ? server
              : origin.sourceType === 'Block'
              ? origin.sourceBlock
              : origin.initiator ||
                origin.sourceEntity;

          const player =
            source instanceof Player
              ? source
              : undefined;

          system.run(() => {
            if (
              Array.isArray(structure.tags) &&
              structure.tags.length > 0 &&
              player &&
              !structure.tags.some((tag) => {
                if (tag === 'owner')
                  return player.isOwner;
                if (tag === 'admin')
                  return player.isAdmin;
                return player.hasTag(tag);
              })
            )
              return player.sendMessage(
                lang("ess.player.dont.have.permission")
              );

            if (extList.length > 0) {
              const missing = extList.filter(
                (ext) => {
                  const plugin = PLUGINS.find(
                    (p) => p.namespace === ext
                  );
                  if (!plugin) return true;
                  const pluginModule =
                    plugin.protocol?.split(
                      '|'
                    )[1];
                  const currentModule =
                    PROTOCOL.split('|')[1];
                  return (
                    pluginModule !==
                      currentModule &&
                    pluginModule.includes('-beta')
                  );
                }
              );

              if (missing.length > 0) {
                player?.sendMessage(
                  lang("ess.plugin.not.available.or.incompatible")?.replace(
                    '%plugin%',
                    missing.join(', ')
                  ) ??
                    `§cRequired plugin(s) not loaded or incompatible: ${missing.join(
                      ', '
                    )}`
                );
                return;
              }
            }

            const cooldownKey = `${
              player?.name
            }:${structure.name.replace(
              config.namespace,
              ''
            )}`;
            const currentTick =
              system.currentTick;
            const cooldownExpireTick =
              _cmd_cd[cooldownKey];

            if (
              structure.cooldown > 0 &&
              cooldownExpireTick &&
              currentTick < cooldownExpireTick
            ) {
              const secondsLeft = Math.ceil(
                (cooldownExpireTick -
                  currentTick) /
                  20
              );
              player?.sendMessage(
                lang("ess.command.cooldown",structure?.name.toString(), secondsLeft.toString()) ??
                  `§cPlease wait ${secondsLeft}s before using this command again.`
              );
              return;
            }

            if (structure.cooldown > 0) {
              _cmd_cd[cooldownKey] =
                currentTick +
                structure.cooldown * 20;
              system.runTimeout(() => {
                delete _cmd_cd[cooldownKey];
              }, structure.cooldown * 20);
            }

            callback(
              {
                player,
                source,
                ...origin
              },
              ...args
            );
          });

          return {
            status: CustomCommandStatus.Success
          };
        }
      );

      _pl++;
    } catch (e) {
      console.error(
        `Failed to register ${structure.name}:`,
        e
      );
    }
  }
  console.warn(
    `Register ${_pl} commands ${
      Date.now() - dst
    }ms`
  );
});

system.afterEvents.scriptEventReceive.subscribe(
  (e) => {
    const player = e.initiator || e.sourceType;
    if (player instanceof Player)
      if (e.id === 'set:currency')
        player.setCurrency(parseInt(e.message));
      else if (e.id === 'add:currency')
        player.addCurrency(parseInt(e.message));
      else if (e.id === 'set:homelimit') {
  const [target = null, limit = 1] = message.split("|");
  if (!target || !PlayerDB.has(target)) return;

  const dbP = PlayerDB.get(target);
  PlayerDB.set(target, {
    ...dbP,
    limit: {
      home: limit === "unli" ? limit : (!isNaN(limit) ? parseInt(limit) : 1)
    }
  });
}

  }
);
