import { useTranslation } from 'react-i18next';

interface PlaceholderPageProps {
  titleKey: string;
  icon: string;
  messageKey: string;
}

export default function PlaceholderPage({ titleKey, icon, messageKey }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className={`${icon} text-2xl text-muted`}></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">{t(titleKey)}</h2>
        <p className="text-sm text-muted">{t(messageKey)}</p>
      </div>
    </div>
  );
}