 import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
 
 interface NTAModeContextType {
   isNTAMode: boolean;
   toggleNTAMode: () => void;
   setNTAMode: (value: boolean) => void;
 }
 
 const NTAModeContext = createContext<NTAModeContextType | undefined>(undefined);
 
 const NTA_MODE_KEY = 'jee_nta_classic_mode';
 
 export function NTAModeProvider({ children }: { children: ReactNode }) {
   const [isNTAMode, setIsNTAMode] = useState<boolean>(() => {
     if (typeof window !== 'undefined') {
       const saved = localStorage.getItem(NTA_MODE_KEY);
       return saved === 'true';
     }
     return false;
   });
 
   useEffect(() => {
     localStorage.setItem(NTA_MODE_KEY, String(isNTAMode));
     
     // Apply/remove class from root element
     if (isNTAMode) {
       document.documentElement.classList.add('nta-classic-mode');
     } else {
       document.documentElement.classList.remove('nta-classic-mode');
     }
   }, [isNTAMode]);
 
   const toggleNTAMode = () => setIsNTAMode(prev => !prev);
   const setNTAMode = (value: boolean) => setIsNTAMode(value);
 
   return (
     <NTAModeContext.Provider value={{ isNTAMode, toggleNTAMode, setNTAMode }}>
       {children}
     </NTAModeContext.Provider>
   );
 }
 
 export function useNTAMode() {
   const context = useContext(NTAModeContext);
   if (context === undefined) {
     throw new Error('useNTAMode must be used within a NTAModeProvider');
   }
   return context;
 }