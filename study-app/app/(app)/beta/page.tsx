import { studentAccess } from "@/lib/server/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
export default async function BetaPage() {
  const access = await studentAccess();
  if (
    !access ||
    !(process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .includes(access.user.id)
  )
    notFound();
  const { data, error } =
    await createSupabaseAdminClient().rpc("study_beta_metrics");
  if (error)
    return <p className="p-6">Metrics unavailable. Check migration 8.</p>;
  return (
    <section className="space-y-5 p-6">
      <h1 className="text-2xl font-semibold">Beta activity</h1>
      <p>
        Opt-in accounts only. Sessions are counted once per account per hour.
        Retention is the share of last week’s active accounts returning this
        week; small cohorts are noisy.
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        {Object.entries(data ?? {}).map(([key, value]) => (
          <div key={key} className="rounded-xl border p-4">
            <dt>{key.replaceAll("_", " ")}</dt>
            <dd className="text-2xl">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
