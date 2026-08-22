import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GamesPerformance } from "@/components/users/games-performance";
import { UserProfileCard } from "@/components/users/user-profile-card";
import { UserStatCards } from "@/components/users/user-stat-cards";
import { getUserById } from "@/data/users";

type UserPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = getUserById(id);
  return {
    title: user ? `${user.name} | Cricket Fan` : "User | Cricket Fan",
  };
}

export default async function UserDetailPage({ params }: UserPageProps) {
  const { id } = await params;
  const user = getUserById(id);

  if (!user) {
    notFound();
  }

  return (
    <div>
      <UserProfileCard user={user} />
      <UserStatCards user={user} />
      <GamesPerformance user={user} />
    </div>
  );
}
