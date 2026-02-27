export interface WebsitePublicFileUrlPort {
  getPublicUrl(fileId: string): Promise<string | null>;
}

export const WEBSITE_PUBLIC_FILE_URL_PORT = "website/public-file-url-port";
