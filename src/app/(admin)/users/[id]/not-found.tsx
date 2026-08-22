export default function UserNotFound() {
  return (
    <div className="rounded-[28px] bg-card px-8 py-16 text-center">
      <h1 className="text-2xl font-semibold text-white">User not found</h1>
      <p className="mt-2 text-sm text-zinc-500">
        This profile is not in the current user list.
      </p>
    </div>
  );
}
