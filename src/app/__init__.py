"""Flask application factory."""

from __future__ import annotations

import json
import os

from flask import Flask

from .client import ArtifikClient


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"),
        static_url_path="/static",
    )

    app.config.from_mapping(
        SECRET_KEY="dev",
        VITE_DEV_MODE=os.environ.get("FLASK_DEBUG", "0") == "1",
        VITE_DEV_SERVER="http://localhost:5173",
    )

    if test_config:
        app.config.update(test_config)

    # Shared API client
    app.artifik = ArtifikClient()  # type: ignore[attr-defined]

    # Vite manifest helper
    @app.context_processor
    def vite_context() -> dict:
        if app.config["VITE_DEV_MODE"]:
            return {"vite_dev": True, "vite_server": app.config["VITE_DEV_SERVER"]}

        manifest_path = os.path.join(
            os.path.dirname(__file__), "..", "frontend", "dist", "manifest.json"
        )
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
        except FileNotFoundError:
            manifest = {}
        return {"vite_dev": False, "vite_manifest": manifest}

    # Register blueprints
    from .api import bp as api_bp

    app.register_blueprint(api_bp, url_prefix="/api")

    # Catch-all route for SPA
    @app.route("/")
    @app.route("/<path:path>")
    def index(path: str = "") -> str:
        from flask import render_template
        return render_template("index.html")

    return app
