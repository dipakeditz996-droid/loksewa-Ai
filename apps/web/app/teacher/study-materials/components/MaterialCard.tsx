import { FileText, Video, Link as LinkIcon, Presentation, MoreVertical, Eye, Edit, Copy, Trash2, Send, Clock, FileWarning } from 'lucide-react';
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

interface MaterialCardProps {
  material: any;
  onPreview: (material: any) => void;
  onSubmit: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}

export function MaterialCard({ material, onPreview, onSubmit, onDuplicate, onDelete }: MaterialCardProps) {

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-8 h-8 text-primary" />;
      case 'external_link': return <LinkIcon className="w-8 h-8 text-primary" />;
      case 'pdf': return <FileText className="w-8 h-8 text-primary" />;
      case 'presentation': return <Presentation className="w-8 h-8 text-primary" />;
      default: return <FileText className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_1px_rgba(16,24,40,0.02)] transition-all duration-300 hover:shadow-lg">
      {/* Visual Header indicating type */}
      <div className="relative flex h-28 items-center justify-center border-b border-border bg-primary/10">
        <div className="rounded-xl border border-[#E3E9F2] bg-card p-3 shadow-sm transition-transform duration-300 group-hover:scale-110">
          {getIcon(material.material_type)}
        </div>
        <div className="absolute right-3 top-3">
          <StatusPill status={material.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1 line-clamp-1 font-bold text-foreground">
          {material.title}
        </h3>

        {/* Context metadata */}
        <div className="mb-4 line-clamp-1 text-xs font-medium text-muted-foreground">
          {material.exam_name} • {material.subject_name}
          {material.topic_name ? ` • ${material.topic_name}` : ''}
        </div>

        {material.status === 'changes_requested' && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F0DFAF] bg-[#946B00]/10 p-3">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-[#946B00] dark:text-[#F2C94C]" />
            <div>
              <p className="mb-0.5 text-xs font-semibold text-[#5C4300] dark:text-[#F2C94C]">Admin Feedback:</p>
              <p className="line-clamp-2 text-xs text-[#8A6E1F] dark:text-[#F2C94C]/80">{material.review_note || 'Please update and resubmit.'}</p>
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(material.updated_at).toLocaleDateString()}
          </span>
          <span className="rounded-md bg-[#EEF1F6] px-2 py-0.5 font-medium capitalize text-muted-foreground">
            {material.material_type.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border bg-muted px-5 py-3">
        <Button
          size="sm"
          onClick={() => onPreview(material)}
          className="mr-2 h-8 flex-1 rounded-lg bg-[#0B2545] text-xs font-medium text-white shadow-sm hover:bg-[#163E6C]"
        >
          <Eye className="mr-1.5 h-3 w-3" />
          Preview
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-lg border-border text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/teacher/study-materials/${material.id}/edit`} className="flex cursor-pointer items-center">
                <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                Edit Metadata
              </Link>
            </DropdownMenuItem>

            {(material.status === 'draft' || material.status === 'changes_requested') && (
              <DropdownMenuItem onClick={() => onSubmit(material.id)} className="flex cursor-pointer items-center font-medium text-primary">
                <Send className="mr-2 h-4 w-4" />
                Submit for Review
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => onDuplicate(material.id)} className="flex cursor-pointer items-center">
              <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
              Duplicate
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onDelete(material.id)} className="flex cursor-pointer items-center text-destructive focus:bg-destructive/10 focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
