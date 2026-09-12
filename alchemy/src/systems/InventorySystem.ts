import type { IngredientInstance, PotionInstance, SaveData } from '../data/types';
export class InventorySystem {
  constructor(private data: SaveData, private onChange: () => void) {}
  addIngredient(item: IngredientInstance): void { this.data.ingredients.push(item); this.onChange(); }
  removeIngredients(ids: string[]): void { this.data.ingredients = this.data.ingredients.filter((item) => !ids.includes(item.id)); this.onChange(); }
  addPotion(item: PotionInstance): void { this.data.potions.push(item); this.onChange(); }
  removePotion(id: string): void { this.data.potions = this.data.potions.filter((item) => item.id !== id); this.onChange(); }
}
