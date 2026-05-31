import { redirect } from "next/navigation";

// Wishlist is the collection filtered to WANTED items.
export default function WishlistPage() {
  redirect("/collection?status=WANTED");
}
