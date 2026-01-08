/** @format */

import { system, world, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { config } from "../config.js";
import { COMMANDS } from "../_loader/lib/PROTO.js"

function processParams(params = []) {
  return params.map((param) => {
    if (param?.type === CustomCommandParamType.Enum && typeof param.name === "string" && !param.name.includes(":")) {
      return {
        ...param,
        name: `${config.namespace}:${param.name}`
      };
    }
    return param;
  });
}

export class Command {
  static register(structure, callback = () => {}) {
    if (!structure?.name) return console.warn("Command must have a name.");

    const STRUCTURED = {
      name: structure.name.includes(":") ? structure.name : `${config.namespace}:${structure.name}`,
      permissionLevel: structure.permission || structure.permissionLevel || 0,
      description: structure.description || "",
      optionalParameters: processParams(structure.optional || structure.optionalParameters),
      tags: structure.tags || [],
      cooldown: structure.cooldown || 0,
      mandatoryParameters: processParams(structure.required || structure.mandatoryParameters),
      cheatsRequired: config.command_required_cheats,
      extension: structure.extension || structure.plugins || [],
      category: (structure.category || structure.group || "GENERAL").toUpperCase(),
      alias: (structure.aliases || []).map(_ => _.includes(":")?`${config.namespace}:${_}`:_)
    };
    
    if (Array.isArray(structure.aliases)) {
  for (const alias of structure.aliases) {
    const aliasName = alias.includes(":") ? alias : `${config.namespace}:${alias}`;
    COMMANDS.push([
      {
        ...STRUCTURED,
        name: aliasName,
        alias: undefined
      },
      callback
    ]);
  }
}


    COMMANDS.push([STRUCTURED, callback]);
  }

  static get param() {
    return {
      blockType: CustomCommandParamType.BlockType,
      itemType: CustomCommandParamType.ItemType,
      entitySelector: CustomCommandParamType.EntitySelector,
      float: CustomCommandParamType.Float,
      playerSelector: CustomCommandParamType.PlayerSelector,
      boolean: CustomCommandParamType.Boolean,
      enum: CustomCommandParamType.Enum,
      integer: CustomCommandParamType.Integer,
      location: CustomCommandParamType.Location,
      string: CustomCommandParamType.String
    };
  }

  static get status() {
    return {
      success: CustomCommandStatus.Success,
      fail: CustomCommandStatus.Failure
    };
  }

  static get permission() {
    return {
      any: 0,
      gameDirectors: 1,
      admin: 2,
      host: 3,
      owner: 4
    };
  }
}

export { COMMANDS };
