"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KnowledgeBasePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new topics sub-page
    router.replace("/admin/knowledge-base/subjects");
  }, [router]);

  return null;
}
