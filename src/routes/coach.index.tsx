import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { createThread, newId, readThreads } from "@/lib/coach-chats";

export const Route = createFileRoute("/coach/")({
  component: CoachIndex,
});

function CoachIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    const existing = readThreads();
    const id = existing[0]?.id ?? createThread(newId()).id;
    void navigate({ to: "/coach/$chatId", params: { chatId: id }, replace: true });
  }, [navigate]);

  return null;
}
