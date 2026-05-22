declare module 'mjml' {
  interface MjmlToHtmlOptions {
    [key: string]: unknown;
  }

  interface MjmlError {
    message?: string;
    line?: number;
    column?: number;
    [key: string]: unknown;
  }

  interface MjmlToHtmlResult {
    html: string;
    errors: MjmlError[];
  }

  function mjml2html(mjml: string, options?: MjmlToHtmlOptions): MjmlToHtmlResult;

  export default mjml2html;
}
