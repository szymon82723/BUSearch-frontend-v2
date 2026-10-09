import { mkdir, writeFile } from 'node:fs/promises';

const profiles = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'android-small', width: 360, height: 640 },
  { name: 'phone-375', width: 375, height: 667 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'android-412', width: 412, height: 915 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'short-viewport', width: 390, height: 480 },
  { name: 'phone-landscape', width: 844, height: 390 },
  { name: 'large-landscape', width: 915, height: 412 },
  { name: 'tablet', width: 768, height: 1024 },
];
const reportDir = process.env.PLANNER_REPORT_DIR || '/tmp/busearch-planner-mobile-audit';
await mkdir(reportDir, { recursive: true });
const report: { round: number; passed: number; exitCode: number }[] = [];
// Two independent browser processes at a time, to keep the server responsive.
async function round(number: number) {
  const timezone = ['Europe/Warsaw', 'America/Los_Angeles', 'Asia/Tokyo'][number - 1];
  const process = Bun.spawn(['bun', 'tests/planner.ts'], {
    env: { ...Bun.env, PLANNER_PROFILES: JSON.stringify(profiles.map(profile => ({ ...profile, mobile: true, timezone }))), PLANNER_REPORT_PREFIX: `mobile-round-${number}` },
    stdout: 'pipe', stderr: 'pipe',
  });
  const stdout = new Response(process.stdout).text();
  const stderr = new Response(process.stderr).text();
  const exitCode = await process.exited;
  const output = await stdout;
  const errors = await stderr;
  await writeFile(`${reportDir}/round-${number}.log`, output + errors);
  const passed = (output.match(/^PASS /gm) || []).length;
  report.push({ round: number, passed, exitCode });
  console.log(output.trim());
  if (errors) console.error(errors.trim());
  console.log(`ROUND ${number}: ${passed}/10 passed, exit ${exitCode}`);
}
await Promise.all([round(1), round(2)]);
await round(3);
report.sort((a, b) => a.round - b.round);
const passed = report.reduce((count, round) => count + round.passed, 0);
await writeFile(`${reportDir}/summary.json`, JSON.stringify({ completedAt: new Date().toISOString(), engine: 'Chromium with mobile/touch emulation', profiles, report, passed, total: 30 }, null, 2));
console.log(`MOBILE AUDIT: ${passed}/30 complete workflows passed. Reports: ${reportDir}`);
if (passed !== 30 || report.some(round => round.exitCode !== 0)) process.exit(1);
