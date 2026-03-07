"""Flask application factory."""

from __future__ import annotations

import os

from flask import Flask, jsonify, send_from_directory

from .client import ArtifikClient
from .doffin import DoffinClient

# SvelteKit adapter-static build output
_BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)

    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-only-fallback")
    )

    if test_config:
        app.config.update(test_config)

    # Shared API clients
    app.artifik = ArtifikClient()  # type: ignore[attr-defined]
    cache_bucket = os.environ.get("CACHE_BUCKET")
    app.doffin = DoffinClient(  # type: ignore[attr-defined]
        cache_bucket=cache_bucket,
        cache_dir=None if cache_bucket else ".cache/eforms",
    )

    # Health check
    @app.route("/health")
    def health():
        return jsonify({"status": "ok"})

    # Register blueprints
    from .api import bp as api_bp

    app.register_blueprint(api_bp, url_prefix="/api")

    # Serve SvelteKit SPA — static files + fallback to index.html
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path: str):
        file_path = os.path.join(_BUILD_DIR, path)
        if path and os.path.isfile(file_path):
            return send_from_directory(_BUILD_DIR, path)
        return send_from_directory(_BUILD_DIR, "index.html")

    return app
