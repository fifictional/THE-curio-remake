export interface PageFlowProps {
    variant?: string;
    onFinish: (params?: Record<string, string> | undefined) => void; 
    onSkip?: ({ skipAll }: { skipAll: boolean }) => void;
  }
    