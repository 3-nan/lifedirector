import { defineConfig } from 'vitest/config';

// Start mit `npx vitest run` (bzw. `npx vitest` im Watch-Modus). Bewusst kein
// npm-Script: Scripts in package.json zählen zum Expo-Fingerprint, ein neues
// würde die runtimeVersion ändern und EAS Updates bis zum nächsten Build sperren.

// Feste Zeitzone, damit Tests mit lokaler Zeit (isoWeekKey, monthKey) überall
// gleich laufen. Die Worker übernehmen sie aus dieser Umgebung.
process.env.TZ = 'Europe/Berlin';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
  },
});
