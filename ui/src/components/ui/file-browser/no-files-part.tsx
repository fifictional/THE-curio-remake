import { FileIcon } from "lucide-react"

export const NoFilesPart = ({ colSpan }: { colSpan: number }) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-4">
        <div className="text-center w-full">
          <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No files uploaded</h3>
          <p className="mt-1 text-sm text-gray-500">Upload your first file to get started</p>
        </div>
      </td>
    </tr>
  )
}