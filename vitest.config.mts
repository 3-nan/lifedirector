import { defineConfig } from 'vitest/config';

// Feste Zeitzone, damit Tests mit lokaler Zeit (isoWeekKey, monthKey) überall
// gleich laufen. Die Worker übernehmen sie aus dieser Umgebung.
process.env.TZ = 'Europe/Berlin';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
  },
});
