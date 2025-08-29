#!/usr/bin/env python3

# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "click==8.1.8",
#   "requests==2.32.3",
#   "rich==14.0.0",
# ]
# ///

# scripts/fetch_webmentions.py

import json
import logging
from pathlib import Path

import click
import requests
from rich.logging import RichHandler

# Configure logging
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(markup=True)],
)

# --- Constants ---
DATA_DIR = Path("data")
OUTPUT_FILE = DATA_DIR / "webmentions.json"


@click.command()
@click.option(
    "--domain",
    required=True,
    help="The domain to fetch webmentions for (e.g., rgoswami.me).",
)
@click.option(
    "--token",
    envvar="WEBMENTIONS_TOKEN",
    required=True,
    help="Your Webmention.io API token. Can be set via WEBMENTIONS_TOKEN env var.",
)
def main(domain: str, token: str):
    """
    Fetches all webmentions for a given domain from webmention.io
    and saves them to a JSON file for Hugo to use.
    """
    api_url = (
        f"https://webmention.io/api/mentions.jf2"
        f"?domain={domain}"
        f"&token={token}"
        f"&per-page=1000"
    )

    logging.info(f"Fetching webmentions for [bold green]{domain}[/bold green]...")

    try:
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        mentions = response.json()

        DATA_DIR.mkdir(exist_ok=True)

        with OUTPUT_FILE.open("w", encoding="utf-8") as f:
            json.dump(mentions, f, indent=2, ensure_ascii=False)

        count = len(mentions.get("children", []))
        logging.info(
            f"Successfully fetched and saved [bold cyan]{count}[/] webmentions to [green]{OUTPUT_FILE}[/green]."
        )

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to fetch webmentions: {e}")
    except json.JSONDecodeError:
        logging.error("Failed to parse JSON response from webmention.io API.")


if __name__ == "__main__":
    main()
