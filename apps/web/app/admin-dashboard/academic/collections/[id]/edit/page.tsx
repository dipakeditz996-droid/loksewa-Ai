'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminCollectionsApi, QuestionCollection } from '@/lib/api/admin-collections';
import CollectionForm from '@/components/admin/collections/CollectionForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EditCollectionPage() {
  const params = useParams<{ id: string }>();
  const [collection, setCollection] = useState<QuestionCollection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    adminCollectionsApi
      .getCollection(Number(params.id))
      .then(setCollection)
      .catch(() => toast.error('Failed to load collection.'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="p-6 text-center text-gray-500">Collection not found.</div>
    );
  }

  return <CollectionForm collection={collection} />;
}
