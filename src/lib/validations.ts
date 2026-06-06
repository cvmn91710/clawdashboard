import { ScheduleType } from "@prisma/client";
import { z } from "zod";

export const createTaskSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  prompt: z.string().min(1),
  agentId: z.string().min(1).optional(),
  workspacePath: z.string().optional().nullable(),
  repeatable: z.boolean().default(true),
  scheduleEnabled: z.boolean().default(false),
  scheduleType: z.nativeEnum(ScheduleType).optional().nullable(),
  scheduleExpr: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  thinking: z.string().optional().nullable(),
  timeoutSeconds: z.number().int().positive().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const loginSchema = z.object({
  password: z.string().min(1),
});
