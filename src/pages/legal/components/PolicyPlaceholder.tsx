import LegalPageLayout from '@/pages/legal/components/LegalPageLayout';

interface PolicyPlaceholderProps {
  title: string;
  description: string;
}

export default function PolicyPlaceholder({ title, description }: PolicyPlaceholderProps) {
  return <LegalPageLayout title={title} description={description} preparing />;
}