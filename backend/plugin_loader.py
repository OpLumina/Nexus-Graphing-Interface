# Auto-loads Python plugin files from backend/plugins/.
# Each plugin file must define: OPS = { "op_name": callable }
# Drop a .py file in backend/plugins/ — it registers automatically on next restart.

import importlib.util
from pathlib import Path

PLUGINS_DIR = Path(__file__).parent / "plugins"


def load_plugin_ops() -> dict[str, callable]:
    """Scan backend/plugins/*.py and collect all declared OPS dicts."""
    ops: dict[str, callable] = {}

    if not PLUGINS_DIR.exists():
        return ops

    for py_file in sorted(PLUGINS_DIR.glob("*.py")):
        if py_file.name.startswith("_"):
            continue
        try:
            spec   = importlib.util.spec_from_file_location(f"nexus_plugin.{py_file.stem}", py_file)
            module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
            spec.loader.exec_module(module)                  # type: ignore[union-attr]

            plugin_ops = getattr(module, "OPS", None)
            if isinstance(plugin_ops, dict):
                ops.update(plugin_ops)
                print(f"[plugins] Loaded {len(plugin_ops)} op(s) from {py_file.name}")
            else:
                print(f"[plugins] {py_file.name} has no OPS dict — skipping")
        except Exception as exc:
            print(f"[plugins] Failed to load {py_file.name}: {exc}")

    return ops
