const DEFS = {
  health_potion: { name: 'Health Potion', glyph: '!', color: '#ef5350', type: 'consumable',
    use(p) { const h = 8; p.hp = Math.min(p.maxHp, p.hp + h); return `+${h} HP`; } },
  big_potion: { name: 'Big Potion', glyph: '!', color: '#ff7043', type: 'consumable',
    use(p) { const h = 20; p.hp = Math.min(p.maxHp, p.hp + h); return `+${h} HP`; } },
  sword:       { name: 'Iron Sword',    glyph: '/', color: '#90caf9', type: 'weapon', atk: 3 },
  great_sword: { name: 'Great Sword',   glyph: '/', color: '#42a5f5', type: 'weapon', atk: 6 },
  shield:      { name: 'Wooden Shield', glyph: ']', color: '#a1887f', type: 'armor',  def: 2 },
  plate:       { name: 'Plate Armor',   glyph: ']', color: '#78909c', type: 'armor',  def: 4 },
};

export class Item {
  constructor(key, x, y) {
    const d = DEFS[key];
    Object.assign(this, { key, x, y, name: d.name, glyph: d.glyph, color: d.color, type: d.type, picked: false });
    if (d.atk) this.atk = d.atk;
    if (d.def) this.def = d.def;
    if (d.use) this.use = d.use;
  }
}

export function spawnItems(rooms, level) {
  const pool = level <= 2 ? ['health_potion', 'sword', 'shield']
    : level <= 4 ? ['health_potion', 'big_potion', 'sword', 'shield']
    : ['big_potion', 'great_sword', 'plate'];
  const out = [];
  for (const r of rooms) {
    if (Math.random() > 0.5) continue;
    const ix = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
    const iy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
    out.push(new Item(pool[Math.floor(Math.random() * pool.length)], ix, iy));
  }
  return out;
}
