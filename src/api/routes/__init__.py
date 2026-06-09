# api/routes/__init__.py
#
# Name-collision shim. Two things share the import name `api.routes`:
#   * api/routes.py        -> the main API blueprint (`api`, ~900KB of routes)
#   * api/routes/  (here)  -> package of sub-route modules (script_routes, etc.)
#
# Python resolves `api.routes` to THIS package (a directory shadows a sibling
# module), which left `routes.py` unreachable and broke:
#   app.py:67               from api.routes import api
#   api/error_handling.py   from api.routes import api
#
# We load the shadowed sibling routes.py by file path and re-export its
# blueprints so the existing `from api.routes import api` keeps working, while
# the package's own submodules (api.routes.script_routes, ...) remain importable.
# The module is loaded under name "api._routes_module" so its __package__ is
# "api"; its relative imports (`from .socketio import socketio`, etc.) therefore
# resolve to the same api.* singletons the rest of the app uses.
import os as _os
import sys as _sys
import importlib.util as _ilu

_routes_py = _os.path.join(_os.path.dirname(_os.path.dirname(__file__)), "routes.py")
if "api._routes_module" not in _sys.modules:
    _spec = _ilu.spec_from_file_location("api._routes_module", _routes_py)
    _module = _ilu.module_from_spec(_spec)
    _sys.modules["api._routes_module"] = _module
    _spec.loader.exec_module(_module)
else:
    _module = _sys.modules["api._routes_module"]

api = _module.api
chat_api = _module.chat_api
user_api = _module.user_api
