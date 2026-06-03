import { redirect } from 'next/navigation';

// Redirect to the public wishlist page
export default function WishlistRedirect() {
  redirect('/wishlist');
}
