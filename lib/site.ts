// Edit the text of your storefront here. Changing `name` renames the shop everywhere
// (header, footer, browser tab and the item name shown on the PayFast payment page).
export const SITE = {
  name: 'ClearCurrent',
  description: 'Water filters, dispensers and cooling for South African homes.',
  contactEmail: '', // shown in the footer when set, e.g. 'hello@clearcurrent.co.za'

  // Highlighted link in the category bar, and readable names for product tags
  navHighlight: { label: 'Load-shedding ready', href: '/products?tag=load-shedding' },
  tags: { 'load-shedding': 'Load-shedding ready' } as Record<string, string>,

  topLinks: [
    { label: 'Track order', href: '/account/orders' },
    { label: 'Help Center', href: '/#faq' },
  ],

  hero: {
    title: 'Clean Water. Cool Air. Delivered to Your Door.',
    subtitle:
      'Water filters, dispensers and cooling for South African homes, including options that keep working without mains power.',
  },

  // Update the delivery and returns answers to match your real policies, then add them here.
  faqs: [
    {
      q: 'Which products work during load shedding?',
      a: 'Gravity filters, tap and shower filters, jugs, bottles and hand pumps need no electricity at all. Our rechargeable fans and USB products run from a built-in battery or a power bank. Each product page says how it is powered.',
    },
    {
      q: 'How do I pay?',
      a: 'Checkout is handled securely by PayFast. You can pay with the options PayFast offers on its payment page, including card and instant EFT.',
    },
    {
      q: 'Do I need an account to order?',
      a: 'Yes. An account lets you track your orders, save delivery addresses and keep a favourites list.',
    },
    {
      q: 'How can I track my order?',
      a: 'Open Order history in your account to see the latest status of every order, from paid through to delivered.',
    },
    {
      q: 'Who can leave a review?',
      a: 'Only customers who have bought a product can review it, so every review comes from a real buyer.',
    },
  ],
}
