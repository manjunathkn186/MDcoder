import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "@features/layout/AppShell";
import { WorkspaceView } from "@features/workspace/WorkspaceView";

// Settings is rarely visited — code-split it into a separate chunk.
const SettingsPanel = lazy(() =>
  import("@features/settings/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);

function RouteFallback(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      <span aria-busy>Loading…</span>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/workspace" replace /> },
      { path: "workspace", element: <WorkspaceView /> },
      {
        path: "settings",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <SettingsPanel />
          </Suspense>
        ),
      },
    ],
  },
]);

export function Routes(): JSX.Element {
  return <RouterProvider router={router} />;
}
