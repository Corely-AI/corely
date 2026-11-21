export abstract class TemplatePdfInspector {
  abstract pageCount(bytes: Buffer): Promise<number>;
}
