type ControlLoader = () => Promise<unknown>;

const registry = new Map<string, ControlLoader>();

export interface GridConfig {
  controls?: Record<string, ControlLoader>;
}

export function configureGrid(config: GridConfig): void {
  if (!config.controls) return;
  for (const [tag, loader] of Object.entries(config.controls)) {
    registry.set(tag, loader);
  }
}

export async function resolveControl(tag: string): Promise<void> {
  const loader = registry.get(tag);
  if (loader && !customElements.get(tag)) {
    await loader();
  }
  await customElements.whenDefined(tag);
}

export function _resetRegistryForTesting(): void {
  registry.clear();
}
