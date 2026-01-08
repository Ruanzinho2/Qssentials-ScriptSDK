import { world, system, ItemStack, TicksPerSecond } from "@minecraft/server";

const sellPercent = 0.5; // 50% potongan harga

class Item {
  constructor(itemType, { price, min, max, maxStock }) {
    this.itemtype = itemType;
    this.price = price;
    this.minimum = min;
    this.maximum = max || min;
    this.stock = maxStock;
    this.maxStock = maxStock;
  }

  DynamicPrice(maxRange, minRange) {
    return Math.floor(Math.min(maxRange, Math.max(minRange || this.price >> 2, this.price * (1 + (1 - this.stock / this.maxStock)))));
  }

  resetStock() {
    let boolean = false;
    if (this.stock > this.maxStock) (this.stock = this.maxStock), (boolean = !![]);
    else if (this.stock < this.maxStock) (this.stock = Math.min(this.maxStock, this.stock + this.maximum)), (boolean = !![]);
    return boolean;
  }

  buy(player, amountBuy, currentPrice) {
    const inventory = player.getComponent("inventory").container;
    const money = player.getCurrency();
    const price = currentPrice * amountBuy;
    if (inventory.emptySlotsCount === 0) return player.say("Tidak cukup ruang di inventory mu");
    if (this.stock <= 0) return player.say("Stock Habis, tunggu hingga stock terisi lagi.");
    if (price > money) return player.say("Kamu tidak memiliki cukup uang!!");

    this.stock -= Math.min(this.stock, amountBuy);
    player.addCurrency(-price);
    inventory.addItem(new ItemStack(this.itemType, amountBuy));
    return player.say("Berhasil membeli item");
  }

  sell(player, amountSell, currentPrice) {
    const inventory = player.getComponent("inventory").container;
    const itemTypeId = this.itemType;
    let itemsToRemove = [];
    let totalCollected = 0;

    for (let i = 0; i < inventory.size; i++) {
      const item = inventory.getItem(i);
      if (!item || !item.isValid() || item.typeId !== itemTypeId) continue;

      const available = item.amount;
      if (totalCollected + available <= amountSell) {
        itemsToRemove.push({ slot: i, amount: available });
        totalCollected += available;
      } else {
        const needed = amountSell - totalCollected;
        itemsToRemove.push({ slot: i, amount: needed });
        totalCollected += needed;
        break;
      }

      if (totalCollected >= amountSell) break;
    }

    if (totalCollected < amountSell) return player.say("Item yang dijual kurang");

    for (const { slot, amount } of itemsToRemove) {
      const item = inventory.getItem(slot);
      if (item.amount > amount) {
        item.amount -= amount;
        inventory.setItem(slot, item);
      } else inventory.setItem(slot);
    }

    const pricePerItem = currentPrice * sellPercent;
    const totalMoney = Math.floor(pricePerItem * amountSell);
    player.addCurrency(totalMoney);
    this.stock = this.stock + amountSell;

    return player.say(`Berhasil menjual ${amountSell} ${this.itemType} dan mendapatkan ${totalMoney}`);
  }
}