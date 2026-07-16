import { useCallback, useEffect, useState } from 'react';

// Overlay layout for the nested "+ New dataset" SubDrawer. Mirrors the GPU
// instances public-key overlay hook, but targets the benchmark FormDrawer's
// panel (`.ant-drawer-content`) so the SubDrawer slides over the drawer content
// instead of the page layout.
const useBenchmarkOverlayLayout = (open: boolean) => {
  const [drawerWidth, setDrawerWidth] = useState<number | string>(600);

  const getContainer = useCallback(() => {
    const containers = document.querySelectorAll<HTMLElement>(
      '.ant-drawer-content'
    );
    return containers[containers.length - 1] ?? null;
  }, []);

  useEffect(() => {
    if (!open) return;
    const container = getContainer();
    if (container) {
      setDrawerWidth(container.clientWidth);
    }
  }, [open, getContainer]);

  return { drawerWidth, getContainer };
};

export default useBenchmarkOverlayLayout;
