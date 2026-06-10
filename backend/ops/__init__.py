from .calculus    import numeric_derivative, symbolic_derivative, taylor_series, definite_integral
from .geometry    import reflect_vector
from .algebra     import solve, factor, expand, simplify, integral, limit
from .stats       import sample, regression
from .analysis    import analyze_function
import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from plugin_loader import load_plugin_ops

OPS: dict[str, callable] = {
    "numeric_derivative":  numeric_derivative,
    "symbolic_derivative": symbolic_derivative,
    "taylor_series":       taylor_series,
    "definite_integral":   definite_integral,
    "reflect_vector": reflect_vector,
    "solve":    solve,
    "factor":   factor,
    "expand":   expand,
    "simplify": simplify,
    "integral": integral,
    "limit":    limit,
    "sample":     sample,
    "regression": regression,
    "analyze_function": analyze_function,
}

_plugin_ops = load_plugin_ops()
for _name, _fn in _plugin_ops.items():
    if _name in OPS:
        print(f"[plugins] WARNING: plugin op '{_name}' conflicts with a built-in — skipping. "
              f"Rename the op in your plugin to avoid this.")
    else:
        OPS[_name] = _fn
