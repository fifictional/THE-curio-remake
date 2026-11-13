import { Loader2 } from "lucide-react";

export type LoadingType = 'content' | 'pdf' | 'image' | 'video';

interface LoadingSpinnerWithTypeProps {
	/** Selects the label to display under the spinner */
	type: LoadingType;
	/** Optional additional classes for the container */
	className?: string;
}

export function LoadingSpinnerWithType({ type, className }: LoadingSpinnerWithTypeProps) {
	let label;
	switch (type) {
		case 'pdf':
			label = 'Loading PDF...';
			break;
		case 'image':
			label = 'Loading Image...';
			break;
		case 'video':
			label = 'Loading Video...';
			break;
		default:
			label = 'Loading content...';
	}

	return (
		<div className={`flex items-center justify-center py-8 ${className || ''}`}>
			<Loader2 className="w-6 h-6 animate-spin text-gray-400" />
			<span className="ml-2 text-sm text-gray-500">{label}</span>
		</div>
	);
}



