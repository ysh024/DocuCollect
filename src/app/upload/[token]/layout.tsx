import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Documents — Client Portal",
  description: "Secure, encrypted client document upload portal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
