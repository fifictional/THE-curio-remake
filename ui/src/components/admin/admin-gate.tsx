import { useSessionContext } from "@/providers/session-provider";
import { NoPermission } from "../layout/no-permission";

export interface AdminGateProps {
  children: React.ReactNode;
  ghost?: boolean;
}

export const AdminGate = ({ children, ghost = false }: AdminGateProps) => {
  const { groups } = useSessionContext();

  return <>{groups.includes('admin') ? children : ghost ? null : <NoPermission />}</>;
};