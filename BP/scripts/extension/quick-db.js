import { world, system } from "@minecraft/server";

export class QuickDB {
  static DATABASE_PREFIX = "\u0235\u0235";
  #identifier;
  id;
  __cache;
  #lastSnapshot = "";
  
  constructor(id, autoRefreshMs = 0) {
    if (typeof id !== "string" || !id.trim()) throw new Error("Invalid DB id");
    this.id=id;
    this.#identifier = `${QuickDB.DATABASE_PREFIX}${id}${QuickDB.DATABASE_PREFIX}`;
    this.__cache = {};
    system.run(()=>this.refresh());

    if (autoRefreshMs > 0) {
      system.runInterval(() => this.refreshIfChanged(), autoRefreshMs);
    }
  }
  
  get size() {
    return Object.keys(this.__cache).length
  }

  refreshIfChanged() {
    const snapshot = JSON.stringify(world.getDynamicPropertyIds().map(id => [id, world.getDynamicProperty(id)]));
    if (snapshot === this.#lastSnapshot) return;
    this.refresh();
    this.#lastSnapshot = snapshot;
  }

 refresh() {
    const ids = this.getIds();
    const newCache = {};
    for (const id of ids) {
      let v = world.getDynamicProperty(id);
      if (typeof v === "string" && v.startsWith("obj")) {
        try { v = JSON.parse(v.slice(3)) } catch {}
      }
      const key = id.slice(this.#identifier.length);
      newCache[key] = v;
    }
    this.__cache = newCache;
    this.#lastSnapshot = JSON.stringify(ids.map(id => [id, this.__cache[id.slice(this.#identifier.length)]]));
  }

  static get(id, autoRefreshMs = 5000) {
    return new QuickDB(id, autoRefreshMs);
  }

  keys() { return Object.keys(this.__cache) }
  values() { return Object.values(this.__cache) }
  entries() { return Object.entries(this.__cache) }

  set(key, value) {
    if (!key.trim()) throw new Error("Key must be non-empty string");
    const val = typeof value === "object" ? "obj" + JSON.stringify(value) : value;
    world.setDynamicProperty(this.#identifier + key, val);
    this.__cache[key] = value;
    this.refreshIfChanged();
  }

  delete(key) {
    if (!this.has(key)) return false;
    world.setDynamicProperty(this.#identifier + key, undefined);
    delete this.__cache[key];
    this.refreshIfChanged();
    return true;
  }

  get(key) {
    if (!key.trim()) throw new Error("Key must be non-empty string");
    return this.__cache[key];
  }

  has(key) { return key in this.__cache }

  getIds() {
    return world.getDynamicPropertyIds().filter(id => id.startsWith(this.#identifier));
  }

  clear() {
    for (const k of this.keys()) this.delete(k);
  }
}
