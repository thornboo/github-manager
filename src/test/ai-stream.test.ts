import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAIStream } from "@/hooks/useAIStream";

describe("useAIStream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle progress events", async () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: progress\ndata: {"type":"progress","current":1,"total":2,"repoId":1,"repoName":"test/repo"}\n\n',
          ),
        );
        controller.enqueue(
          encoder.encode(
            'event: complete\ndata: {"type":"complete","success":true,"totalProcessed":1,"totalErrors":0}\n\n',
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      body,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchMock;

    const { result } = renderHook(() =>
      useAIStream({ onProgress, onComplete }),
    );

    await act(async () => {
      const complete = await result.current.startStream({
        repos: [
          {
            id: 1,
            name: "repo",
            full_name: "test/repo",
            description: null,
            language: "TypeScript",
            topics: [],
          },
        ],
        existingLists: [],
        existingTags: [],
        provider: {
          baseUrl: "https://example.com",
          apiKey: "test",
          model: "test",
          requestFormat: "openai",
        },
        depth: "simple",
      });

      expect(complete).toEqual({
        success: true,
        totalProcessed: 1,
        totalErrors: 0,
      });
    });

    expect(onProgress).toHaveBeenCalledWith({
      current: 1,
      total: 2,
      repoId: 1,
      repoName: "test/repo",
    });
    expect(onComplete).toHaveBeenCalledWith({
      success: true,
      totalProcessed: 1,
      totalErrors: 0,
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it("should cancel stream", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchMock;

    const { result } = renderHook(() => useAIStream());

    let promise: Promise<unknown> | null = null;
    act(() => {
      promise = result.current.startStream({
        repos: [
          {
            id: 1,
            name: "repo",
            full_name: "test/repo",
            description: null,
            language: "TypeScript",
            topics: [],
          },
        ],
        existingLists: [],
        existingTags: [],
        provider: {
          baseUrl: "https://example.com",
          apiKey: "test",
          model: "test",
          requestFormat: "openai",
        },
        depth: "simple",
      });
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(true));

    act(() => result.current.cancelStream());

    await act(async () => {
      await expect(promise!).rejects.toMatchObject({ name: "AbortError" });
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });
});
