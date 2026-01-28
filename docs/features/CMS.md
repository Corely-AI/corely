# CMS Module (MVP)

This document describes the minimal CMS module that supports authoring, publishing, public reading, comments, and a small AI draft helper.

## Overview

- Staff can create, edit, publish, and unpublish posts.
- Public readers can view published posts and approved comments.
- Readers can sign up and log in to submit comments (moderation required).
- Images are stored via the existing `documents` module with GCS; CMS files are marked `isPublic`.

## Data model

- `CmsPost` (tenant/workspace scoped): title, slug, excerpt, cover image file, content JSON, derived HTML/text.
- `CmsComment` (tenant/workspace scoped): body, status (PENDING/APPROVED/REJECTED/SPAM/DELETED).
- `CmsReader` (tenant/workspace scoped): email + password hash for public commenting.

## API endpoints

### Admin (staff auth)

- `GET /cms/posts`
- `POST /cms/posts`
- `GET /cms/posts/:postId`
- `PUT /cms/posts/:postId`
- `PUT /cms/posts/:postId/content`
- `POST /cms/posts/:postId/publish`
- `POST /cms/posts/:postId/unpublish`
- `GET /cms/comments`
- `POST /cms/comments/:commentId/approve`
- `POST /cms/comments/:commentId/reject`
- `POST /cms/comments/:commentId/spam`
- `POST /cms/comments/:commentId/delete`
- `POST /cms/ai/draft`

### Public

- `GET /public/cms/posts`
- `GET /public/cms/posts/:slug`
- `GET /public/cms/posts/:slug/comments`
- `POST /public/cms/posts/:slug/comments` (reader auth)
- `POST /public/cms/auth/signup`
- `POST /public/cms/auth/login`

### Public documents (images)

- `GET /public/documents/files/:fileId`
  - Public access only if `File.isPublic = true`.
  - The handler redirects to a short-lived signed GCS URL.

## Images

CMS uses `documents` upload intent + completion flow and marks files as public:

1. `POST /documents/upload-intent` with `isPublic: true` and `purpose: cms-cover|cms-inline`.
2. Upload to signed URL.
3. `POST /documents/:documentId/files/:fileId/complete`.
4. Public URL: `/public/documents/files/:fileId`.

Inline images in Tiptap JSON store:

```json
{
  "type": "image",
  "attrs": {
    "src": "https://.../public/documents/files/<fileId>",
    "alt": "...",
    "fileId": "<fileId>"
  }
}
```

## AI Draft

`POST /cms/ai/draft` accepts `topic`, `keyword`, optional `tone` and `language`, and returns:

- `title`, `excerpt`, `slugSuggestion`
- `metaTitle`, `metaDescription`
- `contentJson` (Tiptap document)

Prompt definitions live in `packages/prompts/src/prompts/cms.ts` and are logged via the existing AI copilot usage logger.

## Local testing checklist

1. Create a draft post, save, and refresh.
2. Upload a cover image and verify it renders in the public list/detail page.
3. Insert an inline image in Tiptap and verify it renders publicly.
4. Publish the post and view it at `/p/:slug`.
5. Sign up a reader, submit a comment, and approve it in `/cms/comments`.
