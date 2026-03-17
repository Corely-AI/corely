export type ApplyTranscriptionResult = {
  commentId?: string | null;
  issueDescriptionUpdated: boolean;
};

export interface IssueTranscriptionRepositoryPort {
  applyTranscription(params: {
    tenantId: string;
    issueId: string;
    attachmentId: string;
    transcriptText: string;
    transcriptSegments?: Array<{ startSeconds: number; endSeconds: number; text: string }>;
    commentId?: string | null;
  }): Promise<ApplyTranscriptionResult>;
  markFailed(params: {
    tenantId: string;
    attachmentId: string;
    errorMessage: string;
  }): Promise<void>;
}

export const ISSUE_TRANSCRIPTION_REPOSITORY_PORT = "worker/issues/issue-transcription-repo";
