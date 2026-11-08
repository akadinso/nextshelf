import Link from "next/link";
import { getTopCategories } from "@/lib/data";
import { SITE } from "@/lib/site";

export default async function SiteFooter() {
  const categories = await getTopCategories();

  return (
    <footer className="mt-20 border-t bg-muted/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-lg font-bold">{SITE.name}</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {SITE.description}
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Shop</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/products" className="hover:text-foreground">
                All products
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="hover:text-foreground"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Account</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/account" className="hover:text-foreground">
                My account
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="hover:text-foreground">
                Order history
              </Link>
            </li>
            <li>
              <Link href="/account/addresses" className="hover:text-foreground">
                Saved addresses
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Help</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/#faq" className="hover:text-foreground">
                FAQ
              </Link>
            </li>
            {SITE.contactEmail && (
              <li>
                <a
                  href={`mailto:${SITE.contactEmail}`}
                  className="hover:text-foreground"
                >
                  {SITE.contactEmail}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE.name}. Payments secured by PayFast.
      </div>
    </footer>
  );
}
