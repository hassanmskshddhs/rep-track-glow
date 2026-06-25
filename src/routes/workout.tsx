import { createFileRoute, redirect } from "@tanstack/react-router";

// Shortcut target: "Start Workout". Routes the user to the dashboard
// where they pick a routine to begin their next training session.
export const Route = createFileRoute("/workout")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
