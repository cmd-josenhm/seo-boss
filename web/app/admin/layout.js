/** Le dashboard est utile aux humains, pas aux moteurs : noindex explicite. */
export const metadata = {
  title: 'Contrôle du site',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function AdminLayout({ children }) {
  return children;
}
