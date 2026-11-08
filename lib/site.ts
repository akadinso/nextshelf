// Edit the text of your storefront here.
export const SITE = {
  name: 'NextShelf',
  contactEmail: '', // shown in the footer when set, e.g. 'hello@nextshelf.co.za'

  topLinks: [
    { label: 'Track order', href: '/account/orders' },
    { label: 'Help Center', href: '/#faq' },
  ],

  hero: {
    title: 'The Easiest Way to Shop Online',
    subtitle: 'Curated picks, smart filters and a secure checkout, all in one seamless experience.',
  },

  // Update the shipping and returns answers to match your real policies.
  faqs: [
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
