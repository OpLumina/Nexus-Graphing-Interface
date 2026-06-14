import os as _os
import sys as _sys

from .algebra import expand, factor, integral, limit, simplify, solve
from .analysis import analyze_function
from .calculus import definite_integral, numeric_derivative, symbolic_derivative, taylor_series
from .geometry import reflect_vector
from .stats import regression, sample

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
