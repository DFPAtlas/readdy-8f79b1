import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  getDocumentCategoryLabel,
  getDocumentVisibilityLabel,
  getReviewStatusLabel,
  getReviewBadgeColor,
  type WorkforceDocument,
} from '@/mocks/workforce';

interface DocumentsTabProps {
  documents: WorkforceDocument[];
}

export default function DocumentsTab({ documents }: DocumentsTabProps) {
  const { t } = useTranslation();
  const { showToast: addToast } = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-main">{t('workforce.documents')}</h2>
        <span className="text-sm text-muted">{documents.length} documents</span>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-50">
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colName')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colCategory')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colUploaded')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colExpiry')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colReviewStatus')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colVisibility')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colVersion')}</th>
                <th className="text-right px-4 py-3 font-medium text-muted">{t('workforce.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-background-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <i className="ri-file-pdf-line text-muted"></i>
                      <span className="font-medium text-main">{doc.name}</span>
                      <span className="text-xs text-muted">({doc.size})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                      {getDocumentCategoryLabel(doc.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {doc.expiryDate
                      ? new Date(doc.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getReviewBadgeColor(doc.reviewStatus)}`}>
                      {getReviewStatusLabel(doc.reviewStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {doc.visibility === 'restricted' ? (
                      <span className="flex items-center gap-1 text-status-red">
                        <i className="ri-lock-line text-xs"></i>
                        {getDocumentVisibilityLabel(doc.visibility)}
                      </span>
                    ) : (
                      getDocumentVisibilityLabel(doc.visibility)
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">v{doc.version}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-background-100 hover:text-main transition-colors cursor-pointer"
                      >
                        <i className="ri-more-line"></i>
                      </button>
                      {openMenuId === doc.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)}></div>
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-40 overflow-hidden">
                            <button
                              onClick={() => { addToast(t('workforce.demoView')); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                            >
                              {t('workforce.view')}
                            </button>
                            <button
                              onClick={() => { addToast(t('workforce.demoDownload')); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                            >
                              {t('workforce.download')}
                            </button>
                            <button
                              onClick={() => { addToast(t('workforce.demoRequestReplacement')); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                            >
                              {t('workforce.requestReplacement')}
                            </button>
                            <div className="border-t border-border"></div>
                            <button
                              onClick={() => { addToast(t('workforce.demoArchiveDoc')); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-status-red hover:bg-background-50 cursor-pointer"
                            >
                              {t('workforce.archive')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    {t('workforce.noDocuments')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}