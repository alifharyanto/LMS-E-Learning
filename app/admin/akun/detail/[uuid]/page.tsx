import AccountDetailPage from "@/app/admin/accounts-detail-page";

export default async function AccountDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ uuid }, query] = await Promise.all([params, searchParams]);
  return <AccountDetailPage key={`${uuid}-${query.edit === "account"}`} uuid={uuid} initiallyEditing={query.edit === "account"} />;
}
