declare module 'mjml' {
  interface MjmlToHtmlOptions {
    [key: string]: any;
  }

  interface MjmlToHtmlResult {
    html: string;
    errors: any[];
  }

  function mjml2html(mjml: string, options?: MjmlToHtmlOptions): MjmlToHtmlResult;

  export default mjml2html;
}
