import PgBoss from "pg-boss";
import { prisma } from "../src/lib/db";
import { syncAgentsFromGateway } from "../src/lib/openclaw/agents";
import { buildCronJobSpec, createOrUpdateCronJob } from "../src/lib/openclaw/cron-sync";
import { reconcileStuckRuns } from "../src/lib/openclaw/task-poller";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required for worker");
  process.exit(1);
}

const boss = new PgBoss(DATABASE_URL);

async function syncAllCronJobs() {
  const tasks = await prisma.task.findMany();
  for (const task of tasks) {
    const result = await createOrUpdateCronJob(buildCronJobSpec(task), task.openclawCronJobId);
    if (result.jobId !== task.openclawCronJobId) {
      await prisma.task.update({
        where: { id: task.id },
        data: { openclawCronJobId: result.jobId },
      });
    }
  }
  console.log(`[worker] synced ${tasks.length} cron jobs`);
}

async function main() {
  await boss.start();

  await boss.createQueue("sync-agents");
  await boss.createQueue("sync-cron-jobs");
  await boss.createQueue("reconcile-runs");

  await boss.schedule("sync-agents", "*/15 * * * *");
  await boss.schedule("sync-cron-jobs", "*/5 * * * *");
  await boss.schedule("reconcile-runs", "*/2 * * * *");

  await boss.work("sync-agents", async () => {
    await syncAgentsFromGateway();
    console.log("[worker] agents synced");
  });

  await boss.work("sync-cron-jobs", async () => {
    await syncAllCronJobs();
  });

  await boss.work("reconcile-runs", async () => {
    const count = await reconcileStuckRuns();
    if (count > 0) console.log(`[worker] reconciled ${count} stuck runs`);
  });

  // Initial sync on startup
  await syncAgentsFromGateway();
  await syncAllCronJobs();

  console.log("[worker] started");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
