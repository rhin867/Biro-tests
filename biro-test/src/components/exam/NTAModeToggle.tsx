 import React from 'react';
 import { Switch } from '@/components/ui/switch';
 import { Label } from '@/components/ui/label';
 import { useNTAMode } from '@/contexts/NTAModeContext';
 import { Monitor } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface NTAModeToggleProps {
   className?: string;
   showLabel?: boolean;
 }
 
 export function NTAModeToggle({ className, showLabel = true }: NTAModeToggleProps) {
   const { isNTAMode, toggleNTAMode } = useNTAMode();
 
   return (
     <div className={cn('flex items-center gap-2', className)}>
       <Switch
         id="nta-mode"
         checked={isNTAMode}
         onCheckedChange={toggleNTAMode}
       />
       {showLabel && (
         <Label 
           htmlFor="nta-mode" 
           className="flex items-center gap-1.5 cursor-pointer text-sm"
         >
           <Monitor className="h-4 w-4" />
           NTA Classic
         </Label>
       )}
     </div>
   );
 }