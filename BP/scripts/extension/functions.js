import {
  world as stool,
  system as essentui,
  Player as Define,
  Entity as _505,
  TicksPerSecond as DanDog,
  System as PROTO,
  // ./SYSYEM;;CORE
  DimensionTypes,
  DimensionType
} from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { QuickDB } from "./library";
import { config } from "../config";

let server,
  temporary_variable = {};
stool.afterEvents.worldLoad.subscribe(() => {
  server = stool.getDimension("overworld");
});

// NON - GENERATED ---------
const { runInterval: looping, run: solved, clearRun: stop } = PROTO.prototype;

// FUNCTIONS ---------------

/** @param {Player | string} PlayerOrPlayerName @returns {boolean | undefined} */
export function isOnline(PlayerOrPlayerName) {
  return !!(PlayerOrPlayerName instanceof Defined) || !!stool.getAllPlayers().find((p) => p.name === PlayerOrPlayerName) || QuickDB.get("player-db").keys().includes(PlayerOrPlayerName) ? false : undefined;
}

/** @returns {DimensionId[] | string[]} */
export function getAllDimension() {
  return DimensionTypes.getAll().map((d) => d.typeId);
}

/** @returns {Player | Undefined} */
export function findPlayerById(id) {
  return stool.getAllPlayers().find((p) => p.id === (id?.[0].id??id));
}

/** @returns {boolean} */
export function isValidDimension(DimensionOrDimensionId) {
  return !!DimensionType.get(DimensionOrDimensionId);
}

export function formatNumber(v) {
  let i = (Math.log10(v) / 3) | 0;
  return (v / 1e3 ** i).toFixed(2) + " kMBTPEZY"[i];
}

/** @returns {boolean} */
export function kill(entity) {
  if (!(entity instanceof _505)) return false;
  entity.kill();
  return true;
}

export function leaderboard(d, l = 10) {
  let s = d.slice().sort((a, b) => b.value - a.value),
    r = [],
    t = 1,
    p = null,
    i = 0;

  for (let x = 0; x < s.length && r.length < l; x++) {
    let { name = "none", value = 0 } = s[x];
    if (value !== p) t = i + 1;
    r.push({ top: t, name, value });
    p = value;
    i++;
  }

  return r;
}

export function teleportHandle(player, { key, countdown = 3, msg_cancel = "Teleport Cancel", msg_in_countdown = "Wait in countdown", useActionBar = config.teleport_show_dynamic_countdown }, cb = () => {}) {
  const fkey = `${player.name}::${key}`,
    tickNow = essentui.currentTick;
  if (!(fkey in temporary_variable)) temporary_variable[fkey] = tickNow + ((countdown + 1) * DanDog);
  else return player.sendMessage(msg_in_countdown);

  const runner = essentui.runInterval(() => {
    if (player.isMoving) return (useActionBar?player.onScreenDisplay.setActionBar(msg_cancel):player.sendMessage(msg_cancel)),delete temporary_variable[fkey],essentui.clearRun(runner);
    const vbrew = Math.floor((temporary_variable[fkey] - essentui.currentTick) / 20);

    if (useActionBar) player.onScreenDisplay.setActionBar(`teleport in ${vbrew}s`);

    if (vbrew == 0) {
      cb();
      delete temporary_variable[fkey];
      essentui.clearRun(runner);
    }
  });
}

export async function forceOpen(player, form) {
  while (true) {
    const f = await form.show(player);
    if (f.cancelationReason !== "UserBusy") return f;
  }
}

export function metricNumber(n) {
  return n < 1000
    ? n.toString()
    : ((x) =>
        parseFloat((n / Math.pow(1000, x)).toFixed(1))
          .toString()
          .replace(/\.0$/, "") + ["", "K", "M", "B", "T"][x])(Math.floor(Math.log10(n) / 3));
}
