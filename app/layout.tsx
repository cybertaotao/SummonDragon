import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '召唤神龙',
  description: '从小蝌蚪开始吞噬进化，最终召唤神龙。',
  openGraph: {
    title: '召唤神龙',
    description: '从小蝌蚪开始吞噬进化，最终召唤神龙。',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og.png', width: 1736, height: 909, alt: '召唤神龙' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#19b9c4',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
