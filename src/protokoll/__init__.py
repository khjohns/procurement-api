"""Protokoll generator package."""

from .markdown import generate_protokoll

# Docx generators require python-docx — guarded import
try:
    from .docx_del3 import generate_protokoll_docx  # noqa: F401
    from .docx_del2 import generate_protokoll_docx_del2  # noqa: F401

    _HAS_DOCX = True
except ImportError:
    _HAS_DOCX = False

__all__ = ["generate_protokoll"]
if _HAS_DOCX:
    __all__.extend(["generate_protokoll_docx", "generate_protokoll_docx_del2"])
