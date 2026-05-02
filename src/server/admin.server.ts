// Server-only admin helpers. Service-role operations.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function admin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function assertCallerIsAdmin(callerId: string) {
  const sb = admin();
  const { data } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export async function adminCreateUser(opts: {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "lecturer" | "admin" | "parent";
  departmentId?: string | null;
  matricNumber?: string | null;
  phone?: string | null;
}) {
  const sb = admin();
  const { data, error } = await sb.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: {
      full_name: opts.fullName,
      role: opts.role,
      department_id: opts.departmentId ?? "",
      matric_number: opts.matricNumber ?? "",
      phone: opts.phone ?? "",
    },
  });
  if (error) throw new Response(error.message, { status: 400 });
  return { id: data.user?.id ?? null };
}

export async function adminSetRole(userId: string, role: "student" | "lecturer" | "admin" | "parent") {
  const sb = admin();
  // Replace existing roles with the new one
  await sb.from("user_roles").delete().eq("user_id", userId);
  const { error } = await sb.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Response(error.message, { status: 400 });
  return { ok: true };
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const sb = admin();
  const { error } = await sb.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Response(error.message, { status: 400 });
  return { ok: true };
}

export async function adminInviteStaff(opts: {
  email: string;
  fullName: string;
  role: "lecturer" | "admin";
  departmentId?: string | null;
  phone?: string | null;
  redirectTo?: string | null;
}) {
  const sb = admin();
  const { data, error } = await sb.auth.admin.inviteUserByEmail(opts.email, {
    data: {
      full_name: opts.fullName,
      role: opts.role,
      department_id: opts.departmentId ?? "",
      phone: opts.phone ?? "",
    },
    redirectTo: opts.redirectTo ?? undefined,
  });
  if (error) throw new Response(error.message, { status: 400 });
  return { id: data.user?.id ?? null };
}

export async function adminListUsers() {
  const sb = admin();
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Response(error.message, { status: 400 });
  return data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
  }));
}
