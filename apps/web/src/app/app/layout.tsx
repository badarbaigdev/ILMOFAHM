import { AppShell } from "@/components/shell/AppShell";

export default function AppWorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
