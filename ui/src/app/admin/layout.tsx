'use client';

import { useSessionContext } from "@/providers/session-provider";
import { NoPermission } from "@/components/layout/no-permission";
import { useCommonContext } from "@/providers/common-provider";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { groups } = useSessionContext();
  const { closeSidebar, openSidebar } = useCommonContext();
  
  useEffect(() => {
    closeSidebar();
    return () => {
      openSidebar();
    }
  }, []);

  return <div className="flex flex-col min-h-screen">
    <div className="flex-1">
      {groups.includes('admin') ? children : <NoPermission />}
    </div>
  </div>
}