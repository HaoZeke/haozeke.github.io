#!/usr/bin/env python3

# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "beautifulsoup4==4.12.3",
#   "click==8.1.8",
#   "requests==2.32.3",
#   "rich==14.0.0",
# ]
# ///

import logging
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import click
import requests
from bs4 import BeautifulSoup
from rich.logging import RichHandler

# --- Constants ---
BLOG_NAME = "RG Musings"
ARXIV_PATTERN = re.compile(r"arxiv\.org/abs/([\w\.\-]+)")


def load_sent_trackbacks(log_file: Path) -> set:
    """Loads the set of already sent trackbacks from the log file."""
    if not log_file.exists():
        return set()
    with log_file.open("r", encoding="utf-8") as f:
        return set(line.strip() for line in f)


def send_trackback(
    paper_id: str, post_url: str, post_title: str, post_excerpt: str, site_url: str
) -> bool:
    """Sends a single trackback to arXiv."""
    trackback_url = f"https://arxiv.org/trackback/{paper_id}"
    payload = {
        "title": post_title,
        "url": post_url,
        "blog_name": BLOG_NAME,
        "excerpt": post_excerpt,
    }
    headers = {"User-Agent": f"Python-Trackback-Client/1.0 ({site_url})"}

    try:
        logging.info(
            f"Sending trackback for paper [bold cyan]{paper_id}[/] from [link={post_url}]{post_url}[/link]"
        )
        response = requests.post(
            trackback_url, data=payload, headers=headers, timeout=15
        )
        response.raise_for_status()  # Raise an exception for bad status codes

        if "<error>1</error>" in response.text:
            error_message = re.search(r"<message>(.*?)</message>", response.text)
            msg = (
                error_message.group(1) if error_message else "Unknown error from arXiv"
            )
            logging.error(f"Trackback for {paper_id} rejected by arXiv: {msg}")
            return False
        else:
            logging.info(f"Successfully sent trackback for [bold cyan]{paper_id}[/].")
            return True

    except requests.exceptions.RequestException as e:
        logging.error(f"Network error sending trackback for {paper_id}: {e}")
        return False


@click.command()
@click.option(
    "--site-url",
    required=True,
    help="The full base URL of the site (e.g., https://rgoswami.me).",
)
@click.option(
    "--public-dir",
    default="public",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    help="Path to the directory containing the built site.",
)
@click.option(
    "--log-file",
    default=".sent_trackbacks.log",
    type=click.Path(dir_okay=False, writable=True, path_type=Path),
    help="Path to the log file for tracking sent trackbacks.",
)
@click.option(
    "-v", "--verbose", is_flag=True, help="Enable verbose DEBUG level logging."
)
def main(site_url: str, public_dir: Path, log_file: Path, verbose: bool):
    """
    Scans a static site for arXiv links and sends trackbacks for new mentions.
    """
    log_level = "DEBUG" if verbose else "INFO"
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, markup=True)],
    )

    # Internal sanity check, as recommended by the guide
    assert site_url.startswith(("http://", "https://")), (
        "site_url must be a valid http/https URL."
    )

    sent_trackbacks = load_sent_trackbacks(log_file)
    new_trackbacks_sent = 0

    logging.info(f"Scanning for HTML files in [green]{public_dir}[/]...")

    html_files = list(public_dir.glob("**/*.html"))
    if not html_files:
        logging.warning(f"No HTML files found in '{public_dir}'. Exiting.")
        sys.exit(0)

    logging.info(f"Found {len(html_files)} HTML files. Checking for new arXiv links...")

    for html_file in html_files:
        logging.debug(f"Parsing {html_file.relative_to(public_dir)}")
        with html_file.open("r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

        links = soup.find_all("a", href=True)
        if not links:
            continue

        relative_path = html_file.relative_to(public_dir).as_posix()
        post_url = urljoin(site_url, relative_path)
        post_title = (
            soup.title.string.strip()
            if soup.title and soup.title.string
            else "Untitled Page"
        )
        meta_desc = soup.find("meta", attrs={"name": "description"})
        post_excerpt = (
            meta_desc["content"]
            if meta_desc and meta_desc.get("content")
            else (soup.p.get_text() if soup.p else "...")
        )
        post_excerpt = (
            (post_excerpt[:250] + "...") if len(post_excerpt) > 253 else post_excerpt
        )

        for link in links:
            match = ARXIV_PATTERN.search(link["href"])
            if match:
                paper_id = match.group(1)
                log_entry = f"{post_url}|{paper_id}"

                if log_entry in sent_trackbacks:
                    logging.debug(
                        f"Skipping already sent trackback for {paper_id} in {post_url}"
                    )
                    continue

                if send_trackback(
                    paper_id, post_url, post_title, post_excerpt, site_url
                ):
                    with log_file.open("a", encoding="utf-8") as f:
                        f.write(f"{log_entry}\n")
                    sent_trackbacks.add(log_entry)
                    new_trackbacks_sent += 1

    logging.info(
        f"[bold green]Finished. Sent {new_trackbacks_sent} new trackback(s).[/bold green]"
    )


if __name__ == "__main__":
    main()
