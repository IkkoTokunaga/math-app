function setupBrowserGlobals() {
  const memory = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
    },
  };

  Object.assign(globalThis, { window: globalThis, localStorage });
}

async function main() {
  setupBrowserGlobals();

  const { getUnlockedLevel } = await import("../lib/levels");
  const { getPendingUnlockCelebration } = await import("../lib/unlock-celebration-core");
  const {
    markGuestUnlockCelebrated,
    setGuestCelebratedLevels,
  } = await import("../lib/guest-unlock-celebration");
  type Level = import("../lib/questions").Level;

  const TARGET = Number(process.env.TEST_UNLOCK_LEVEL ?? 7);

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean) {
    if (condition) {
      passed += 1;
      console.log(`✓ ${name}`);
    } else {
      failed += 1;
      console.error(`✗ ${name}`);
    }
  }

  function setCelebrated(upToExclusive: number) {
    const celebrated: number[] = [];
    for (let level = 2; level < upToExclusive; level += 1) {
      celebrated.push(level);
    }
    setGuestCelebratedLevels(celebrated);
  }

  for (let targetLevel = 2; targetLevel <= TARGET; targetLevel += 1) {
    localStorage.removeItem("math-app-unlock-celebrations");

    const unlocked = getUnlockedLevel(
      Array.from({ length: targetLevel - 1 }, (_, index) => ({
        level: index + 1,
        stars: 5,
        totalScore: 9999,
      })),
    );
    assert(`Lv${targetLevel - 1} クリアで Lv${targetLevel} 解放`, unlocked === targetLevel);

    setCelebrated(targetLevel);
    const { readGuestCelebratedLevels } = await import("../lib/guest-unlock-celebration");
    const pending = getPendingUnlockCelebration(
      readGuestCelebratedLevels(),
      targetLevel as Level,
    );
    assert(`Lv${targetLevel} 初回演出 pending`, pending === targetLevel);

    markGuestUnlockCelebrated(targetLevel as Level);
    const after = getPendingUnlockCelebration(
      readGuestCelebratedLevels(),
      targetLevel as Level,
    );
    assert(`Lv${targetLevel} 演出済みなら pending なし`, after === null);
  }

  if (failed > 0) {
    console.error(`\n${failed} failed, ${passed} passed`);
    process.exit(1);
  }

  console.log(`\nAll unlock logic tests passed (Lv2–Lv${TARGET}). ${passed} assertions.`);
}

main();
