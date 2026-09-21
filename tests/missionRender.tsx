import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MissionProvider } from "../src/state/MissionProvider";

interface MissionRenderOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
}

/**
 * Renders a subtree inside the real MissionProvider and a MemoryRouter so shared
 * forecast-draft and mission state behave exactly as they do in the app.
 */
export function renderWithMission(
  ui: ReactElement,
  { route = "/", ...options }: MissionRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <MissionProvider>{children}</MissionProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
