declare module '*.pdf';
declare module 'pdfjs-dist/build/pdf.worker.entry';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
