declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  type IconProps = SVGProps<SVGSVGElement>;
  
  export const EyeOff: FC<IconProps>;
  export const EyeOffIcon: FC<IconProps>;
  export const Calendar: FC<IconProps>;
  export const ChevronLeft: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const Plus: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Check: FC<IconProps>;
  export const LogOut: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const MoreVertical: FC<IconProps>;
  export const RefreshCw: FC<IconProps>;
  export const Users: FC<IconProps>;
  export const Mail: FC<IconProps>;
  export const Shield: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const PlusIcon: FC<IconProps>;
  export const LogOutIcon: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const Circle: FC<IconProps>;
  export const ChevronsUpDown: FC<IconProps>;
  
  // Add more icons as needed
  const lucideReact: {
    [key: string]: FC<IconProps>;
  };
  
  export default lucideReact;
}