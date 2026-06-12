 import React, { useMemo } from 'react';
 import 'katex/dist/katex.min.css';
 import katex from 'katex';
 
 interface LatexRendererProps {
   content: string;
   className?: string;
   displayMode?: boolean;
 }
 
 export function LatexRenderer({ content, className = '', displayMode = false }: LatexRendererProps) {
   const renderedContent = useMemo(() => {
     if (!content) return '';
     
     // Regex to find LaTeX expressions
     const inlineLatex = /\$([^$]+)\$/g;
     const displayLatex = /\$\$([^$]+)\$\$/g;
     
     let result = content;
     
     // Replace display math first ($$...$$)
     result = result.replace(displayLatex, (match, latex) => {
       try {
         return katex.renderToString(latex, {
           throwOnError: false,
           displayMode: true,
           strict: false,
         });
       } catch (e) {
         console.warn('KaTeX error:', e);
         return match;
       }
     });
     
     // Replace inline math ($...$)
     result = result.replace(inlineLatex, (match, latex) => {
       try {
         return katex.renderToString(latex, {
           throwOnError: false,
           displayMode: false,
           strict: false,
         });
       } catch (e) {
         console.warn('KaTeX error:', e);
         return match;
       }
     });
     
     return result;
   }, [content]);
 
   return (
     <span 
       className={className}
       dangerouslySetInnerHTML={{ __html: renderedContent }}
     />
   );
 }
 
 // Simple text-only version for when LaTeX isn't needed
 export function TextWithLatex({ text, className = '' }: { text: string; className?: string }) {
   // Check if text contains LaTeX
   const hasLatex = /\$[^$]+\$/.test(text);
   
   if (!hasLatex) {
     return <span className={className}>{text}</span>;
   }
   
   return <LatexRenderer content={text} className={className} />;
 }