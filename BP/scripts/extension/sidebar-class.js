//wellwell this is AI
import { world } from "@minecraft/server";
let si_line=[];
export class Scoreboard {
  static get $asset() {
    return world.scoreboard;
  }

  static setLine(name, index, objective = "scorehud-nperma") {
    const obj = this.$asset.getObjective(objective);
    if (!obj) return;
    try {
      obj.setScore(name, index);
    } catch (e) {
      console.warn(`[Scoreboard.setLine] Failed to set line: ${name}`, e);
    }
  }

  /**
   * Tampilkan scoreboard untuk player dengan struktur string atau fungsi.
   * @param {string[] | Function} structure - Array string atau fungsi yang menghasilkan array.
   * @param {Player | Player[] | "all"} sender - Target player(s).
   * @param {string} [objective="scorehud-nperma"]
   * @param {number} [sortOrder=0]
   */
  static run(structure, sender = "all", objective = "scorehud-nperma", sortOrder = 0) {
    const players = sender === "all" ? world.getAllPlayers() : Array.isArray(sender) ? sender : [sender];
    const obj = this.$asset.getObjective(objective);
    if (!obj) return;

    for (const player of players) {
      const linesRaw = typeof structure === "function" ? structure(player) : structure;
      if (!Array.isArray(linesRaw)) continue;

      const les = linesRaw.map(line => line?.trim() ? line : "§z"),lines=les.reverse()
      si_line=les;

      const total = lines.length;

      const entries = obj.getParticipants();
      for (const entry of entries) {
        if(lines.includes(entry)) continue;
        obj.removeParticipant(entry);
      }

      this.$asset.setObjectiveAtDisplaySlot("Sidebar", {
        objective: obj,
        sortOrder
      });
      
  for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const index = lines.length - i - 1;
  this.setLine(line, index, objective);
}
    }
  }
}