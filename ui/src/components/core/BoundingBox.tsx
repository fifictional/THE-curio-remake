import { cn } from "@/lib/utils";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

// Add a utility function to handle different bbox formats
export function normalizeBbox(bbox: number[] | BoundingBox): BoundingBox {
  if (Array.isArray(bbox)) {
    if (bbox.length === 4) {
      // Assume [x1, y1, x2, y2] format from Datalab
      const [x1, y1, x2, y2] = bbox;
      return {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
        text: ''
      };
    }
  }
  
  // Assume it's already in the correct format
  return bbox as BoundingBox;
}

type Props = {
  bbox: BoundingBox;
  canvasWidth: number;
  canvasHeight: number;
  onSelect?: (bbox: BoundingBox) => void;
}

export function BoundingBox({ bbox, canvasWidth, canvasHeight, onSelect }: Props) {
  const { x, y, width, height } = bbox;

  const scaledStyles = {
    position: 'absolute' as const,
    left: `${x * canvasWidth}px`,
    top: `${y * canvasHeight}px`,
    width: `${width * canvasWidth}px`,
    height: `${height * canvasHeight}px`,
  };

  return (
    <div
      className={cn(
        "text-transparent bounding-box overflow-hidden",
        "hover:border-2 hover:border-primary",
        "transition-all duration-50",
        "cursor-pointer z-50"
      )}
      style={scaledStyles}
      onClick={() => {
        onSelect?.(bbox);
      }}
    >
      <p className="select-none hidden">{bbox.text}</p>
    </div>
  );
}