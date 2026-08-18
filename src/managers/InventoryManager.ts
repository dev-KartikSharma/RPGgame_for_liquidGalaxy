export interface Item {
  id: string;
  name: string;
  iconKey: string;
  quantity: number;
}

export class InventoryManager {
  public items: Item[] = [];
  private maxSlots: number = 16;

  constructor(initialItems: Item[] = []) {
    this.items = [...initialItems];
  }

  public addItem(item: Item): boolean {
    // Check if we already have it
    const existing = this.items.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
      return true;
    }

    if (this.items.length < this.maxSlots) {
      this.items.push(item);
      return true;
    }

    return false; // Inventory full
  }

  public removeItem(itemId: string, quantity: number = 1): boolean {
    const index = this.items.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      this.items[index].quantity -= quantity;
      if (this.items[index].quantity <= 0) {
        this.items.splice(index, 1);
      }
      return true;
    }
    return false;
  }
}
