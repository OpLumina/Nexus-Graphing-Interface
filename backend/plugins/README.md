# Backend Plugin Directory

Drop any `.py` file here to add backend math operations that are automatically
registered with the `/compute` endpoint on next server restart.

## Required format

Each plugin file must export an `OPS` dict:

```python
# my_plugin.py

def my_operation(inputs: dict) -> dict:
    x = float(inputs.get("x", 0))
    return {"result": x ** 2, "latex": f"{x}^2"}

OPS = {
    "my_operation": my_operation,
}
```

The op name (`"my_operation"`) is what you reference in your `.ngplugin.json`
tool definition under `operation.op`.

## Notes

- Files starting with `_` are ignored
- If a plugin fails to load, the error is printed and startup continues
- Op names must be unique across all plugins and built-in ops
