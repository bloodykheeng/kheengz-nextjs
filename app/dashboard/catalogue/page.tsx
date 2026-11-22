import { redirect } from "next/navigation";

/** The breadcrumb's "Catalogue" step: its first page. */
export default function CataloguePage() {
  redirect("/dashboard/catalogue/categories");
}
