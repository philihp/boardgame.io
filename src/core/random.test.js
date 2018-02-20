/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { randomctx, RunRandom, addrandomop, DICE, Random } from './random';

function checkrandom(value, min, max) {
  expect(value).toBeDefined();
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

test('randomctx', () => {
  let ctx = { random: { seed: 'hi there' } };

  // make sure that on subsequent calls different numbers are generated.
  let { ctx: ctx2, randomnumber } = randomctx(ctx);
  expect(randomnumber).toBe(0.573445922927931);
  let { ctx: ctx3, randomnumber: randomnumber2 } = randomctx(ctx2);
  expect(randomnumber2).toBe(0.4695413049776107);
  let { ctx: ctx4, randomnumber: randomnumber3 } = randomctx(ctx3);
  expect(randomnumber3).toBe(0.5943194630090147);
  expect(ctx4).not.toMatchObject(ctx3);
});

test('RunRandom nothing to do', () => {
  let ctx = { random: { seed: 0 } };
  let G = {};

  let { G: G2, ctx: ctx2 } = RunRandom(G, ctx);

  expect(G2).toMatchObject(G);
  expect(ctx2).toMatchObject(ctx);
});

test('RunRandom invalid op', () => {
  let ctx = { random: { seed: 0 } };
  let G = {};

  // currently, the framework silently ignores the request.
  const G2 = addrandomop(G, 'field1', 'XYZ');
  let { G: G3, ctx: ctx2 } = RunRandom(G2, ctx);

  expect(G3).toMatchObject(G);
  expect(ctx2).toMatchObject(ctx);
  expect(G3._randomOps).toBeUndefined();
});

test('Random', () => {
  let G = {};
  const G2 = Random.D6(G, 'field1');
  let expectedOps = [{ op: DICE, args: [6], fieldname: 'field1' }];
  expect(G2._randomOps).toMatchObject(expectedOps);

  const G3 = Random.D6(G2, 'field2');
  expectedOps = [...expectedOps, { op: DICE, args: [6], fieldname: 'field2' }];
  expect(G3._randomOps).toMatchObject(expectedOps);

  const G4 = Random.D6(G3, 'field1');
  expectedOps = [...expectedOps, { op: DICE, args: [6], fieldname: 'field1' }];
  expect(G4._randomOps).toMatchObject(expectedOps);
});

test('predefined dice values', () => {
  let ctx = { random: { seed: 0 } };
  let G = {};

  const rfns = [4, 6, 8, 10, 12, 20].map(v => {
    return { fn: Random[`D${v}`], highest: v };
  });
  rfns.forEach(pair => {
    // random event
    const G2 = pair.fn(G, 'field1');

    let { G: G3, ctx: ctx2 } = RunRandom(G2, ctx);
    expect(ctx).not.toMatchObject(ctx2);
    checkrandom(G3.field1, 1, pair.highest);
  });
});

test('Random.Die', () => {
  let ctx = { random: { seed: 0 } };
  let G = {};

  // random event - die with arbitrary spot count
  const G2 = Random.Die(G, 'field1', 123);
  let { G: G3, ctx: ctx2 } = RunRandom(G2, ctx);
  expect(ctx).not.toMatchObject(ctx2);
  checkrandom(G3.field1, 74, 74);
  // same with a deep field
  const G4 = Random.Die({ a: { b: {} } }, 'a.b.c', 123);
  let { G: G5, ctx: ctx3 } = RunRandom(G4, ctx);
  expect(ctx).not.toMatchObject(ctx3);
  checkrandom(G5.a.b.c, 74, 74);
});

test('Random.Number', () => {
  let ctx = { random: { seed: 0 } };
  let G = {};

  // random event - random number
  const G2 = Random.Number(G, 'field1');
  let { G: G3, ctx: ctx2 } = RunRandom(G2, ctx);
  expect(ctx).not.toMatchObject(ctx2);
  checkrandom(G3.field1, 0, 1);
  // same with a deep field
  const G4 = Random.Number({ a: { b: {} } }, 'a.b.c', 123);
  let { G: G5, ctx: ctx3 } = RunRandom(G4, ctx);
  expect(ctx).not.toMatchObject(ctx3);
  checkrandom(G5.a.b.c, 0, 1);
});

test('Random.Shuffle', () => {
  const initialTiles = ['A', 'B', 'C', 'D', 'E'];
  let ctx = { random: { seed: 'some_predetermined_seed' } };
  let G = { tiles: initialTiles };

  // random event - shuffle tiles order
  let G2 = Random.Shuffle(G, 'tiles');

  let { G: G3, ctx: ctx2 } = RunRandom(G2, ctx);
  expect(G3.tiles.length).toEqual(initialTiles.length);
  expect(G3.tiles).toEqual(expect.arrayContaining(initialTiles));
  expect(G3.tiles.sort()).toEqual(initialTiles);
  expect(ctx).not.toMatchObject(ctx2);
});

test('Random.D6 works on a nested attribute', () => {
  let ctx = { random: { seed: 'some_predetermined_seed' } };
  let G = {
    suspense: 9000,
    players: {
      0: {
        points: 100,
      },
      1: {
        points: 200,
      },
    },
  };

  let G2 = G;
  G2 = Random.D6(G2, 'players.0.attackerDie');
  G2 = Random.D6(G2, 'players.1.defenderDie');
  let { G: G3 } = RunRandom(G2, ctx);

  expect(G3.players['0'].attackerDie).toBe(2);
  expect(G3.players['1'].defenderDie).toBe(4);
  expect(G3).toMatchObject(G);
});

test('Random.Shuffle works on a nested attribute', () => {
  let ctx = { random: { seed: 'some_predetermined_seed' } };
  const tiles = ['A', 'B', 'C', 'D', 'E'];
  let G = {
    players: {
      0: tiles,
      1: tiles,
    },
  };

  let G2 = Random.Shuffle(G, 'players.1');
  let { G: G3 } = RunRandom(G2, ctx);
  expect(G.players['0']).toMatchObject(tiles);
  expect(G.players['1']).toMatchObject(tiles); // this was the tricky one :(
  expect(G3.players['0']).toMatchObject(tiles);
  expect(G3.players['1']).not.toMatchObject(tiles);
});

test('Random.D6 only mutates necessary objects', () => {
  let ctx = { random: { seed: 'some_predetermined_seed' } };
  let G = {
    universe: 42,
    players: {
      0: {
        hp: 20,
        inventory: ['sword', 'shield'],
      },
      1: {
        hp: 14,
        inventory: ['staff', 'bracers'],
      },
    },
  };

  let G2 = Random.D20(G, 'players.0.savingThrow');
  let { G: G3 } = RunRandom(G2, ctx);
  expect(G3.universe).toBe(42);
  expect(G3.players['0'].hp).toBe(20);
  expect(G3.players['0'].inventory).toBe(G.players['0'].inventory);
  expect(G3.players['1']).toBe(G.players['1']);
  expect(G.players['0'].savingThrow).not.toBeDefined();
  expect(G3.players['0'].savingThrow).toBeDefined();
});
