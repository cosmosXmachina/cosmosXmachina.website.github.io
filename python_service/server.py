from pathlib import Path
import os
import sys

import uvicorn


def load_env(path: Path) -> dict[str, str]:
    environment: dict[str, str] = {}
    if not path.exists():
        return dict(os.environ)
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        environment[key.strip()] = value.strip().strip('"').strip("'")
    return {**environment, **os.environ}


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(root))
    environment_file = Path(os.environ.get("COSMOS_ENV_FILE", root / ".env")).expanduser().resolve()
    environment = load_env(environment_file)
    port = int(environment.get("PYTHON_LAB_PORT", "8790"))
    uvicorn.run(
        "python_service.app:app",
        host="127.0.0.1",
        port=port,
        access_log=False,
    )
