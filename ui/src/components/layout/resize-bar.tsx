import { cn } from "@/lib/utils";

export type ResizeEvents = {
  onDragStart: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export const ResizeBar = ({ onDragStart }: ResizeEvents) => {
  return <div className={cn('absolute top-0 left-0 w-[2px] -translate-x-[1.5px] h-full hover:bg-gray-300 cursor-col-resize transition-all duration-300')}>
    <div className="absolute w-1 -translate-x-[1px] h-5 top-1/2 -translate-y-1/2 bg-gray-300 rounded-full shadow-md" onMouseDown={onDragStart} />
  </div>;
};