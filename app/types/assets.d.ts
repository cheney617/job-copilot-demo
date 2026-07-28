declare module "*?url" {
  const url: string;
  export default url;
}

declare module "mammoth/mammoth.browser" {
  interface RawTextResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<RawTextResult>;
}
