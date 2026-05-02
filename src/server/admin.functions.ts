import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertCallerIsAdmin,
  adminCreateUser,
  adminSetRole,
  adminResetPassword,
  adminListUsers,
  adminInviteStaff,
} from "./admin.server";

const staffRoleEnum = z.enum(["lecturer", "admin"]);

const roleEnum = z.enum(["student", "lecturer", "admin", "parent"]);

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(128),
        fullName: z.string().trim().min(1).max(120),
        role: roleEnum,
        departmentId: z.string().uuid().nullable().optional(),
        matricNumber: z.string().trim().max(40).nullable().optional(),
        phone: z.string().trim().max(20).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    return adminCreateUser(data);
  });

export const changeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), role: roleEnum }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    return adminSetRole(data.userId, data.role);
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), newPassword: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    return adminResetPassword(data.userId, data.newPassword);
  });

export const listAuthUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCallerIsAdmin(context.userId);
    return { users: await adminListUsers() };
  });
