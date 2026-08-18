import { redirect } from "next/navigation";

/**
 * Products are no longer browsed on their own. Every product is attached to a
 * campaign, so the deal is the unit of discovery. Kept as a redirect so old
 * links and bookmarks still land somewhere sensible.
 */
export default function StoreIndex() {
  redirect("/");
}
