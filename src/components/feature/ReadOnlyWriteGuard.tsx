import { useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/components/base/Toast';
import { isWriteControl, READONLY_MESSAGE } from '@/lib/readonly';

/**
 * Mounted once inside the dashboard/mobile shell. When the organisation is in
 * read-only mode it blocks clicks on create/edit/delete controls, shows the
 * friendly "Upgrade to make changes" message, and labels those controls on hover.
 * The database enforces the same rule, so this is purely the UX layer.
 */
export default function ReadOnlyWriteGuard() {
  const { isReadOnly } = useOrg();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isReadOnly) return;

    const handleClick = (event: MouseEvent) => {
      const control = isWriteControl(event.target);
      if (!control) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      showToast(READONLY_MESSAGE, 'warning');
    };

    const handleHover = (event: MouseEvent) => {
      const control = isWriteControl(event.target);
      if (!control) return;
      if (control.getAttribute('title') !== READONLY_MESSAGE) {
        control.setAttribute('data-readonly-title', control.getAttribute('title') || '');
        control.setAttribute('title', READONLY_MESSAGE);
      }
    };

    const handleLeave = (event: MouseEvent) => {
      const control = isWriteControl(event.target);
      if (!control || !control.hasAttribute('data-readonly-title')) return;
      const previous = control.getAttribute('data-readonly-title') || '';
      if (previous) {
        control.setAttribute('title', previous);
      } else {
        control.removeAttribute('title');
      }
      control.removeAttribute('data-readonly-title');
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mouseover', handleHover, true);
    document.addEventListener('mouseout', handleLeave, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mouseover', handleHover, true);
      document.removeEventListener('mouseout', handleLeave, true);
    };
  }, [isReadOnly, showToast]);

  return null;
}