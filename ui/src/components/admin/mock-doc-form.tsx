"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAmplifyApiClient } from "@/providers";
import { v4 as uuidv4 } from 'uuid';

export function MockDocForm() {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentUuid, setDocumentUuid] = useState("");
  const [thumbnailKey, setThumbnailKey] = useState("");
  const [contentKey, setContentKey] = useState("");
  const [youtube, setYoutube] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !contentKey) {
      setError("Title, description and content key are required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await client.models.MockDocument.create({
        mockDocumentUuid: uuidv4(),
        documentUuid,
        thumbnailKey,
        contentKey,
        title,
        description,
        youtube,
      });
      setTitle("");
      setDescription("");
      setThumbnailKey("");
      setContentKey("");
      setYoutube(false);
      await queryClient.invalidateQueries({ queryKey: ["mockDocuments"] });
    } finally {
      setIsSubmitting(false);
    }
  }, [client, queryClient, title, description, contentKey, youtube]);

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <h2 className="text-base font-semibold">Add new mock document</h2>
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Document UUID</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={documentUuid}
            onChange={(e) => setDocumentUuid(e.target.value)}
            placeholder="Document UUID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Thumbnail key (optional)</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={thumbnailKey}
            onChange={(e) => setThumbnailKey(e.target.value)}
            placeholder="s3://... or key"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Content key</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={contentKey}
            onChange={(e) => setContentKey(e.target.value)}
            placeholder="s3://... or key"
            required
          />
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={youtube} onChange={(e) => setYoutube(e.target.checked)} />
        YouTube
      </label>
      <div className="pt-2">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
