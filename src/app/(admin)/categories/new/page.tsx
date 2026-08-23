import { redirect } from "next/navigation";

export default function NewCategoryRedirect() {
  redirect("/categories");
}
