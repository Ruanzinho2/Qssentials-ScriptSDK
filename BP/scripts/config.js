// ADMIN = OPERATOR Permission or Tag Admin

export const config = {
  namespace: 'es', //CustomCommandNamespace
  language: 'en', //Defaultlanguage, for Player and CustomCommand, useless

  owners: ['NpermaDev', 'NASRULGgindo'],
  command_required_cheats: true,
  rank_prefix: 'rank:',
  rank_default: '§7',

  ranklist: {
    GUEST: '§7',
    VIP: '§b',
    MVP: '§d',
    ADMIN: '§c',
    DEV: '§6',
    DONATOR: '§3'
  },

  experimental: {
    daily: true,
    weekly: true,
    cdialog: false,
  },

  news: ['Qssentials Build Peformance', 'Best ServerTool Addon!!'],

  chat: {
    message_max_length: 500,
    cooldown: 3, //second, chat cooldown
    /**
  #KEYS
  - @player_name
  - @rank
  - @faction
  - @money
  - @platform
  */
    message_template: '@rank @player_name§r @faction §7§l>§r @msg'
  },

  /**
  #KEYS
  - @player_name
  - @rank
  - @faction
  - @money
  - @platform
  */
  nametag: {
    template: '@rank§r @faction §r@player_name',
    enabled: true //set to false if you want to disabled this custom nametag
  },

  faction: {
    color: '§6', //default faction color
    min: 3, //minimum length faction name
    max: 10, //maximum length faction name
    maximum_member: 20,
    enabled: false //set to true if you want to enabled this feature
  },

  home: {
    min: 1, //minimum length homeName
    max: 20, //maximum length homeName
    limit_default: 1, //set to 0 if you dont want default player have limit to sethome, min: 0, max: 99
    limit_admin: 10, // adminPermission
    limit_owner: 'unli'
  },

  hide_plugin_command_for_member: true, //hide command 'plugin' for member, this will show for player
  teleport_show_dynamic_countdown: true, //set to false if dont want to show the actionbar

  pay: {
    min: 1000 /** @property {integer} min - minimum pay, minimum 500, maximum = 20000*/
  },

  clear: {
    announcement: [300, 180, 60, 10, 5, 3, 2, 1],
    wait: 20,
    chat: true,
    actived: true
  },

  land: {
    pricePerBlock: 500 /** @property {integer} pricePerBlock, minimum = 100, maximum = 20000*/,
    percentSell: 20 /** @property {integer} percentSell - What percentage of the proceeds will you get if you sell your land, minimum = 1, maximum = 100 */,
    minimumSize: 5 /** @property {integer} minimumSize, minimum = 0, maximum = 2000**/,
    limitLandperPlayer: null /** @property {integer | void} limitLandperPlayer, make to number as integer if you want a limiter for land, make to null or void 0 if you dont want a limit*/,

    allowedInteractEntities: ['minecraft:npc'] /** @property {string[] | EntityTypeId[]} allowedInteractEntities - Allow to interact entity in land */
  },

  scorehud: {
    enable_by_default: true /** @property {boolean} enable_by_default - show the scorehud by default */,
    /**
  #KEYS
  - @player_name
  - @rank
  - @faction
  - @money
  - @moneyr
  - @kills
  - @deaths
  - @land_here
  - @durability_mainhand_current
  - @durability_mainhand_max
  - @platform
  - @n
  */
    template_default: `textures/ui/title|§l§6info§r@ln§arank: @rank§r§2@lnfaction: @faction@ln§a  money: @moneyr@ln§2durability: @durability_mainhand_current/@durability_mainhand_max@ln§ainland: §7{@land_here§7}§6@ln@ln§lstatistic§r§a@lnkills: @kills@ln§2deaths: @deaths|nperma.github.io` /** @property {string} template_default - {TITLE}|{BODY}|{WATERMARK}
    - TITLE: you can make for string or texture: if you wanna use texture you can make the title into path texture
    - BODY: string for the body scorehud
    - WATERMARK: watermark
    */
  },

  lobby_protect: {
    enabled: true, //set to false if you dont want this feature actived
    pos: [
      { x: 5, z: 5 },
      { x: -5, z: -5 }
    ], // [pos1,pos2] //coordinate
    allowInteractNpc: true,
    disable_pvp: true
  },

  //ONE CLICK | NPC
  interaction: {
    'npc.daily': {
      // npc.daily = entity tag
      command: 'daily', //command when trigger interact or hit the entity when have the key tag npc.daily
      hit: true, //enable hit trigger
      interact: true //enable hit trigger
    },
    'npc.weekly': {
      command: 'weekly',
      hit: true,
      interact: true
    },
    'npc.rtp': {
      command: 'rtp',
      hit: false,
      interact: true
    },
    'npc.rules': {
      command: 'rules',
      hit: true,
      interact: true
    },
    'npc.news': {
      command: 'news',
      hit: true,
      interact: true
    }
  },

  broadcast: {
    cooldown: 10, //second
    price_limit: 20000,
    message_max_length: 300,
    title: '§cbroadcast',
    auto_message: {
      enabled: true,
      delay_per_index: 250,
      /**
       # KEYS
       - @online
       - @max_players
       */
      message: ['dont forgot your daily reward, type §e/daily', 'see news or you forgot :b, type §e/news', '§aonline now @online/@max_players']
    },
    limit_default: 1,
    limit_admin: 20,
    limit_owner: 'unli'
  },

  rules: ['§cGrief', '§cSpam', '§cDupe', '§cXray', '§cThief This addon and Copy with no permission is Crime'],

  daily: {
    0: [
      //day 1, or monday atau senin
      {
        type: 'item',
        item_type: 'minecraft:bread',
        amount: 5
      }
    ],
    1: [
      //day 2, or tuesday atau selasa
      {
        type: 'currency',
        value: 2000
      }
    ],
    2: [
      //day 3, or wednesday atau rabu
      {
        type: 'item',
        item_type: 'minecraft:iron_sword',
        item_name: '§bDaily Sword',
        enchants: [
          {
            id: 'sharpness',
            level: 2
          }
        ]
      }
    ],
    3: [
      //day 4, or thursday atau kamis
      {
        type: 'item',
        item_type: 'minecraft:diamond',
        amount: 3
      }
    ],
    4: [
      //day 5, or friday atau jum'at
      {
        type: 'currency',
        value: 5000
      }
    ],
    5: [
      //day 6, or saturday atau sabtu
      {
        type: 'random',
        item: [
          {
            type: 'item',
            item_type: 'minecraft:golden_apple',
            amount: [1, 3]
          },
          {
            type: 'currency',
            value: [1000, 5000]
          }
        ]
      }
    ],
    6: [
      //day 7, or sunday atau minggu
      {
        type: 'item',
        item_type: 'minecraft:netherite_ingot',
        amount: 1
      }
    ]
  },

  weekly: {
    free: {
      prize: [
        {
          type: 'item', //type = ["item","currency","random"]
          item_type: 'minecraft:bread',
          amount: 8 //optional, default value amount = 1
        },
        {
          type: 'random',
          item: [
            {
              type: 'item',
              item_type: 'minecraft:diamond',
              item_name: '§bPerosDiamon'
            },
            {
              type: 'currency',
              value: 5000
            },
            {
              type: 'item',
              item_type: 'minecraft:stone_pickaxe',
              item_name: '§bXyzzzN Pickaxe',
              enchants: [
                {
                  id: 'efficiency',
                  level: 2
                }
              ]
            }
          ]
        }
      ]
    },
    rare: {
      permission: 'weekly.rare', //tag permission access
      prize: [
        {
          type: 'item',
          item_type: 'minecraft:golden_apple',
          amount: [1, 8] //randomize 1 -> 8
        },
        {
          type: 'currency',
          value: [5000, 250000] //randomize 5000 -> 250000
        },
        {
          type: 'random',
          item: [
            {
              type: 'item',
              item_type: ['minecraft:iron_pickaxe', 'minecraft:diamond_pickaxe'],
              item_name: '§bitsFary §ePickaxe',
              enchants: [
                {
                  id: 'efficiency',
                  level: [1, 2] //randomize 1 -> 2
                },
                'random',
                'random'
              ] //random = random enchanted
            },
            {
              type: 'item',
              item_type: ['minecraft:iron_sword', 'minecraft:diamond_sword'],
              item_name: '§bZenqsan §eSword',
              enchants: [
                {
                  id: 'random',
                  level: [1, 'max']
                },
                'random'
              ]
            }
          ]
        },
        {
          type: 'item',
          item_type: 'minecraft:netherite_ingot',
          amount: [1, 2]
        }
      ]
    },
    mythical: {
      permission: 'weekly.myth',
      prize: [
        {
          type: 'currency',
          value: [8500, 200000]
        },
        {
          type: 'item',
          item_type: 'minecraft:enchanted_golden_apple',
          amount: [2, 5]
        },
        {
          type: 'random',
          item: [
            {
              type: 'item',
              item_name: 'Paoonie',
              item_type: 'minecraft:totem_of_undying'
            },
            {
              type: 'item',
              item_name: '§bsirob §dPickaxe',
              item_type: 'minecraft:diamond_pickaxe',
              enchants: [
                { id: 'mending', level: 1 },
                { id: 'efficiency', level: [2, 'max'] },
                { id: 'unbreaking', level: [1, 'max'] }
              ]
            },
            {
              type: 'item',
              item_name: '§3Nperma §eAxe',
              item_type: 'minecraft:diamond_axe',
              enchants: ['random', 'random', 'random', 'random']
            }
          ]
        }
      ]
    }
  }
};
