from pathlib import Path
from uuid import uuid4

from python_service.server import load_env


def test_process_environment_overrides_external_file(monkeypatch) -> None:
    fixture_root = Path(".test-tmp")
    fixture_root.mkdir(exist_ok=True)
    environment_file = fixture_root / f"environment-{uuid4().hex}.env"

    try:
        environment_file.write_text("COSMOS_FILE_ONLY=present\nCOSMOS_TEST_OVERRIDE=file\n", encoding="utf-8")
        monkeypatch.setenv("COSMOS_TEST_OVERRIDE", "process")
        environment = load_env(environment_file)

        assert environment["COSMOS_FILE_ONLY"] == "present"
        assert environment["COSMOS_TEST_OVERRIDE"] == "process"
    finally:
        environment_file.unlink(missing_ok=True)
