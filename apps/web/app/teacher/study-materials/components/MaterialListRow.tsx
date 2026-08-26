import { FileText, Video, Link as LinkIcon, Presentation, MoreHorizontal, Eye, Edit, Copy, Trash2, Send, FileWarning, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { StatusPill } from '@/components/teacher/portal';

interface MaterialListRowProps {
  material: any;
  onPreview: (material: any) => void;
  onSubmit: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}

export function MaterialListRow({ material, onPreview, onSubmit, onDuplicate, onDelete }: MaterialListRowProps) {

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5 text-[#0B2545]" />;
      case 'external_link': return <LinkIcon className="h-5 w-5 text-[#0B2545]" />;
      case 'pdf': return <FileText className="h-5 w-5 text-[#0B2545]" />;
      case 'presentation': return <Presentation className="h-5 w-5 text-[#0B2545]" />;
      default: return <FileText className="h-5 w-5 text-[#0B2545]" />;
    }
  };

  return (
    <div className="group flex items-center justify-between rounded-xl border border-[#E7EBF3] bg-white p-4 transition-all duration-200 hover:border-[#D9E1EA] hover:shadow-md">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="shrink-0 rounded-lg border border-[#E3E9F2] bg-[#EEF2F8] p-3">
          {getIcon(material.material_type)}
        </div>

        <div className="min-w-0 flex-1 pr-4">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-bold text-[#101828]">
              {material.title}
            </h3>
            {material.status === 'changes_requested' && (
              <FileWarning className="h-4 w-4 shrink-0 text-[#B23A3A]" />
            )}
          </div>
          <div className="truncate text-sm text-[#667085]">
            {material.exam_name} • {material.subject_name}
            {material.topic_name ? ` • ${material.topic_name}` : ''}
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-6 pr-6 md:flex">
        <div className="w-32">
          <div className="mb-1 text-xs text-[#8A98AE]">Type</div>
          <div className="truncate text-sm font-medium capitalize text-[#344054]">
            {material.material_type.replace('_', ' ')}
          </div>
        </div>

        <div className="w-36">
          <div className="mb-1 text-xs text-[#8A98AE]">Status</div>
          <StatusPill status={material.status} />
        </div>

        <div className="w-28">
          <div className="mb-1 text-xs text-[#8A98AE]">Updated</div>
          <div className="flex items-center gap-1.5 text-sm text-[#475467]">
            <Clock className="h-3.5 w-3.5 text-[#8A98AE]" />
            {new Date(material.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPreview(material)}
          className="hidden text-[#0B2545] hover:bg-[#EEF2F8] hover:text-[#0B2545] sm:flex"
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#667085] hover:text-[#344054]">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/teacher/study-materials/${material.id}/edit`} className="flex cursor-pointer items-center">
                <Edit className="mr-2 h-4 w-4 text-[#8A98AE]" />
                Edit Metadata
              </Link>
            </DropdownMenuItem>

            {(material.status === 'draft' || material.status === 'changes_requested') && (
              <DropdownMenuItem onClick={() => onSubmit(material.id)} className="flex cursor-pointer items-center font-medium text-[#0B2545]">
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => onDuplicate(material.id)} className="flex cursor-pointer items-center">
              <Copy className="mr-2 h-4 w-4 text-[#8A98AE]" />
              Duplicate
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onDelete(material.id)} className="flex cursor-pointer items-center text-[#B23A3A] focus:bg-[#FBEAEA] focus:text-[#B23A3A]">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
