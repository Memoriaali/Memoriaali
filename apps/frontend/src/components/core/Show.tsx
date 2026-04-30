import { useAuth } from '@/hooks/useAuth';
import { useVariant } from '@/hooks/useVariant';
import { WithAccessProps, hasAccess } from '@/lib/access/hasAccess';
import { PropsWithChildren } from 'react';

interface ShowProps extends WithAccessProps {
  /**
   * Render the children the access props are not met
   */
  orRender?: React.ReactNode;
}

/**
 * Helper component to show or hide children based on access props
 * @param children - The children to show if the access props are met
 * @param orRender - The children to show if the access props are not met
 * @param props - The access props
 * @returns The children or the orRender prop if the access props are not met
 */
const Show = ({ children, orRender, ...props }: PropsWithChildren<ShowProps>) => {
  const { user } = useAuth();
  const variant = useVariant();

  const show = hasAccess(props, user, variant.configuration);
  return show ? children : (orRender ?? null);
};

export default Show;
