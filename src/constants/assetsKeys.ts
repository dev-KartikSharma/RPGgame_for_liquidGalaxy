export const ASEPRITES = [
  {
    key: "player",
    textureURL: "units/warrior/Warrior.png",
    atlasURL: "units/warrior/Warrior.json",
  },
  {
    key: "enemy_goblin_torch_blue",
    textureURL: "terrain/enemy/goblin/Troops/Torch/Blue/Torch_Blue.png",
    atlasURL: "terrain/enemy/goblin/Troops/Torch/Blue/Torch_Blue.json",
  },
];

export const SPRITESHEETS = [
  {
    key: "water_splash",
    path: "effects/Water Splash.png",
    frameWidth: 192,
    frameHeight: 192,
  },
  {
    key: "spawn_dust",
    path: "effects/Spawn Dust.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  {
    key: "icon_10_sheet",
    path: "ui_elements/ui_elements/icons/icon_10.png",
    frameWidth: 16,
    frameHeight: 16,
  },
  {
    key: "g_spawn",
    path: "effects/G_Spawn.png",
    frameWidth: 128,
    frameHeight: 128,
  },
  {
    key: "g_idle",
    path: "effects/G_Idle.png",
    frameWidth: 128,
    frameHeight: 128,
  },
  {
    key: "pawn_idle",
    path: "npc/pawn_idle.png",
    frameWidth: 192,
    frameHeight: 192,
  },
  // Goblin TNT Blue variation
  {
    key: "enemy_goblin_tnt_blue",
    path: "terrain/enemy/goblin/Troops/TNT/Blue/TNT_Blue.png",
    frameWidth: 192,
    frameHeight: 192,
  },
  // Goblin Barrel Blue variation
  {
    key: "enemy_goblin_barrel_blue",
    path: "terrain/enemy/goblin/Troops/Barrel/Blue/Barrel_Blue.png",
    frameWidth: 128,
    frameHeight: 128,
  },
  // Explosion effect
  {
    key: "explosion",
    path: "effects/Explosions.png",
    frameWidth: 192,
    frameHeight: 192,
  },
  // Dynamite projectile spritesheet
  {
    key: "dynamite_projectile",
    path: "terrain/enemy/goblin/Troops/TNT/Dynamite/Dynamite.png",
    frameWidth: 64,
    frameHeight: 64,
  },
];

export const TILESETS = [
  //Master Tileset
  {
    tiledName: "frame_1", // updated to match spawn.json
    key: "frame_1",
    path: "terrain/master/frame_1.png",
  },
  {
    tiledName: "trees", // updated to match spawn.json
    key: "trees",
    path: "terrain/master/Trees.png",
  },
  {
    tiledName: "enemybuildings",
    key: "enemybuildings",
    path: "buildings/enemybuildings.png",
  },
  {
    tiledName: "master_clouds",
    key: "master_clouds",
    path: "terrain/deco/Clouds/master_clouds.png",
  },

  //Terrain/Bridge/
  {
    tiledName: "bridge_all", // updated to match spawn.json
    key: "bridge",
    path: "terrain/Bridge/Bridge_All.png",
  },

  // Additional tilesets for spawn.json
  {
    tiledName: "masterTilesetBuildings",
    key: "master_tileset_buildings",
    path: "buildings/master_tileset_buildings.png",
  },
  {
    tiledName: "bushe1",
    key: "bushe1",
    path: "terrain/deco/Bushes/Bushe1.png",
  },
  {
    tiledName: "Shadow",
    key: "shadow",
    path: "terrain/master/Shadow.png",
  },
  {
    tiledName: "master_tileset_buildings",
    key: "master_tileset_buildings_safevillage",
    path: "buildings/master_tileset_buildings.png",
  },
  {
    tiledName: "rubber_duck",
    key: "rubber_duck",
    path: "terrain/deco/rubber_duck/rubber_duck.png",
  },
  {
    tiledName: "Gold Stone 1_Highlight",
    key: "gold_stone_1_highlight",
    path: "resources/goldstones/Gold Stone 1_Highlight.png",
  },
  {
    tiledName: "ribbon_red",
    key: "ribbon_red",
    path: "ui_elements/ui_banners_from_the_store_page/ribbons/ribbon_red.png",
  },
  {
    tiledName: "banner",
    key: "banner",
    path: "ui_elements/ui_elements/banners/banner.png",
  },
];

export const MAPS = [
  {
    key: "map",
    path: "maps/spawn.json",
  },
  {
    key: "start_menu",
    path: "maps/start_menu.json",
  },
  {
    key: "safevillage",
    path: "maps/safevillage.json",
  },
];

export const UI_ASSETS = [
  {
    key: "big_bar_base",
    path: "ui_elements/ui_elements/bars/big_bar_base.png",
  },
  {
    key: "small_bar_base",
    path: "ui_elements/ui_elements/bars/small_bar_base.png",
  },
  {
    key: "big_bar_fill",
    path: "ui_elements/ui_elements/bars/big_bar_fill.png",
  },
  {
    key: "small_bar_fill",
    path: "ui_elements/ui_elements/bars/small_bar_fill.png",
  },
  {
    key: "avatars_01",
    path: "ui_elements/ui_elements/human_avatars/avatars_01.png",
  },
  {
    key: "button_regular",
    path: "ui_elements/ui_elements/buttons/big_blue_button_regular.png",
  },
  {
    key: "button_pressed",
    path: "ui_elements/ui_elements/buttons/big_blue_button_pressed.png",
  },
  {
    key: "paper_bg",
    path: "ui_elements/ui_elements/papers/regular_paper.png",
  },
  {
    key: "icon_01",
    path: "ui_elements/ui_elements/icons/icon_01.png",
  },
  {
    key: "icon_02",
    path: "ui_elements/ui_elements/icons/icon_02.png",
  },
  {
    key: "big_ribbons",
    path: "ui_elements/ui_elements/ribbons/big_ribbons.png",
  },
  {
    key: "special_paper",
    path: "ui_elements/ui_elements/papers/special_paper.png",
  },
  {
    key: "icon_09",
    path: "ui_elements/ui_elements/icons/icon_09.png",
  },
  {
    key: "wood_table",
    path: "ui_elements/ui_elements/wood_table/wood_table.png",
  },
  {
    key: "start_screen",
    path: "ui_elements/start_screen.png",
  },
  {
    key: "small_ribbons",
    path: "ui_elements/ui_elements/ribbons/small_ribbons.png",
  },
  {
    key: "icon_10",
    path: "ui_elements/ui_elements/icons/icon_10.png",
  },
];
