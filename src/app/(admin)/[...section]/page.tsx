import { navItems } from "@/data/nav";

const titles: Record<string, string> = Object.fromEntries(
  navItems.map((item) => [item.href, item.label]),
);

export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;
  const href = `/${section.join("/")}`;
  const title = titles[href] ?? section.at(-1)?.replace(/-/g, " ") ?? "Page";

  return (
    <div className="rounded-[28px] bg-card px-8 py-16 text-center">
      <h1 className="text-2xl font-semibold capitalize text-white">{title}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        This section is not wired to the Go API yet.
      </p>
    </div>
  );
}
