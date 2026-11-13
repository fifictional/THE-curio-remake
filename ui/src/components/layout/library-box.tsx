'use client';

import { Button } from '@/components/ui/button';
import { Space } from '@/lib/types';
import { FolderPlus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LibraryBoxProps {
  onCreateSpace?: () => void;
  spaces: Space[];
}

export function LibraryBox({ onCreateSpace, spaces }: LibraryBoxProps) {
  const pathname = usePathname();

  return (
    <div className="bg-gray-50 rounded-xl p-6 min-h-60">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-900">Library</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onCreateSpace}
          disabled={true}
          className="flex items-center gap-2 bg-white"
        >
          <FolderPlus className="w-4 h-4" />
          Create Space
        </Button>
      </div>
      {spaces?.length === 0 && (
        <p className="text-sm text-gray-600">
          Spaces will be available soon.
        </p>
      )}
      {spaces?.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {spaces.map((space) => (
            <Link 
              key={space.spaceUuid} 
              href={`/spaces/${space.spaceUuid}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-white
                ${pathname === `/spaces/${space.spaceUuid}` ? 'bg-white' : ''}`}
            >
              <span className="text-sm text-gray-700">{space.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 