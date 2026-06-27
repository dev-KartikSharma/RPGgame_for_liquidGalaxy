
export const ASEPRITES = [
    {
        key: 'player',
        textureURL: 'units/warrior/warrior.png',
        atlasURL: 'units/warrior/warrior.json'
    },
    {
        key: 'enemy_goblin_torch_blue',
        textureURL: 'terrain/enemy/goblin/troops/torch/blue/torch_blue.png',
        atlasURL: 'terrain/enemy/goblin/troops/torch/blue/torch_blue.json'
    }
];

export const TILESETS = [
    //Master Tileset
    {
        tiledName: 'frame_1', // updated to match spawn.json
        key: 'frame_1',
        path: 'terrain/master/frame_1.png'
    },
    {
        tiledName: 'trees', // updated to match spawn.json
        key: 'trees',
        path: 'terrain/master/trees.png'
    },


    //Terrain/Bridge/
    {
        tiledName: 'bridge_all', // updated to match spawn.json
        key: 'bridge',
        path: 'terrain/bridge/bridge_all.png'
    },

    // Additional tilesets for spawn.json
    {
        tiledName: 'masterTilesetBuildings',
        key: 'masterTilesetBuildings',
        path: 'buildings/masterTilesetBuildings.png' // assuming this path works based on common structure, wait, I should check it, but this is the best guess
    },
    {
        tiledName: 'bushe1',
        key: 'bushe1',
        path: 'terrain/deco/bushes/bushe1.png'
    },
    {
        tiledName: 'Shadow',
        key: 'shadow',
        path: 'terrain/master/Shadow.png'
    }
];

export const MAPS = [
    {
        key: 'map',
        path: 'maps/spawn.json'
    }
];

export const UI_ASSETS = [
    {
        key: 'big_bar_base',
        path: 'ui_elements/ui_elements/bars/big_bar_base.png'
    },
    {
        key: 'small_bar_base',
        path: 'ui_elements/ui_elements/bars/small_bar_base.png'
    },
    {
        key: 'big_bar_fill',
        path: 'ui_elements/ui_elements/bars/big_bar_fill.png'
    },
    {
        key: 'small_bar_fill',
        path: 'ui_elements/ui_elements/bars/small_bar_fill.png'
    },
    {
        key: 'avatars_01',
        path: 'ui_elements/ui_elements/human_avatars/avatars_01.png'
    },
    {
        key: 'button_regular',
        path: 'ui_elements/ui_elements/buttons/big_blue_button_regular.png'
    },
    {
        key: 'button_pressed',
        path: 'ui_elements/ui_elements/buttons/big_blue_button_pressed.png'
    },
    {
        key: 'paper_bg',
        path: 'ui_elements/ui_elements/papers/regular_paper.png'
    },
    {
        key: 'icon_01',
        path: 'ui_elements/ui_elements/icons/icon_01.png'
    },
    {
        key: 'icon_02',
        path: 'ui_elements/ui_elements/icons/icon_02.png'
    },
    {
        key: 'big_ribbons',
        path: 'ui_elements/ui_elements/ribbons/big_ribbons.png'
    },
    {
        key: 'special_paper',
        path: 'ui_elements/ui_elements/papers/special_paper.png'
    },
    {
        key: 'icon_09',
        path: 'ui_elements/ui_elements/icons/icon_09.png'
    },
    {
        key: 'wood_table',
        path: 'ui_elements/ui_elements/wood_table/wood_table.png'
    },
    {
        key: 'start_screen',
        path: 'ui_elements/start_screen.png'
    },
    {
        key: 'small_ribbons',
        path: 'ui_elements/ui_elements/ribbons/small_ribbons.png'
    }
];