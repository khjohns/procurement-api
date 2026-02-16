"""Entry point: python -m artifik_mcp"""

from artifik_mcp.server import create_server


def main():
    server = create_server()
    server.run(transport="stdio")


if __name__ == "__main__":
    main()
