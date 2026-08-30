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
      case 'video': return <Video className="h-5 w-5 text-primary" />;
      case 'external_link': return <LinkIcon className="h-5 w-5 text-primary" />;
      case 'pdf': return <FileText className="h-5 w-5 text-primary" />;
      case 'presentation': return <Presentation className="h-5 w-5 text-primary" />;
      default: return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-md">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="shrink-0 rounded-lg border border-[#E3E9F2] bg-primary/10 p-3">
          {getIcon(material.material_type)}
        </div>

        <div className="min-w-0 flex-1 pr-4">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-bold text-foreground">
              {material.title}
            </h3>
            {material.status === 'changes_requested' && (
              <FileWarning className="h-4 w-4 shrink-0 text-destructive" />
            )}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {material.exam_name} • {material.subject_name}
            {material.topic_name ? ` • ${material.topic_name}` : ''}
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-6 pr-6 md:flex">
        <div className="w-32">
          <div className="mb-1 text-xs text-muted-foreground">Type</div>
          <div className="truncate text-sm font-medium capitalize text-foreground">
            {material.material_type.replace('_', ' ')}
          </div>
        </div>

        <div className="w-36">
          <div className="mb-1 text-xs text-muted-foreground">Status</div>
          <StatusPill status={material.status} />
        </div>

        <div className="w-28">
          <div className="mb-1 text-xs text-muted-foreground">Updated</div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(material.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPreview(material)}
          className="hidden text-primary hover:bg-primary/10 hover:text-primary sm:flex"
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
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
