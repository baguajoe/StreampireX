# Re-export the api Blueprint from the legacy routes.py module
import sys
import os
import importlib.util

_legacy_path = os.path.join(os.path.dirname(__file__), '..', 'routes_legacy.py')
spec = importlib.util.spec_from_file_location("api.routes_legacy", _legacy_path)
_legacy = importlib.util.module_from_spec(spec)
sys.modules["api.routes_legacy"] = _legacy
spec.loader.exec_module(_legacy)

api = _legacy.api
