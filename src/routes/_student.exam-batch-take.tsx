import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { ExamInterfaceSkeleton } from "@/components/exam-batch/exam-interface-skeleton";

const searchSchema = z.object({
  examId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
});

// Lazy-load the heavy exam-interface module. The skeleton lives in a tiny
// standalone file so it can be shown instantly (as pendingComponent AND as
// the Suspense fallback) while this chunk downloads — no white flash.
const ExamInterface = lazy(() =>
  retryImport(() =>
    import("@/components/exam-batch/exam-interface").then((m) => ({ default: m.ExamInterface })),
  ),
);

async function retryImport<T>(loader: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }
  throw lastError;
}

function ExamInterfaceRoute() {
  return (
    <Suspense fallback={<ExamInterfaceSkeleton />}>
      <ExamInterface />
    </Suspense>
  );
}

export const Route = createFileRoute("/_student/exam-batch-take")({
  validateSearch: (search) => searchSchema.parse(search),
  component: ExamInterfaceRoute,
  // Render the exam skeleton for ANY pending state — route-chunk download,
  // navigation transition, refresh — so the user never sees a blank pane
  // between clicking "Start Exam" and the interface mounting.
  pendingComponent: ExamInterfaceSkeleton,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: ExamTakeErrorFallback,
  head: () => ({
    meta: [
      { title: "Exam in Progress · CA Aspire BD" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Take your Exam Batch exam with a distraction-free, secure interface.",
      },
    ],
  }),
});

function ExamTakeErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="w-full rounded-3xl border border-border/60 bg-background/80 p-6 shadow-card-soft backdrop-blur">
        <h1 className="text-lg font-semibold text-foreground">Exam could not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message?.slice(0, 220) || "The exam interface was interrupted while loading."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
          <Link
            to="/exam-batch/available"
            className="inline-flex items-center justify-center rounded-lg border border-border/60 bg-background/60 px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          >
            Back to exams
          </Link>
        </div>
      </div>
    </div>
  );
}
