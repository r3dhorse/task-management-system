#!/usr/bin/env tsx

import { prisma } from "../src/lib/prisma";
import { TaskStatus } from "../src/features/tasks/types";
import { updateOverdueTasks } from "../src/lib/cron-jobs";

async function testOverdueCron() {
  console.log("🔍 Testing Overdue Task Cron Job");
  console.log("================================\n");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("📅 Current date (midnight):", today.toISOString());
    console.log("📍 Timezone: Asia/Manila\n");

    console.log("1️⃣  Checking for overdue tasks...");
    const overdueTasks = await prisma.task.findMany({
      where: {
        AND: [
          {
            status: {
              in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW]
            }
          },
          {
            dueDate: {
              lt: today
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        status: true,
        dueDate: true,
        service: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`   Found ${overdueTasks.length} overdue task(s)\n`);

    if (overdueTasks.length > 0) {
      console.log("📋 Overdue Tasks:");
      overdueTasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.id}`);
        console.log(`      Name: ${task.name}`);
        console.log(`      Status: ${task.status}`);
        console.log(`      Due Date: ${task.dueDate?.toLocaleDateString()}`);
        console.log(`      Service: ${task.service?.name || 'N/A'}`);
        console.log(`      Assignee: ${task.assignee?.user?.name || 'Unassigned'}`);
        console.log("");
      });

      console.log("2️⃣  Running the cron job to update overdue tasks...\n");
      const result = await updateOverdueTasks();

      console.log("✅ Cron Job Results:");
      console.log(`   Total tasks processed: ${result.total}`);
      console.log(`   Successfully updated: ${result.success}`);
      console.log(`   Failed to update: ${result.failed}`);

      if (result.success > 0) {
        console.log("\n3️⃣  Verifying status changes...");
        const updatedTasks = await prisma.task.findMany({
          where: {
            id: {
              in: overdueTasks.map(t => t.id)
            }
          },
          select: {
            id: true,
            status: true
          }
        });

        console.log("   Updated task statuses:");
        updatedTasks.forEach(task => {
          const original = overdueTasks.find(t => t.id === task.id);
          console.log(`   - ${task.id}: ${original?.status} → ${task.status}`);
        });

        console.log("\n4️⃣  Checking audit trail...");
        const auditEntries = await prisma.taskHistory.findMany({
          where: {
            taskId: {
              in: overdueTasks.map(t => t.id)
            },
            action: "STATUS_CHANGED"
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        });

        console.log(`   Found ${auditEntries.length} audit trail entries`);
        if (auditEntries.length > 0) {
          console.log("   Sample audit entry:");
          const entry = auditEntries[0];
          console.log(`   - Task: ${entry.taskId}`);
          console.log(`   - Action: ${entry.action}`);
          console.log(`   - Old Value: ${entry.oldValue}`);
          console.log(`   - New Value: ${entry.newValue}`);
          console.log(`   - Details: ${entry.details}`);
        }
      }
    } else {
      console.log("✅ No overdue tasks found. All tasks are up to date!");
    }

    console.log("\n✨ Test completed successfully!");
    console.log("\n📝 Note: In production, this job will run automatically at midnight Philippine time.");
    console.log("   Super admins can also trigger it manually via POST /api/cron/overdue-tasks");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testOverdueCron().catch(console.error);