import { z } from 'zod';
import { FoundryClient } from '../foundry-client.js';
import { Logger } from '../logger.js';

export interface SceneToolsOptions {
  foundryClient: FoundryClient;
  logger: Logger;
}

export class SceneTools {
  private foundryClient: FoundryClient;
  private logger: Logger;

  constructor({ foundryClient, logger }: SceneToolsOptions) {
    this.foundryClient = foundryClient;
    this.logger = logger.child({ component: 'SceneTools' });
  }

  /**
   * Tool definitions for scene operations
   */
  getToolDefinitions() {
    return [
      {
        name: 'get-current-scene',
        description:
          'Get information about the currently active scene, including tokens and layout',
        inputSchema: {
          type: 'object',
          properties: {
            includeTokens: {
              type: 'boolean',
              description: 'Whether to include detailed token information (default: true)',
              default: true,
            },
            includeHidden: {
              type: 'boolean',
              description: 'Whether to include hidden tokens and elements (default: false)',
              default: false,
            },
          },
        },
      },
      {
        name: 'get-token-state',
        description:
          'Get LIVE state (HP, AC, conditions with badge values, active effects, and immunities/weaknesses/resistances) of tokens on the active scene, read from each token\'s own synthetic actor — correct for unlinked tokens whose conditions differ from the world actor. Identify one token by tokenId, tokenName, or nearest x/y pixel coordinates, or pass all: true for every token. Pass selected: true for the token(s) the GM currently has selected on the canvas, or targeted: true for the GM\'s targeted token(s).',
        inputSchema: {
          type: 'object',
          properties: {
            tokenId: { type: 'string', description: 'Exact token document id' },
            tokenName: { type: 'string', description: 'Token name (exact, then substring match)' },
            x: { type: 'number', description: 'Scene x coordinate; pairs with y for nearest-token lookup' },
            y: { type: 'number', description: 'Scene y coordinate; pairs with x for nearest-token lookup' },
            all: { type: 'boolean', description: 'Return state of ALL tokens on the scene', default: false },
            selected: { type: 'boolean', description: 'Use the token(s) currently SELECTED on the GM canvas', default: false },
            targeted: { type: 'boolean', description: 'Use the token(s) currently TARGETED by the GM user', default: false },
          },
        },
      },
      {
        name: 'get-token-distances',
        description:
          'Measure grid distances from one origin token to all other tokens on the viewed scene, using the game system\'s OWN distance metric (PF2e: closest occupied squares, alternating 5-10-5 diagonals, elevation-aware) so results match the in-app ruler. Identify the origin by tokenId, tokenName, selected: true, or targeted: true. Optional rangeFeet flags each token as in/out of range (e.g. "who is within 30 feet of the selected ogre"). Optional reachFeet applies reach-weapon measurement.',
        inputSchema: {
          type: 'object',
          properties: {
            tokenId: { type: 'string', description: 'Origin token document id' },
            tokenName: { type: 'string', description: 'Origin token name (exact, then substring)' },
            selected: { type: 'boolean', description: 'Use the single token selected on the GM canvas as origin', default: false },
            targeted: { type: 'boolean', description: 'Use the single token targeted by the GM as origin', default: false },
            rangeFeet: { type: 'number', description: 'If set, adds an inRange flag per token for this range' },
            reachFeet: { type: 'number', description: 'Measure as a reach attack of this reach (PF2e reach diagonal rule)' },
            includeHidden: { type: 'boolean', description: 'Include hidden tokens in results', default: false },
          },
        },
      },
      {
        name: 'get-item-identification',
        description:
          'List magical/alchemical physical items with mystification status and identify-check DCs per skill (PF2e: level+rarity DCs, cursed treated as unique, non-matching tradition skills harder). trueName is GM-only knowledge for mystified items — never reveal it to the player. Scope by selected token, tokenName/tokenId, the viewed scene (default), or allScenes.',
        inputSchema: {
          type: 'object',
          properties: {
            selected: { type: 'boolean', description: 'Only items on the selected token(s)', default: false },
            tokenId: { type: 'string' },
            tokenName: { type: 'string' },
            allScenes: { type: 'boolean', description: 'Scan every scene and world actor', default: false },
            includePlayerOwned: { type: 'boolean', description: 'Include player-owned actors', default: false },
            onlyMystified: { type: 'boolean', description: 'Only currently mystified items', default: false },
          },
        },
      },
      {
        name: 'set-item-identification',
        description:
          'Change item identification via the PF2e system\'s own method. action "identify" reveals an item (posts a chat card unless postChat: false); "mystify" hides one; "mystify-all" bulk-mystifies every identified magical/alchemical item (player-owned gear excluded by default). Requires the module\'s "Allow Identification Writes" setting — a scoped permission independent of general write operations.',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['identify', 'mystify', 'mystify-all'] },
            itemUuid: { type: 'string', description: 'Item uuid from get-item-identification (identify/mystify)' },
            allScenes: { type: 'boolean', description: 'mystify-all: cover every scene and world actor', default: false },
            includePlayerOwned: { type: 'boolean', default: false },
            postChat: { type: 'boolean', description: 'Post a reveal chat card on identify', default: true },
          },
          required: ['action'],
        },
      },
      {
        name: 'apply-damage',
        description:
          'Apply damage or healing to a token via the PF2e damage pipeline (resistances, weaknesses, hardness, temp HP, and immunities are applied automatically). Identify the target by tokenId, tokenName, selected: true, or targeted: true. amount is a positive number; set healing: true to heal instead. skipIWR applies the number as-is (ignoring resistances/weaknesses); raw forces plain HP subtraction. Requires the module\'s "Allow Combat Writes" setting.',
        inputSchema: {
          type: 'object',
          properties: {
            tokenId: { type: 'string', description: 'Target token document id' },
            tokenName: { type: 'string', description: 'Target token name (exact, then substring)' },
            selected: { type: 'boolean', description: 'Apply to the selected token(s)', default: false },
            targeted: { type: 'boolean', description: 'Apply to the targeted token(s)', default: false },
            amount: { type: 'number', description: 'Amount of damage (or healing if healing: true); positive number' },
            healing: { type: 'boolean', description: 'Heal instead of damage', default: false },
            skipIWR: { type: 'boolean', description: 'Apply the number as-is, ignoring resistances/weaknesses', default: false },
            raw: { type: 'boolean', description: 'Plain HP arithmetic, bypassing the system pipeline entirely', default: false },
          },
          required: ['amount'],
        },
      },
      {
        name: 'get-scene-walls',
        description:
          'Get wall and door geometry for the active scene so the GM can reason about line of sight, cover, chokepoints, and doors. Each wall gives endpoint coordinates (scene pixels and grid squares gx/gy), whether it blocks movement and sight, and its one-way direction if any. Doors also report type (door/secret) and state (closed/open/locked, passableNow). Pass doorsOnly: true for just the doors.',
        inputSchema: {
          type: 'object',
          properties: {
            doorsOnly: { type: 'boolean', description: 'Return only doors and secret doors', default: false },
            blocksSight: { type: 'boolean', description: 'Filter to walls that DO (true) or do NOT (false) block sight. Open doors never block sight.' },
            blocksMovement: { type: 'boolean', description: 'Filter to walls that DO (true) or do NOT (false) block movement.' },
            includeInvisible: { type: 'boolean', description: 'Include invisible walls (block movement, not sight)', default: true },
          },
        },
      },
      {
        name: 'get-line-of-sight',
        description:
          'Determine whether a source token can see a target token, using corner-to-corner ray casting (16 rays from the source\'s 4 corners to the target\'s 4 corners) against sight-blocking walls (open doors do not block). Returns "clear" (a source corner sees all target corners), "blocked" (all 16 rays hit a wall), or "cover" (in between — GM adjudicates lesser vs standard cover). Identify tokens by id, name, sourceSelected, or targetTargeted.',
        inputSchema: {
          type: 'object',
          properties: {
            sourceTokenId: { type: 'string' },
            sourceTokenName: { type: 'string' },
            sourceSelected: { type: 'boolean', description: 'Use the selected token as the source', default: false },
            targetTokenId: { type: 'string' },
            targetTokenName: { type: 'string' },
            targetTargeted: { type: 'boolean', description: 'Use the targeted token as the target', default: false },
          },
        },
      },
      {
        name: 'get-world-info',
        description: 'Get basic information about the Foundry world and system',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async handleGetTokenState(args: any): Promise<any> {
    const schema = z.object({
      tokenId: z.string().optional(),
      tokenName: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      all: z.boolean().default(false),
      selected: z.boolean().default(false),
      targeted: z.boolean().default(false),
    });
    const params = schema.parse(args);
    this.logger.info('Getting token state', params);
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.getTokenState', params);
    } catch (error) {
      this.logger.error('Failed to get token state', error);
      throw new Error(
        `Failed to get token state: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleGetTokenDistances(args: any): Promise<any> {
    const schema = z.object({
      tokenId: z.string().optional(),
      tokenName: z.string().optional(),
      selected: z.boolean().default(false),
      targeted: z.boolean().default(false),
      rangeFeet: z.number().optional(),
      reachFeet: z.number().optional(),
      includeHidden: z.boolean().default(false),
    });
    const params = schema.parse(args);
    this.logger.info('Measuring token distances', params);
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.getTokenDistances', params);
    } catch (error) {
      this.logger.error('Failed to measure token distances', error);
      throw new Error(
        `Failed to measure token distances: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleGetItemIdentification(args: any): Promise<any> {
    const schema = z.object({
      selected: z.boolean().default(false),
      tokenId: z.string().optional(),
      tokenName: z.string().optional(),
      allScenes: z.boolean().default(false),
      includePlayerOwned: z.boolean().default(false),
      onlyMystified: z.boolean().default(false),
    });
    const params = schema.parse(args);
    this.logger.info('Getting item identification', params);
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.getItemIdentification', params);
    } catch (error) {
      this.logger.error('Failed to get item identification', error);
      throw new Error(
        `Failed to get item identification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleSetItemIdentification(args: any): Promise<any> {
    const schema = z.object({
      action: z.enum(['identify', 'mystify', 'mystify-all']),
      itemUuid: z.string().optional(),
      allScenes: z.boolean().default(false),
      includePlayerOwned: z.boolean().default(false),
      postChat: z.boolean().default(true),
    });
    const params = schema.parse(args);
    this.logger.info('Setting item identification', params);
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.setItemIdentification', params);
    } catch (error) {
      this.logger.error('Failed to set item identification', error);
      throw new Error(
        `Failed to set item identification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleApplyDamage(args: any): Promise<any> {
    const schema = z.object({
      tokenId: z.string().optional(),
      tokenName: z.string().optional(),
      selected: z.boolean().default(false),
      targeted: z.boolean().default(false),
      amount: z.number(),
      healing: z.boolean().default(false),
      skipIWR: z.boolean().default(false),
      raw: z.boolean().default(false),
    });
    const params = schema.parse(args);
    this.logger.info('Applying damage', params);
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.applyTokenDamage', params);
    } catch (error) {
      this.logger.error('Failed to apply damage', error);
      throw new Error(
        `Failed to apply damage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleGetLineOfSight(args: any): Promise<any> {
    const schema = z.object({
      sourceTokenId: z.string().optional(),
      sourceTokenName: z.string().optional(),
      sourceSelected: z.boolean().default(false),
      targetTokenId: z.string().optional(),
      targetTokenName: z.string().optional(),
      targetTargeted: z.boolean().default(false),
    });
    const params = schema.parse(args);
    this.logger.info('Computing line of sight', params);
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.getLineOfSight', params);
    } catch (error) {
      this.logger.error('Failed to compute line of sight', error);
      throw new Error(
        `Failed to compute line of sight: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleGetSceneWalls(args: any): Promise<any> {
    const schema = z.object({
      doorsOnly: z.boolean().default(false),
      blocksSight: z.boolean().optional(),
      blocksMovement: z.boolean().optional(),
      includeInvisible: z.boolean().default(true),
    });
    const params = schema.parse(args);
    this.logger.info('Getting scene walls', params);
    try {
      return await this.foundryClient.query('foundry-mcp-bridge.getSceneWalls', params);
    } catch (error) {
      this.logger.error('Failed to get scene walls', error);
      throw new Error(
        `Failed to get scene walls: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleGetCurrentScene(args: any): Promise<any> {
    const schema = z.object({
      includeTokens: z.boolean().default(true),
      includeHidden: z.boolean().default(false),
    });

    const { includeTokens, includeHidden } = schema.parse(args);

    this.logger.info('Getting current scene information', { includeTokens, includeHidden });

    try {
      const sceneData = await this.foundryClient.query('foundry-mcp-bridge.getActiveScene');

      this.logger.debug('Successfully retrieved scene data', {
        sceneId: sceneData.id,
        sceneName: sceneData.name,
        tokenCount: sceneData.tokens?.length || 0,
      });

      return this.formatSceneResponse(sceneData, includeTokens, includeHidden);
    } catch (error) {
      this.logger.error('Failed to get current scene', error);
      throw new Error(
        `Failed to get current scene: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleGetWorldInfo(_args: any): Promise<any> {
    this.logger.info('Getting world information');

    try {
      const worldData = await this.foundryClient.query('foundry-mcp-bridge.getWorldInfo');

      this.logger.debug('Successfully retrieved world data', {
        worldId: worldData.id,
        system: worldData.system,
      });

      return this.formatWorldResponse(worldData);
    } catch (error) {
      this.logger.error('Failed to get world information', error);
      throw new Error(
        `Failed to get world information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private formatSceneResponse(sceneData: any, includeTokens: boolean, includeHidden: boolean): any {
    const response: any = {
      id: sceneData.id,
      name: sceneData.name,
      active: sceneData.active,
      dimensions: {
        width: sceneData.width,
        height: sceneData.height,
        padding: sceneData.padding,
      },
      hasBackground: !!sceneData.background,
      navigation: sceneData.navigation,
      elements: {
        walls: sceneData.walls || 0,
        lights: sceneData.lights || 0,
        sounds: sceneData.sounds || 0,
        notes: sceneData.notes?.length || 0,
      },
    };

    if (includeTokens && sceneData.tokens) {
      response.tokens = this.formatTokens(sceneData.tokens, includeHidden);
      response.tokenSummary = this.createTokenSummary(sceneData.tokens, includeHidden);
    }

    if (sceneData.notes && sceneData.notes.length > 0) {
      response.notes = sceneData.notes.map((note: any) => ({
        id: note.id,
        text: this.truncateText(note.text, 100),
        position: { x: note.x, y: note.y },
      }));
    }

    return response;
  }

  private formatTokens(tokens: any[], includeHidden: boolean): any[] {
    return tokens
      .filter(token => includeHidden || !token.hidden)
      .map(token => ({
        id: token.id,
        name: token.name,
        position: {
          x: token.x,
          y: token.y,
        },
        size: {
          width: token.width,
          height: token.height,
        },
        actorId: token.actorId,
        disposition: this.getDispositionName(token.disposition),
        hidden: token.hidden,
        hasImage: !!token.img,
      }));
  }

  private createTokenSummary(tokens: any[], includeHidden: boolean): any {
    const visibleTokens = includeHidden ? tokens : tokens.filter(t => !t.hidden);

    const summary = {
      total: visibleTokens.length,
      byDisposition: {
        friendly: 0,
        neutral: 0,
        hostile: 0,
        unknown: 0,
      },
      hasActors: 0,
      withoutActors: 0,
    };

    visibleTokens.forEach(token => {
      // Count by disposition
      const disposition = this.getDispositionName(token.disposition);
      if (disposition in summary.byDisposition) {
        summary.byDisposition[disposition as keyof typeof summary.byDisposition]++;
      } else {
        summary.byDisposition.unknown++;
      }

      // Count actor association
      if (token.actorId) {
        summary.hasActors++;
      } else {
        summary.withoutActors++;
      }
    });

    return summary;
  }

  private formatWorldResponse(worldData: any): any {
    return {
      id: worldData.id,
      title: worldData.title,
      system: {
        id: worldData.system,
        version: worldData.systemVersion,
      },
      foundry: {
        version: worldData.foundryVersion,
      },
      users: {
        total: worldData.users?.length || 0,
        active: worldData.users?.filter((u: any) => u.active).length || 0,
        gms: worldData.users?.filter((u: any) => u.isGM).length || 0,
        players: worldData.users?.filter((u: any) => !u.isGM).length || 0,
      },
      activeUsers:
        worldData.users
          ?.filter((u: any) => u.active)
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            isGM: u.isGM,
          })) || [],
    };
  }

  private getDispositionName(disposition: number): string {
    switch (disposition) {
      case -1:
        return 'hostile';
      case 0:
        return 'neutral';
      case 1:
        return 'friendly';
      default:
        return 'unknown';
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
