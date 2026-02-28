"""Flask application factory."""

from __future__ import annotations

import os

from flask import Flask, send_from_directory

from .client import ArtifikClient

# SvelteKit adapter-static build output
_BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)

    app.config.from_mapping(SECRET_KEY="dev")

    if test_config:
        app.config.update(test_config)

    # Shared API client
    app.artifik = ArtifikClient()  # type: ignore[attr-defined]

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
